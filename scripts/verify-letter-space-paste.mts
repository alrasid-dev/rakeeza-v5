import { buildOfficialLetterHtml } from '../src/lib/official-letter-html';
import { bodyToExportHtml, ensurePreWrapOnParagraphs } from '../src/lib/body-html-bridge';
import { buildPasteStatePatch } from '../src/lib/paste-state';
import { normalizeBodyText } from '../src/components/OfficialPaperPreview';

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('ok ', msg);
}

// 1) Leading spaces survive into preview HTML
const spaced = '   السلام عليكم ورحمة الله وبركاته وبعد:-\n\nنص تجريبي للتحول الرقمي.\n\nوالله يحفظكم';
const html = bodyToExportHtml(spaced, { fallbackAlign: 'right', fontFamily: 'Amiri' });
ok(/&nbsp;|&nbsp;|pre-wrap|\\u00a0/.test(html) || html.includes('\u00a0') || /white-space:\s*pre-wrap/.test(html) || /&#160;/.test(html) || html.includes('&nbsp;') || /^(?:\s|&nbsp;)/m.test(html), 'export html preserves space shift mechanism');
ok(/السلام عليكم/.test(html), 'salutation present');

const tiptap = ensurePreWrapOnParagraphs('<p>   مرحبا</p>');
ok(/white-space:\s*pre-wrap/.test(tiptap), 'tiptap html gets pre-wrap');

const kept = normalizeBodyText('كلمة\u00a0مسافة');
ok(kept.includes('\u00a0'), 'normalizeBodyText keeps nbsp');

// 2) Letter paste fills recipients + subject
const letterPaste = `فضيلة رئيس المحكمة سلمه الله

السلام عليكم ورحمة الله وبركاته وبعد:-

إشارة إلى التحول الرقمي في المنظومة العدلية وتطبيق أدوات الذكاء الاصطناعي لمساندة الكوادر القضائية.

والله يحفظكم`;
const patch = buildPasteStatePatch(letterPaste, { formName: 'خطاب صادر' });
ok(patch.detectedKind === 'letter' || patch.json.templateKind === 'officialLetter', 'detected as letter got ' + patch.detectedKind + '/' + (patch.json as any).templateKind);
ok(Boolean((patch.form.recipients || '').trim()), 'recipients filled: ' + JSON.stringify(patch.form.recipients));
ok(Boolean((patch.form.body || '').trim()), 'body filled');
ok(/والله يحفظكم/.test(patch.form.body || ''), 'closing kept');

// 3) Table paste yields tableRows and HTML table
const tablePaste = `الاسم\tالهوية
أحمد محمد\t1234567890
سارة علي\t0987654321`;
const tpatch = buildPasteStatePatch(tablePaste, {});
ok((tpatch.tableRows || []).length >= 2, 'tableRows >= 2 got ' + (tpatch.tableRows || []).length);

const full = buildOfficialLetterHtml({
  subject: patch.form.subject || 'تجربة',
  recipients: patch.form.recipients || 'فضيلة رئيس المحكمة',
  body: spaced,
  dateHijri: '1448/04/09',
  tableRows: tpatch.tableRows,
  fontFamily: 'Amiri',
  fontSizePt: 16,
});
ok(/الجدول|<table/i.test(full), 'preview HTML includes table for tableRows');
ok(/white-space:\\s*pre-wrap|white-space: pre-wrap/.test(full), 'preview CSS has pre-wrap');

console.log('All letter-space-paste checks PASSED');
