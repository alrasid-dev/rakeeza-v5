/** Key/value judgment-monitoring card shown inside official letters */

export type JudgmentCardRow = { label: string; value: string };

/** Canonical label for the judge-source row (honorific is part of the label). */
export const JUDGMENT_SOURCE_LABEL = 'مصدر الحكم فضيلة الشيخ';
export const JUDGMENT_SOURCE_PLACEHOLDER = '[اسم مصدر الحكم]';

export const JUDGMENT_CARD_SEED: JudgmentCardRow[] = [
  { label: 'التشكيل', value: 'الثالثة عشر' },
  { label: 'رقم القضية', value: '4772814332' },
  { label: JUDGMENT_SOURCE_LABEL, value: JUDGMENT_SOURCE_PLACEHOLDER },
  { label: 'رقم الحكم', value: '4830350652' },
  { label: 'الرصد', value: 'إختيار الحكم غير نهائي' },
  { label: 'المعالجة المقترحة', value: 'إصدار صك مستبدل' },
];

export const JUDGMENT_CARD_RECIPIENTS = 'فضيلة رئيس المحكمة المكلف سلمه الله';
export const JUDGMENT_CARD_SUBJECT = 'بشأن متابعة سلامة مدخلات الأحكام';

export const JUDGMENT_CARD_BODY = `السلام عليكم ورحمة الله وبركاته وبعد

تنفيذاً لتوجيه فضيلة الرئيس –وفقه الله- بمتابعة سلامة مدخلات الأحكام نود إفادتكم بأنه عند مراجعة القضية المدونة أدناه المنظورة لدى التشكيل القضائي ( [التشكيل] ) تم رصد صدور حكم ( غير نهائي ) وقيمة المطالبة في الدعوى دون الخمسين ألف ريال.
وفي حال اقتضى الأمر إصدار صك مستبدل فإن المعالجة التقنية بإصدار صك مستبدل تكون عبر الخطوات التالية:
(جلسة مداولة أو مرافعة – نطق بالحكم – اختيار حكم مستبدل – تحديد الحكم من القائمة.)
لإطلاع فضيلتكم والله يحفظكم`
  .replace('[التشكيل]', 'الثالثة عشر');

export type TemplateFieldsMeta = {
  keys: string[];
  defaultPaperLayout?: string;
  seed?: {
    subject?: string;
    recipients?: string;
    judgmentCard?: JudgmentCardRow[];
  };
};

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
        ? (seed.judgmentCard as JudgmentCardRow[]).filter(
            (r) => r && typeof r.label === 'string' && typeof r.value === 'string',
          )
        : Array.isArray(parsed.judgmentCard)
          ? (parsed.judgmentCard as JudgmentCardRow[]).filter(
              (r) => r && typeof r.label === 'string' && typeof r.value === 'string',
            )
          : undefined;
      return {
        keys,
        defaultPaperLayout:
          typeof parsed.defaultPaperLayout === 'string'
            ? parsed.defaultPaperLayout
            : typeof seed?.defaultPaperLayout === 'string'
              ? seed.defaultPaperLayout
              : undefined,
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

export function normalizeJudgmentCard(raw: unknown): JudgmentCardRow[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const rows: JudgmentCardRow[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const label = String((r as JudgmentCardRow).label || '').trim();
    const value = String((r as JudgmentCardRow).value || '').trim();
    if (label || value) rows.push({ label, value });
  }
  return rows.length ? rows : null;
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
  { key: 'المعالجة المقترحة', aliases: /^(?:المعالجة المقترحة|المعالجة|الإجراء المقترح)\s*$/ },
];

function stripHonorificPrefix(name: string) {
  return name
    .replace(/^(?:فضيلة(?:\s+الشيخ)?|الشيخ|سعادة|معالي)\s+/, '')
    .trim();
}

/**
 * Extract key/value pairs for the judgment card from pasted text
 * (lines like «التشكيل: …» / tab-separated / «مصدر الحكم فضيلة الشيخ …»).
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

  return out;
}

/** Merge paste-extracted values into an existing (or seeded) judgment card. */
export function mergeJudgmentCardFromPaste(
  base: JudgmentCardRow[] | null | undefined,
  pasteRaw: string,
  extras?: Partial<Record<string, string>>,
): JudgmentCardRow[] {
  const card = (base && base.length ? base : JUDGMENT_CARD_SEED).map((r) => ({ ...r }));
  const extracted = { ...extractJudgmentCardFromPaste(pasteRaw), ...(extras || {}) };

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

  return card;
}
