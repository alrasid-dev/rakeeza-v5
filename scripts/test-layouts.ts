/**
 * اختبار تميّز التخطيطات الثلاثة (formal-gold / study-report / compact-memo):
 * يستدعي buildOfficialLetterHtml مع كل تخطيط ويتحقق أن CSS الناتج مختلف ويحوي
 * الخصائص المميزة لكل تخطيط.
 */
import { buildOfficialLetterHtml, type OfficialLetterDoc } from '../src/lib/official-letter-html';

const doc: OfficialLetterDoc = {
  number: '1',
  subject: 'اختبار التخطيط',
  recipients: 'سعادة',
  body: '<p>نص تجريبي</p>',
  docType: 'خطاب',
  fontFamily: 'Traditional Arabic',
  fontSizePt: 14,
};

const CASES: { layout: string; patterns: string[] }[] = [
  {
    layout: 'study-report',
    patterns: [
      'background: #2e9e5c; color: #fff; padding: 8px 14px', // sectionStyle
      'linear-gradient(135deg, #2e9e5c', // bismillah gradient
      'box-shadow: 0 2px 6px', // sectionStyle shadow
    ],
  },
  {
    layout: 'formal-gold',
    patterns: [
      '3px double #C5A059', // paperBorder
      'linear-gradient(90deg, #8a6b2e', // bismillah gold gradient
      'letter-spacing: 2px', // bismillah spacing
    ],
  },
  {
    layout: 'compact-memo',
    patterns: [
      '1px solid #cccccc', // paperBorder
      'border-right: 4px solid #2e9e5c', // meta
      '1px dashed #999', // foot
    ],
  },
];

let failed = 0;
const htmls: Record<string, string> = {};

for (const c of CASES) {
  const html = buildOfficialLetterHtml({ ...doc, paperLayout: c.layout }, { forPdf: true });
  htmls[c.layout] = html;
  for (const p of c.patterns) {
    const ok = html.includes(p);
    console.log(`${ok ? '✅' : '❌'} [${c.layout}] يحتوي: ${p}`);
    if (!ok) failed += 1;
  }
}

// التأكد أن التخطيطات الثلاثة تُنتج HTML مختلفاً (4+ خصائص مختلفة)
const distinct =
  htmls['study-report'] !== htmls['formal-gold'] &&
  htmls['formal-gold'] !== htmls['compact-memo'] &&
  htmls['study-report'] !== htmls['compact-memo'];
console.log(`${distinct ? '✅' : '❌'} التخطيطات الثلاثة تُنتج HTML مختلفاً`);
if (!distinct) failed += 1;

console.log(failed === 0 ? '\n=== كل الفحوصات صحيحة ===' : `\n=== ${failed} فحص فشل ===`);
process.exit(failed === 0 ? 0 : 1);
