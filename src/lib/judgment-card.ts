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
  'تنويه',
  'تنبيه',
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

/** True for مدخلات الأحكام form slugs (both paper designs). */
export function isJudgmentBriefingFormSlug(slug: string | null | undefined): boolean {
  return /^madkhalat-ahkam/i.test(String(slug || ''));
}

/**
 * Runtime briefing detection.
 * Prefer the explicit `judgmentBriefing` flag — never force briefing from a leftover
 * `judgmentCard` alone when study sections are present (flexible study vs letter vs judgment).
 */
export function isJudgmentBriefingDoc(doc: {
  judgmentCard?: { label: string; value: string }[] | null;
  judgmentBriefing?: boolean | null;
  studySections?: unknown;
}): boolean {
  if (doc.judgmentBriefing === true) return true;
  if (doc.judgmentBriefing === false) return false;
  // Legacy saved docs: card without flag — only if no study payload
  if (doc.studySections) return false;
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
  if (/تنبيه/.test(text)) return 'تنبيه';
  if (/تنويه/.test(text)) return 'تنويه';
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

/** Dynamic title above the judgment KV table (never «عرض شف»). */
export const BRIEFING_TITLES = [
  'بطاقة عرض',
  'عرض تذكير',
  'تنويه',
  'تنبيه',
  'بطاقة رصد',
] as const;

export type BriefingTitle = (typeof BRIEFING_TITLES)[number];

export type JudgmentPriority = 'عادي' | 'عاجل';

export const JUDGMENT_SALUTATION = 'السلام عليكم ورحمة الله وبركاته وبعد:-';
export const JUDGMENT_CLOSING = 'لإطلاع فضيلتكم والله يحفظكم';
export const OBSERVATION_RED = 'تم رصد';

export function isBriefingTitle(v: string): v is BriefingTitle {
  return (BRIEFING_TITLES as readonly string[]).includes(v);
}

export function detectBriefingTitle(raw: string): BriefingTitle | null {
  const t = String(raw || '');
  if (!t.trim()) return null;
  const typeLine = t.match(/(?:نوع(?:\s*البطاقة|\s*العرض)?|عنوان(?:\s*البطاقة)?|عنوان العرض)\s*[:：]\s*([^\n]+)/);
  if (typeLine) {
    const v = typeLine[1].trim();
    if (/عرض\s*تذكير/.test(v)) return 'عرض تذكير';
    if (/تنبيه/.test(v)) return 'تنبيه';
    if (/تنويه/.test(v)) return 'تنويه';
    if (/بطاقة\s*رصد/.test(v)) return 'بطاقة رصد';
    if (/بطاقة\s*عرض/.test(v)) return 'بطاقة عرض';
  }
  if (/عرض\s*تذكير/.test(t)) return 'عرض تذكير';
  if (/بطاقة\s*رصد/.test(t)) return 'بطاقة رصد';
  if (/بطاقة\s*عرض/.test(t)) return 'بطاقة عرض';
  // Standalone title near the top of the paste only
  const head = t.slice(0, 180);
  if (/^تنبيه\b/m.test(head)) return 'تنبيه';
  if (/^تنويه\b/m.test(head)) return 'تنويه';
  return null;
}

export function detectJudgmentPriority(raw: string): JudgmentPriority | null {
  const t = String(raw || '');
  if (!t.trim()) return null;
  if (/عاجل|عاجلة|مستعجل|أولوية\s*[:：]?\s*عاجل/.test(t)) return 'عاجل';
  if (/أولوية\s*[:：]?\s*عادي|درجة\s*[:：]?\s*عادي/.test(t)) return 'عادي';
  return null;
}

export function getJudgmentCardValue(
  rows: JudgmentCardRow[] | null | undefined,
  label: string,
): string {
  if (!rows?.length) return '';
  const target = label === MECHANISM_LABEL_LEGACY ? MECHANISM_LABEL : label;
  const row = rows.find(
    (r) =>
      r.label === target ||
      (target === MECHANISM_LABEL && r.label === MECHANISM_LABEL_LEGACY) ||
      (target === JUDGMENT_SOURCE_LABEL && r.label === 'مصدر الحكم'),
  );
  return String(row?.value || '').trim();
}

export type JudgmentObservationParts = {
  beforeRed: string;
  red: string;
  afterRed: string;
};

/** Observation sentence with «تم رصد» split out for red styling. */
export function buildJudgmentObservationParts(
  card: JudgmentCardRow[] | null | undefined,
): JudgmentObservationParts {
  const formation = getJudgmentCardValue(card, 'التشكيل') || '……';
  const caseNo = getJudgmentCardValue(card, 'رقم القضية') || '……';
  const deed = getJudgmentCardValue(card, 'رقم الحكم') || '……';
  const source = getJudgmentCardValue(card, JUDGMENT_SOURCE_LABEL) || '……';
  const note = getJudgmentCardValue(card, 'الرصد');
  const beforeRed = `تنفيذاً لتوجيه أصحاب الفضيلة أعضاء الدائرة لدى التشكيل ( ${formation} ) `;
  const afterRed =
    ` صدور حكم برقم ${deed} في القضية رقم ${caseNo} من فضيلة الشيخ ${source}` +
    (note ? `، ${note}` : '') +
    '.';
  return { beforeRed, red: OBSERVATION_RED, afterRed };
}

/** Mechanism paragraph reflecting selected آلية المعالجة المقترحة. */
export function buildMechanismParagraph(mechanismRaw: string): string {
  const detected = detectProcessingMechanism(mechanismRaw);
  const m = detected || String(mechanismRaw || '').trim();
  switch (m) {
    case 'إصدار صك مستبدل':
      return (
        'وفي حال اقتضى الأمر إصدار صك مستبدل يُراعى: (١) التحقق من سلامة بيانات الحكم والمدخلات، ' +
        '(٢) استكمال مسوغات الاستبدال وفق الإجراءات المتبعة، (٣) رفع ما يلزم للاعتماد.'
      );
    case 'رفع تذكرة':
      return 'ونقترح رفع تذكرة حيال ما رُصد لاتخاذ ما يلزم وفق النظام.';
    case 'تحديد موعد':
      return 'ونقترح تحديد موعد للنظر فيما رُصد واتخاذ اللازم.';
    case 'تنويه':
      return 'وننوه إلى ما رُصد أعلاه لاتخاذ ما ترونه مناسباً.';
    case 'تنبيه':
      return 'وننبّه إلى ما رُصد أعلاه لاتخاذ اللازم بصفة عاجلة.';
    default:
      if (/تنبيه/.test(m)) return 'وننبّه إلى ما رُصد أعلاه لاتخاذ اللازم بصفة عاجلة.';
      if (/تنويه/.test(m)) return 'وننوه إلى ما رُصد أعلاه لاتخاذ ما ترونه مناسباً.';
      return m ? `والمقترح: ${m}.` : '';
  }
}

function escHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Full judgment briefing block HTML: preamble → closing → titled KV table. No «عرض شف». */
export function buildJudgmentBriefingBlockHtml(opts: {
  recipients?: string | null;
  card: JudgmentCardRow[];
  title?: string | null;
  green?: string;
}): string {
  if (!opts.card?.length) return '';
  const GREEN = opts.green || '#006C35';
  const address = String(opts.recipients || JUDGMENT_CARD_RECIPIENTS).trim();
  const title = String(opts.title || 'بطاقة عرض').trim() || 'بطاقة عرض';
  const obs = buildJudgmentObservationParts(opts.card);
  const mech = buildMechanismParagraph(getJudgmentCardValue(opts.card, MECHANISM_LABEL));
  const cells = opts.card
    .map(
      (r, i) =>
        `<tr style="background:${i % 2 ? '#f3f8f5' : '#fff'}">
          <th style="padding:8px 10px;border:1px solid ${GREEN}55;background:${GREEN}14;color:${GREEN};font-weight:700;width:38%;text-align:right;vertical-align:middle;white-space:nowrap">${escHtml(r.label)}</th>
          <td style="padding:8px 10px;border:1px solid ${GREEN}55;text-align:right;vertical-align:middle;font-weight:600" dir="auto">${escHtml(r.value || '—')}</td>
        </tr>`,
    )
    .join('');
  return `<div class="judgment-briefing" style="margin:4px 0 12px;line-height:1.9;text-align:justify">
  <div style="margin-bottom:6px;font-weight:700">${escHtml(address)}</div>
  <div style="margin-bottom:8px">${escHtml(JUDGMENT_SALUTATION)}</div>
  <div style="margin-bottom:8px">${escHtml(obs.beforeRed)}<span style="color:#c00000;font-weight:700">${escHtml(obs.red)}</span>${escHtml(obs.afterRed)}</div>
  ${mech ? `<div style="margin-bottom:8px">${escHtml(mech)}</div>` : ''}
  <div style="margin-bottom:12px;font-weight:600">${escHtml(JUDGMENT_CLOSING)}</div>
  <h3 style="margin:10px 0 6px;color:${GREEN};font-size:14px;border-bottom:1px solid #C5A059;padding-bottom:2px">${escHtml(title)}</h3>
  <table dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${GREEN};margin:6px 0 4px;font-size:13px">
    <tbody>${cells}</tbody>
  </table>
</div>`;
}
