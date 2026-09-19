/** Key/value judgment-monitoring card — عرض شف (oral briefing) for court workflow */

export type JudgmentCardRow = { label: string; value: string };

/** Canonical label for the judge-source row (honorific is part of the label). */
export const JUDGMENT_SOURCE_LABEL = 'مصدر الحكم فضيلة الشيخ';
export const JUDGMENT_SOURCE_PLACEHOLDER = '[اسم مصدر الحكم]';

/** Mechanism row — replaces buried body prose about صك مستبدل / تذكرة / موعد. */
export const MECHANISM_LABEL = 'آلية المعالجة المقترحة';
/** Legacy label kept for migration from older drafts/seeds. */
export const MECHANISM_LABEL_LEGACY = 'المعالجة المقترحة';

export const PROCESSING_MECHANISMS = [
  'إصدار صك مستبدل',
  'رفع تذكرة',
  'تحديد موعد',
] as const;

export type ProcessingMechanism = (typeof PROCESSING_MECHANISMS)[number];

export const JUDGMENT_CARD_SEED: JudgmentCardRow[] = [
  { label: 'التشكيل', value: 'الثالثة عشر' },
  { label: 'رقم القضية', value: '4772814332' },
  { label: JUDGMENT_SOURCE_LABEL, value: JUDGMENT_SOURCE_PLACEHOLDER },
  { label: 'رقم الحكم', value: '4830350652' },
  { label: 'الرصد', value: 'إختيار الحكم غير نهائي' },
  { label: MECHANISM_LABEL, value: 'إصدار صك مستبدل' },
];

export const JUDGMENT_CARD_RECIPIENTS = 'فضيلة رئيس المحكمة المكلف سلمه الله';
export const JUDGMENT_CARD_SUBJECT = 'بشأن متابعة سلامة مدخلات الأحكام';

/** Briefing card has no letter body — content lives in the smart table. */
export const JUDGMENT_CARD_BODY = '';

export type TemplateFieldsMeta = {
  keys: string[];
  defaultPaperLayout?: string;
  /** `briefing` = عرض شف — hide parties/body editors & sections */
  mode?: 'briefing' | string;
  hideBodyAndParties?: boolean;
  seed?: {
    subject?: string;
    recipients?: string;
    judgmentCard?: JudgmentCardRow[];
  };
};

/** True when template/doc is an oral briefing (عرض شف) judgment card. */
export function isJudgmentBriefingMeta(meta: TemplateFieldsMeta | null | undefined): boolean {
  if (!meta) return false;
  if (meta.mode === 'briefing' || meta.hideBodyAndParties === true) return true;
  return Boolean(meta.seed?.judgmentCard?.length);
}

/** Runtime: any doc carrying a judgment card is treated as briefing for render. */
export function isJudgmentBriefingDoc(doc: {
  judgmentCard?: { label: string; value: string }[] | null;
  judgmentBriefing?: boolean | null;
}): boolean {
  if (doc.judgmentBriefing === true) return true;
  return Boolean(doc.judgmentCard && doc.judgmentCard.length > 0);
}

/** Detect processing mechanism phrase from free text / paste. */
export function detectProcessingMechanism(raw: string): ProcessingMechanism | null {
  const text = String(raw || '');
  if (!text.trim()) return null;
  // Prefer longer / more specific phrases first
  if (/إصدار\s*صك\s*مستبدل|صك\s*مستبدل/.test(text)) return 'إصدار صك مستبدل';
  if (/رفع\s*تذكرة/.test(text)) return 'رفع تذكرة';
  if (/تحديد\s*موعد/.test(text)) return 'تحديد موعد';
  // Exact match against known list
  for (const m of PROCESSING_MECHANISMS) {
    if (text.includes(m)) return m;
  }
  return null;
}

export function isKnownMechanism(value: string): value is ProcessingMechanism {
  return (PROCESSING_MECHANISMS as readonly string[]).includes(value);
}

/** Parse template.fieldsJson — supports legacy string[] or richer meta object. */
export function parseTemplateFieldsJson(raw: string | null | undefined): TemplateFieldsMeta {
  if (!raw) return { keys: [] };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { keys: parsed.map(String) };
    }
    if (parsed && typeof parsed === 'object') {
      const keys = Array.isArray(parsed.keys)
        ? parsed.keys.map(String)
        : Array.isArray(parsed.fields)
          ? parsed.fields.map(String)
          : [];
      const seed = parsed.seed && typeof parsed.seed === 'object' ? parsed.seed : undefined;
      const judgmentCard = Array.isArray(seed?.judgmentCard)
        ? migrateMechanismLabel(
            (seed.judgmentCard as JudgmentCardRow[]).filter(
              (r) => r && typeof r.label === 'string' && typeof r.value === 'string',
            ),
          )
        : Array.isArray(parsed.judgmentCard)
          ? migrateMechanismLabel(
              (parsed.judgmentCard as JudgmentCardRow[]).filter(
                (r) => r && typeof r.label === 'string' && typeof r.value === 'string',
              ),
            )
          : undefined;
      const mode =
        typeof parsed.mode === 'string'
          ? parsed.mode
          : typeof seed?.mode === 'string'
            ? seed.mode
            : judgmentCard?.length
              ? 'briefing'
              : undefined;
      const hideBodyAndParties =
        parsed.hideBodyAndParties === true ||
        seed?.hideBodyAndParties === true ||
        mode === 'briefing';
      return {
        keys,
        defaultPaperLayout:
          typeof parsed.defaultPaperLayout === 'string'
            ? parsed.defaultPaperLayout
            : typeof seed?.defaultPaperLayout === 'string'
              ? seed.defaultPaperLayout
              : undefined,
        mode,
        hideBodyAndParties,
        seed: seed
          ? {
              subject: typeof seed.subject === 'string' ? seed.subject : undefined,
              recipients: typeof seed.recipients === 'string' ? seed.recipients : undefined,
              judgmentCard,
            }
          : judgmentCard
            ? { judgmentCard }
            : undefined,
      };
    }
  } catch {
    /* ignore */
  }
  return { keys: [] };
}

/** Rename legacy «المعالجة المقترحة» → «آلية المعالجة المقترحة». */
export function migrateMechanismLabel(rows: JudgmentCardRow[]): JudgmentCardRow[] {
  return rows.map((r) =>
    r.label === MECHANISM_LABEL_LEGACY || r.label.trim() === MECHANISM_LABEL_LEGACY
      ? { ...r, label: MECHANISM_LABEL }
      : r,
  );
}

export function normalizeJudgmentCard(raw: unknown): JudgmentCardRow[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const rows: JudgmentCardRow[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const label = String((r as JudgmentCardRow).label || '').trim();
    const value = String((r as JudgmentCardRow).value || '').trim();
    if (label || value) rows.push({ label, value });
  }
  if (!rows.length) return null;
  return migrateMechanismLabel(rows);
}

/** Labels we try to fill from smart-paste into the seeded card. */
const PASTE_FIELD_ALIASES: { key: string; aliases: RegExp }[] = [
  { key: 'التشكيل', aliases: /^(?:التشكيل|رقم التشكيل|التشكيل القضائي)\s*$/ },
  { key: 'رقم القضية', aliases: /^(?:رقم القضية|القضية)\s*$/ },
  {
    key: JUDGMENT_SOURCE_LABEL,
    aliases:
      /^(?:مصدر الحكم(?:\s+فضيلة(?:\s+الشيخ)?)?|فضيلة الشيخ|القاضي|اسم القاضي|ناظر القضية|مصدر الحكم فضيلة الشيخ)\s*$/,
  },
  { key: 'رقم الحكم', aliases: /^(?:رقم الحكم|رقم الصك|الصك)\s*$/ },
  { key: 'الرصد', aliases: /^(?:الرصد|الملاحظة|الملاحظات)\s*$/ },
  {
    key: MECHANISM_LABEL,
    aliases:
      /^(?:آلية المعالجة المقترحة|المعالجة المقترحة|المعالجة|الإجراء المقترح|الآلية)\s*$/,
  },
];

function stripHonorificPrefix(name: string) {
  return name
    .replace(/^(?:فضيلة(?:\s+الشيخ)?|الشيخ|سعادة|معالي)\s+/, '')
    .trim();
}

/**
 * Extract key/value pairs for the judgment card from pasted text
 * (lines like «التشكيل: …» / tab-separated / «مصدر الحكم فضيلة الشيخ …»).
 * Also scans free text for mechanism phrases (صك مستبدل / رفع تذكرة / تحديد موعد).
 */
export function extractJudgmentCardFromPaste(raw: string): Partial<Record<string, string>> {
  const text = String(raw || '').replace(/\r\n/g, '\n');
  const out: Partial<Record<string, string>> = {};
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // label: value  OR  label\tvalue  OR  label＝value
    const kv = line.match(/^(.+?)\s*[:：=\t]\s*(.+)$/);
    if (kv) {
      const label = kv[1].replace(/\s+/g, ' ').trim();
      let value = kv[2].trim();
      for (const field of PASTE_FIELD_ALIASES) {
        if (field.aliases.test(label)) {
          if (field.key === JUDGMENT_SOURCE_LABEL) value = stripHonorificPrefix(value);
          if (field.key === MECHANISM_LABEL) {
            const detected = detectProcessingMechanism(value) || value;
            value = detected;
          }
          if (value) out[field.key] = value;
          break;
        }
      }
      continue;
    }

    // «مصدر الحكم فضيلة الشيخ …» (label+name on one line, no separator)
    const inlineSource = line.match(
      /^(?:مصدر الحكم(?:\s+فضيلة(?:\s+الشيخ)?)?|مصدر الحكم فضيلة الشيخ)\s+(.+)$/,
    );
    if (inlineSource) {
      const name = stripHonorificPrefix(inlineSource[1]);
      if (name && !/^(?:فضيلة|الشيخ)$/.test(name)) out[JUDGMENT_SOURCE_LABEL] = name;
    }
  }

  // Free-text mechanism scan (body prose like «وفي حال اقتضى الأمر إصدار صك مستبدل…»)
  if (!out[MECHANISM_LABEL]) {
    const mech = detectProcessingMechanism(text);
    if (mech) out[MECHANISM_LABEL] = mech;
  }

  return out;
}

/** Merge paste-extracted values into an existing (or seeded) judgment card. */
export function mergeJudgmentCardFromPaste(
  base: JudgmentCardRow[] | null | undefined,
  pasteRaw: string,
  extras?: Partial<Record<string, string>>,
): JudgmentCardRow[] {
  const card = migrateMechanismLabel(
    (base && base.length ? base : JUDGMENT_CARD_SEED).map((r) => ({ ...r })),
  );
  const extracted = { ...extractJudgmentCardFromPaste(pasteRaw), ...(extras || {}) };

  // Map legacy key from callers that still use old label
  if (extracted[MECHANISM_LABEL_LEGACY] && !extracted[MECHANISM_LABEL]) {
    extracted[MECHANISM_LABEL] = extracted[MECHANISM_LABEL_LEGACY]!;
  }

  for (const row of card) {
    const next = extracted[row.label];
    if (typeof next === 'string' && next.trim()) {
      row.value =
        row.label === JUDGMENT_SOURCE_LABEL ? stripHonorificPrefix(next.trim()) : next.trim();
    }
  }

  // If paste named the source under a short alias and seed uses the long label
  if (extracted[JUDGMENT_SOURCE_LABEL]) {
    const idx = card.findIndex((r) => r.label === JUDGMENT_SOURCE_LABEL || r.label === 'مصدر الحكم');
    if (idx >= 0) {
      card[idx] = {
        label: JUDGMENT_SOURCE_LABEL,
        value: stripHonorificPrefix(extracted[JUDGMENT_SOURCE_LABEL]!),
      };
    }
  }

  // Ensure mechanism row exists and is filled when detected
  if (extracted[MECHANISM_LABEL]) {
    const idx = card.findIndex(
      (r) => r.label === MECHANISM_LABEL || r.label === MECHANISM_LABEL_LEGACY,
    );
    const value = extracted[MECHANISM_LABEL]!;
    if (idx >= 0) {
      card[idx] = { label: MECHANISM_LABEL, value };
    } else {
      card.push({ label: MECHANISM_LABEL, value });
    }
  }

  return card;
}

/** Update a single row value by label (immutable). */
export function setJudgmentCardValue(
  rows: JudgmentCardRow[],
  label: string,
  value: string,
): JudgmentCardRow[] {
  const migrated = migrateMechanismLabel(rows.map((r) => ({ ...r })));
  const target = label === MECHANISM_LABEL_LEGACY ? MECHANISM_LABEL : label;
  const idx = migrated.findIndex(
    (r) => r.label === target || (target === MECHANISM_LABEL && r.label === MECHANISM_LABEL_LEGACY),
  );
  if (idx >= 0) {
    migrated[idx] = { ...migrated[idx], label: target, value };
  } else {
    migrated.push({ label: target, value });
  }
  return migrated;
}
