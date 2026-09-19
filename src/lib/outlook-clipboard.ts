import { officialDateDisplay } from '@/lib/hijri';
import { BRAND } from '@/lib/brand';
import { bodyBlocksToHtml } from '@/lib/body-align';
import { buildJudgmentBriefingBlockHtml } from '@/lib/judgment-card';

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
  judgmentCard?: { label: string; value: string }[] | null;
  judgmentBriefing?: boolean | null;
  briefingTitle?: string | null;
  observationText?: string | null;
  mechanismText?: string | null;
  underLogoLabel?: string | null;
};

/**
 * Full official template for Outlook paste — table-based inline CSS.
 * Images use absolute https URLs (Outlook often strips data-URIs).
 * No بسم الله — removed per MOJ user request.
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

  // Hosted PNG — Outlook-safe (data-URI often dropped on paste)
  const emblemSrc = origin
    ? `${origin}/brand/moj-logo-gold.png`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/brand/moj-logo-gold.png`;
  const emblem = `<img src="${esc(emblemSrc)}" width="72" height="72" alt="شعار وزارة العدل" style="width:72px;height:72px;border:1.5px solid ${GOLD};border-radius:10px;background:#fff;display:block;margin:0 auto" />`;

  const badge =
    doc.underLogoLabel || doc.briefingTitle
      ? `<div style="display:inline-block;margin-top:6px;font-size:10pt;font-weight:800;color:${GREEN};border:1px solid ${GOLD};border-radius:999px;padding:2px 10px;background:#fff">${esc(
          doc.underLogoLabel || doc.briefingTitle || 'بطاقة عرض',
        )}</div>`
      : '';

  const qrPayload = String(doc.number || '').trim();
  let qrInner: string;
  if (origin && qrPayload) {
    const qrUrl = `${origin}/api/public/qr?text=${encodeURIComponent(qrPayload)}`;
    qrInner = `<img src="${esc(qrUrl)}" width="72" height="72" alt="QR" style="width:72px;height:72px;border:1px solid ${GOLD};border-radius:6px;background:#fff;display:block" />`;
  } else if (doc.qrDataUrl && /^https?:\/\//i.test(doc.qrDataUrl)) {
    qrInner = `<img src="${esc(doc.qrDataUrl)}" width="72" height="72" alt="QR" style="width:72px;height:72px;border:1px solid ${GOLD};border-radius:6px;background:#fff;display:block" />`;
  } else if (origin && doc.qrDataUrl) {
    // data-uri fallback only if no https QR — many Outlook builds keep it
    qrInner = `<img src="${esc(doc.qrDataUrl)}" width="72" height="72" alt="QR" style="width:72px;height:72px;border:1px solid ${GOLD};border-radius:6px;background:#fff;display:block" />`;
  } else {
    qrInner = `<div style="width:72px;height:72px;border:1px dashed ${GOLD};border-radius:8px;text-align:center;line-height:72px;font-size:11px;color:${GREEN};background:#fff">QR</div>`;
  }

  const headerCenter = header
    .map(
      (h, i) =>
        `<div style="color:${GREEN};font-weight:bold;font-size:${i === header.length - 1 ? 16 : 13}pt;font-family:Tahoma,Arial,sans-serif;line-height:1.45;text-align:right">${esc(h)}</div>`,
    )
    .join('');

  const isBriefing = Boolean(doc.judgmentBriefing && doc.judgmentCard?.length);
  const briefingHtml = isBriefing
    ? buildJudgmentBriefingBlockHtml({
        recipients: doc.recipients,
        card: doc.judgmentCard!,
        title: doc.briefingTitle,
        green: GREEN,
        observationText: doc.observationText,
        mechanismText: doc.mechanismText,
      })
    : '';

  const bodyInner = isBriefing
    ? briefingHtml
    : bodyBlocksToHtml(String(doc.body || '').trim(), { escape: esc, fallbackAlign: 'right' }) ||
      '&nbsp;';

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
</head>
<body style="margin:0;padding:12px;background:#f5f5f5" dir="rtl" lang="ar">
<!--[if mso]><table role="presentation" width="700" cellpadding="0" cellspacing="0" align="center"><tr><td><![endif]-->
<table dir="rtl" width="700" cellpadding="0" cellspacing="0" role="presentation" align="center" style="width:700px;max-width:100%;border:2px solid ${GREEN};border-collapse:collapse;font-family:Tahoma,'Traditional Arabic',Arial,sans-serif;font-size:15pt;line-height:1.8;color:#111;background:#ffffff;margin:0 auto">
  <tr>
    <td style="padding:0;border-bottom:2px solid ${GOLD};background:#ffffff">
      <table dir="ltr" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-collapse:collapse">
        <tr>
          <td width="33%" valign="middle" align="left" style="padding:12px;width:33%">${qrInner}</td>
          <td width="34%" valign="middle" align="center" style="padding:12px;width:34%">${emblem}${badge}</td>
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
          ${doc.copyTo?.trim() ? `<div><b style="color:${GREEN}">نسخة إلى:</b> ${esc(doc.copyTo)}</div>` : ''}
          <div><b style="color:${GREEN}">الموضوع:</b> ${esc(doc.subject || '')}</div>
        </td></tr>
      </table>
    </td>
  </tr>
  ${!isBriefing ? section('الأطراف', doc.parties) : ''}
  ${!isBriefing ? section('الأسباب', doc.reasons) : ''}
  <tr>
    <td style="padding:10px 16px 16px;font-size:14pt;direction:rtl;text-align:right;font-family:'Traditional Arabic',Tahoma,Arial,serif;line-height:1.85;background:#ffffff">${bodyInner}</td>
  </tr>
  ${!isBriefing ? section('الدراسة', doc.studyFields) : ''}
  <tr>
    <td style="text-align:center;font-size:11pt;color:#666666;border-top:2px solid ${GOLD};padding:12px;font-family:Tahoma,Arial,sans-serif;background:#fafcfb">${esc(footer)}</td>
  </tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
}
