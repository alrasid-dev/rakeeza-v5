/**
 * اختبار شامل للإصلاحات الخمسة (PDF + الكليشة):
 * 1) اللون الأخضر الجديد #1f7a3f (بدل #006C35 الداكن)
 * 2) إصلاح الأخضر المكسور في قالب التعميم (لا #004d26 / #1B4332)
 * 3) حدود كاملة على كل td في بطاقة القضية + empty-cells
 * 4) حدود فاصلة في الترويسة (المملكة/الوزارة/المحكمة + QR/رقم/تاريخ)
 * 5) @page A4 + انكسار الجداول بين الصفوف (multi-page)
 */
import type { OfficialLetterDoc } from '../src/lib/official-letter-html';
import { buildOfficialLetterHtml } from '../src/lib/official-letter-html';

const CASE_CARD_HTML = [
  '<table class="case-card">',
  '  <tr><td class="label" data-col-type="label"><p>التشكيل</p></td><td class="value" data-col-type="value"><p>الدائرة الثامنة / التشكيل الخامس عشر</p></td></tr>',
  '  <tr><td class="label" data-col-type="label"><p>رقم القضية</p></td><td class="value" data-col-type="value"><p>4571449052</p></td></tr>',
  '  <tr><td class="label" data-col-type="label"><p>ملاحظة</p></td><td class="value" data-col-type="value"></td></tr>',
  '</table>',
].join('\n');

const base: OfficialLetterDoc = {
  number: '123', subject: 'اختبار', recipients: 'إلى', body: CASE_CARD_HTML,
  docType: 'تعميم', fontFamily: 'Traditional Arabic',
};

const html = buildOfficialLetterHtml(base, { forPdf: true });

const checks: [string, boolean][] = [
  ['اللون الأخضر الجديد #1f7a3f موجود', html.includes('#1f7a3f')],
  ['اللون الداكن القديم #006C35 غير موجود', !html.includes('#006C35')],
  ['empty-cells: show موجود', html.includes('empty-cells: show')],
  ['حد label = أخضر', html.includes('border: 1px solid #1f7a3f')],
  ['حد value = ذهبي', html.includes('border: 1px solid #C5A059')],
  ['حد فاصل في الترويسة (border-bottom ذهبي)', html.includes('border-bottom:1px solid #C5A059')],
  ['@page A4 موجود', html.includes('@page { size: A4 portrait')],
  ['انكسار بين الصفوف (tr/td avoid) موجود', html.includes('tr, td, .card-block { page-break-inside: avoid')],
  ['الجداول لا تتجاوز العرض (max-width)', html.includes('table { max-width: 100%')],
];

// قالب التعميم (taameem-circular) — إصلاح الأخضر المكسور
const taameem = buildOfficialLetterHtml({ ...base, paperLayout: 'taameem-circular' }, { forPdf: true });
checks.push(['تعميم: لا #004d26 مكسور', !taameem.includes('#004d26')]);
checks.push(['تعميم: لا #1B4332 مكسور', !taameem.includes('#1B4332')]);
checks.push(['تعميم: الأخضر الجديد موجود', taameem.includes('#1f7a3f')]);

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed += 1;
}
console.log(failed === 0 ? '\n=== كل الفحوصات صحيحة ===' : `\n=== ${failed} فحص فشل ===`);
process.exit(failed === 0 ? 0 : 1);
