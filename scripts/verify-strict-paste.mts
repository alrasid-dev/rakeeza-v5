/**
 * Prove Smart Paste never invents names/amounts/IDs absent from the input.
 * Run: npx tsx scripts/verify-strict-paste.mts
 */
import { extractStrictPaste, findInventedTokens } from '../src/lib/smart-paste.ts';
import { buildPasteStatePatch, emptyJudgmentCardShell } from '../src/lib/paste-state.ts';
import { mergeJudgmentCardFromPaste, JUDGMENT_CARD_SEED } from '../src/lib/judgment-card.ts';

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('ok ', msg);
}

const INVENTED_NAME = 'عبدالله بن محمد القحطاني';
const INVENTED_AMOUNT = '999,888.77';
const INVENTED_CASE = '1111222233';

// --- 1) Partial letter: only subject present ---
const LETTER = `الموضوع: طلب إفادة
السلام عليكم ورحمة الله وبركاته وبعد:-
نأمل التكرم بالإفادة.`;

{
  const { json } = extractStrictPaste(LETTER);
  assert(json.templateKind === 'officialLetter' || json.templateKind === 'notice' || json.templateKind === 'memorandum', `letter-ish kind (got ${json.templateKind})`);
  if (json.templateKind === 'officialLetter') {
    assert(json.subject.includes('طلب إفادة'), `subject extracted (got ${json.subject})`);
    assert(!json.parties.includes(INVENTED_NAME), 'parties has no invented name');
    assert(json.parties === '' || LETTER.includes(json.parties), 'parties empty or from paste');
    assert(json.recipients === '' || LETTER.includes(json.recipients), 'recipients empty or from paste');
  }
  const leaks = findInventedTokens(json, LETTER, [INVENTED_NAME, INVENTED_AMOUNT, INVENTED_CASE]);
  assert(leaks.length === 0, `no invented tokens in letter JSON (leaks=${leaks})`);
}

// --- 2) Briefing paste with ONLY formation — seed IDs must not appear ---
const BRIEFING = `بطاقة عرض
التشكيل: الرابعة
الرصد: اختيار الحكم غير نهائي`;

{
  const { json } = extractStrictPaste(BRIEFING, { briefingTemplate: true });
  assert(json.templateKind === 'displayCard' || json.templateKind === 'reminderCard', `briefing kind (got ${json.templateKind})`);
  if (json.templateKind === 'displayCard' || json.templateKind === 'reminderCard') {
    assert(json.formation.includes('الرابعة') || json.formation === 'الرابعة', `formation from paste (got ${json.formation})`);
    assert(json.caseNumber === '', `caseNumber empty when absent (got '${json.caseNumber}')`);
    assert(json.judgmentNumber === '', `judgmentNumber empty when absent (got '${json.judgmentNumber}')`);
    assert(json.judgmentSource === '', `judgmentSource empty when absent (got '${json.judgmentSource}')`);
    assert(!json.caseNumber.includes('4772814332'), 'seed case id not leaked');
    assert(!json.judgmentNumber.includes('4830350652'), 'seed judgment id not leaked');
  }
  const patch = buildPasteStatePatch(BRIEFING, { briefingTemplate: true });
  assert(patch.judgmentCard, 'judgment card present');
  const caseRow = patch.judgmentCard!.find((r) => r.label === 'رقم القضية');
  const sourceRow = patch.judgmentCard!.find((r) => r.label.includes('مصدر'));
  assert(caseRow && caseRow.value === '', `patch caseNumber empty (got '${caseRow?.value}')`);
  assert(sourceRow && sourceRow.value === '', `patch source empty (got '${sourceRow?.value}')`);
  const leaks = findInventedTokens(json, BRIEFING, [INVENTED_NAME, INVENTED_AMOUNT, '4772814332', '4830350652']);
  assert(leaks.length === 0, `no seed/invented tokens in briefing JSON (leaks=${leaks})`);
}

// --- 3) mergeJudgmentCardFromPaste strict drops seed samples ---
{
  const merged = mergeJudgmentCardFromPaste(JUDGMENT_CARD_SEED, BRIEFING, {}, { strict: true });
  const vals = Object.fromEntries(merged.map((r) => [r.label, r.value]));
  assert(vals['رقم القضية'] === '', `strict merge case empty (got '${vals['رقم القضية']}')`);
  assert(vals['رقم الحكم'] === '', `strict merge judgment empty (got '${vals['رقم الحكم']}')`);
  assert(String(vals['التشكيل'] || '').includes('الرابعة'), `strict merge keeps formation (got '${vals['التشكيل']}')`);
  assert(!merged.some((r) => r.value === '4772814332'), 'strict merge no seed case id');
}

// --- 4) Study paste: amount only if present; invented amount stays out ---
const STUDY = [
  'نموذج تحليل حكم (شكوى)',
  'رقم القضية\t4670855622',
  'المدعي\tشركة النقل المحدودة',
  'المدعى عليه\tعامل أجنبي',
  'مقدارها\t753,078.48',
  'التوصية\tإثبات الأجور',
  'الاختصاص النوعي\tعمالي',
].join('\n');

{
  const { json } = extractStrictPaste(STUDY);
  assert(json.templateKind === 'study', `study kind (got ${json.templateKind})`);
  if (json.templateKind === 'study') {
    assert(json.caseNumber.includes('4670855622'), `case from paste (got ${json.caseNumber})`);
    assert(String(json.claimAmount).includes('753'), `amount from paste (got ${json.claimAmount})`);
    assert(!json.plaintiff.includes(INVENTED_NAME), 'plaintiff not invented');
    assert(!String(json.claimAmount).includes(INVENTED_AMOUNT), 'invented amount absent');
    assert(json.preparer === '' || STUDY.includes(json.preparer), 'preparer empty or from paste');
  }
  const leaks = findInventedTokens(json, STUDY, [INVENTED_NAME, INVENTED_AMOUNT, INVENTED_CASE]);
  assert(leaks.length === 0, `no invented tokens in study JSON (leaks=${leaks})`);
}

// --- 5) Empty shell has labels but blank values ---
{
  const shell = emptyJudgmentCardShell();
  assert(shell.length >= 5, 'shell has rows');
  assert(shell.every((r) => r.value === ''), 'shell values all empty');
  assert(shell.some((r) => r.label === 'رقم القضية'), 'shell has رقم القضية');
}

console.log('\nAll strict-paste checks passed.');
