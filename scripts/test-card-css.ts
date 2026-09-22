/**
 * اختبار توحيد CSS بطاقة القضية:
 * 1) border-collapse + border-spacing: 0
 * 2) border: 2px (table) + border-right 2px (label) + border-bottom (value/rows)
 * 3) font-family: inherit
 * 4) direction: rtl (label/value) + ltr للأرقام
 */
import { buildOfficialLetterHtml } from '../src/lib/official-letter-html';
import { inlineCaseCardStyles } from '../src/lib/case-card';

const CASE_CARD_HTML = [
  '<table class="case-card">',
  '  <tr><td class="label" data-col-type="label"><p>التشكيل</p></td><td class="value" data-col-type="value"><p>الدائرة الثامنة</p></td></tr>',
  '  <tr><td class="label" data-col-type="label"><p>رقم القضية</p></td><td class="value" data-col-type="value"><p data-numeric="true">4571449052</p></td></tr>',
  '</table>',
].join('\n');

const html = buildOfficialLetterHtml(
  { number: '1', subject: 'ت', recipients: 'إ', body: CASE_CARD_HTML, docType: 'خطاب' } as never,
  { forPdf: true },
);

const checks: [string, boolean][] = [
  ['border-collapse: collapse !important', html.includes('border-collapse: collapse !important')],
  ['border-spacing: 0 !important', html.includes('border-spacing: 0 !important')],
  ['table border 2px', html.includes('border: 2px solid #1f7a3f !important')],
  ['label border-right 2px', html.includes('border-right: 2px solid #1f7a3f !important')],
  ['value border-bottom', html.includes('border-bottom: 1px solid #C5A059 !important')],
  ['tr:not(:last-child) border-bottom', html.includes('tr:not(:last-child) td')],
  ['font-family: inherit', html.includes('font-family: inherit !important')],
  ['label direction rtl', html.includes('direction: rtl !important')],
  ['numeric direction ltr', html.includes('direction: ltr !important')],
  ['numeric text-align center', html.includes('text-align: center !important')],
];

// inline styles (Outlook/Excel)
const inlined = inlineCaseCardStyles(CASE_CARD_HTML);
checks.push(['inline: table border 2px', inlined.includes('border:2px solid #1f7a3f !important')]);
checks.push(['inline: border-spacing 0', inlined.includes('border-spacing:0 !important')]);
checks.push(['inline: label direction rtl', inlined.includes('direction:rtl !important')]);

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed += 1;
}
console.log(failed === 0 ? '\n=== كل الفحوصات صحيحة ===' : `\n=== ${failed} فحص فشل ===`);
process.exit(failed === 0 ? 0 : 1);
