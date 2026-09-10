/** Client helper: copy Outlook-friendly HTML */
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

export function buildLetterHtml(doc: {
  number?: string | null;
  subject?: string;
  dateGregorian?: string | null;
  recipients?: string;
  body?: string;
  footer?: string;
}) {
  return `<div dir="rtl" style="font-family:'Traditional Arabic','Sakkal Majalla',Tahoma,serif;font-size:16pt;line-height:1.8;color:#000;border:2px solid #006C35;padding:0;max-width:700px">
<div style="background:#006C35;color:#fff;text-align:center;font-weight:bold;padding:8px;border-bottom:3px solid #C5A059">بسم الله الرحمن الرحيم</div>
<div style="text-align:center;color:#006C35;font-weight:bold;margin-top:12px">المملكة العربية السعودية</div>
<div style="text-align:center;color:#006C35;font-weight:bold">وزارة العدل</div>
<div style="text-align:center;color:#006C35;font-weight:bold;font-size:18pt">المحكمة العمالية بالرياض</div>
<div style="margin:16px;background:#E6F2EB;border:1px solid #006C35;border-radius:8px;padding:10px">
<div>الرقم: ${doc.number || '—'}</div>
<div>التاريخ: ${doc.dateGregorian || '—'}</div>
<div>إلى: ${doc.recipients || ''}</div>
<div>الموضوع: ${doc.subject || ''}</div>
</div>
<div style="margin:16px;white-space:pre-wrap">${(doc.body || '').replace(/\n/g, '<br/>')}</div>
<div style="text-align:center;font-size:11pt;color:#666;border-top:2px solid #C5A059;padding:8px">${doc.footer || 'للاستخدام الداخلي فقط'}</div>
</div>`;
}
