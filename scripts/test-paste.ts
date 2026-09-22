/**
 * اختبار بطاقة القضية (جدول بعمودين label/value) + فلترة الأعمدة.
 */
import { adaptPastedTable } from '../src/lib/universal-table-parser';

const HEADERS = [
  'الدائرة', 'مصدر الحكم', 'رقم الحكم', 'تاريخ الحكم', 'رقم القضية',
  'مبلغ المطالبة', 'مدخلات الحكم', 'الملحوظة الرئيسية', 'نص الملحوظة', 'المعالجة', 'الموظف',
];

const ROWS = [
  [
    'الدائرة الثامنة / التشكيل الخامس عشر - الفردية - دوائر عمالية',
    'حسن بن زيد بن محمد سهلي',
    '4830375831',
    '1448/04/06',
    '4571449052',
    '983,594',
    'غير صحيح',
    'صفة الحكم',
    'الدعوى يسيرة...',
    'تم ارسال ايميل',
    'الحميدي',
  ],
  [
    'الدائرة الثامنة / التشكيل السادس - الفردية - دوائر عمالية',
    'حسن بن زيد بن محمد سهلي',
    '4830367372',
    '1448/04/07',
    '4771743892',
    '1,200,000',
    'غير صحيح',
    'صحيح',
    'الدعوى يسيرة...',
    '—',
    'الحميدي',
  ],
  [
    'الدائرة الثامنة / التشكيل الثاني والعشرون - الفردية - دوائر عمالية',
    'حسن بن زيد بن محمد سهلي',
    '4830362769',
    '1448/04/08',
    '4772544550',
    '500,000',
    'صحيح',
    'صحيح',
    'الدعوى معقدة...',
    '—',
    'الحميدي',
  ],
];

function buildHtml(rows: string[][]): string {
  const th = HEADERS.map((h) => `<td>${h}</td>`).join('');
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<html><body><table><tr>${th}</tr>${body}</table></body></html>`;
}

function labelsOf(html: string): string[] {
  return [...html.matchAll(/data-col-type="label"><p>([^<]+)<\/p>/g)].map((m) => m[1]);
}

function valueCountOfFirstField(html: string): number {
  const m = html.match(/data-col-type="value">([\s\S]*?)<\/td>/);
  return m ? (m[1].match(/<p>/g) || []).length : 0;
}

// 1) 3 صفوف → بطاقة بعمودين، كل حقل 3 قيم
const r3 = adaptPastedTable(buildHtml(ROWS))!;
console.log('=== 3 صفوف — HTML الناتج ===');
console.log(r3.editorHtml);
const labels3 = labelsOf(r3.editorHtml);
const v3 = valueCountOfFirstField(r3.editorHtml);
console.log('\nlabels:', labels3.join(' | '));
console.log('عدد القيم في أول حقل:', v3);

// 2) صف واحد → بطاقة، قيمة واحدة
const r1 = adaptPastedTable(buildHtml([ROWS[0]]))!;
console.log('\n=== صف واحد — HTML الناتج ===');
console.log(r1.editorHtml);
const v1 = valueCountOfFirstField(r1.editorHtml);
console.log('\nعدد القيم في أول حقل (صف واحد):', v1);

// 3) 12 صفاً → 6 أعمدة (fallback)
const r12 = adaptPastedTable(buildHtml(Array(12).fill(ROWS[0])))!;
const isFallback6Col = !r12.editorHtml.includes('data-col-type="label"');
console.log('\n12 صفاً → استخدم 6 أعمدة (بدون بطاقة):', isFallback6Col);

const orderOk = labels3.join('|') === 'التشكيل|رقم القضية|مصدر الحكم|رقم الحكم|الرصد|المعالجة المقترحة';
const ok = orderOk && v3 === 3 && v1 === 1 && isFallback6Col;

console.log(ok ? '\nكل الفحوصات صحيحة' : `\nيوجد خطأ: orderOk=${orderOk}, v3=${v3}, v1=${v1}, fallback=${isFallback6Col}`);
process.exit(ok ? 0 : 1);
