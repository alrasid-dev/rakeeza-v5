import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { buildOfficialLetterHtml } from '@/lib/official-letter-html';
import { hasOfficialOutgoingNumber } from '@/lib/honorific';
import { prepareArabicForPdf, wrapArabicLines } from '@/lib/arabic-pdf-text';
import { jsPDF } from 'jspdf';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function pdfViaChromium(html: string): Promise<Buffer | null> {
  try {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = await import('puppeteer-core');
    const executablePath = await chromium.executablePath();
    if (!executablePath) return null;

    const browser = await puppeteer.default.launch({
      args: [...chromium.args, '--font-render-hinting=none', '--force-color-profile=srgb'],
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
      executablePath,
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load', timeout: 35000 });
      // Ensure embedded @font-face is ready before print
      await page.evaluate(async () => {
        const fonts = (globalThis as unknown as { document?: { fonts?: { ready?: Promise<unknown> } } }).document?.fonts;
        if (fonts?.ready) await fonts.ready;
      });
      await new Promise((r) => setTimeout(r, 250));
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch (e) {
    console.error('chromium pdf failed', e);
    return null;
  }
}

function loadArabicFontBase64(): string {
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoNaskhArabic-Regular.ttf');
  if (!fs.existsSync(fontPath)) {
    throw new Error('Arabic font missing: public/fonts/NotoNaskhArabic-Regular.ttf');
  }
  return fs.readFileSync(fontPath).toString('base64');
}

/** jsPDF fallback with embedded Noto Naskh Arabic — real Arabic strings, no English stubs */
function pdfViaJsPdf(doc: {
  number: string | null;
  subject: string;
  dateGregorian: string | null;
  dateHijri: string | null;
  recipients: string;
  body: string;
  parties: string;
  reasons: string;
  studyFields: string;
  footer: string;
  headerLines: string[];
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

  const writeAr = (line: string, size = 12, color: [number, number, number] = [0, 0, 0]) => {
    pdf.setFont('NotoNaskhArabic', 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const prepared = prepareArabicForPdf(line);
    const chunk = prepared.slice(0, 120) || ' ';
    pdf.text(chunk, xRight, y, { align: 'right' });
    y += size * 0.45 + 2.2;
    if (y > 280) {
      pdf.addPage();
      pdf.setFont('NotoNaskhArabic', 'normal');
      y = 16;
    }
  };

  // Green header bar
  pdf.setFillColor(0, 108, 53);
  pdf.rect(10, 8, 190, 12, 'F');
  pdf.setTextColor(255, 255, 255);
  y = 16;
  writeAr('بسم الله الرحمن الرحيم', 13, [255, 255, 255]);
  pdf.setTextColor(0, 0, 0);
  y = 28;

  for (const h of doc.headerLines.slice(0, 3)) {
    writeAr(h, h.includes('محكمة') || h.includes('المحكمة') ? 13 : 11, [0, 108, 53]);
  }
  writeAr('منصة ركيزة الذكية', 9, [197, 160, 89]);
  y += 2;

  writeAr(`الرقم: ${doc.number || '—'}`, 11);
  writeAr(`التاريخ: ${doc.dateGregorian || doc.dateHijri || '—'}`, 11);
  writeAr(`إلى: ${doc.recipients || '—'}`, 11);
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
  writeAr(doc.footer || 'للاستخدام الداخلي فقط', 9, [80, 80, 80]);
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
    try {
      const fields = JSON.parse(doc.fieldsJson || '{}') as {
        qrDataUrl?: string;
        studySections?: import('@/lib/parse-study').StudySections;
        style?: { fontFamily?: string; fontSizePt?: number };
        paperLayout?: string;
      };
      qrDataUrl = fields.qrDataUrl || null;
      studySections = fields.studySections || null;
      style = fields.style || null;
      paperLayout = fields.paperLayout || null;
    } catch {
      qrDataUrl = null;
    }

    const headerLines = (letterhead?.header || 'المملكة العربية السعودية\nوزارة العدل\nالمحكمة العمالية بالرياض')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const fontB64 = loadArabicFontBase64();
    const embeddedFontCss = `@font-face {
  font-family: 'Noto Naskh Arabic';
  font-style: normal;
  font-weight: 400;
  src: url(data:font/ttf;base64,${fontB64}) format('truetype');
  font-display: block;
}`;

    const html = buildOfficialLetterHtml(
      {
        number: doc.number,
        subject: doc.subject,
        dateGregorian: doc.dateGregorian,
        dateHijri: doc.dateHijri,
        recipients: doc.recipients,
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
    if (!buffer || buffer.length < 100) {
      buffer = pdfViaJsPdf({
        number: doc.number,
        subject: doc.subject,
        dateGregorian: doc.dateGregorian,
        dateHijri: doc.dateHijri,
        recipients: doc.recipients,
        body: doc.body,
        parties: doc.parties,
        reasons: doc.reasons,
        studyFields: doc.studyFields,
        footer: letterhead?.footer || 'للاستخدام الداخلي فقط',
        headerLines,
      });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rakeeza-${doc.number || doc.id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('pdf export failed', e);
    return jsonError('تعذر إنشاء ملف PDF حالياً. جرّب تصدير DOCX.', 500);
  }
}
