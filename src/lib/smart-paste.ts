/**
 * Deterministic Smart Paste: local parsers + Zod. No paid LLM.
 * Values not present in the paste are cleared to "".
 */
import { parseRichPaste, type ParsedPaste } from '@/lib/parse-paste';
import {
  JUDGMENT_SOURCE_LABEL,
  MECHANISM_LABEL,
  detectBriefingTitle,
  detectJudgmentPriority,
  extractJudgmentCardFromPaste,
  extractJudgmentProseFromPaste,
  type BriefingTitle,
  type JudgmentPriority,
} from '@/lib/judgment-card';
import {
  DisplayCardSchema,
  MemorandumSchema,
  NoticeSchema,
  OfficialLetterSchema,
  ReminderCardSchema,
  StudyExtractSchema,
  type StrictPasteJson,
  type TemplateKind,
  emptyDisplayCard,
  emptyMemorandum,
  emptyNotice,
  emptyOfficialLetter,
  emptyReminderCard,
  emptyStudyExtract,
} from '@/lib/template-schemas';

export type SmartPasteOptions = {
  preferredKind?: TemplateKind | null;
  briefingTemplate?: boolean;
};

export type SmartPasteResult = {
  json: StrictPasteJson;
  raw: ParsedPaste;
};

export function normalizeForPresence(s: string): string {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function onlyIfPresent(rawPaste: string, value: string | null | undefined): string {
  const v = String(value ?? '').trim();
  if (!v) return '';
  const hay = normalizeForPresence(rawPaste);
  if (!hay) return '';
  const needle = normalizeForPresence(v);
  if (!needle || needle.length < 2) return '';
  if (hay.includes(needle)) return v;

  const parts = needle
    .split(/[—–:\u060c|/]/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3);
  const boilerplate = /^(دراس|بشأن|موضوع|المدعي|المدعى|عليه|رقم|القضية|شكوى)/;
  const content = parts.filter((t) => !boilerplate.test(t));
  if (content.length >= 1 && content.every((t) => hay.includes(t))) return v;

  const digits = needle.replace(/[^\d.]/g, '');
  if (digits.length >= 4) {
    const hayDigits = hay.replace(/[^\d.]+/g, ' ');
    if (hayDigits.includes(digits)) return v;
  }
  return '';
}

function scrubStrings<T extends Record<string, unknown>>(
  rawPaste: string,
  obj: T,
  skip: Set<string>,
): T {
  const out: Record<string, unknown> = { ...obj };
  for (const [k, v] of Object.entries(out)) {
    if (skip.has(k)) continue;
    if (typeof v === 'string') {
      out[k] = onlyIfPresent(rawPaste, v);
    } else if (Array.isArray(v)) {
      out[k] = v
        .map((row) => {
          if (!row || typeof row !== 'object') return row;
          const r: Record<string, unknown> = { ...(row as object) };
          for (const [rk, rv] of Object.entries(r)) {
            if (typeof rv === 'string') r[rk] = onlyIfPresent(rawPaste, rv);
          }
          return r;
        })
        .filter((row) => {
          if (!row || typeof row !== 'object') return false;
          return Object.values(row as object).some((x) => String(x ?? '').trim());
        });
    }
  }
  return out as T;
}

function detectKind(raw: ParsedPaste, paste: string, opts: SmartPasteOptions): TemplateKind {
  if (opts.briefingTemplate) {
    return detectBriefingTitle(paste) === 'عرض تذكير' ? 'reminderCard' : 'displayCard';
  }
  if (opts.preferredKind) return opts.preferredKind;
  if (raw.detectedKind === 'study' || raw.studySections) return 'study';

  const head = paste.slice(0, 120);
  if (/إشعار|موعد(?:كم| الجلسة)/.test(paste) && !/خطاب|مذكرة|بطاقة/.test(head)) return 'notice';
  if (/بطاقة عرض|عرض تذكير|مدخلات الأحكام|مصدر الحكم|آلية المعالجة/.test(paste)) {
    return detectBriefingTitle(paste) === 'عرض تذكير' ? 'reminderCard' : 'displayCard';
  }
  if (/مذكرة|للإحاطة|للتفضل بالاطلاع/.test(paste)) return 'memorandum';
  return 'officialLetter';
}

function fromStudy(raw: ParsedPaste, paste: string) {
  const s = raw.studySections ?? ({} as NonNullable<ParsedPaste["studySections"]>);
  const caseNumber = onlyIfPresent(paste, s.caseNumber);
  let subject = onlyIfPresent(paste, raw.subject);
  if (!subject && caseNumber && raw.subject) subject = raw.subject;
  return StudyExtractSchema.parse({
    ...emptyStudyExtract(),
    caseNumber,
    deedNumber: onlyIfPresent(paste, s.deedNumber),
    formation: onlyIfPresent(paste, s.formation),
    plaintiff: onlyIfPresent(paste, s.plaintiff),
    defendant: onlyIfPresent(paste, s.defendant),
    jurisdiction: onlyIfPresent(paste, s.jurisdiction),
    acceptance: onlyIfPresent(paste, s.acceptance),
    claimType: onlyIfPresent(paste, s.claimType),
    claimAmount: onlyIfPresent(paste, s.claimAmount),
    representation: onlyIfPresent(paste, s.representation),
    researcher: onlyIfPresent(paste, s.researcher),
    summaryPlaintiff: onlyIfPresent(paste, s.summaryPlaintiff),
    summaryDefendant: onlyIfPresent(paste, s.summaryDefendant),
    problem: onlyIfPresent(paste, s.problem),
    legalOpinion: onlyIfPresent(paste, s.legalOpinion),
    recommendation: onlyIfPresent(paste, s.recommendation),
    preparer: onlyIfPresent(paste, s.preparer),
    supervisor: onlyIfPresent(paste, s.supervisor),
    prepDate: onlyIfPresent(paste, s.prepDate),
    subject,
    parties: onlyIfPresent(paste, raw.parties),
    reasons: onlyIfPresent(paste, raw.reasons),
    studyFields: onlyIfPresent(paste, raw.studyFields),
    body: onlyIfPresent(paste, raw.body),
  });
}

function fromDisplayOrReminder(
  raw: ParsedPaste,
  paste: string,
  kind: 'displayCard' | 'reminderCard',
) {
  const card = extractJudgmentCardFromPaste(paste);
  const prose = extractJudgmentProseFromPaste(paste);
  const title = detectBriefingTitle(paste) as BriefingTitle | null;
  const priority = detectJudgmentPriority(paste) as JudgmentPriority | null;
  const base = kind === 'reminderCard' ? emptyReminderCard() : emptyDisplayCard();
  const filled = {
    ...base,
    briefingTitle: title,
    priority,
    subject: onlyIfPresent(paste, raw.subject),
    recipients: onlyIfPresent(paste, raw.recipients),
    formation: onlyIfPresent(paste, card['التشكيل']),
    caseNumber: onlyIfPresent(paste, card['رقم القضية']),
    judgmentSource: onlyIfPresent(paste, card[JUDGMENT_SOURCE_LABEL]),
    judgmentNumber: onlyIfPresent(paste, card['رقم الحكم']),
    observation: onlyIfPresent(paste, card['الرصد']),
    mechanism: onlyIfPresent(paste, card[MECHANISM_LABEL]),
    observationProse: onlyIfPresent(paste, prose.observation),
    mechanismProse: onlyIfPresent(paste, prose.mechanismText),
    body: onlyIfPresent(paste, raw.body),
  };
  return kind === 'reminderCard'
    ? ReminderCardSchema.parse(filled)
    : DisplayCardSchema.parse(filled);
}

function fromNotice(raw: ParsedPaste, paste: string) {
  return NoticeSchema.parse(
    scrubStrings(
      paste,
      {
        ...emptyNotice(),
        number: raw.number,
        date: raw.date,
        subject: raw.subject,
        recipients: raw.recipients,
        copyTo: '',
        body: raw.body,
        sessionDay: paste.match(/(?:يوم)\s*[:：]?\s*([^\n\d]{2,24})/)?.[1]?.trim() || '',
        sessionDate:
          paste.match(/(?:تاريخ)\s*[:：]?\s*([0-9٠-٩/\-.]+)/)?.[1]?.trim() || raw.date || '',
        sessionTime: paste.match(/(?:الساعة)\s*[:：]?\s*([^\n]+)/)?.[1]?.trim() || '',
        venue: paste.match(/(?:القاعة|المكان)\s*[:：]?\s*([^\n]+)/)?.[1]?.trim() || '',
      },
      new Set(['templateKind']),
    ),
  );
}

function fromLetter(raw: ParsedPaste, paste: string) {
  return OfficialLetterSchema.parse(
    scrubStrings(
      paste,
      {
        ...emptyOfficialLetter(),
        number: raw.number,
        date: raw.date,
        subject: raw.subject,
        recipients: raw.recipients,
        copyTo: '',
        parties: raw.parties,
        reasons: raw.reasons,
        body: raw.body,
        tableRows: (raw.tableRows || []).map((r) => ({
          name: r.name,
          id: r.id,
          extra: r.extra,
        })),
      },
      new Set(['templateKind']),
    ),
  );
}

function fromMemorandum(raw: ParsedPaste, paste: string) {
  const s = raw.studySections;
  return MemorandumSchema.parse(
    scrubStrings(
      paste,
      {
        ...emptyMemorandum(),
        number: raw.number,
        date: raw.date,
        subject: raw.subject,
        recipients: raw.recipients,
        copyTo: '',
        parties: raw.parties,
        reasons: raw.reasons,
        studyFields: raw.studyFields,
        body: raw.body,
        caseNumber: s?.caseNumber || '',
        claimAmount: s?.claimAmount || '',
        plaintiff: s?.plaintiff || '',
        defendant: s?.defendant || '',
      },
      new Set(['templateKind']),
    ),
  );
}

export function extractStrictPaste(
  rawText: string,
  opts: SmartPasteOptions = {},
): SmartPasteResult {
  const paste = String(rawText || '');
  const raw = parseRichPaste(paste);
  const kind = detectKind(raw, paste, opts);

  let json: StrictPasteJson;
  switch (kind) {
    case 'study':
      json = fromStudy(raw, paste);
      break;
    case 'displayCard':
      json = fromDisplayOrReminder(raw, paste, 'displayCard');
      break;
    case 'reminderCard':
      json = fromDisplayOrReminder(raw, paste, 'reminderCard');
      break;
    case 'notice':
      json = fromNotice(raw, paste);
      break;
    case 'memorandum':
      json = fromMemorandum(raw, paste);
      break;
    default:
      json = fromLetter(raw, paste);
      break;
  }
  return { json, raw };
}

export function findInventedTokens(
  json: StrictPasteJson,
  rawPaste: string,
  forbidden: string[],
): string[] {
  const hay = normalizeForPresence(rawPaste);
  const leaks: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') {
      for (const f of forbidden) {
        const ff = f.trim();
        if (!ff) continue;
        if (v.includes(ff) && !hay.includes(normalizeForPresence(ff))) leaks.push(ff);
      }
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(json);
  return Array.from(new Set(leaks));
}
