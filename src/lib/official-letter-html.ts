/** Shared official MOJ letter HTML — used by PDF export and previews */

import type { StudySections } from '@/lib/parse-study';
import { officialDateDisplay } from '@/lib/hijri';
import {
  IDENTITY_COLORS,
  normalizePaperLayout,
  type PaperLayoutId,
} from '@/lib/paper-layouts';
import { MOJ_EMBLEM_PNG_DATA_URL } from '@/lib/brand-emblem-data';
import { researcherRoleLabel, preparerRoleLabel } from '@/lib/honorific';
import { formatClaimAmount, normalizeFormationOrdinal } from '@/lib/arabic-normalize';
import { enrichStudySections, hasStudyContent, studyDisplayMeta } from '@/lib/study-display';
import { BRAND } from '@/lib/brand';
import { fontStackFor } from '@/lib/font-stacks';
import {
  buildJudgmentBriefingBlockHtml,
  isJudgmentBriefingDoc,
} from '@/lib/judgment-card';

export type OfficialLetterDoc = {
  number?: string | null;
  subject?: string | null;
  dateGregorian?: string | null;
  dateHijri?: string | null;
  recipients?: string | null;
  copyTo?: string | null;
  attachments?: string | null;
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
  judgmentCard?: { label: string; value: string }[] | null;
  /** Explicit judgment-briefing mode */
  judgmentBriefing?: boolean | null;
  briefingTitle?: string | null;
  observationText?: string | null;
  mechanismText?: string | null;
  judgmentPriority?: string | null;
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

function partyBar(label: string, value: string | undefined, tone: 'plaintiff' | 'defendant') {
  if (!value) return '';
  const bg = tone === 'plaintiff' ? '#E6F2EB' : '#FFF8E8';
  const bd = tone === 'plaintiff' ? GREEN : GOLD;
  const fg = tone === 'plaintiff' ? GREEN : '#8a6b2e';
  return `<div style="background:${bg};border:2px solid ${bd};border-radius:6px;padding:8px 10px;margin:6px 0;display:flex;gap:10px;align-items:flex-start">
    <b style="color:${fg};min-width:6.5rem;font-size:12px">${esc(label)}</b>
    <span style="flex:1;font-weight:600">${esc(value)}</span>
  </div>`;
}

function studyHtml(s: StudySections) {
  const formation = normalizeFormationOrdinal(s.formation) || s.formation;
  const amount = formatClaimAmount(s.claimAmount) || s.claimAmount;
  const amountHtml = amount
    ? `<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid ${GREEN}22"><b style="color:${GREEN};min-width:7rem">مقدار المطالبة</b><span dir="ltr" style="unicode-bidi:embed;font-weight:600">${esc(amount)}</span></div>`
    : '';
  return `
  <div style="border:1px solid ${GREEN};border-radius:8px;overflow:hidden;margin:8px 0">
    <div style="background:${GREEN};color:#fff;text-align:center;font-weight:700;padding:6px;font-size:12px">بيانات القضية</div>
    <div style="padding:8px">
      ${kv('رقم القضية', s.caseNumber)}
      ${kv('رقم الصك', s.deedNumber)}
      ${kv('التشكيل', formation)}
      ${kv('الاختصاص النوعي', s.jurisdiction)}
      ${amountHtml}
      ${kv(researcherRoleLabel(s.researcher), s.researcher)}
      ${partyBar('المدعي/ة', s.plaintiff, 'plaintiff')}
      ${partyBar('المدعى عليه/ا', s.defendant, 'defendant')}
    </div>
  </div>
  ${
    s.summaryPlaintiff || s.summaryDefendant
      ? `<div style="border:1px solid ${GREEN};border-radius:8px;overflow:hidden;margin:8px 0">
    <div style="background:${GREEN};color:#fff;text-align:center;font-weight:700;padding:6px;font-size:12px">ملخص الدعوى</div>
    <div style="padding:8px">
      <div style="margin-bottom:8px;padding:8px;border:1px solid ${GREEN}44;border-radius:6px;background:#f7faf8"><div style="color:${GOLD};font-weight:700;font-size:11px;margin-bottom:4px">دعوى المدعي</div>${pre(s.summaryPlaintiff || '—')}</div>
      <div style="padding:8px;border:1px solid ${GOLD}66;border-radius:6px;background:#fffaf0"><div style="color:${GOLD};font-weight:700;font-size:11px;margin-bottom:4px">إجابة المدعى عليه</div>${pre(s.summaryDefendant || '—')}</div>
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
      ${kv(researcherRoleLabel(s.researcher), s.researcher)}
      ${kv(preparerRoleLabel(s.preparer), s.preparer)}
    </div>
  </div>`;
}

/** Always embed MOJ logo as data URL so PDF/DOCX/print never fall back to old icon */
const EMBLEM_IMG = `<img src="${MOJ_EMBLEM_PNG_DATA_URL}" alt="شعار وزارة العدل" width="72" height="72" style="width:72px;height:72px;object-fit:contain;display:block" />`;
const EMBLEM_IMG_FILE = EMBLEM_IMG;

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
    case 'modern-hex':
      return {
        paperBg: '#F9F7F1',
        paperBorder: `2px solid ${IDENTITY_COLORS.gold}`,
        bismillah: `background:${IDENTITY_COLORS.greenDeep};border-bottom:3px solid ${IDENTITY_COLORS.gold};text-align:right;padding-inline:20px;`,
        meta: `background:#fff;border:1px solid ${IDENTITY_COLORS.gold}55;border-radius:8px;`,
        foot: `border-top:3px solid ${IDENTITY_COLORS.gold};background:#1B4332;color:#f5f5f5;`,
        modernHex: true,
        extraChrome: `<div style="position:relative;line-height:0;height:36px;background:#1B4332">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="36" viewBox="0 0 80 36" style="position:absolute;left:4px;bottom:0;opacity:0.55" aria-hidden="true">
            <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="${IDENTITY_COLORS.gold}" opacity="0.45"/>
            <polygon points="44,6 56,13 56,27 44,34 32,27 32,13" fill="none" stroke="${IDENTITY_COLORS.gold}" stroke-width="1.2"/>
          </svg>
        </div>`,
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


function judgmentBriefingHtml(
  doc: OfficialLetterDoc,
  rows: { label: string; value: string }[],
) {
  return buildJudgmentBriefingBlockHtml({
    recipients: doc.recipients,
    card: rows,
    title: doc.briefingTitle || 'بطاقة عرض',
    green: GREEN,
    observationText: doc.observationText,
    mechanismText: doc.mechanismText,
  });
}

export function buildOfficialLetterHtml(doc: OfficialLetterDoc, opts?: { forPdf?: boolean; embeddedFontCss?: string }) {
  const layout = normalizePaperLayout(doc.paperLayout);
  const theme = layoutTheme(layout);
  const court = doc.courtName || 'المحكمة العمالية بالرياض';
  const header =
    doc.headerLines?.filter(Boolean) ||
    ['المملكة العربية السعودية', 'وزارة العدل', court];
  const footer = doc.footer || 'للاستخدام الداخلي فقط';
  const font = fontStackFor(doc.fontFamily);
  const size = doc.fontSizePt || 14;
  const pageCss = opts?.forPdf
    ? `@page { size: A4; margin: 12mm; }
body { margin: 0; color: #111; }
.paper, .paper *:not(img):not(svg):not(svg *) { font-family: ${font} !important; font-weight: 400 !important; }
.paper { color: #111 !important; }
.bismillah, .bismillah * { color: #fff !important; font-weight: 400 !important; }`
    : '';
  const fontFace =
    opts?.embeddedFontCss ||
    (opts?.forPdf
      ? `@font-face {
  font-family: 'Noto Naskh Arabic';
  font-style: normal;
  font-weight: 100 900;
  src: url('/fonts/NotoNaskhArabic-Regular.ttf') format('truetype');
  font-display: block;
}`
      : `@import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap');`);

  const qr = doc.qrDataUrl
    ? `<img src="${esc(doc.qrDataUrl)}" alt="QR" style="width:72px;height:72px;border:1px solid ${GOLD};border-radius:6px;background:#fff;display:block" />`
    : `<div style="width:72px;height:72px;border:1px dashed ${GOLD};border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:${GREEN};background:#fff">QR</div>`;

  const emblemInner = opts?.forPdf ? EMBLEM_IMG : EMBLEM_IMG_FILE;
  const emblem = `<div style="width:64px;height:64px;border:1.5px solid ${GOLD};border-radius:12px;background:#fff;overflow:hidden;display:flex;align-items:center;justify-content:center">${emblemInner}</div>`;

  const study = doc.studySections
    ? enrichStudySections(doc.studySections, {
        subject: doc.subject,
        parties: doc.parties,
        reasons: doc.reasons,
        studyFields: doc.studyFields,
        body: doc.body,
        recipients: doc.recipients,
      })
    : null;
  const hasStudy = hasStudyContent(study);
  const isBriefing =
    !hasStudy &&
    isJudgmentBriefingDoc({
      judgmentBriefing: doc.judgmentBriefing,
      judgmentCard: doc.judgmentCard,
      studySections: doc.studySections,
    });
  const isUrgent = isBriefing && doc.judgmentPriority === 'عاجل';
  const underLogoLabel = isBriefing
    ? (String(doc.briefingTitle || '').trim() || 'بطاقة عرض')
    : '';
  const meta = studyDisplayMeta(study, { subject: doc.subject, recipients: doc.recipients });
  const previewSubject =
    (doc.subject && doc.subject.trim() && doc.subject.trim() !== '—')
      ? doc.subject
      : meta.subject || (study?.caseNumber ? `دراسة شكوى — ${study.caseNumber}` : '') || '—';

  const hexDecor = layout === 'modern-hex'
    ? `<div style="position:absolute;inset:0;pointer-events:none;overflow:hidden" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 280" width="55%" height="70%" style="position:absolute;left:0;top:40px;opacity:0.22">
          <g stroke="${GREEN}" stroke-width="1.4" fill="none">
            <polygon points="48,20 88,42 88,86 48,108 8,86 8,42" fill="${GREEN}" fill-opacity="0.12"/>
            <polygon points="110,8 158,34 158,86 110,112 62,86 62,34" stroke="${GOLD}"/>
            <polygon points="170,50 210,72 210,116 170,138 130,116 130,72" fill="${GOLD}" fill-opacity="0.14" stroke="${GOLD}"/>
            <polygon points="70,120 118,146 118,198 70,224 22,198 22,146"/>
            <polygon points="140,140 188,166 188,218 140,244 92,218 92,166" fill="${GREEN}" fill-opacity="0.08" stroke="${GOLD}"/>
            <polygon points="220,100 255,120 255,160 220,180 185,160 185,120"/>
          </g>
          <g stroke="${GOLD}" stroke-width="1.1" fill="none" opacity="0.85">
            <path d="M250 40 L280 55 L280 90 L250 105 L220 90 L220 55 Z"/>
            <path d="M220 55 L250 40 L280 55"/>
            <path d="M250 40 L250 105"/>
          </g>
        </svg>
      </div>`
    : '';

  // Official Saudi letterhead (physical LTR): LEFT=QR, CENTER=emblem, RIGHT=kingdom/ministry/court
  // modern-hex: same official order on cream geometric chrome
  const hexText = `
          <div style="text-align:right;line-height:1.35;min-width:0" dir="rtl">
            <div class="court" style="font-size:12px;color:${GREEN};font-weight:700">${esc(BRAND.kingdom)}</div>
            <div class="court" style="font-size:12px;color:${GREEN};font-weight:700">${esc(BRAND.ministry)}</div>
            <div class="court" style="font-size:15px;color:${GREEN};font-weight:800;margin-top:2px">${esc(court)}</div>
            <div class="sub" style="color:${GOLD};font-size:11px;margin-top:2px">${esc(BRAND.platform)}</div>
          </div>`;
  const brandRow = layout === 'modern-hex'
    ? `<div style="position:relative;background:#F9F7F1">
  ${hexDecor}
  <table class="brand-row" dir="ltr" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="position:relative;z-index:1;border-collapse:collapse;border-bottom:1px solid ${GOLD}80;table-layout:fixed;background:transparent">
    <tr>
      <td width="33%" valign="middle" align="left" style="padding:14px 18px">${qr.replace('border:1px solid', 'border:1.5px dashed').replace('border:1px dashed', 'border:1.5px dashed')}</td>
      <td width="34%" valign="middle" align="center" style="padding:14px 8px">${emblem}${underLogoLabel ? `<div style="display:inline-block;margin-top:4px;font-size:10px;font-weight:800;color:${GREEN};border:1px solid ${GOLD};border-radius:999px;padding:2px 10px;background:#fff">${esc(underLogoLabel)}</div>` : ''}</td>
      <td width="33%" valign="middle" align="right" style="padding:14px 6px 14px 10px">${hexText}</td>
    </tr>
  </table>
</div>`
    : `
  <table class="brand-row" dir="ltr" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-bottom:2px solid ${GOLD};table-layout:fixed">
    <tr>
      <td width="33%" valign="middle" align="left" style="padding:14px 12px;width:33%">${qr}</td>
      <td width="34%" valign="middle" align="center" style="padding:14px 8px;width:34%">${emblem}${underLogoLabel ? `<div style="display:inline-block;margin-top:4px;font-size:10px;font-weight:800;color:${GREEN};border:1px solid ${GOLD};border-radius:999px;padding:2px 10px;background:#fff">${esc(underLogoLabel)}</div>` : (layout === 'taameem-circular' ? `<div style="display:inline-block;margin-top:4px;font-size:9px;font-weight:700;color:${GREEN};border:1px solid ${GOLD};border-radius:999px;padding:1px 8px">تعميم</div>` : '')}</td>
      <td width="33%" valign="middle" align="right" style="padding:14px 6px 14px 10px;width:33%" dir="rtl">
        ${header
          .map(
            (h, i) =>
              `<div class="court" style="font-size:${h === court || i === header.length - 1 ? 16 : 13}px;color:${GREEN};font-weight:800;text-align:right">${esc(h)}</div>`,
          )
          .join('')}
        <div class="sub" style="color:${GOLD};font-size:12px;margin-top:2px;text-align:right">${BRAND.platform}</div>
      </td>
    </tr>
  </table>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<style>
${fontFace}
${pageCss}
* { box-sizing: border-box; }
body {
  overflow-wrap: anywhere;
  word-break: break-word;
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
  font-family: ${font};
  position: relative;
}
.paper, .paper *:not(img):not(svg):not(svg *) {
  font-family: inherit;
}
.bismillah {
  color: #fff;
  text-align: center;
  font-weight: 700;
  padding: 8px 12px;
  font-size: 15px;
  ${theme.bismillah}
}
.brand-row { width: 100%; }
.brand-row .court { color: ${GREEN}; font-weight: 800; }
.brand-row .sub { color: ${GOLD}; font-size: 12px; margin-top: 2px; }
.meta {
  margin: 14px 18px;
  padding: 10px 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
  font-size: ${size}px;
  ${theme.meta}
}
.meta .label { color: ${GREEN}; font-weight: 700; }
.section { padding: 4px 18px 10px; overflow: hidden; max-width: 100%; overflow-wrap: anywhere; }
.section h3 {
  margin: 12px 0 6px;
  color: ${GREEN};
  font-size: 13px;
  border-bottom: 1px solid ${GOLD};
  padding-bottom: 2px;
}
.body { white-space: pre-wrap; text-align: justify; font-family: inherit; }
.foot {
  margin-top: 18px;
  padding: 10px 18px;
  text-align: center;
  color: #555;
  font-size: 11px;
  ${theme.foot}
}
@media print {
  .cc-row, .cc-icon { display: inline-block !important; visibility: visible !important; }
}
</style>
</head>
<body>
<div class="paper" data-paper-layout="${esc(layout)}">
  <div class="bismillah" style="position:relative">${isUrgent ? `<span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;gap:4px;background:#c00000;color:#fff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:999px">⚠ عاجل</span>` : ''}بسم الله الرحمن الرحيم</div>
  ${brandRow}
  <div class="meta">
    <div><span class="label">الرقم:</span> <span dir="ltr">${esc(doc.number || '—')}</span></div>
    <div><span class="label">التاريخ:</span> ${esc(officialDateDisplay(doc.dateHijri, doc.dateGregorian))}</div>
    <div style="grid-column:1/-1"><span class="label">إلى:</span> ${esc(doc.recipients || '—')}</div>
    ${
      doc.copyTo?.trim()
        ? `<div class="cc-row" style="grid-column:1/-1;display:inline-block"><span class="label"><span class="cc-icon" style="display:inline-block;visibility:visible;margin-inline-end:4px">⧉</span>نسخة إلى:</span> ${esc(doc.copyTo)}</div>`
        : ''
    }
    ${
      doc.attachments?.trim()
        ? `<div style="grid-column:1/-1"><span class="label">مرفقات:</span> ${esc(doc.attachments)}</div>`
        : ''
    }
    <div style="grid-column:1/-1"><span class="label">الموضوع:</span> ${esc(previewSubject)}</div>
  </div>
  <div class="section" style="${layout === 'modern-hex' ? 'padding-inline:28px' : ''}">
    ${hasStudy && study ? studyHtml(study) : ''}
    ${isBriefing && doc.judgmentCard?.length ? judgmentBriefingHtml(doc, doc.judgmentCard) : ''}
    ${
      !hasStudy && !isBriefing && doc.parties
        ? `<h3>الأطراف</h3><div class="body">${pre(doc.parties)}</div>`
        : ''
    }
    ${
      !hasStudy && !isBriefing && doc.reasons
        ? `<h3>الأسباب</h3><div class="body">${pre(doc.reasons)}</div>`
        : ''
    }
    ${
      !hasStudy && !isBriefing && doc.body
        ? `<div class="body">${pre(String(doc.body).trim())}</div>`
        : ''
    }
    ${
      !hasStudy && !isBriefing && doc.studyFields
        ? `<h3>الدراسة</h3><div class="body">${pre(doc.studyFields)}</div>`
        : ''
    }
  </div>
  <div class="foot">${theme.extraChrome ? theme.extraChrome + `<div style="padding:8px 18px;text-align:center;color:#555;font-size:11px">${esc(footer)}</div>` : esc(footer)}</div>
</div>
</body>
</html>`;
}
