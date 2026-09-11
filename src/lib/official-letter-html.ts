/** Shared official MOJ letter HTML — used by PDF export and previews */

import type { StudySections } from '@/lib/parse-study';
import { officialDateDisplay } from '@/lib/hijri';
import {
  IDENTITY_COLORS,
  normalizePaperLayout,
  type PaperLayoutId,
} from '@/lib/paper-layouts';

export type OfficialLetterDoc = {
  number?: string | null;
  subject?: string | null;
  dateGregorian?: string | null;
  dateHijri?: string | null;
  recipients?: string | null;
  parties?: string | null;
  facts?: string | null;
  reasons?: string | null;
  studyFields?: string | null;
  body?: string | null;
  docType?: string | null;
  footer?: string | null;
  qrDataUrl?: string | null;
  courtName?: string | null;
  headerLines?: string[] | null;
  studySections?: StudySections | null;
  fontFamily?: string | null;
  fontSizePt?: number | null;
  paperLayout?: PaperLayoutId | string | null;
};

const GREEN = '#006C35';
const GOLD = '#C5A059';

function esc(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pre(s: string) {
  return esc(s).replace(/\n/g, '<br/>');
}

function kv(label: string, value?: string) {
  if (!value) return '';
  return `<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid ${GREEN}22"><b style="color:${GREEN};min-width:7rem">${esc(label)}</b><span>${esc(value)}</span></div>`;
}

function studyHtml(s: StudySections) {
  return `
  <div style="border:1px solid ${GREEN};border-radius:8px;overflow:hidden;margin:8px 0">
    <div style="background:${GREEN};color:#fff;text-align:center;font-weight:700;padding:6px;font-size:12px">بيانات القضية</div>
    <div style="padding:8px">
      ${kv('رقم القضية', s.caseNumber)}
      ${kv('رقم الصك', s.deedNumber)}
      ${kv('التشكيل', s.formation)}
      ${kv('المدعي/ة', s.plaintiff)}
      ${kv('المدعى عليه/ا', s.defendant)}
      ${kv('الاختصاص النوعي', s.jurisdiction)}
      ${kv('مقدار المطالبة', s.claimAmount)}
      ${kv('دارس القضية', s.researcher)}
    </div>
  </div>
  ${
    s.summaryPlaintiff || s.summaryDefendant
      ? `<div style="border:1px solid ${GREEN};border-radius:8px;overflow:hidden;margin:8px 0">
    <div style="background:${GREEN};color:#fff;text-align:center;font-weight:700;padding:6px;font-size:12px">ملخص الدعوى</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
      <div style="padding:8px;border-left:1px solid ${GREEN}33"><div style="color:${GOLD};font-weight:700;font-size:11px;margin-bottom:4px">دعوى المدعي</div>${pre(s.summaryPlaintiff || '—')}</div>
      <div style="padding:8px"><div style="color:${GOLD};font-weight:700;font-size:11px;margin-bottom:4px">إجابة المدعى عليه</div>${pre(s.summaryDefendant || '—')}</div>
    </div>
  </div>`
      : ''
  }
  <div style="border:1px solid ${GOLD};border-radius:8px;overflow:hidden;margin:8px 0">
    <div style="background:${GOLD};color:#fff;text-align:center;font-weight:700;padding:6px;font-size:12px">الخلاصة</div>
    <div style="padding:8px">
      ${kv('المشكلة', s.problem)}
      ${kv('الرأي القانوني', s.legalOpinion)}
      ${kv('التوصية', s.recommendation)}
      ${kv('معد الدراسة', s.preparer || s.researcher)}
    </div>
  </div>`;
}

/** Inline abstract emblem (no external fetch needed for PDF) */
const EMBLEM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 96 96"><circle cx="48" cy="48" r="44" fill="#fff" stroke="${GOLD}" stroke-width="3"/><rect x="42" y="28" width="12" height="36" rx="2" fill="${GREEN}"/><rect x="36" y="24" width="24" height="6" rx="1.5" fill="${GOLD}"/><rect x="34" y="64" width="28" height="6" rx="1.5" fill="${GOLD}"/><rect x="18" y="34" width="60" height="3" rx="1.5" fill="${GOLD}"/><line x1="26" y1="35.5" x2="26" y2="48" stroke="${GREEN}" stroke-width="1.5"/><path d="M18 48 Q26 56 34 48 Z" fill="${GREEN}" opacity="0.85"/><line x1="70" y1="35.5" x2="70" y2="48" stroke="${GREEN}" stroke-width="1.5"/><path d="M62 48 Q70 56 78 48 Z" fill="${GREEN}" opacity="0.85"/><circle cx="48" cy="32" r="3.5" fill="${GOLD}"/></svg>`;

function geometricFooterSvg(variant: 'a' | 'b') {
  const g = IDENTITY_COLORS.green;
  const gold = IDENTITY_COLORS.gold;
  const teal = IDENTITY_COLORS.teal;
  if (variant === 'a') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="48" viewBox="0 0 600 48" preserveAspectRatio="none" aria-hidden="true">
      <rect width="600" height="48" fill="${IDENTITY_COLORS.creamDeep}"/>
      <path d="M0 48 L40 0 L80 48 Z" fill="${g}" opacity="0.35"/>
      <path d="M60 48 L100 8 L140 48 Z" fill="${gold}" opacity="0.55"/>
      <path d="M120 48 L160 0 L200 48 Z" fill="${g}" opacity="0.28"/>
      <path d="M220 48 L260 12 L300 48 Z" fill="${gold}" opacity="0.45"/>
      <path d="M320 48 L360 0 L400 48 Z" fill="${g}" opacity="0.32"/>
      <path d="M400 48 L440 10 L480 48 Z" fill="${gold}" opacity="0.5"/>
      <path d="M500 48 L540 4 L580 48 Z" fill="${g}" opacity="0.3"/>
      <rect y="44" width="600" height="4" fill="${gold}"/>
    </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="40" viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden="true">
    <rect width="600" height="40" fill="${teal}"/>
    <path d="M0 40 L50 5 L100 40 L150 8 L200 40 L250 5 L300 40 L350 10 L400 40 L450 6 L500 40 L550 12 L600 40 Z" fill="${gold}" opacity="0.35"/>
    <rect y="0" width="600" height="3" fill="${gold}"/>
  </svg>`;
}

function layoutTheme(layout: PaperLayoutId) {
  switch (layout) {
    case 'formal-gold':
      return {
        paperBg: '#fff',
        paperBorder: `2px solid ${GOLD}`,
        bismillah: `background:linear-gradient(90deg,#8a6b2e,${GOLD},#8a6b2e);border-bottom:3px solid ${GREEN};`,
        meta: `background:#fffaf0;border:2px solid ${GOLD};border-radius:8px;`,
        foot: `border-top:2px solid ${GOLD};background:#fff8e8;`,
        extraChrome: '',
      };
    case 'compact-memo':
      return {
        paperBg: '#fff',
        paperBorder: `1px solid ${GREEN}`,
        bismillah: `background:${GREEN};border-bottom:2px solid ${GOLD};`,
        meta: `background:#f3f7f4;border:1px solid ${GREEN}66;border-radius:4px;`,
        foot: `border-top:1px solid ${GOLD};background:#fff;`,
        extraChrome: '',
      };
    case 'taameem-circular':
      return {
        paperBg: '#fff',
        paperBorder: `2px solid ${GREEN}`,
        bismillah: `background:#004d26;border-bottom:3px solid ${GOLD};`,
        meta: `background:#E6F2EB;border:1px solid ${GREEN};border-radius:999px;`,
        foot: `border-top:2px solid ${GOLD};background:#f0f7f3;`,
        extraChrome: '',
      };
    case 'study-report':
      return {
        paperBg: '#fff',
        paperBorder: `2px solid ${GREEN}`,
        bismillah: `background:${GREEN};border-bottom:3px solid ${GOLD};`,
        meta: `background:#fff;border-top:2px solid ${GREEN};border-bottom:2px solid ${GREEN};border-radius:0;`,
        foot: `border-top:4px double ${GOLD};background:#fafcfb;`,
        extraChrome: '',
      };
    case 'identity-service-a':
      return {
        paperBg: IDENTITY_COLORS.cream,
        paperBorder: `2px solid ${IDENTITY_COLORS.gold}`,
        bismillah: `background:${IDENTITY_COLORS.green};border-bottom:3px solid ${IDENTITY_COLORS.gold};`,
        meta: `background:#fff;border:1px solid ${IDENTITY_COLORS.beige};border-radius:8px;box-shadow:0 0 0 1px ${IDENTITY_COLORS.gold}33;`,
        foot: `border-top:none;background:transparent;padding:0;`,
        extraChrome: `<div style="line-height:0">${geometricFooterSvg('a')}</div>`,
      };
    case 'identity-service-b':
      return {
        paperBg: '#fff',
        paperBorder: `2px solid ${IDENTITY_COLORS.teal}`,
        bismillah: `background:linear-gradient(90deg,${IDENTITY_COLORS.greenDeep},${IDENTITY_COLORS.tealBand},${IDENTITY_COLORS.green});border-bottom:4px solid ${IDENTITY_COLORS.gold};`,
        meta: `background:#F0F7F4;border:1px solid ${IDENTITY_COLORS.teal}55;border-radius:6px;`,
        foot: `border-top:none;background:transparent;padding:0;`,
        extraChrome: `<div style="line-height:0">${geometricFooterSvg('b')}</div>`,
      };
    default:
      return {
        paperBg: '#fff',
        paperBorder: `2px solid ${GREEN}`,
        bismillah: `background:${GREEN};border-bottom:3px solid ${GOLD};`,
        meta: `background:#E6F2EB;border:1px solid ${GREEN};border-radius:8px;`,
        foot: `border-top:2px solid ${GOLD};background:#fafcfb;`,
        extraChrome: '',
      };
  }
}

export function buildOfficialLetterHtml(doc: OfficialLetterDoc, opts?: { forPdf?: boolean; embeddedFontCss?: string }) {
  const layout = normalizePaperLayout(doc.paperLayout);
  const theme = layoutTheme(layout);
  const court = doc.courtName || 'المحكمة العمالية بالرياض';
  const header =
    doc.headerLines?.filter(Boolean) ||
    ['المملكة العربية السعودية', 'وزارة العدل', court];
  const footer = doc.footer || 'للاستخدام الداخلي فقط';
  const pageCss = opts?.forPdf
    ? `@page { size: A4; margin: 12mm; } body { margin: 0; }`
    : '';
  const font = doc.fontFamily || "'Noto Naskh Arabic', 'Traditional Arabic', 'Sakkal Majalla', Tahoma, serif";
  const size = doc.fontSizePt || 14;
  const fontFace =
    opts?.embeddedFontCss ||
    (opts?.forPdf
      ? `@font-face {
  font-family: 'Noto Naskh Arabic';
  font-style: normal;
  font-weight: 400;
  src: url('/fonts/NotoNaskhArabic-Regular.ttf') format('truetype');
  font-display: block;
}`
      : `@import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap');`);

  const qr = doc.qrDataUrl
    ? `<img src="${esc(doc.qrDataUrl)}" alt="QR" style="width:72px;height:72px;border:1px solid ${GOLD};border-radius:6px;background:#fff" />`
    : `<div style="width:72px;height:72px;border:1px dashed ${GOLD};border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:${GREEN};background:#fff">QR</div>`;

  const emblem = `<div style="width:64px;height:64px;border:1.5px solid ${GOLD};border-radius:12px;background:#fff;overflow:hidden;display:flex;align-items:center;justify-content:center">${EMBLEM_SVG}</div>`;

  const hasStudy =
    doc.studySections &&
    (doc.studySections.caseNumber || doc.studySections.plaintiff || doc.studySections.recommendation);

  // RTL row: first = RIGHT (emblem), center text, last = LEFT (QR)
  const brandRow = `
  <div class="brand-row" dir="rtl">
    <div style="flex-shrink:0">${emblem}${layout === 'taameem-circular' ? `<div style="text-align:center;font-size:9px;font-weight:700;color:${GREEN};border:1px solid ${GOLD};border-radius:999px;margin-top:4px;padding:1px 6px">تعميم</div>` : ''}</div>
    <div class="brand-center">
      ${header
        .map(
          (h, i) =>
            `<div class="court" style="font-size:${h === court || i === header.length - 1 ? 16 : 13}px">${esc(h)}</div>`,
        )
        .join('')}
      <div class="sub">منصة ركيزة الذكية</div>
    </div>
    <div style="flex-shrink:0">${qr}</div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<style>
${fontFace}
${pageCss}
* { box-sizing: border-box; }
body {
  font-family: ${font};
  color: #111;
  background: #fff;
  font-size: ${size}px;
  line-height: 1.85;
}
.paper {
  max-width: 210mm;
  margin: 0 auto;
  border: ${theme.paperBorder};
  border-radius: 4px;
  overflow: hidden;
  background: ${theme.paperBg};
}
.bismillah {
  color: #fff;
  text-align: center;
  font-weight: 700;
  padding: 8px 12px;
  font-size: 15px;
  ${theme.bismillah}
}
.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px 10px;
  border-bottom: 2px solid ${GOLD};
  direction: rtl;
}
.brand-center { text-align: center; flex: 1; min-width: 0; }
.brand-center .court { color: ${GREEN}; font-weight: 800; font-size: 16px; }
.brand-center .sub { color: ${GOLD}; font-size: 12px; margin-top: 2px; }
.meta {
  margin: 14px 18px;
  padding: 10px 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
  font-size: 13px;
  ${theme.meta}
}
.meta .label { color: ${GREEN}; font-weight: 700; }
.section { padding: 4px 18px 10px; }
.section h3 {
  margin: 12px 0 6px;
  color: ${GREEN};
  font-size: 13px;
  border-bottom: 1px solid ${GOLD};
  padding-bottom: 2px;
}
.body { white-space: pre-wrap; text-align: justify; }
.foot {
  margin-top: 18px;
  padding: 10px 18px;
  text-align: center;
  color: #555;
  font-size: 11px;
  ${theme.foot}
}
</style>
</head>
<body>
<div class="paper" data-paper-layout="${esc(layout)}">
  <div class="bismillah">بسم الله الرحمن الرحيم</div>
  ${brandRow}
  <div class="meta">
    <div><span class="label">الرقم:</span> <span dir="ltr">${esc(doc.number || '—')}</span></div>
    <div><span class="label">التاريخ:</span> ${esc(officialDateDisplay(doc.dateHijri, doc.dateGregorian))}</div>
    <div style="grid-column:1/-1"><span class="label">إلى:</span> ${esc(doc.recipients || '—')}</div>
    <div style="grid-column:1/-1"><span class="label">الموضوع:</span> ${esc(doc.subject || '—')}</div>
  </div>
  <div class="section">
    ${hasStudy && doc.studySections ? studyHtml(doc.studySections) : ''}
    ${
      !hasStudy && doc.parties
        ? `<h3>الأطراف</h3><div class="body">${pre(doc.parties)}</div>`
        : ''
    }
    ${
      !hasStudy && doc.reasons
        ? `<h3>الأسباب</h3><div class="body">${pre(doc.reasons)}</div>`
        : ''
    }
    ${
      !hasStudy && doc.body
        ? `<h3>النص</h3><div class="body">${pre(String(doc.body).trim())}</div>`
        : ''
    }
    ${
      !hasStudy && doc.studyFields
        ? `<h3>الدراسة</h3><div class="body">${pre(doc.studyFields)}</div>`
        : ''
    }
  </div>
  <div class="foot">${theme.extraChrome ? theme.extraChrome + `<div style="padding:8px 18px;text-align:center;color:#555;font-size:11px">${esc(footer)}</div>` : esc(footer)}</div>
</div>
</body>
</html>`;
}
