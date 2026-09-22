import type { OfficialLetterDoc } from '@/lib/official-letter-html';
import { officialDateDisplay } from '@/lib/hijri';
import { BRAND } from '@/lib/brand';
import { bodyBlocksToHtml } from '@/lib/body-align';
import { bodyToExportHtml, isBodyHtml } from '@/lib/body-html-bridge';
import { normalizeHtmlColors } from '@/lib/color-normalize';
import { exportFontStack, fontStackFor } from '@/lib/font-stacks';
import { MOJ_EMBLEM_PNG_DATA_URL } from '@/lib/brand-emblem-data';
import { outlookEmblemImgHtml, outlookEmblemUrl } from '@/lib/outlook-public-assets';
import { isJudgmentBriefingDoc } from '@/lib/judgment-card';
import {
  enrichStudySections,
  hasStudyContent,
  studyDisplayMeta,
} from '@/lib/study-display';
import { researcherRoleLabel, preparerRoleLabel } from '@/lib/honorific';
import { formatClaimAmount, normalizeFormationOrdinal } from '@/lib/arabic-normalize';
import type { StudySections } from '@/lib/parse-study';
import { inlineCaseCardStyles } from '@/lib/case-card';

/**
 * Outlook / Word HTML clipboard — ruthless MSO-compatible letter markup.
 *
 * ROOT CAUSE of nested scrollbar + locked formatting after paste:
 * previous path wrapped preview/PDF HTML that injected
 *   .paper { overflow:hidden } and .section { overflow:hidden }
 * (+ max-height / position / user-select). Outlook Word then renders an
 * INTERNAL scroll box and treats the paste as a locked object.
 *
 * This builder NEVER wraps official-letter-html. Pure nested tables only.
 */

const GREEN = '#2e9e5c';
const GOLD = '#C5A059';
const LIGHT = '#E6F2EB';

export async function writeHtmlClipboard(html: string, plainFallback?: string): Promise<boolean> {
  const plainText =
    plainFallback ||
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|h[1-6]|li|td|th)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  const blob = new Blob([html], { type: 'text/html' });
  const plain = new Blob([plainText], { type: 'text/plain' });
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': blob,
        'text/plain': plain,
      }),
    ]);
    return true;
  } catch {
    try {
      const listener = (e: ClipboardEvent) => {
        e.clipboardData?.setData('text/html', html);
        e.clipboardData?.setData('text/plain', plainText);
        e.preventDefault();
      };
      document.addEventListener('copy', listener);
      const ok = document.execCommand('copy');
      document.removeEventListener('copy', listener);
      if (ok) return true;
    } catch {
      /* fall through */
    }
    try {
      await navigator.clipboard.writeText(plainText);
      return true;
    } catch {
      return false;
    }
  }
}

export async function copyOutlookHtml(html: string, plainFallback?: string) {
  return writeHtmlClipboard(html, plainFallback);
}

function esc(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type OutlookLetterDoc = OfficialLetterDoc & {
  origin?: string | null;
  underLogoLabel?: string | null;
};

export function absolutizeHtmlForOutlook(html: string, origin: string): string {
  const base = String(origin || '').replace(/\/$/, '');
  if (!base) return html;
  return html.replace(/src="\/([^"]+)"/gi, (_m, path: string) => `src="${esc(`${base}/${path}`)}"`);
}

/** Strip CSS that creates Outlook nested scrollbars / locked editing. */
export function stripOutlookHostileCss(html: string): string {
  let out = String(html || '');
  out = out.replace(/\sstyle="([^"]*)"/gi, (_m, style: string) => {
    const cleaned = String(style)
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => {
        const prop = (p.split(':')[0] || '').trim().toLowerCase();
        if (
          [
            'overflow',
            'overflow-x',
            'overflow-y',
            'max-height',
            'min-height',
            'max-width',
            'position',
            'top',
            'left',
            'right',
            'bottom',
            'inset',
            'pointer-events',
            'user-select',
            '-webkit-user-select',
            '-moz-user-select',
            '-ms-user-select',
            'display',
            'flex',
            'flex-direction',
            'grid',
            'grid-template-columns',
            'gap',
            'border-radius',
            'object-fit',
            'z-index',
            'transform',
            'float',
            'height',
            'width',
          ].includes(prop)
        ) {
          return false;
        }
        if (/#[0-9a-fA-F]{8}\b/.test(p)) return false;
        return true;
      })
      .join(';');
    return cleaned ? ` style="${cleaned}"` : '';
  });
  out = out.replace(/\scontenteditable="[^"]*"/gi, '');
  out = out.replace(/\sunselectable="[^"]*"/gi, '');
  return out;
}

/**
 * Ensure body fragments are editable Outlook paragraphs with align= attribute.
 * TipTap HTML often uses only style text-align — Word needs align="center|right|left".
 */
export function outlookBodyParagraphs(
  body: string | null | undefined,
  opts: { fontFamily: string; fontSizePx: number; align?: 'right' | 'center' | 'left' | null },
): string {
  const font = opts.fontFamily;
  const size = opts.fontSizePx;
  const fallback = opts.align || 'right';
  const raw = String(body ?? '');
  if (!raw.trim()) return '';

  let html = isBodyHtml(raw)
    ? raw
    : bodyToExportHtml(raw, {
        escape: esc,
        fallbackAlign: fallback,
        fontFamily: font,
      });

  // Ensure custom colors are explicit #RRGGBB hex before the Word engine reads them.
  html = normalizeHtmlColors(html);
  html = stripOutlookHostileCss(html);

  html = html.replace(/<(p|div)(\s[^>]*)?>/gi, (_full, _tag: string, attrs = '') => {
    const alignMatch =
      String(attrs).match(/\balign\s*=\s*["']?(left|center|right|justify)["']?/i) ||
      String(attrs).match(/text-align\s*:\s*(left|center|right|justify)/i);
    const align = (alignMatch?.[1] || fallback).toLowerCase();
    let nextAttrs = String(attrs)
      .replace(/\balign\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\sstyle="([^"]*)"/i, (_s, st: string) => {
        const kept = st
          .split(';')
          .map((x: string) => x.trim())
          .filter(Boolean)
          .filter((x: string) => !/^text-align\s*:/i.test(x))
          .join(';');
        return kept ? ` style="${kept}"` : '';
      });
    const styleMatch = nextAttrs.match(/\sstyle="([^"]*)"/i);
    const baseStyle = styleMatch ? styleMatch[1] : '';
    const merged = [
      `font-family:${font}`,
      `font-size:${Math.max(9, Math.round((opts.fontSizePx || 14) * 0.75))}pt`,
      `text-align:${align}`,
      'margin:0 0 8px 0',
      baseStyle,
    ]
      .filter(Boolean)
      .join(';');
    nextAttrs = nextAttrs.replace(/\sstyle="[^"]*"/i, '');
    return `<p align="${align}" dir="rtl" style="${merged}"${nextAttrs}>`;
  });
  html = html.replace(/<\/div>/gi, '</p>');

  html = html.replace(
    /<p\b[^>]*>\s*(?:&nbsp;|\u00a0|\s)*<\/p>/gi,
    `<p align="${fallback}" dir="rtl" style="font-family:${font};font-size:${Math.max(9, Math.round((opts.fontSizePx || 14) * 0.75))}pt;margin:0 0 8px 0">&nbsp;</p>`,
  );

  html = inlineCaseCardStyles(html);

  return html;
}

function metaRow(label: string, value: string, font: string, size: number): string {
  return `<tr>
  <td align="right" dir="rtl" style="padding:6px 12px;font-family:${font};font-size:${Math.max(9, Math.round(size * 0.75))}pt;color:#111;background:${LIGHT};border-bottom:1px solid ${GREEN}">
    <b style="color:${GREEN}">${esc(label)}</b> ${esc(value)}
  </td>
</tr>`;
}

function judgmentTableHtml(
  rows: { label: string; value: string }[],
  font: string,
  size: number,
): string {
  if (!rows?.length) return '';
  const cells = rows
    .map((r, i) => {
      const bg = i % 2 ? '#f3f8f5' : '#ffffff';
      return `<tr>
  <td width="38%" valign="middle" align="right" dir="rtl" style="padding:8px 10px;border:1px solid ${GREEN};background:${LIGHT};color:${GREEN};font-family:${font};font-size:${Math.max(9, Math.round(size * 0.75))}pt;font-weight:700">${esc(r.label)}</td>
  <td valign="middle" align="right" dir="rtl" style="padding:8px 10px;border:1px solid ${GREEN};background:${bg};font-family:${font};font-size:${Math.max(9, Math.round(size * 0.75))}pt;font-weight:600">${esc(r.value || '—')}</td>
</tr>`;
    })
    .join('');
  return `<table class="outlook-judgment" dir="rtl" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;border:1px solid ${GREEN};margin:0">
${cells}
</table>`;
}

function studyTablesHtml(study: StudySections, font: string, size: number): string {
  const formation = normalizeFormationOrdinal(study.formation || '') || study.formation;
  const amount = formatClaimAmount(study.claimAmount || '') || study.claimAmount;
  const kv = (label: string, value?: string) =>
    value
      ? `<tr>
  <td width="28%" valign="top" align="right" dir="rtl" style="padding:4px 8px;border-bottom:1px solid #cfe3d7;color:${GREEN};font-family:${font};font-size:${Math.max(9, Math.round(size * 0.75))}pt;font-weight:700">${esc(label)}</td>
  <td valign="top" align="right" dir="rtl" style="padding:4px 8px;border-bottom:1px solid #cfe3d7;font-family:${font};font-size:${Math.max(9, Math.round(size * 0.75))}pt">${esc(value)}</td>
</tr>`
      : '';
  const party = (label: string, value: string | undefined, bg: string, bd: string) =>
    value
      ? `<tr>
  <td width="28%" valign="top" align="right" dir="rtl" style="padding:8px 10px;background:${bg};border:2px solid ${bd};color:${GREEN};font-family:${font};font-size:9pt;font-weight:700">${esc(label)}</td>
  <td valign="top" align="right" dir="rtl" style="padding:8px 10px;background:${bg};border:2px solid ${bd};font-family:${font};font-size:${Math.max(9, Math.round(size * 0.75))}pt;font-weight:600">${esc(value)}</td>
</tr>`
      : '';

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;border:1px solid ${GREEN};margin:0 0 10px 0">
  <tr><td align="center" style="padding:6px;background:${GREEN};color:#ffffff;font-family:${font};font-size:9pt;font-weight:700">بيانات القضية</td></tr>
  <tr><td style="padding:4px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
      ${kv('رقم القضية', study.caseNumber)}
      ${kv('رقم الصك', study.deedNumber)}
      ${kv('التشكيل', formation)}
      ${kv('الاختصاص النوعي', study.jurisdiction)}
      ${amount ? kv('مقدار المطالبة', amount) : ''}
      ${kv(researcherRoleLabel(study.researcher), study.researcher)}
      ${party('المدعي/ة', study.plaintiff, '#E6F2EB', GREEN)}
      ${party('المدعى عليه/ا', study.defendant, '#FFF8E8', GOLD)}
    </table>
  </td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;border:1px solid ${GOLD};margin:0 0 10px 0">
  <tr><td align="center" style="padding:6px;background:${GOLD};color:#ffffff;font-family:${font};font-size:9pt;font-weight:700">الخلاصة</td></tr>
  <tr><td style="padding:4px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
      ${kv('المشكلة', study.problem)}
      ${kv('الرأي القانوني', study.legalOpinion)}
      ${kv('التوصية', study.recommendation)}
      ${kv(researcherRoleLabel(study.researcher), study.researcher)}
      ${kv(preparerRoleLabel(study.preparer), study.preparer)}
    </table>
  </td></tr>
</table>`;
}

/**
 * Full Outlook letter — pure nested tables, editable paragraphs.
 * Does NOT wrap the preview/PDF HTML (that path injects overflow:hidden scroll boxes).
 */
export function buildLetterHtml(doc: OutlookLetterDoc) {
  const origin = (doc.origin || (typeof window !== 'undefined' ? window.location.origin : '')).replace(
    /\/$/,
    '',
  );

  let qrSrc = '';
  if (origin && doc.number) {
    qrSrc = `${origin}/api/public/qr?text=${encodeURIComponent(String(doc.number))}`;
  } else if (doc.qrDataUrl && /^https?:\/\//i.test(String(doc.qrDataUrl))) {
    qrSrc = String(doc.qrDataUrl);
  } else if (doc.qrDataUrl && String(doc.qrDataUrl).startsWith('data:image')) {
    qrSrc = String(doc.qrDataUrl);
  }

  const font = exportFontStack(doc.fontFamily) || fontStackFor(doc.fontFamily);
  const size = doc.fontSizePt || 14;
  const court = doc.courtName || BRAND.court;
  const headerLines =
    doc.headerLines?.filter(Boolean) || [BRAND.kingdom, BRAND.ministry, court];
  const dateShown = officialDateDisplay(doc.dateHijri, doc.dateGregorian);
  const footerText = doc.footer || BRAND.footer;
  const underLogo =
    doc.underLogoLabel ||
    (doc.judgmentBriefing ? doc.briefingTitle || 'بطاقة عرض' : '') ||
    '';

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
  const meta = studyDisplayMeta(study, { subject: doc.subject, recipients: doc.recipients });
  const previewSubject =
    doc.subject && doc.subject.trim() && doc.subject.trim() !== '—'
      ? doc.subject
      : meta.subject || (study?.caseNumber ? `دراسة شكوى — ${study.caseNumber}` : '') || '—';

  const emblemImg = outlookEmblemImgHtml(origin);

  const qrImg = qrSrc
    ? `<img src="${esc(qrSrc)}" width="72" height="72" alt="QR" border="0" style="border:1px solid ${GOLD};display:block;background:#ffffff" />`
    : `<table width="72" cellpadding="0" cellspacing="0" border="0" style="border:1px dashed ${GOLD}"><tr><td width="72" height="72" align="center" valign="middle" style="font-family:${font};font-size:9pt;color:${GREEN}">QR</td></tr></table>`;

  // Physical LTR header: LEFT=QR+number+date · CENTER=logo · RIGHT=kingdom
  // (Outlook Word reverses RTL layout tables.)
  const leftCol = `
<table class="official-left" dir="ltr" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
  <tr><td align="left" valign="top" style="padding:0 0 6px 0">${qrImg}</td></tr>
  <tr><td align="left" valign="top" style="padding:6px 0;font-family:${font};font-size:11pt;color:${GREEN};font-weight:700">الرقم: <span dir="ltr">${esc(doc.number || '—')}</span></td></tr>
  <tr><td align="left" valign="top" style="padding:2px 0;font-family:${font};font-size:11pt;color:${GREEN};font-weight:700">التاريخ: ${esc(dateShown)}</td></tr>
</table>`;

  const centerBadge = underLogo
    ? `<tr><td align="center" style="padding:6px 0 0 0">
        <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;border:1px solid ${GOLD};background:#ffffff">
          <tr><td align="center" style="padding:2px 10px;font-family:${font};font-size:9pt;font-weight:800;color:${GREEN}">${esc(underLogo)}</td></tr>
        </table>
      </td></tr>`
    : '';

  const centerCol = `
<table class="official-center" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
  <tr><td align="center" valign="top" style="padding:0">${emblemImg}</td></tr>
  ${centerBadge}
</table>`;

  const rightLines = [...headerLines, BRAND.platform]
    .map((h, i, arr) => {
      const isPlatform = h === BRAND.platform || i === arr.length - 1;
      const isCourt = !isPlatform && (h === court || i === headerLines.length - 1);
      const pt = isCourt ? 12 : isPlatform ? 9 : 10;
      const color = isPlatform ? GOLD : GREEN;
      return `<tr><td class="${isPlatform ? 'sub' : 'court'}" align="right" dir="rtl" style="padding:1px 0;font-family:${font};font-size:${pt}pt;color:${color};font-weight:800;text-align:right">${esc(h)}</td></tr>`;
    })
    .join('');

  const rightCol = `<table class="official-right" dir="rtl" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">${rightLines}</table>`;

  // RTL: first cell = visual RIGHT (letterhead), center = logo, last = visual LEFT (QR)
  const headerRow = `
<table class="brand-row official-header" dir="rtl" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed">
  <tr>
    <td class="official-right" width="35%" valign="top" align="right" style="width:35%;padding:12px 10px">${rightCol}</td>
    <td class="official-center" width="30%" valign="top" align="center" style="width:30%;padding:12px 8px">${centerCol}</td>
    <td class="official-left" width="35%" valign="top" align="left" style="width:35%;padding:12px 10px">${leftCol}</td>
  </tr>
</table>`;

  let metaRows = metaRow('إلى:', doc.recipients || '—', font, size);
  if (doc.copyTo?.trim()) metaRows += metaRow('نسخة إلى:', doc.copyTo, font, size);
  if (doc.attachments?.trim()) metaRows += metaRow('مرفقات:', doc.attachments, font, size);
  metaRows += metaRow('الموضوع:', previewSubject, font, size);

  const metaTable = `
<table class="meta" dir="rtl" width="700" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;width:700px;border:1px solid ${GREEN};background:${LIGHT}">
${metaRows}
</table>`;

  let bodyInner = '';
  if (hasStudy && study) {
    bodyInner += studyTablesHtml(study, font, size);
  }
  if (isBriefing && doc.judgmentCard?.length) {
    if (doc.body?.trim()) {
      bodyInner += outlookBodyParagraphs(doc.body, {
        fontFamily: font,
        fontSizePx: size,
        align: doc.align,
      });
    } else if (doc.observationText || doc.mechanismText) {
      const parts = [doc.observationText, doc.mechanismText].filter(Boolean).join('\n\n');
      bodyInner += outlookBodyParagraphs(parts, {
        fontFamily: font,
        fontSizePx: size,
        align: doc.align,
      });
    }
    bodyInner += judgmentTableHtml(doc.judgmentCard, font, size);
  } else if (!hasStudy) {
    if (doc.parties) {
      bodyInner += `<p align="right" dir="rtl" style="font-family:${font};font-size:10pt;color:${GREEN};font-weight:700;margin:12px 0 6px 0;border-bottom:1px solid ${GOLD}">الأطراف</p>`;
      bodyInner += outlookBodyParagraphs(doc.parties, {
        fontFamily: font,
        fontSizePx: size,
        align: 'right',
      });
    }
    if (doc.reasons) {
      bodyInner += `<p align="right" dir="rtl" style="font-family:${font};font-size:10pt;color:${GREEN};font-weight:700;margin:12px 0 6px 0;border-bottom:1px solid ${GOLD}">الأسباب</p>`;
      bodyInner += outlookBodyParagraphs(doc.reasons, {
        fontFamily: font,
        fontSizePx: size,
        align: 'right',
      });
    }
    if (doc.body) {
      bodyInner += outlookBodyParagraphs(doc.body, {
        fontFamily: font,
        fontSizePx: size,
        align: doc.align,
      });
    }
    if (doc.studyFields) {
      bodyInner += `<p align="right" dir="rtl" style="font-family:${font};font-size:10pt;color:${GREEN};font-weight:700;margin:12px 0 6px 0;border-bottom:1px solid ${GOLD}">الدراسة</p>`;
      bodyInner += outlookBodyParagraphs(doc.studyFields, {
        fontFamily: font,
        fontSizePx: size,
        align: 'right',
      });
    }
  }

  const bodyTable = `
<table dir="rtl" width="700" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;width:700px">
  <tr>
    <td align="right" dir="rtl" style="padding:10px 18px;font-family:${font};font-size:${Math.max(9, Math.round(size * 0.75))}pt;color:#111">
      ${bodyInner || `<p align="right" dir="rtl" style="font-family:${font};font-size:${Math.max(9, Math.round(size * 0.75))}pt;margin:0">&nbsp;</p>`}
    </td>
  </tr>
</table>`;

  const footTable = `
<table dir="rtl" width="700" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;width:700px;border-top:2px solid ${GOLD};background:#fafcfb">
  <tr>
    <td align="center" style="padding:10px 18px;font-family:${font};font-size:8.5pt;color:#555">${esc(footerText)}</td>
  </tr>
</table>`;

  const goldRule = `
<table width="700" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;width:700px">
  <tr><td style="border-bottom:3px solid ${GOLD};font-size:0;line-height:0">&nbsp;</td></tr>
</table>`;

  const paper = `
<!--[if mso]>
<table role="presentation" width="700" cellpadding="0" cellspacing="0" border="0"><tr><td width="700">
<![endif]-->
<table class="paper outlook-letter" data-paper-layout="${esc(String(doc.paperLayout || 'classic-green'))}" dir="ltr" width="700" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:700px;border-collapse:collapse;border:2px solid ${GREEN};background:#ffffff;margin:0 auto">
  <tr><td style="padding:0;background:#ffffff">
    ${goldRule}
    ${headerRow}
    ${metaTable}
    ${bodyTable}
    ${footTable}
  </td></tr>
</table>
<!--[if mso]>
</td></tr></table>
<![endif]-->`;

  const baseTag = origin ? `<base href="${esc(origin)}/" />` : '';

  const wrapped = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<!--[if mso]>
<xml>
  <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings>
</xml>
<![endif]-->
${baseTag}
</head>
<body dir="rtl" style="margin:0;padding:0;background:#ffffff;font-family:${font};font-size:${Math.max(9, Math.round(size * 0.75))}pt;color:#111">
${paper}
</body>
</html>`;

  return absolutizeHtmlForOutlook(wrapped, origin);
}

/** Assert MSO/table-based Outlook HTML (verify scripts). */
export function outlookHtmlIsTableBased(html: string): boolean {
  const src = String(html || '');
  return (
    /<table[\s>]/i.test(src) &&
    /class="brand-row[^"]*official-header"|class="brand-row official-header"/i.test(src) &&
    /role="presentation"/i.test(src) &&
    /align="left"/i.test(src) &&
    /align="center"/i.test(src) &&
    /align="right"/i.test(src) &&
    /class="official-left"/i.test(src) &&
    /class="official-center"/i.test(src) &&
    /class="official-right"/i.test(src) &&
    !/display\s*:\s*flex/i.test(src) &&
    !/display\s*:\s*grid/i.test(src) &&
    !/overflow\s*:/i.test(src) &&
    !/max-height\s*:/i.test(src) &&
    !/min-height\s*:/i.test(src) &&
    (/xmlns:o=/i.test(src) || /xmlns:w=/i.test(src) || /mso/i.test(src) || /<!--\[if mso\]/i.test(src))
  );
}

/** Left column carries QR + outgoing number + date. */
export function outlookHeaderHasQrNumberDate(html: string): boolean {
  const src = String(html || '');
  const left = src.match(/<table[^>]*class="official-left"[^>]*>[\s\S]*?<\/table>/i);
  if (!left) return false;
  const chunk = left[0];
  return /QR|qr|alt="QR"/i.test(chunk) && /الرقم/.test(chunk) && /التاريخ/.test(chunk);
}

/** Hostile CSS that creates nested scrollbars / locked paste in Outlook. */
export function outlookHtmlHasHostileLayout(html: string): boolean {
  const src = String(html || '');
  const withoutImgs = src
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/\b(width|height)\s*=\s*["'][^"']*["']/gi, '');
  return (
    /overflow\s*:/i.test(withoutImgs) ||
    /max-height\s*:/i.test(withoutImgs) ||
    /min-height\s*:/i.test(withoutImgs) ||
    /(?:^|[;\s{])height\s*:\s*\d/i.test(withoutImgs) ||
    /position\s*:\s*(absolute|fixed|sticky)/i.test(withoutImgs) ||
    /display\s*:\s*flex/i.test(withoutImgs) ||
    /display\s*:\s*grid/i.test(withoutImgs) ||
    /user-select\s*:\s*none/i.test(withoutImgs) ||
    /pointer-events\s*:\s*none/i.test(withoutImgs) ||
    /contenteditable\s*=\s*["']?false/i.test(src)
  );
}

/** Body paragraphs expose align= so Word can re-align after paste. */
export function outlookBodyUsesAlignAttribute(html: string): boolean {
  return /<p\b[^>]*\balign\s*=\s*["']?(right|center|left)/i.test(String(html || ''));
}

/** Legacy simple letter — prefer buildLetterHtml. */
export function buildSimpleLetterHtml(doc: OutlookLetterDoc) {
  const letterFont = exportFontStack(doc.fontFamily) || fontStackFor(doc.fontFamily);
  const letterSize = doc.fontSizePt ? `${doc.fontSizePt}pt` : '15pt';
  const origin = (doc.origin || '').replace(/\/$/, '');
  const emblemSrc = origin ? `${origin}/brand/moj-logo-gold.png` : '/brand/moj-logo-gold.png';
  return `<div dir="rtl" style="font-family:${letterFont};font-size:${letterSize}">${esc(doc.subject || '')}<br/>${esc(doc.recipients || '')}<br/><img src="${esc(emblemSrc)}" width="72" height="72" alt="شعار"/><div style="background:${LIGHT};border:1px solid ${GREEN};padding:8px">${esc(officialDateDisplay(doc.dateHijri, doc.dateGregorian))}</div>${bodyBlocksToHtml(String(doc.body || ''), { escape: esc })}<div style="color:#666;border-top:2px solid ${GOLD};padding:8px;text-align:center">${esc(BRAND.platform)}</div></div>`;
}
