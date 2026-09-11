import { officialDateDisplay } from '@/lib/hijri';
/** Client helper: copy Outlook-friendly HTML */

const GREEN = '#006C35';
const GOLD = '#C5A059';

export async function copyOutlookHtml(html: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const plain = new Blob([html.replace(/<[^>]+>/g, '')], { type: 'text/plain' });
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
      await navigator.clipboard.writeText(html);
      return true;
    } catch {
      return false;
    }
  }
}

const EMBLEM =
  `<div style="width:56px;height:56px;border:1.5px solid ${GOLD};border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;color:${GREEN};font-weight:700">شعار</div>`;

export function buildLetterHtml(doc: {
  number?: string | null;
  subject?: string;
  dateGregorian?: string | null;
  dateHijri?: string | null;
  recipients?: string;
  body?: string;
  footer?: string;
  courtName?: string;
}) {
  const court = doc.courtName || 'المحكمة العمالية بالرياض';
  const qr =
    `<div style="width:56px;height:56px;border:1px dashed ${GOLD};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;color:${GREEN};background:#fff">QR</div>`;
  return `<div dir="rtl" style="font-family:'Traditional Arabic','Sakkal Majalla',Tahoma,serif;font-size:16pt;line-height:1.8;color:#000;border:2px solid ${GREEN};padding:0;max-width:700px">
<div style="background:${GREEN};color:#fff;text-align:center;font-weight:bold;padding:8px;border-bottom:3px solid ${GOLD}">بسم الله الرحمن الرحيم</div>
<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:2px solid ${GOLD};direction:rtl">
${EMBLEM}
<div style="flex:1;text-align:center;min-width:0">
<div style="color:${GREEN};font-weight:bold;font-size:12pt">المملكة العربية السعودية</div>
<div style="color:${GREEN};font-weight:bold;font-size:12pt">وزارة العدل</div>
<div style="color:${GREEN};font-weight:bold;font-size:16pt">${court}</div>
<div style="color:${GOLD};font-size:11pt">منصة ركيزة الذكية</div>
</div>
${qr}
</div>
<div style="margin:16px;background:#E6F2EB;border:1px solid ${GREEN};border-radius:8px;padding:10px">
<div>الرقم: ${doc.number || '—'}</div>
<div>التاريخ: ${officialDateDisplay(doc.dateHijri, doc.dateGregorian)}</div>
<div>إلى: ${doc.recipients || ''}</div>
<div>الموضوع: ${doc.subject || ''}</div>
</div>
<div style="margin:16px;white-space:pre-wrap">${(doc.body || '').replace(/\n/g, '<br/>')}</div>
<div style="text-align:center;font-size:11pt;color:#666;border-top:2px solid ${GOLD};padding:8px">${doc.footer || 'للاستخدام الداخلي فقط'}</div>
</div>`;
}
