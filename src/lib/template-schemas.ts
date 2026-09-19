/**
 * Strict JSON Schema (Zod) for Smart Paste templates.
 * Missing → "" or null. Never invent names, amounts, or IDs.
 */
import { z } from 'zod';

const Text = z.string().default('');
const TableRowSchema = z.object({
  name: Text,
  id: z.string().optional(),
  extra: z.string().optional(),
});

export const NoticeSchema = z.object({
  templateKind: z.literal('notice'),
  number: Text,
  date: Text,
  subject: Text,
  recipients: Text,
  copyTo: Text,
  body: Text,
  sessionDay: Text,
  sessionDate: Text,
  sessionTime: Text,
  venue: Text,
});

export const OfficialLetterSchema = z.object({
  templateKind: z.literal('officialLetter'),
  number: Text,
  date: Text,
  subject: Text,
  recipients: Text,
  copyTo: Text,
  parties: Text,
  reasons: Text,
  body: Text,
  tableRows: z.array(TableRowSchema).default([]),
});

const BriefingTitleEnum = z.enum([
  'بطاقة عرض',
  'عرض تذكير',
  'تنويه',
  'تنبيه',
  'بطاقة رصد',
]);

export const DisplayCardSchema = z.object({
  templateKind: z.literal('displayCard'),
  briefingTitle: BriefingTitleEnum.nullable().default(null),
  priority: z.enum(['عادي', 'عاجل']).nullable().default(null),
  subject: Text,
  recipients: Text,
  formation: Text,
  caseNumber: Text,
  judgmentSource: Text,
  judgmentNumber: Text,
  observation: Text,
  mechanism: Text,
  observationProse: Text,
  mechanismProse: Text,
  body: Text,
});

export const ReminderCardSchema = DisplayCardSchema.extend({
  templateKind: z.literal('reminderCard'),
});

export const MemorandumSchema = z.object({
  templateKind: z.literal('memorandum'),
  number: Text,
  date: Text,
  subject: Text,
  recipients: Text,
  copyTo: Text,
  parties: Text,
  reasons: Text,
  studyFields: Text,
  body: Text,
  caseNumber: Text,
  claimAmount: Text,
  plaintiff: Text,
  defendant: Text,
});

export const StudyExtractSchema = z.object({
  templateKind: z.literal('study'),
  caseNumber: Text,
  deedNumber: Text,
  formation: Text,
  plaintiff: Text,
  defendant: Text,
  jurisdiction: Text,
  acceptance: Text,
  claimType: Text,
  claimAmount: Text,
  representation: Text,
  researcher: Text,
  summaryPlaintiff: Text,
  summaryDefendant: Text,
  problem: Text,
  legalOpinion: Text,
  recommendation: Text,
  preparer: Text,
  supervisor: Text,
  prepDate: Text,
  subject: Text,
  parties: Text,
  reasons: Text,
  studyFields: Text,
  body: Text,
});

export const StrictPasteSchema = z.discriminatedUnion('templateKind', [
  NoticeSchema,
  OfficialLetterSchema,
  DisplayCardSchema,
  ReminderCardSchema,
  MemorandumSchema,
  StudyExtractSchema,
]);

export type NoticeJson = z.infer<typeof NoticeSchema>;
export type OfficialLetterJson = z.infer<typeof OfficialLetterSchema>;
export type DisplayCardJson = z.infer<typeof DisplayCardSchema>;
export type ReminderCardJson = z.infer<typeof ReminderCardSchema>;
export type MemorandumJson = z.infer<typeof MemorandumSchema>;
export type StudyExtractJson = z.infer<typeof StudyExtractSchema>;
export type StrictPasteJson = z.infer<typeof StrictPasteSchema>;
export type TemplateKind = StrictPasteJson['templateKind'];

export function emptyNotice(): NoticeJson {
  return NoticeSchema.parse({ templateKind: 'notice' });
}
export function emptyOfficialLetter(): OfficialLetterJson {
  return OfficialLetterSchema.parse({ templateKind: 'officialLetter' });
}
export function emptyDisplayCard(): DisplayCardJson {
  return DisplayCardSchema.parse({ templateKind: 'displayCard' });
}
export function emptyReminderCard(): ReminderCardJson {
  return ReminderCardSchema.parse({ templateKind: 'reminderCard' });
}
export function emptyMemorandum(): MemorandumJson {
  return MemorandumSchema.parse({ templateKind: 'memorandum' });
}
export function emptyStudyExtract(): StudyExtractJson {
  return StudyExtractSchema.parse({ templateKind: 'study' });
}
