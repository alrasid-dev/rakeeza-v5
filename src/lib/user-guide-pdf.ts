/**
 * First-time user guide PDF for ركيزة (dark theme + gold accents + QR).
 * Logical Arabic only — same approach as export/pdf jsPDF fallback.
 */
import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { BRAND } from '@/lib/brand';
import { loadEmblemPng } from '@/lib/brand-assets';
import { wrapArabicLines } from '@/lib/arabic-pdf-text';

export const GUIDE_LOGIN_URL = 'https://rakeza-moj-assistant.vercel.app/login';
export const GUIDE_PDF_FILENAME = 'Rakiza_User_Guide.pdf';

const COLORS = {
  bg: [10, 18, 16] as [number, number, number],
  panel: [18, 36, 30] as [number, number, number],
  green: [0, 108, 53] as [number, number, number],
  gold: [197, 160, 89] as [number, number, number],
  white: [245, 248, 246] as [number, number, number],
  muted: [170, 185, 178] as [number, number, number],
};

function loadArabicFontBase64(): string {
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoNaskhArabic-Regular.ttf');
  if (!fs.existsSync(fontPath)) {
    throw new Error('Arabic font missing: public/fonts/NotoNaskhArabic-Regular.ttf');
  }
  return fs.readFileSync(fontPath).toString('base64');
}

function paintPageBackground(pdf: jsPDF, pageW: number, pageH: number) {
  pdf.setFillColor(...COLORS.bg);
  pdf.rect(0, 0, pageW, pageH, 'F');
  // Left gold accent strip
  pdf.setFillColor(...COLORS.gold);
  pdf.rect(0, 0, 3.5, pageH, 'F');
  // Top green bar
  pdf.setFillColor(...COLORS.green);
  pdf.rect(0, 0, pageW, 8, 'F');
  pdf.setFillColor(...COLORS.gold);
  pdf.rect(0, 8, pageW, 1.2, 'F');
}

export async function generateUserGuidePdf(): Promise<Buffer> {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const fontB64 = loadArabicFontBase64();
  pdf.addFileToVFS('NotoNaskhArabic-Regular.ttf', fontB64);
  pdf.addFont('NotoNaskhArabic-Regular.ttf', 'NotoNaskhArabic', 'normal');
  pdf.setFont('NotoNaskhArabic');

  const pageW = 210;
  const pageH = 297;
  const marginR = 16;
  const marginL = 16;
  const xRight = pageW - marginR;
  const contentW = pageW - marginL - marginR;
  let y = 18;

  paintPageBackground(pdf, pageW, pageH);

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 18) {
      pdf.addPage();
      paintPageBackground(pdf, pageW, pageH);
      pdf.setFont('NotoNaskhArabic', 'normal');
      y = 20;
    }
  };

  const writeAr = (
    line: string,
    size = 12,
    color: [number, number, number] = COLORS.white,
    align: 'right' | 'center' | 'left' = 'right',
  ) => {
    pdf.setFont('NotoNaskhArabic', 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const chunk = String(line ?? '').slice(0, 140) || ' ';
    const x = align === 'center' ? pageW / 2 : align === 'left' ? marginL : xRight;
    pdf.text(chunk, x, y, { align });
    y += size * 0.42 + 2.4;
  };

  // —— Header: emblem + titles ——
  try {
    const emblem = loadEmblemPng();
    pdf.addImage(emblem.toString('base64'), 'PNG', pageW / 2 - 14, 14, 28, 28);
  } catch {
    /* ignore */
  }
  y = 48;
  writeAr(BRAND.kingdom, 11, COLORS.gold, 'center');
  writeAr(BRAND.ministry, 12, COLORS.white, 'center');
  writeAr(BRAND.court, 11, COLORS.muted, 'center');
  y += 2;
  writeAr(BRAND.platform, 14, COLORS.gold, 'center');
  writeAr('دليل الاستخدام لأول مرة', 13, COLORS.white, 'center');
  y += 3;

  // Gold divider
  pdf.setDrawColor(...COLORS.gold);
  pdf.setLineWidth(0.4);
  pdf.line(marginL + 20, y, pageW - marginR - 20, y);
  y += 8;

  // —— Summary panel ——
  ensureSpace(42);
  const summaryTop = y - 2;
  pdf.setFillColor(...COLORS.panel);
  pdf.roundedRect(marginL, summaryTop, contentW, 38, 3, 3, 'F');
  pdf.setDrawColor(...COLORS.gold);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(marginL, summaryTop, contentW, 38, 3, 3, 'S');
  y = summaryTop + 8;
  writeAr('نبذة عن المنصة', 12, COLORS.gold, 'right');
  for (const line of wrapArabicLines(
    'منصة ركيزة: منصة إدارية وقضائية مؤتمتة لتنظيم وتتبع سائر المعاملات والتكاليف بين جميع القيادات والوحدات التنظيمية بالمحكمة العمالية بالرياض.',
    62,
  )) {
    writeAr(line, 9.5, COLORS.white, 'right');
  }
  y += 1;
  for (const line of wrapArabicLines(
    'الهدف: أتمتة تدفق العمليات، حوكمة تسلسل الصلاحيات والهيكل التنظيمي، وتسريع إنجاز المهام مع رفع مستويات الشفافية ومراقبة الأداء.',
    62,
  )) {
    writeAr(line, 9.5, COLORS.muted, 'right');
  }
  y = summaryTop + 42;

  // —— First-time steps ——
  ensureSpace(90);
  writeAr('خطوات البدء لأول مرة', 13, COLORS.gold, 'right');
  y += 2;

  const steps: { n: string; title: string; body: string }[] = [
    {
      n: '١',
      title: 'تسجيل الدخول',
      body: 'تسجيل الدخول عبر البريد المؤسسي @moj.gov.sa للوصول التلقائي للوحدة التنظيمية.',
    },
    {
      n: '٢',
      title: 'استكشاف لوحة التحكم والهيكل',
      body: 'استكشاف لوحة التحكم والهيكل: مساحة العمل، المهام المسندة، الوحدة التنظيمية.',
    },
    {
      n: '٣',
      title: 'إدارة المهام والتكاليف',
      body: 'إدارة المهام والتكاليف: إسناد التكاليف، متابعة الإنجاز، تحديث التنبيهات.',
    },
    {
      n: '٤',
      title: 'قائمة إدارة القسم',
      body: 'قائمة إدارة القسم (للمدراء/رؤساء الأقسام): أداء الموظفين، الصلاحيات، التقارير الدورية.',
    },
  ];

  for (const step of steps) {
    ensureSpace(28);
    const boxH = 24;
    const boxTop = y;
    pdf.setFillColor(...COLORS.panel);
    pdf.roundedRect(marginL, boxTop, contentW, boxH, 2.5, 2.5, 'F');
    // Number circle
    pdf.setFillColor(...COLORS.green);
    pdf.circle(xRight - 5, boxTop + 7, 4.2, 'F');
    pdf.setTextColor(...COLORS.gold);
    pdf.setFontSize(11);
    pdf.text(step.n, xRight - 5, boxTop + 8.5, { align: 'center' });

    y = boxTop + 7;
    pdf.setFont('NotoNaskhArabic', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(...COLORS.gold);
    pdf.text(step.title, xRight - 12, y, { align: 'right' });
    y += 5;
    for (const line of wrapArabicLines(step.body, 58)) {
      pdf.setFontSize(9);
      pdf.setTextColor(...COLORS.white);
      pdf.text(line, xRight - 12, y, { align: 'right' });
      y += 4.2;
    }
    y = boxTop + boxH + 4;
  }

  // —— Login CTA + QR ——
  ensureSpace(70);
  y += 2;
  writeAr('الوصول السريع', 13, COLORS.gold, 'right');
  y += 2;

  const ctaTop = y;
  const ctaH = 52;
  pdf.setFillColor(...COLORS.panel);
  pdf.roundedRect(marginL, ctaTop, contentW, ctaH, 3, 3, 'F');
  pdf.setDrawColor(...COLORS.gold);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(marginL, ctaTop, contentW, ctaH, 3, 3, 'S');

  // QR on the left side of the panel
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(GUIDE_LOGIN_URL, {
      margin: 1,
      width: 220,
      errorCorrectionLevel: 'M',
      color: { dark: '#006C35', light: '#FFFFFF' },
    });
  } catch {
    qrDataUrl = null;
  }

  if (qrDataUrl) {
    const m = qrDataUrl.match(/^data:image\/\w+;base64,(.+)$/);
    if (m) {
      pdf.addImage(m[1], 'PNG', marginL + 6, ctaTop + 8, 36, 36);
      // Clickable region over QR
      pdf.link(marginL + 6, ctaTop + 8, 36, 36, { url: GUIDE_LOGIN_URL });
    }
  }

  // CTA button (right side)
  const btnW = 58;
  const btnH = 12;
  const btnX = xRight - btnW;
  const btnY = ctaTop + 14;
  pdf.setFillColor(...COLORS.green);
  pdf.roundedRect(btnX, btnY, btnW, btnH, 2, 2, 'F');
  pdf.setDrawColor(...COLORS.gold);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(btnX, btnY, btnW, btnH, 2, 2, 'S');
  pdf.setFont('NotoNaskhArabic', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(...COLORS.gold);
  pdf.text('تسجيل الدخول الآن', btnX + btnW / 2, btnY + 8, { align: 'center' });
  pdf.link(btnX, btnY, btnW, btnH, { url: GUIDE_LOGIN_URL });

  pdf.setFontSize(8.5);
  pdf.setTextColor(...COLORS.muted);
  pdf.text(GUIDE_LOGIN_URL, btnX + btnW / 2, btnY + 18, { align: 'center' });
  // Also make the URL text a link
  pdf.link(btnX - 10, btnY + 14, btnW + 20, 6, { url: GUIDE_LOGIN_URL });

  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.white);
  pdf.text('امسح رمز الاستجابة السريعة أو اضغط الزر للدخول', xRight - 2, ctaTop + 42, {
    align: 'right',
  });

  y = ctaTop + ctaH + 10;

  // Footer
  ensureSpace(16);
  pdf.setDrawColor(...COLORS.gold);
  pdf.setLineWidth(0.3);
  pdf.line(marginL + 10, y, pageW - marginR - 10, y);
  y += 6;
  writeAr(BRAND.footer + ' · ' + BRAND.court, 8.5, COLORS.muted, 'center');
  writeAr('ركيزة v5 — وزارة العدل', 8, COLORS.gold, 'center');

  return Buffer.from(pdf.output('arraybuffer'));
}
