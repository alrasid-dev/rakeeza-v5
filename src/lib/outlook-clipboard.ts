import { officialDateDisplay } from '@/lib/hijri';
import { MOJ_EMBLEM_PNG_DATA_URL } from '@/lib/brand-emblem-data';

/** Client helper: copy Outlook-friendly HTML */

const GREEN = '#006C35';
const GOLD = '#C5A059';
const LIGHT = '#E6F2EB';

export async function copyOutlookHtml(html: string, plainFallback?: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const plainText =
    plainFallback ||
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
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
      await navigator.clipboard.writeText(plainText);
      return true;
    } catch {
      return false;
    }
  }
}

export function buildLetterHtml(doc: {
  number?: string | null;
  subject?: string;
  dateGregorian?: string | null;
  dateHijri?: string | null;
  recipients?: string;
  parties?: string;
  reasons?: string;
  studyFields?: string;
  body?: string;
  footer?: string;
  courtName?: string;
  qrDataUrl?: string | null;
  headerLines?: string[] | null;
}) {
  const court = doc.courtName || 'المحكمة العمالية بالرياض';
  const header =
    doc.headerLines?.filter(Boolean) ||
    ['المملكة العربية السعودية', 'وزارة العدل', court];
  const footer = doc.footer || 'للاستخدام الداخلي فقط';

  const emblem = `<img src="${MOJ_EMBLEM_PNG_DATA_URL}" width="64" height="64" alt="شعار" style="width:64px;height:64px;border:1.5px solid ${GOLD};border-radius:10px;background:#fff;display:block" />`;
  const qr = doc.qrDataUrl
    ? `<img src="${doc.qrDataUrl.replace(/"/g, '&quot;')}" width="72" height="72" alt="QR" style="width:72px;height:72px;border:1px solid ${GOLD};border-radius:6px;background:#fff;display:block" />`
    : `<div style="width:72px;height:72px;border:1px dashed ${GOLD};border-radius:8px;text-align:center;line-height:72px;font-size:11px;color:${GREEN};background:#fff">QR</div>`;

  const bodyHtml = String(doc.body || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  const parties = doc.parties?.trim()
    ? `<tr><td style="padding:8px 16px;font-family:Tahoma,Arial,sans-serif;font-size:14px;direction:rtl;text-align:right"><b style="color:${GREEN}">الأطراف:</b><br/>${String(doc.parties).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br/>')}</td></tr>`
    : '';
  const reasons = doc.reasons?.trim()
    ? `<tr><td style="padding:8px 16px;font-family:Tahoma,Arial,sans-serif;font-size:14px;direction:rtl;text-align:right"><b style="color:${GREEN}">الأسباب:</b><br/>${String(doc.reasons).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br/>')}</td></tr>`
    : '';
  const study = doc.studyFields?.trim()
    ? `<tr><td style="padding:8px 16px;font-family:Tahoma,Arial,sans-serif;font-size:14px;direction:rtl;text-align:right"><b style="color:${GREEN}">الدراسة:</b><br/>${String(doc.studyFields).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br/>')}</td></tr>`
    : '';

  const headerCenter = header
    .map(
      (h, i) =>
        `<div style="color:${GREEN};font-weight:bold;font-size:${i === header.length - 1 ? 16 : 13}pt;font-family:'Traditional Arabic',Tahoma,serif">${h}</div>`,
    )
    .join('');

  // Full official chrome — table-based for Outlook; physical LTR: QR | kingdom | emblem
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#fff">
<table dir="rtl" width="700" cellpadding="0" cellspacing="0" role="presentation" style="width:700px;max-width:100%;border:2px solid ${GREEN};border-collapse:collapse;font-family:'Traditional Arabic','Sakkal Majalla',Tahoma,serif;font-size:16pt;line-height:1.8;color:#111;background:#fff">
  <tr>
    <td style="background:${GREEN};color:#fff;text-align:center;font-weight:bold;padding:10px 12px;border-bottom:3px solid ${GOLD};font-size:15pt">بسم الله الرحمن الرحيم</td>
  </tr>
  <tr>
    <td style="padding:0;border-bottom:2px solid ${GOLD}">
      <table dir="ltr" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-collapse:collapse">
        <tr>
          <td width="88" valign="middle" align="left" style="padding:12px;width:88px">${qr}</td>
          <td valign="middle" align="center" style="padding:12px 8px" dir="rtl">
            ${headerCenter}
            <div style="color:${GOLD};font-size:11pt;margin-top:2px">منصة ركيزة الذكية</div>
          </td>
          <td width="88" valign="middle" align="right" style="padding:12px;width:88px">${emblem}</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-collapse:collapse;background:${LIGHT};border:1px solid ${GREEN};border-radius:8px">
        <tr><td style="padding:10px 12px;font-size:13pt;direction:rtl;text-align:right;font-family:Tahoma,Arial,sans-serif">
          <div><b style="color:${GREEN}">الرقم:</b> <span dir="ltr">${doc.number || '—'}</span></div>
          <div><b style="color:${GREEN}">التاريخ:</b> ${officialDateDisplay(doc.dateHijri, doc.dateGregorian)}</div>
          <div><b style="color:${GREEN}">إلى:</b> ${doc.recipients || ''}</div>
          <div><b style="color:${GREEN}">الموضوع:</b> ${doc.subject || ''}</div>
        </td></tr>
      </table>
    </td>
  </tr>
  ${parties}
  ${reasons}
  <tr>
    <td style="padding:8px 16px 16px;font-size:15pt;direction:rtl;text-align:right;white-space:pre-wrap;font-family:'Traditional Arabic',Tahoma,serif">${bodyHtml}</td>
  </tr>
  ${study}
  <tr>
    <td style="text-align:center;font-size:11pt;color:#666;border-top:2px solid ${GOLD};padding:10px;font-family:Tahoma,Arial,sans-serif">${footer}</td>
  </tr>
</table>
</body>
</html>`;
}
