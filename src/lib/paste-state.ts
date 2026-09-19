
/** Official letter rhythm: blank line after salutation; closing on own line. */
export function formatOfficialLetterBody(body: string): string {
  let b = String(body || '').replace(/\r\n/g, '\n');
  if (!b.trim()) return b;
  // Ensure blank line after salutation
  b = b.replace(
    /(السلام\s+عليكم[^\n]*بعد[^\n]*[:-]?\s*)\n(?!\n)/,
    '$1\n\n',
  );
  // Closing phrases on their own centered-friendly lines
  b = b.replace(/\n?[ \t]*(والله\s+يحفظكم[^\n]*)/g, '\n\n$1');
  b = b.replace(/\n?[ \t]*(وتقبلوا[^\n]*)/g, '\n\n$1');
  b = b.replace(/\n{3,}/g, '\n\n');
  return b.replace(/^\n+/, '').replace(/\n+$/, '');
}

/**
 * Paste → reactive document state. Strict JSON maps 1:1 into visible fields.
 * Missing paste values stay empty — never keep seed samples.
 */
import {
  JUDGMENT_SOURCE_LABEL,
  MECHANISM_LABEL,
  emptyJudgmentCardShell,
  type BriefingTitle,
  type JudgmentCardRow,
  type JudgmentPriority,
} from '@/lib/judgment-card';
import type { ParsedPaste } from '@/lib/parse-paste';
import type { StudySections } from '@/lib/parse-study';
import { extractStrictPaste, type SmartPasteOptions } from '@/lib/smart-paste';
import type {
  DisplayCardJson,
  ReminderCardJson,
  StrictPasteJson,
} from '@/lib/template-schemas';

export type DocumentFormFields = {
  subject: string;
  recipients: string;
  copyTo: string;
  parties: string;
  reasons: string;
  studyFields: string;
  body: string;
  dateGregorian: string;
  dateHijri: string;
  docType: string;
};

export type PasteStatePatch = {
  form: Partial<DocumentFormFields>;
  judgmentCard: JudgmentCardRow[] | null;
  studySections: StudySections | null;
  tableRows: { name: string; id?: string; extra?: string }[];
  detectedKind: 'study' | 'letter' | 'table' | 'briefing' | 'unknown';
  briefingTitle: BriefingTitle | null;
  judgmentPriority: JudgmentPriority | null;
  observationText: string;
  mechanismText: string;
  /** When true, do not invent default judgment letter body. */
  briefingBodyStrict: boolean;
  json: StrictPasteJson;
  raw: ParsedPaste;
};

function cardFromDisplay(j: DisplayCardJson | ReminderCardJson): JudgmentCardRow[] {
  const map: Record<string, string> = {
    التشكيل: j.formation,
    'رقم القضية': j.caseNumber,
    [JUDGMENT_SOURCE_LABEL]: j.judgmentSource,
    'رقم الحكم': j.judgmentNumber,
    الرصد: j.observation,
    [MECHANISM_LABEL]: j.mechanism,
  };
  return emptyJudgmentCardShell().map((row) => ({
    label: row.label,
    value: (map[row.label] || '').trim(),
  }));
}

export function buildPasteStatePatch(
  rawText: string,
  opts: SmartPasteOptions & {
    formName?: string;
    keepDates?: { gregorian: string; hijri: string };
  } = {},
): PasteStatePatch {
  const { json, raw } = extractStrictPaste(rawText, opts);
  const dates = opts.keepDates || { gregorian: '', hijri: '' };
  const baseForm: Partial<DocumentFormFields> = {
    dateGregorian: dates.gregorian,
    dateHijri: dates.hijri,
  };

  if (json.templateKind === 'displayCard' || json.templateKind === 'reminderCard') {
    const body =
      json.body ||
      [json.observationProse, json.mechanismProse].filter(Boolean).join('\n\n') ||
      '';
    return {
      form: {
        ...baseForm,
        subject: json.subject,
        recipients: json.recipients,
        copyTo: '',
        parties: '',
        reasons: '',
        studyFields: '',
        body,
        docType:
          opts.formName ||
          (json.templateKind === 'reminderCard' ? 'عرض تذكير' : 'مدخلات الأحكام بطاقة عرض'),
      },
      judgmentCard: cardFromDisplay(json),
      studySections: null,
      tableRows: [],
      detectedKind: 'briefing',
      briefingTitle: json.briefingTitle,
      judgmentPriority: json.priority,
      observationText: json.observationProse,
      mechanismText: json.mechanismProse,
      briefingBodyStrict: true,
      json,
      raw,
    };
  }

  if (json.templateKind === 'study') {
    return {
      form: {
        ...baseForm,
        subject: json.subject,
        recipients: '',
        copyTo: '',
        parties: json.parties,
        reasons: json.reasons,
        studyFields: json.studyFields,
        body: json.body,
        docType: opts.formName || 'نموذج تحليل حكم (شكوى)',
      },
      judgmentCard: null,
      studySections: raw.studySections
        ? {
            ...raw.studySections,
            caseNumber: json.caseNumber || undefined,
            deedNumber: json.deedNumber || undefined,
            formation: json.formation || undefined,
            plaintiff: json.plaintiff || undefined,
            defendant: json.defendant || undefined,
            claimAmount: json.claimAmount || undefined,
            claimType: json.claimType || undefined,
            recommendation: json.recommendation || undefined,
            preparer: json.preparer || undefined,
          }
        : null,
      tableRows: [],
      detectedKind: 'study',
      briefingTitle: null,
      judgmentPriority: null,
      observationText: '',
      mechanismText: '',
      briefingBodyStrict: false,
      json,
      raw,
    };
  }

  if (json.templateKind === 'notice') {
    return {
      form: {
        ...baseForm,
        subject: json.subject,
        recipients: json.recipients,
        copyTo: json.copyTo,
        parties: '',
        reasons: '',
        studyFields: '',
        body: formatOfficialLetterBody(json.body),
        docType: opts.formName || 'إشعار',
      },
      judgmentCard: null,
      studySections: null,
      tableRows: [],
      detectedKind: 'letter',
      briefingTitle: null,
      judgmentPriority: null,
      observationText: '',
      mechanismText: '',
      briefingBodyStrict: false,
      json,
      raw,
    };
  }

  if (json.templateKind === 'memorandum') {
    return {
      form: {
        ...baseForm,
        subject: json.subject,
        recipients: json.recipients,
        copyTo: json.copyTo,
        parties: json.parties,
        reasons: json.reasons,
        studyFields: json.studyFields,
        body: formatOfficialLetterBody(json.body),
        docType: opts.formName || 'مذكرة',
      },
      judgmentCard: null,
      studySections: null,
      tableRows: [],
      detectedKind: raw.detectedKind === 'table' ? 'table' : 'letter',
      briefingTitle: null,
      judgmentPriority: null,
      observationText: '',
      mechanismText: '',
      briefingBodyStrict: false,
      json,
      raw,
    };
  }

  return {
    form: {
      ...baseForm,
      subject: json.subject,
      recipients: json.recipients,
      copyTo: json.copyTo,
      parties: json.parties,
      reasons: json.reasons,
      studyFields: '',
      body: formatOfficialLetterBody(json.body),
      docType: opts.formName || 'خطاب رسمي',
    },
    judgmentCard: null,
    studySections: null,
    tableRows: json.tableRows.map((r) => ({ name: r.name, id: r.id, extra: r.extra })),
    detectedKind: raw.detectedKind === 'table' ? 'table' : 'letter',
    briefingTitle: null,
    judgmentPriority: null,
    observationText: '',
    mechanismText: '',
    briefingBodyStrict: false,
    json,
    raw,
  };
}

export { emptyJudgmentCardShell };
