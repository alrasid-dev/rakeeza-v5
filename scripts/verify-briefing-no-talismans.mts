import { buildJudgmentBriefingBlockHtml } from '../src/lib/judgment-card';
import { buildOfficialLetterHtml } from '../src/lib/official-letter-html';

function ok(c: boolean, m: string) {
  if (!c) throw new Error('FAIL ' + m);
  console.log('ok ', m);
}

const tiptapBody = `<p style="text-align: right">السلام عليكم ورحمة الله وبركاته وبعد:-</p>
<p style="text-align: right">تم رصد اختيار الحكم غير نهائي.</p>
<p style="text-align: right">وفي حال اقتضى الأمر إصدار صك مستبدل (جلسة مداولة).</p>
<p style="text-align: center">لإطلاع فضيلتكم والله يحفظكم</p>`;

const card = [
  { label: 'التشكيل', value: 'الثالثة عشر' },
  { label: 'رقم القضية', value: '4772814332' },
  { label: 'مصدر الحكم فضيلة الشيخ', value: 'أوس السحيباني' },
  { label: 'رقم الحكم', value: '4830350652' },
  { label: 'الرصد', value: 'اختيار الحكم غير نهائي' },
  { label: 'آلية المعالجة المقترحة', value: 'إصدار صك مستبدل' },
];

const html = buildJudgmentBriefingBlockHtml({
  card,
  letterBody: tiptapBody,
  mechanismText: 'وفي حال اقتضى الأمر إصدار صك مستبدل (جلسة مداولة).',
  observationText: tiptapBody, // should be ignored when letterBody is HTML
});

ok(!/&lt;p/.test(html), 'no escaped &lt;p talismans');
ok(!/&lt;p style/.test(html), 'no escaped style talismans');
ok(/<p\b/i.test(html), 'real <p> tags present');
ok((html.match(/وفي\s*حال\s*اقتضى\s*الأمر/g) || []).length === 1, 'mechanism once got ' + (html.match(/وفي\s*حال\s*اقتضى\s*الأمر/g) || []).length);
ok(/<table/i.test(html), 'card table present');
ok((html.match(/4772814332/g) || []).length === 1, 'case number once in table only');

const full = buildOfficialLetterHtml({
  judgmentBriefing: true,
  judgmentCard: card,
  body: tiptapBody,
  recipients: 'فضيلة رئيس المحكمة',
  subject: 'بشأن متابعة',
  fontFamily: 'Amiri',
  fontSizePt: 16,
});
ok(!/&lt;p/.test(full), 'full letter no talismans');
ok(/Amiri|font-family/i.test(full), 'font applied');

console.log('All briefing talisman/dup checks PASSED');
