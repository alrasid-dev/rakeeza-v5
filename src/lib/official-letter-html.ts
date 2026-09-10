/** Shared official MOJ letter HTML — used by PDF export and previews */

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

export function buildOfficialLetterHtml(doc: OfficialLetterDoc, opts?: { forPdf?: boolean }) {
  const court = doc.courtName || 'المحكمة العمالية بالرياض';
  const header =
    doc.headerLines?.filter(Boolean) ||
    ['المملكة العربية السعودية', 'وزارة العدل', court];
  const footer = doc.footer || 'للاستخدام الداخلي فقط';
  const pageCss = opts?.forPdf
    ? `@page { size: A4; margin: 12mm; } body { margin: 0; }`
    : '';

  const qr = doc.qrDataUrl
    ? `<img src="${esc(doc.qrDataUrl)}" alt="QR" style="width:72px;height:72px;border:1px solid ${GOLD};border-radius:6px;background:#fff" />`
    : `<div style="width:72px;height:72px;border:1px dashed ${GOLD};border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:${GREEN};background:#fff">QR</div>`;

  const emblem = (label: string) =>
    `<div style="width:64px;height:64px;border:1.5px solid ${GOLD};border-radius:12px;display:flex;align-items:center;justify-content:center;background:#fff;color:${GREEN};font-size:9px;text-align:center;line-height:1.2;padding:4px">${label}</div>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<style>
${pageCss}
* { box-sizing: border-box; }
body {
  font-family: 'Noto Naskh Arabic', 'Traditional Arabic', 'Sakkal Majalla', Tahoma, serif;
  color: #111;
  background: #fff;
  font-size: 14px;
  line-height: 1.85;
}
.paper {
  max-width: 210mm;
  margin: 0 auto;
  border: 2px solid ${GREEN};
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}
.bismillah {
  background: ${GREEN};
  color: #fff;
  text-align: center;
  font-weight: 700;
  padding: 8px 12px;
  font-size: 15px;
  border-bottom: 3px solid ${GOLD};
}
.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px 10px;
  border-bottom: 2px solid ${GOLD};
}
.brand-center { text-align: center; flex: 1; }
.brand-center .court { color: ${GREEN}; font-weight: 800; font-size: 16px; }
.brand-center .sub { color: ${GOLD}; font-size: 12px; margin-top: 2px; }
.meta {
  margin: 14px 18px;
  background: #E6F2EB;
  border: 1px solid ${GREEN};
  border-radius: 8px;
  padding: 10px 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
  font-size: 13px;
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
  border-top: 2px solid ${GOLD};
  background: #fafcfb;
}
table.parties {
  width: 100%;
  border-collapse: collapse;
  margin-top: 6px;
  font-size: 12px;
}
table.parties th, table.parties td {
  border: 1px solid ${GREEN};
  padding: 6px 8px;
  text-align: center;
}
table.parties th { background: ${GREEN}; color: #fff; }
</style>
</head>
<body>
<div class="paper">
  <div class="bismillah">بسم الله الرحمن الرحيم</div>
  <div class="brand-row">
    ${emblem('شعار<br/>الوزارة')}
    <div class="brand-center">
      ${header.map((h) => `<div class="court" style="font-size:${h === court ? 16 : 13}px">${esc(h)}</div>`).join('')}
      <div class="sub">منصة ركيزة الذكية</div>
    </div>
    ${qr}
  </div>
  <div class="meta">
    <div><span class="label">الرقم:</span> <span dir="ltr">${esc(doc.number || '—')}</span></div>
    <div><span class="label">التاريخ:</span> ${esc(doc.dateGregorian || doc.dateHijri || '—')}</div>
    <div style="grid-column:1/-1"><span class="label">إلى:</span> ${esc(doc.recipients || '—')}</div>
    <div style="grid-column:1/-1"><span class="label">الموضوع:</span> ${esc(doc.subject || '—')}</div>
  </div>
  <div class="section">
    ${
      doc.parties
        ? `<h3>الأطراف</h3><div class="body">${pre(doc.parties)}</div>`
        : ''
    }
    ${
      doc.facts
        ? `<h3>الوقائع</h3><div class="body">${pre(doc.facts)}</div>`
        : ''
    }
    ${
      doc.reasons
        ? `<h3>الأسباب</h3><div class="body">${pre(doc.reasons)}</div>`
        : ''
    }
    ${
      doc.body
        ? `<h3>النص</h3><div class="body">${pre(doc.body)}</div>`
        : ''
    }
    ${
      doc.studyFields
        ? `<h3>الدراسة</h3><div class="body">${pre(doc.studyFields)}</div>`
        : ''
    }
  </div>
  <div class="foot">${esc(footer)}</div>
</div>
</body>
</html>`;
}
