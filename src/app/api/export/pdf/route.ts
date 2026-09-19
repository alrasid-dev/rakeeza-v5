import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { buildOfficialLetterHtml } from '@/lib/official-letter-html';
import { hasOfficialOutgoingNumber } from '@/lib/honorific';
import { attachmentDisposition } from '@/lib/download-headers';
import { officialDateDisplay } from '@/lib/hijri';
import { wrapArabicLines } from '@/lib/arabic-pdf-text';
import { loadEmblemPng, BRAND } from '@/lib/brand-assets';
import { buildPdfEmbeddedFontCss, loadNotoNaskhBase64 } from '@/lib/pdf-font-css';
import { normalizePaperLayout } from '@/lib/paper-layouts';
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
    // Wait until Base64 @font-face faces are loaded before rasterizing PDF
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 1200));
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      // Keep real text layer so recipients can select/copy (not a flat image)
      tagged: true,
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
  paperLayout?: string | null;
}): Buffer {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const fontB64 = loadNotoNaskhBase64();
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

  // Top gold rule (basmala removed) — GREEN/GOLD match classic theme
  const GREEN_RGB: [number, number, number] = [0, 108, 53];
  const GOLD_RGB: [number, number, number] = [197, 160, 89];
  pdf.setFillColor(...GOLD_RGB);
  pdf.rect(10, 8, 190, 1.5, 'F');
  pdf.setDrawColor(...GREEN_RGB);
  pdf.setLineWidth(0.4);
  pdf.rect(10, 10, 190, 277);
  y = 14;
  const layoutName = normalizePaperLayout(doc.paperLayout);
  pdf.setFont('NotoNaskhArabic', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...GOLD_RGB);
  pdf.text(`layout:${layoutName}`, 14, 11);

  // LEFT=QR, CENTER=emblem, RIGHT=kingdom text (official letterhead)
  if (doc.qrDataUrl) {
    try {
      const m = doc.qrDataUrl.match(/^data:image\/\w+;base64,(.+)$/);
      if (m) pdf.addImage(m[1], 'PNG', 14, 12, 18, 18);
    } catch {
      /* ignore */
    }
  }
  try {
    const emblem = loadEmblemPng();
    pdf.addImage(emblem.toString('base64'), 'PNG', 96, 12, 18, 18);
  } catch {
    /* ignore */
  }

  y = 16;
  for (const h of doc.headerLines.slice(0, 3)) {
    writeAr(h, h.includes('محكمة') || h.includes('المحكمة') ? 13 : 11, [0, 108, 53], 'right');
  }
  writeAr(BRAND.platform, 9, [197, 160, 89], 'right');
  y = Math.max(y, 36);

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
    let judgmentCard: { label: string; value: string }[] | null = null;
    let judgmentBriefing = false;
    let briefingTitleField = '';
    let judgmentPriorityField = '';
    try {
      const fields = JSON.parse(doc.fieldsJson || '{}') as {
        qrDataUrl?: string;
        studySections?: import('@/lib/parse-study').StudySections;
        style?: { fontFamily?: string; fontSizePt?: number };
        paperLayout?: string;
        copyTo?: string;
        judgmentCard?: { label: string; value: string }[];
        judgmentBriefing?: boolean;
      };
      qrDataUrl = fields.qrDataUrl || null;
      studySections = fields.studySections || null;
      style = fields.style || null;
      paperLayout = fields.paperLayout || null;
      copyToField = fields.copyTo || '';
      judgmentCard = fields.judgmentCard?.length ? fields.judgmentCard : null;
      judgmentBriefing =
        fields.judgmentBriefing === true ||
        (Boolean(judgmentCard?.length) && !studySections && fields.judgmentBriefing !== false);
      briefingTitleField = (fields as { briefingTitle?: string }).briefingTitle || '';
      judgmentPriorityField = (fields as { judgmentPriority?: string }).judgmentPriority || '';
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

    const selectedFont = style?.fontFamily || 'Traditional Arabic';
    const embeddedFontCss = buildPdfEmbeddedFontCss(selectedFont);

    // Chromium HTML path: logical Arabic + dir=rtl — NO reshape/bidi
    const html = buildOfficialLetterHtml(
      {
        number: doc.number,
        subject: doc.subject,
        dateGregorian: doc.dateGregorian,
        dateHijri: doc.dateHijri,
        recipients: doc.recipients,
        copyTo: copyToField,
        parties: judgmentBriefing ? '' : doc.parties,
        reasons: judgmentBriefing ? '' : doc.reasons,
        studyFields: judgmentBriefing ? '' : doc.studyFields,
        body: judgmentBriefing ? '' : doc.body,
        docType: doc.docType,
        footer: letterhead?.footer || 'للاستخدام الداخلي فقط',
        qrDataUrl,
        headerLines,
        studySections: judgmentBriefing ? null : studySections,
        judgmentCard,
        judgmentBriefing,
        briefingTitle: briefingTitleField || undefined,
        judgmentPriority: judgmentPriorityField || undefined,
        fontFamily: selectedFont,
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
        paperLayout,
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
