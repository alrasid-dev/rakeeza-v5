/**
 * اختبار شامل لمصدّرات بطاقة القضية (PDF / Outlook / Excel / منع كسر labels).
 * يفحص أن بطاقة القضية تظهر بالألوان في كل مسار وأن labels لا تنكسر.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { OfficialLetterDoc } from '../src/lib/official-letter-html';
import { buildOfficialLetterHtml } from '../src/lib/official-letter-html';
import { buildLetterHtml } from '../src/lib/outlook-clipboard';
import {
  parseCaseCard,
  inlineCaseCardStyles,
  CASE_CARD_GREEN,
  CASE_CARD_GOLD,
} from '../src/lib/case-card';

const CASE_CARD_HTML = [
  '<table class="case-card">',
  '  <tr><td class="label" data-col-type="label"><p>التشكيل</p></td><td class="value" data-col-type="value"><p>الدائرة الثامنة / التشكيل الخامس عشر - الفردية</p></td></tr>',
  '  <tr><td class="label" data-col-type="label"><p>رقم القضية</p></td><td class="value" data-col-type="value"><p>4571449052</p></td></tr>',
  '  <tr><td class="label" data-col-type="label"><p>الأطراف</p></td><td class="value" data-col-type="value"><p>حسن بن زيد بن محمد سهلي</p><p>محمد بن سعد بن علي</p></td></tr>',
  '</table>',
].join('\n');

const doc: OfficialLetterDoc = {
  number: 'صادر-1448-0001',
  subject: 'اختبار تصدير بطاقة القضية',
  dateGregorian: '2026-09-21',
  dateHijri: '1448/04/06هـ',
  recipients: 'سعادة رئيس المحكمة',
  body: CASE_CARD_HTML,
  footer: 'للاستخدام الداخلي فقط',
  courtName: 'المحكمة العمالية بالرياض',
  fontSizePt: 14,
  paperLayout: 'classic-green',
  fontFamily: 'Traditional Arabic',
};

const outDir = path.join(os.tmpdir(), 'rakeza-export-test');
fs.mkdirSync(outDir, { recursive: true });

function save(name: string, content: string): number {
  const file = path.join(outDir, name);
  fs.writeFileSync(file, content, 'utf8');
  return fs.statSync(file).size;
}

console.log('دليل الإخراج:', outDir);

// 1) PDF — HTML المُغذّى إلى Chromium
const pdfHtml = buildOfficialLetterHtml(doc, { forPdf: true });
const pdfSize = save('pdf.html', pdfHtml);
const pdfHasCard = pdfHtml.includes('table.case-card');
const pdfHasGreen = pdfHtml.includes(CASE_CARD_GREEN);
const pdfHasGold = pdfHtml.includes(CASE_CARD_GOLD);
console.log(`PDF  : size=${pdfSize} | table.case-card=${pdfHasCard} | green=${pdfHasGreen} | gold=${pdfHasGold}`);

// 2) Outlook — نفس مسار الحافظة الفعلي (buildLetterHtml)
const outlookHtml = buildLetterHtml({ ...doc, origin: 'https://example.com' });
const outlookSize = save('outlook.html', outlookHtml);
const outlookHasInlineGreen = outlookHtml.includes(`background-color:${CASE_CARD_GREEN}`);
const outlookHasInlineGold = outlookHtml.includes(`border:1px solid ${CASE_CARD_GOLD}`);
console.log(`Outlook: size=${outlookSize} | inline-green=${outlookHasInlineGreen} | inline-gold=${outlookHasInlineGold}`);

// 3) Excel — تحويل البطاقة إلى صفوف label/value
const card = parseCaseCard(CASE_CARD_HTML);
const excelRows = card?.length ?? 0;
console.log(`Excel : rows=${excelRows} | labels=${card ? card.map((c) => c.label).join('|') : 'null'}`);

// 4) منع كسر labels — inline styles
const inlined = inlineCaseCardStyles(CASE_CARD_HTML);
save('inlined-case-card.html', inlined);
const tdNoWrap = /<td[^>]*white-space:nowrap/.test(inlined);
const pNoWrap = /<p[^>]*white-space:nowrap/.test(inlined);
console.log(`Labels: td.nowrap=${tdNoWrap} | p.nowrap=${pNoWrap}`);

// فحص إضافي: مسار forOutlook في buildOfficialLetterHtml
const forOutlookHtml = buildOfficialLetterHtml(doc, { forOutlook: true });
console.log(`forOutlook path: inline-green=${forOutlookHtml.includes(`background-color:${CASE_CARD_GREEN}`)}`);

const ok =
  pdfHasCard && pdfHasGreen && pdfHasGold &&
  outlookHasInlineGreen && outlookHasInlineGold &&
  excelRows === 3 && tdNoWrap && pNoWrap;
console.log(ok ? '\n=== كل الفحوصات صحيحة ===' : '\n=== يوجد خطأ في أحد المصدّرين ===');
process.exit(ok ? 0 : 1);
