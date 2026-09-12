/** Regression: Excel study TSV must fill caseNumber + claimAmount (4670855622 / 753,078.48) */
import { parseStudyPaste, studyToFormFields } from '../src/lib/parse-study.ts';
import { parsePaste } from '../src/lib/parse-paste.ts';
import { enrichStudySections, studyDisplayMeta } from '../src/lib/study-display.ts';

const SAMPLE = [
  'نموذج تحليل حكم (شكوى)',
  'بيانات القضية',
  'رقم القضية\tرقم الصك\tالتشكيل',
  '4670855622\t4411223344\tالرابعة',
  'المدعي/ة\tشركة النقل المحدودة',
  'المدعى عليه/ا\tعامل أجنبي',
  'الاختصاص النوعي\tالقبول\tالمطالبة\tمقدارها',
  'عمالي\tمقبول\tأجور متأخرة\t753,078.48',
  'دارس القضية\tفهد العتيبي',
  'ملخص الدعوى',
  'دعوى المدعي\tيطالب بأجور متأخرة',
  'إجابة المدعى عليه\tينكر الاستحقاق',
  'التوصية\tإثبات الأجور',
  'اسم معد الدراسة\tنورة الدوسري',
].join('\n');

const VERTICAL = [
  'رقم القضية',
  '4670855622',
  'المدعي',
  'شركة النقل المحدودة',
  'المدعى عليه',
  'عامل أجنبي',
  'مقدارها',
  '753,078.48',
  'التوصية',
  'إثبات الأجور',
  'معد الدراسة',
  'نورة الدوسري',
].join('\n');

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('ok ', msg);
}

const study = parseStudyPaste(SAMPLE);
assert(study.caseNumber === '4670855622', `caseNumber === 4670855622 (got ${study.caseNumber})`);
assert(
  String(study.claimAmount || '').replace(/,/g, '') === '753078.48' ||
    String(study.claimAmount || '').includes('753,078.48'),
  `claimAmount is 753,078.48 (got ${study.claimAmount})`,
);
assert(study.deedNumber === '4411223344', `deedNumber (got ${study.deedNumber})`);
assert(study.claimType === 'أجور متأخرة', `claimType (got ${study.claimType})`);
assert(study.researcher, `researcher filled (got ${study.researcher})`);
assert(study.preparer === 'نورة الدوسري', `preparer (got ${study.preparer})`);
assert(study.recommendation === 'إثبات الأجور', `recommendation (got ${study.recommendation})`);

const mapped = studyToFormFields(study);
assert(mapped.subject.includes('4670855622'), `subject from caseNumber (got ${mapped.subject})`);

const pasted = parsePaste(SAMPLE);
assert(pasted.detectedKind === 'study', `parsePaste detects study (got ${pasted.detectedKind})`);
assert(pasted.studySections?.caseNumber === '4670855622', 'parsePaste studySections.caseNumber');
assert(String(pasted.body || '').includes('753') || String(pasted.studySections?.claimAmount || '').includes('753'), 'amount reaches form body or study');

const vertical = parseStudyPaste(VERTICAL);
assert(vertical.caseNumber === '4670855622', `vertical caseNumber (got ${vertical.caseNumber})`);
assert(
  String(vertical.claimAmount || '').includes('753'),
  `vertical claimAmount (got ${vertical.claimAmount})`,
);

// Preview-style enrich: only parties in studySections, rest in form text
const thin = {
  plaintiff: 'شركة النقل المحدودة',
  defendant: 'عامل أجنبي',
  plaintiffRequests: [],
  defendantRequests: [],
};
const enriched = enrichStudySections(thin, {
  parties: 'المدعي: شركة النقل المحدودة\nالمدعى عليه: عامل أجنبي\nرقم القضية: 4670855622',
  reasons: 'الاختصاص: عمالي\nدعوى المدعي: يطالب بأجور متأخرة',
  studyFields: 'التوصية: إثبات الأجور\nمعد الدراسة: نورة الدوسري',
  body: 'مقدار المطالبة: 753,078.48',
});
assert(enriched?.caseNumber === '4670855622', `enrich caseNumber (got ${enriched?.caseNumber})`);
assert(String(enriched?.claimAmount || '').includes('753'), `enrich claimAmount (got ${enriched?.claimAmount})`);
assert(enriched?.recommendation === 'إثبات الأجور', `enrich recommendation (got ${enriched?.recommendation})`);
assert(enriched?.preparer === 'نورة الدوسري', `enrich preparer (got ${enriched?.preparer})`);

const meta = studyDisplayMeta(thin, { subject: '', parties: 'رقم القضية: 4670855622' });
assert(meta.subject.includes('4670855622'), `meta subject fallback (got ${meta.subject})`);

console.log('\nAll parse-study / preview-enrich assertions passed.');
