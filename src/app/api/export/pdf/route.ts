import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { buildOfficialLetterHtml } from '@/lib/official-letter-html';
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
      args: chromium.args,
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
      executablePath,
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 25000 });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch {
    return null;
  }
}

/** Fallback that never throws — Latin labels + Arabic body as unicode (limited shaping) */
function pdfViaJsPdf(doc: {
  number: string | null;
  subject: string;
  dateGregorian: string | null;
  recipients: string;
  body: string;
  footer: string;
}): Buffer {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  pdf.setFont('helvetica');
  pdf.setFontSize(14);
  let y = 16;

  const write = (line: string, size = 11) => {
    pdf.setFontSize(size);
    const chunk = String(line || '').slice(0, 95);
    pdf.text(chunk, 200, y, { align: 'right' });
    y += size * 0.55 + 2;
    if (y > 280) {
      pdf.addPage();
      y = 16;
    }
  };

  // Header bar approximation
  pdf.setFillColor(0, 108, 53);
  pdf.rect(10, 8, 190, 10, 'F');
  pdf.setTextColor(255, 255, 255);
  write('Bismillah / Official letter', 12);
  pdf.setTextColor(0, 0, 0);
  y += 4;
  write(`Court: Labor Court Riyadh`);
  write(`Number: ${doc.number || '-'}`);
  write(`Date: ${doc.dateGregorian || '-'}`);
  write(`To: ${doc.recipients || '-'}`);
  write(`Subject: ${doc.subject || '-'}`);
  y += 2;
  for (const line of (doc.body || '').split('\n').slice(0, 45)) {
    write(line || ' ', 10);
  }
  y += 4;
  write(doc.footer || 'Internal use only', 9);
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

    const letterhead = await prisma.letterhead.findFirst({ where: { name: 'default' } }).catch(() => null);
    let qrDataUrl: string | null = null;
    let studySections: import('@/lib/parse-study').StudySections | null = null;
    let style: { fontFamily?: string; fontSizePt?: number } | null = null;
    try {
      const fields = JSON.parse(doc.fieldsJson || '{}') as {
        qrDataUrl?: string;
        studySections?: import('@/lib/parse-study').StudySections;
        style?: { fontFamily?: string; fontSizePt?: number };
      };
      qrDataUrl = fields.qrDataUrl || null;
      studySections = fields.studySections || null;
      style = fields.style || null;
    } catch {
      qrDataUrl = null;
    }

    const headerLines = (letterhead?.header || 'المملكة العربية السعودية\nوزارة العدل\nالمحكمة العمالية بالرياض')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

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
        fontFamily: style?.fontFamily,
        fontSizePt: style?.fontSizePt,
      },
      { forPdf: true },
    );

    let buffer = await pdfViaChromium(html);
    if (!buffer || buffer.length < 100) {
      buffer = pdfViaJsPdf({
        number: doc.number,
        subject: doc.subject,
        dateGregorian: doc.dateGregorian,
        recipients: doc.recipients,
        body: doc.body,
        footer: letterhead?.footer || 'للاستخدام الداخلي فقط',
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
