import fs from 'node:fs';
import path from 'node:path';
import { buildOfficialLetterHtml } from '../src/lib/official-letter-html';
import { buildLetterHtml } from '../src/lib/outlook-clipboard';

const sample = {
  number: 'صادر-1448-0001',
  subject: 'موضوع تجريبي للتحقق',
  dateGregorian: '2026-09-19',
  dateHijri: '1448/03/28هـ',
  recipients: 'سعادة رئيس المحكمة',
  copyTo: 'وكيل الوزارة',
  body: 'نص الخطاب التجريبي للتحقق من الخطوط والقالب.',
  footer: 'للاستخدام الداخلي فقط',
  courtName: 'المحكمة العمالية بالرياض',
  fontSizePt: 14,
};

const combos = [
  { paperLayout: 'modern-hex', fontFamily: 'Traditional Arabic', tag: 'hex-amiri' },
  { paperLayout: 'classic-green', fontFamily: 'Sakkal Majalla', tag: 'classic-scheh' },
];

const outDir = path.join(process.cwd(), 'tmp');
fs.mkdirSync(outDir, { recursive: true });

let outlookAll = '';
let pdfAll = '';

for (const c of combos) {
  const doc = { ...sample, paperLayout: c.paperLayout, fontFamily: c.fontFamily };
  const outlook = buildLetterHtml({ ...doc, origin: 'https://example.com' });
  const pdf = buildOfficialLetterHtml(doc, { forPdf: true });
  outlookAll += `\n<!-- ${c.tag} -->\n` + outlook;
  pdfAll += `\n<!-- ${c.tag} -->\n` + pdf;
  fs.writeFileSync(path.join(outDir, `verify-outlook-${c.tag}.html`), outlook, 'utf8');
  fs.writeFileSync(path.join(outDir, `verify-pdf-${c.tag}.html`), pdf, 'utf8');
}

fs.writeFileSync(path.join(outDir, 'verify-outlook.html'), outlookAll, 'utf8');
fs.writeFileSync(path.join(outDir, 'verify-pdf.html'), pdfAll, 'utf8');
console.log('wrote verify-outlook.html and verify-pdf.html');
