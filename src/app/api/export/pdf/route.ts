import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { buildOfficialLetterHtml } from '@/lib/official-letter-html';
import { hasOfficialOutgoingNumber } from '@/lib/honorific';
import { attachmentDisposition } from '@/lib/download-headers';
import { officialDateDisplay } from '@/lib/hijri';
import { wrapArabicLines } from '@/lib/arabic-pdf-text';
import { loadEmblemPng } from '@/lib/brand-assets';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function localChromePath(): string | null {
  const envPath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    process.env.CHROMIUM_PATH ||
    '';
  if (envPath && fs.existsSync(envPath)) return envPath;
  const candidates = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

async function launchChromium(executablePath: string, args: string[]) {
  const puppeteer = await import('puppeteer-core');
  return puppeteer.default.launch({
    args: [
      ...args,
      '--font-render-hinting=none',
      '--force-color-profile=srgb',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
    defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
    executablePath,
    headless: true,
  });
}

async function renderHtmlToPdf(browser: { newPage: () => Promise<any>; close: () => Promise<void> }, html: string) {
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 45000 });
    await page.evaluate(async () => {
      const fonts = (globalThis as unknown as { document?: { fonts?: { ready?: Promise<unknown> } } }).document
        ?.fonts;
      if (fonts?.ready) await fonts.ready;
    });
    await new Promise((r) => setTimeout(r, 400));
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/**
 * Prefer Chromium HTML→PDF with dir=rtl + logical Arabic (NO reshape/bidi).
 * Falls back to system Chrome, then null (caller uses jsPDF logical path).
 */
async function pdfViaChromium(html: string): Promise<Buffer | null> {
  // 1) @sparticuz/chromium (Vercel / serverless)
  try {
    const chromium = (await import('@sparticuz/chromium')).default;
    try {
      const anyCr = chromium as unknown as { setGraphicsMode?: ((v: boolean) => void) | boolean };
      if (typeof anyCr.setGraphicsMode === 'function') anyCr.setGraphicsMode(false);
    } catch {
      /* ignore */
    }
    const executablePath = await chromium.executablePath();
    if (executablePath) {
      const browser = await launchChromium(executablePath, [...chromium.args]);
      const buf = await renderHtmlToPdf(browser, html);
      if (buf && buf.length > 100) return buf;
    } else {
      console.error('chromium executablePath empty');
    }
  } catch (e) {
    console.error('sparticuz chromium pdf failed', e);
  }

  // 2) Local / system Chrome
  try {
    const local = localChromePath();
    if (local) {
      const browser = await launchChromium(local, ['--disable-gpu']);
      const buf = await renderHtmlToPdf(browser, html);
      if (buf && buf.length > 100) return buf;
    }
  } catch (e) {
    console.error('local chrome pdf failed', e);
  }

  return null;
}

function loadArabicFontBase64(): string {
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoNaskhArabic-Regular.ttf');
  if (!fs.existsSync(fontPath)) {
    throw new Error('Arabic font missing: public/fonts/NotoNaskhArabic-Regular.ttf');
  }
  return fs.readFileSync(fontPath).toString('base64');
}

/**
 * jsPDF fallback — logical Arabic ONLY (no reshape/bidi).
 * Reshape+bidi + Noto Naskh caused letter-spaced reversed glyphs in production
 * because viewers re-apply bidi on presentation forms.
 */
function pdfViaJsPdf(doc: {
  number: string | null;
  subject: string;
  dateGregorian: string | null;
  dateHijri: string | null;
  recipients: string;
  copyTo?: string;
  body: string;
  parties: string;
  reasons: string;
  studyFields: string;
  footer: string;
  headerLines: string[];
  qrDataUrl?: string | null;
}): Buffer {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const fontB64 = loadArabicFontBase64();
  pdf.addFileToVFS('NotoNaskhArabic-Regular.ttf', fontB64);
  pdf.addFont('NotoNaskhArabic-Regular.ttf', 'NotoNaskhArabic', 'normal');
  pdf.setFont('NotoNaskhArabic');

  const pageW = 210;
  const marginR = 14;
  const xRight = pageW - marginR;
  let y = 16;

  const writeAr = (
    line: string,
    size = 12,
    color: [number, number, number] = [0, 0, 0],
    align: 'right' | 'center' = 'right',
  ) => {
    pdf.setFont('NotoNaskhArabic', 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    // Logical Unicode Arabic — never reverse / reshape / bidi
    const chunk = String(line ?? '').slice(0, 120) || ' ';
    const x = align === 'center' ? pageW / 2 : xRight;
    pdf.text(chunk, x, y, { align });
    y += size * 0.45 + 2.2;
    if (y > 280) {
      pdf.addPage();
      pdf.setFont('NotoNaskhArabic', 'normal');
      y = 16;
    }
  };

  // Green basmala bar
  pdf.setFillColor(0, 108, 53);
  pdf.rect(10, 8, 190, 12, 'F');
  pdf.setFillColor(197, 160, 89);
  pdf.rect(10, 20, 190, 1.2, 'F');
  y = 16;
  writeAr('بسم الله الرحمن الرحيم', 13, [255, 255, 255], 'center');
  y = 26;

  // LEFT=QR, CENTER=emblem, RIGHT=kingdom text (official letterhead)
  if (doc.qrDataUrl) {
    try {
      const m = doc.qrDataUrl.match(/^data:image\/\w+;base64,(.+)$/);
      if (m) pdf.addImage(m[1], 'PNG', 14, 24, 18, 18);
    } catch {
      /* ignore */
    }
  }
  try {
    const emblem = loadEmblemPng();
    pdf.addImage(emblem.toString('base64'), 'PNG', 96, 24, 18, 18);
  } catch {
    /* ignore */
  }

  y = 28;
  for (const h of doc.headerLines.slice(0, 3)) {
    writeAr(h, h.includes('محكمة') || h.includes('المحكمة') ? 13 : 11, [0, 108, 53], 'right');
  }
  writeAr('منصة ركيزة الذكية', 9, [197, 160, 89], 'right');
  y = Math.max(y, 48);

  writeAr(`الرقم: ${doc.number || '—'}`, 11);
  writeAr(`التاريخ: ${officialDateDisplay(doc.dateHijri, doc.dateGregorian)}`, 11);
  writeAr(`إلى: ${doc.recipients || '—'}`, 11);
  if ((doc as { copyTo?: string }).copyTo?.trim()) {
    writeAr(`نسخة إلى: ${(doc as { copyTo?: string }).copyTo}`, 11);
  }
  writeAr(`الموضوع: ${doc.subject || '—'}`, 11);
  y += 3;

  if (doc.parties?.trim()) {
    writeAr('الأطراف', 12, [0, 108, 53]);
    for (const line of wrapArabicLines(doc.parties, 68).slice(0, 20)) writeAr(line, 10);
    y += 1;
  }
  if (doc.reasons?.trim()) {
    writeAr('الأسباب', 12, [0, 108, 53]);
    for (const line of wrapArabicLines(doc.reasons, 68).slice(0, 20)) writeAr(line, 10);
    y += 1;
  }
  if (doc.body?.trim()) {
    writeAr('النص', 12, [0, 108, 53]);
    for (const line of wrapArabicLines(doc.body, 68).slice(0, 55)) writeAr(line || ' ', 10);
    y += 1;
  }
  if (doc.studyFields?.trim()) {
    writeAr('الدراسة', 12, [0, 108, 53]);
    for (const line of wrapArabicLines(doc.studyFields, 68).slice(0, 20)) writeAr(line, 10);
  }

  y += 4;
  writeAr(doc.footer || 'للاستخدام الداخلي فقط', 9, [80, 80, 80], 'center');
  return Buffer.from(pdf.output('arraybuffer'));
}

export async function GET(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return jsonError('غير مصرح', 401);
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return jsonError('id مطلوب', 400);

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return jsonError('غير موجود', 404);

    if (!hasOfficialOutgoingNumber(doc.number)) {
      return jsonError('أصدر الخطاب برقم رسمي أولاً لتتمكن من التصدير', 403);
    }

    const letterhead = await prisma.letterhead.findFirst({ where: { name: 'default' } }).catch(() => null);
    let qrDataUrl: string | null = null;
    let studySections: import('@/lib/parse-study').StudySections | null = null;
    let style: { fontFamily?: string; fontSizePt?: number } | null = null;
    let paperLayout: string | null = null;
    let copyToField = '';
    try {
      const fields = JSON.parse(doc.fieldsJson || '{}') as {
        qrDataUrl?: string;
        studySections?: import('@/lib/parse-study').StudySections;
        style?: { fontFamily?: string; fontSizePt?: number };
        paperLayout?: string;
        copyTo?: string;
      };
      qrDataUrl = fields.qrDataUrl || null;
      studySections = fields.studySections || null;
      style = fields.style || null;
      paperLayout = fields.paperLayout || null;
      copyToField = fields.copyTo || '';
    } catch {
      qrDataUrl = null;
    }

    if (!qrDataUrl && (doc.qrPayload || doc.number)) {
      try {
        qrDataUrl = await QRCode.toDataURL(String(doc.qrPayload || doc.number), { margin: 1, width: 160 });
      } catch {
        qrDataUrl = null;
      }
    }

    const headerLines = (letterhead?.header || 'المملكة العربية السعودية\nوزارة العدل\nالمحكمة العمالية بالرياض')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const fontB64 = loadArabicFontBase64();
    // Map all weights to Regular — bold faces without Arabic glyphs strip labels in PDF
    const embeddedFontCss = `@font-face {
  font-family: 'Noto Naskh Arabic';
  font-style: normal;
  font-weight: 100 900;
  src: url(data:font/ttf;base64,${fontB64}) format('truetype');
  font-display: block;
}
html, body, .paper, .paper * {
  font-family: 'Noto Naskh Arabic', 'Traditional Arabic', Tahoma, serif !important;
  font-weight: 400 !important;
  -webkit-font-smoothing: antialiased;
}
.paper { color: #111 !important; }
.bismillah, .bismillah * { color: #fff !important; }
`;

    // Chromium HTML path: logical Arabic + dir=rtl — NO reshape/bidi
    const html = buildOfficialLetterHtml(
      {
        number: doc.number,
        subject: doc.subject,
        dateGregorian: doc.dateGregorian,
        dateHijri: doc.dateHijri,
        recipients: doc.recipients,
        copyTo: copyToField,
        parties: doc.parties,
        reasons: doc.reasons,
        studyFields: doc.studyFields,
        body: doc.body,
        docType: doc.docType,
        footer: letterhead?.footer || 'للاستخدام الداخلي فقط',
        qrDataUrl,
        headerLines,
        studySections,
        fontFamily: style?.fontFamily || "'Noto Naskh Arabic', 'Traditional Arabic', Tahoma, serif",
        fontSizePt: style?.fontSizePt,
        paperLayout,
      },
      { forPdf: true, embeddedFontCss },
    );

    let buffer = await pdfViaChromium(html);
    let engine = 'chromium';
    if (!buffer || buffer.length < 100) {
      engine = 'jspdf-logical';
      buffer = pdfViaJsPdf({
        number: doc.number,
        subject: doc.subject,
        dateGregorian: doc.dateGregorian,
        dateHijri: doc.dateHijri,
        recipients: doc.recipients,
        copyTo: copyToField,
        body: doc.body,
        parties: doc.parties,
        reasons: doc.reasons,
        studyFields: doc.studyFields,
        footer: letterhead?.footer || 'للاستخدام الداخلي فقط',
        headerLines,
        qrDataUrl,
      });
    }

    if (!buffer || buffer.length < 50) {
      return jsonError('تعذر إنشاء ملف PDF حالياً. جرّب تصدير DOCX.', 500);
    }

    const base = `rakeeza-${doc.number || doc.id}`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': attachmentDisposition(base, 'pdf'),
        'Cache-Control': 'no-store',
        'X-Rakeeza-Pdf-Engine': engine,
      },
    });
  } catch (e) {
    console.error('pdf export failed', e);
    return jsonError('تعذر إنشاء ملف PDF حالياً. جرّب تصدير DOCX.', 500);
  }
}
