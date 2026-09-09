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
  return `<div dir="rtl" style="font-family:'Traditional Arabic','Sakkal Majalla',Tahoma,serif;font-size:16pt;line-height:1.8;color:#000">
<div style="text-align:center;color:#006C35;font-weight:bold">المحكمة العمالية بالرياض</div>
<div style="margin-top:12px">الرقم: ${doc.number || '—'}</div>
<div>التاريخ: ${doc.dateGregorian || '—'}</div>
<div>الموضوع: ${doc.subject || ''}</div>
<div style="margin-top:12px">إلى: ${doc.recipients || ''}</div>
<div style="margin-top:16px;white-space:pre-wrap">${(doc.body || '').replace(/\n/g, '<br/>')}</div>
<hr/>
<div style="font-size:11pt;color:#666">${doc.footer || 'للاستخدام الداخلي فقط'}</div>
</div>`;
}
