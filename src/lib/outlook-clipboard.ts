import { officialDateDisplay } from '@/lib/hijri';
import { MOJ_EMBLEM_PNG_DATA_URL } from '@/lib/brand-emblem-data';
import { BRAND } from '@/lib/brand';

/** Client helper: copy Outlook-friendly full official letter HTML */

const GREEN = '#006C35';
const GOLD = '#C5A059';
const LIGHT = '#E6F2EB';

export async function copyOutlookHtml(html: string, plainFallback?: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const plainText =
    plainFallback ||
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|h[1-6]|li|td)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
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
      // execCommand fallback for stubborn browsers
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

function esc(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type OutlookLetterDoc = {
  number?: string | null;
  subject?: string;
  dateGregorian?: string | null;
  dateHijri?: string | null;
  recipients?: string;
  copyTo?: string;
  parties?: string;
  reasons?: string;
  studyFields?: string;
  body?: string;
  footer?: string;
  courtName?: string;
  qrDataUrl?: string | null;
  headerLines?: string[] | null;
  /** Absolute site origin for Outlook-safe http(s) image URLs */
  origin?: string | null;
};

/**
 * Full official template for Outlook paste — table-based inline CSS.
 * Physical columns: LEFT=QR, CENTER=emblem, RIGHT=kingdom/ministry/court.
 * Prefers absolute https image URLs (Outlook desktop strips many data-URIs).
 */
export function buildLetterHtml(doc: OutlookLetterDoc) {
  const court = doc.courtName || 'المحكمة العمالية بالرياض';
  const header =
    doc.headerLines?.filter(Boolean) ||
    ['المملكة العربية السعودية', 'وزارة العدل', court];
  const footer = doc.footer || 'للاستخدام الداخلي فقط';
  const origin = (doc.origin || (typeof window !== 'undefined' ? window.location.origin : '')).replace(
    /\/$/,
    '',
  );

  // Emblem: hosted PNG first (Outlook-safe), data-uri fallback
  const emblemSrc = MOJ_EMBLEM_PNG_DATA_URL;
  const emblem = `<img src="${esc(emblemSrc)}" width="64" height="64" alt="شعار وزارة العدل" style="width:64px;height:64px;border:1.5px solid ${GOLD};border-radius:10px;background:#fff;display:block" />`;

  // QR: public API URL when we have a number/origin; else data-uri; else dashed box
  const qrPayload = String(doc.number || '').trim();
  let qrInner: string;
  if (origin && qrPayload) {
    const qrUrl = `${origin}/api/public/qr?text=${encodeURIComponent(qrPayload)}`;
    qrInner = `<img src="${esc(qrUrl)}" width="72" height="72" alt="QR" style="width:72px;height:72px;border:1px solid ${GOLD};border-radius:6px;background:#fff;display:block" />`;
  } else if (doc.qrDataUrl) {
    qrInner = `<img src="${esc(doc.qrDataUrl)}" width="72" height="72" alt="QR" style="width:72px;height:72px;border:1px solid ${GOLD};border-radius:6px;background:#fff;display:block" />`;
  } else {
    qrInner = `<div style="width:72px;height:72px;border:1px dashed ${GOLD};border-radius:8px;text-align:center;line-height:72px;font-size:11px;color:${GREEN};background:#fff;mso-line-height-rule:exactly">QR</div>`;
  }

  const headerCenter = header
    .map(
      (h, i) =>
        `<div style="color:${GREEN};font-weight:bold;font-size:${i === header.length - 1 ? 16 : 13}pt;font-family:Tahoma,Arial,sans-serif;line-height:1.45;text-align:right">${esc(h)}</div>`,
    )
    .join('');

  const bodyHtml = esc(String(doc.body || '')).replace(/\n/g, '<br/>');

  const section = (title: string, content?: string) => {
    const c = String(content || '').trim();
    if (!c) return '';
    return `<tr><td style="padding:6px 16px 2px;font-family:Tahoma,Arial,sans-serif;font-size:12pt;color:${GREEN};font-weight:bold;direction:rtl;text-align:right;border-bottom:1px solid ${GOLD}">${esc(title)}</td></tr>
<tr><td style="padding:8px 16px 12px;font-family:Tahoma,Arial,sans-serif;font-size:14px;direction:rtl;text-align:right;line-height:1.75">${esc(c).replace(/\n/g, '<br/>')}</td></tr>`;
  };

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>مكاتبة ركيزة</title>
<style>@media print { .cc-row, .cc-icon { display: inline-block !important; visibility: visible !important; } }</style>
</head>
<body style="margin:0;padding:12px;background:#f5f5f5" dir="rtl" lang="ar">
<!--[if mso]><table role="presentation" width="700" cellpadding="0" cellspacing="0" align="center"><tr><td><![endif]-->
<table dir="rtl" width="700" cellpadding="0" cellspacing="0" role="presentation" align="center" style="width:700px;max-width:100%;border:2px solid ${GREEN};border-collapse:collapse;font-family:Tahoma,'Traditional Arabic',Arial,sans-serif;font-size:15pt;line-height:1.8;color:#111;background:#ffffff;margin:0 auto">
  <tr>
    <td style="background:${GREEN};color:#ffffff;text-align:center;font-weight:bold;padding:10px 12px;border-bottom:3px solid ${GOLD};font-size:15pt;font-family:Tahoma,Arial,sans-serif">بسم الله الرحمن الرحيم</td>
  </tr>
  <tr>
    <td style="padding:0;border-bottom:2px solid ${GOLD};background:#ffffff">
      <table dir="ltr" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-collapse:collapse">
        <tr>
          <td width="33%" valign="middle" align="left" style="padding:12px;width:33%">${qrInner}</td>
          <td width="34%" valign="middle" align="center" style="padding:12px;width:34%">${emblem}</td>
          <td width="33%" valign="middle" align="right" style="padding:12px 8px;width:33%" dir="rtl">
            ${headerCenter}
            <div style="color:${GOLD};font-size:11pt;margin-top:4px;font-family:Tahoma,Arial,sans-serif;text-align:right">${BRAND.platform}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 16px;background:#ffffff">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-collapse:collapse;background:${LIGHT};border:1px solid ${GREEN}">
        <tr><td style="padding:10px 12px;font-size:12pt;direction:rtl;text-align:right;font-family:Tahoma,Arial,sans-serif;line-height:1.7">
          <div><b style="color:${GREEN}">الرقم:</b> <span dir="ltr" style="unicode-bidi:embed">${esc(doc.number || '—')}</span></div>
          <div><b style="color:${GREEN}">التاريخ:</b> ${esc(officialDateDisplay(doc.dateHijri, doc.dateGregorian))}</div>
          <div><b style="color:${GREEN}">إلى:</b> ${esc(doc.recipients || '')}</div>
          ${doc.copyTo?.trim() ? `<div class="cc-row" style="display:inline-block"><b style="color:${GREEN}"><span class="cc-icon" style="display:inline-block;visibility:visible">⧉</span> نسخة إلى:</b> ${esc(doc.copyTo)}</div>` : ''}
          <div><b style="color:${GREEN}">الموضوع:</b> ${esc(doc.subject || '')}</div>
        </td></tr>
      </table>
    </td>
  </tr>
  ${section('الأطراف', doc.parties)}
  ${section('الأسباب', doc.reasons)}
  <tr>
    <td style="padding:4px 16px 2px;font-family:Tahoma,Arial,sans-serif;font-size:12pt;color:${GREEN};font-weight:bold;direction:rtl;text-align:right;border-bottom:1px solid ${GOLD}">نص المكاتبة</td>
  </tr>
  <tr>
    <td style="padding:10px 16px 16px;font-size:14pt;direction:rtl;text-align:right;font-family:'Traditional Arabic',Tahoma,Arial,serif;line-height:1.85;background:#ffffff">${bodyHtml || '&nbsp;'}</td>
  </tr>
  ${section('الدراسة', doc.studyFields)}
  <tr>
    <td style="text-align:center;font-size:11pt;color:#666666;border-top:2px solid ${GOLD};padding:12px;font-family:Tahoma,Arial,sans-serif;background:#fafcfb">${esc(footer)}</td>
  </tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
}
