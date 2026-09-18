/** Local Arabic spelling / grammar / judicial style polish — no paid API */

const HONORIFIC_BEFORE = /(?:^|[\s،.:؛])(?:فضيلة|سعادة|معالي|سمو|الأستاذ|الاستاذ|الأستاذة|الاستاذه|القاضي|القاضية|الشيخ|المستشار|المحامي|الدكتور|الدكتورة)\s+$/;
const FAMILY_AFTER = /^\s+(?:بن\s+|ابن\s+|آل[\u0600-\u06FF])/;
const NAME_LIKE_ALIASES = new Set(['علي', 'الى', 'الي']); // ambiguous short tokens

/** Correct judicial MSA endings — never flag these as errors and never flip ى→ي on them. */
const PROTECTED_FORMS = [
  'على',
  'إلى',
  'الى',
  'لدى',
  'حتى',
  'الدعوى',
  'دعوى',
  'المدعى',
  'شكوى',
  'فتوى',
  'مستشفى',
] as const;

/** Formal blessings / closings — never suggest deleting or rewriting these. */
const PROTECTED_BLESSINGS = [
  'والله يحفظكم',
  'والله يرعاكم',
  'والله الموفق',
  'يحفظكم ويرعاكم',
  'بارك الله',
  'جزاكم الله',
] as const;

function isProtectedBlessingHit(text: string, found: string): boolean {
  const f = String(found || '').trim();
  if (!f) return false;
  // Never flag bare «والله» when it sits inside a known blessing/closing
  if (f === 'والله') {
    if (PROTECTED_BLESSINGS.some((p) => text.includes(p))) return true;
    // Also protect common closing patterns even if not exact list match
    if (/والله\s+(?:يحفظكم|يرعاكم|الموفق)/.test(text)) return true;
    return true; // bare والله in judicial closings is never a delete target
  }
  if ((PROTECTED_BLESSINGS as readonly string[]).includes(f)) return true;
  if (PROTECTED_BLESSINGS.some((p) => p.includes(f) && f.length >= 4)) return true;
  return false;
}

/**
 * Forbidden suggestion flips: found (already correct) → suggestion (corrupt).
 * Never propose these in findPolishIssues.
 */
const FORBIDDEN_FLIPS: [string, string][] = [
  ['المدعى', 'المدعي'],
  ['المدعى عليه', 'المدعي عليه'],
  ['المدعى عليها', 'المدعي عليها'],
  ['الدعوى', 'الدعوي'],
  ['دعوى', 'دعوي'],
  ['على', 'علي'],
  ['إلى', 'الي'],
  ['إلى', 'الى'],
  ['لدى', 'لدي'],
  ['حتى', 'حتي'],
  ['شكوى', 'شكوي'],
  ['فتوى', 'فتوي'],
  ['مستشفى', 'مستشفي'],
];

const REPLACEMENTS: [RegExp, string][] = [
  [/ +/g, ' '],
  [/\u0640+/g, ''], // tatweel
  [/\u200f|\u200e/g, ''],

  // Arabic-safe (avoid \b) — note: علي handled separately with name guard
  [/بناءاً?(?=\s|$)/g, 'بناءً'],
  [/(^|[\s،.])ان(?=[\s]|$)/g, '$1أن'],
  [/(^|[\s،.])الي(?=[\s]|$)/g, '$1إلى'],
  [/(^|[\s،.])لدي(?=[\s]|$)/g, '$1لدى'],
  [/(^|[\s،.])حتي(?=[\s]|$)/g, '$1حتى'],
  [/(^|[\s،.])اذا(?=[\s]|$)/g, '$1إذا'],
  [/(^|[\s،.])او(?=[\s]|$)/g, '$1أو'],

  // hamza / common typos — NEVER global ى→ي (destroys judicial MSA: على/إلى/الدعوى/المدعى)
  [/(^|\s)ان(?=\s|$)/g, '$1أن'],
  [/\bان لا\b/g, 'ألا'],
  [/\bالي\b/g, 'إلى'],
  [/\bلدي\b/g, 'لدى'],
  [/\bحتي\b/g, 'حتى'],
  [/\bاذ\b/g, 'إذ'],
  [/\bاذا\b/g, 'إذا'],
  [/\bانما\b/g, 'إنما'],
  [/\bاو\b/g, 'أو'],
  [/لاكن/g, 'لكن'],
  [/لان(?!\s*ا)/g, 'لأن'],
  [/هاذا/g, 'هذا'],
  [/هاذه/g, 'هذه'],
  [/اولائك|أولائك/g, 'أولئك'],
  [/مسؤلية/g, 'مسؤولية'],
  [/مسئولية/g, 'مسؤولية'],
  [/شئون/g, 'شؤون'],
  [/هيئه/g, 'هيئة'],
  [/المملكه/g, 'المملكة'],
  [/العربيه/g, 'العربية'],
  [/السعوديه/g, 'السعودية'],
  [/العداله/g, 'العدالة'],
  [/المحاكمه/g, 'المحاكمة'],

  // Judicial MSA — corrupt ي → correct ى (correct direction ONLY)
  [/المدعي عليها/g, 'المدعى عليها'],
  [/(^|[^\u0600-\u06FF])المدعي عليه(?=[^\u0600-\u06FF]|$)/g, '$1المدعى عليه'],
  [/الدعوي/g, 'الدعوى'],
  [/(^|[^\u0600-\u06FF])دعوي(?=[^\u0600-\u06FF]|$)/g, '$1دعوى'],
  [/قضيه/g, 'قضية'],
  [/شكوي/g, 'شكوى'],
  [/فتوي/g, 'فتوى'],
  [/مذكره/g, 'مذكرة'],
  [/محضره/g, 'محضرة'],
  [/نتيجه/g, 'نتيجة'],
  [/توصيه/g, 'توصية'],
  [/صلاحيه/g, 'صلاحية'],
  [/مخالصه/g, 'مخالصة'],
  [/تسويه/g, 'تسوية'],
  [/المطالبه/g, 'المطالبة'],
  [/الأهليه|الاهليه/g, 'الأهلية'],

  // honorifics — whole-phrase / known judicial forms first
  [/فضيله\s+القاضي/g, 'فضيلة القاضي'],
  [/فضيله\s+القاضية/g, 'فضيلة القاضية'],
  [/فضيله\s+الشيخ/g, 'فضيلة الشيخ'],
  [/فضيله\s+رئيس/g, 'فضيلة رئيس'],
  [/فضيله/g, 'فضيلة'],
  [/سعاده\s+الأستاذ/g, 'سعادة الأستاذ'],
  [/سعاده\s+الاستاذ/g, 'سعادة الأستاذ'],
  [/سعاده/g, 'سعادة'],
  [/الاستاذ\b/g, 'الأستاذ'],
  [/الاستاذه\b/g, 'الأستاذة'],
  [/الاستاذة\b/g, 'الأستاذة'],
  [/معالي\s+الوزير/g, 'معالي الوزير'],

  // judicial phrasing
  [/بناءا\s*على|بناءاً\s*على/g, 'بناءً على'],
  [/بناء عليه/g, 'بناءً عليه'],
  [/نظرا\s+ل/g, 'نظراً ل'],
  [/اشاره\s+إلى|إشاره\s+إلى/g, 'إشارة إلى'],
  [/بالإضافه\s+إلى|بالاضافه\s+إلى/g, 'بالإضافة إلى'],
  [/وفقا\s+ل/g, 'وفقاً ل'],
  [/طبقا\s+ل/g, 'طبقاً ل'],
  [/استنادا\s+إلى/g, 'استناداً إلى'],
  [/وعلي\s+ذلك/g, 'وعلى ذلك'],
  [/وبناء\s+عليه/g, 'وبناءً عليه'],

  [/السلام عليكم ورحمة الله وبركاته\s*و?بعد\s*[:-]*/g, 'السلام عليكم ورحمة الله وبركاته وبعد:-'],
  [/\n{3,}/g, '\n\n'],
];

/** True when «علي» looks like a person name rather than the preposition «على». */
export function isNameLikeAli(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 40), index);
  const after = text.slice(index + 3, index + 40);
  if (HONORIFIC_BEFORE.test(before)) return true;
  if (FAMILY_AFTER.test(after)) return true;
  // «السيد علي …» / trailing name pattern
  if (/(?:^|[\s،.:؛])(?:السيد|الشيخ|الأستاذ|الاستاذ)\s*$/.test(before)) return true;
  return false;
}

function replaceAliSafely(t: string): string {
  return t.replace(/(^|[\s،.:؛])علي(?=$|[\s،.:؛])/g, (full, prefix, offset, whole) => {
    const idx = offset + String(prefix).length;
    if (isNameLikeAli(String(whole), idx)) return full;
    return `${prefix}على`;
  });
}

export function polishSpelling(raw: string): string {
  let t = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!t) return '';
  for (const [re, to] of REPLACEMENTS) t = t.replace(re, to as string);
  t = t.replace(/فضيله/g, 'فضيلة');
  t = t.replace(/سعاده/g, 'سعادة');
  t = replaceAliSafely(t);
  t = t.replace(/بناءاً?(?=$|[\s،.])/g, 'بناءً');
  t = t.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

/** Formal judicial restructuring for correspondence */
export function polishLegalStyle(raw: string): string {
  let t = polishSpelling(raw);
  if (!t) return '';

  const isStudy = /رقم القضية|ملخص الدعوى|التوصية|دارس القضية|معد الدراسة/.test(t);

  if (!isStudy) {
    if (!/السلام عليكم/.test(t) && t.length > 40) {
      t = `السلام عليكم ورحمة الله وبركاته وبعد:-\n\n${t}`;
    }
    // Prefer formal connectors — whole words only
    t = t
      .replace(/(^|[^\u0600-\u06FF])يعني(?=[^\u0600-\u06FF]|$)/g, '$1أي')
      .replace(/(^|[^\u0600-\u06FF])طيب(?=[^\u0600-\u06FF]|$)/g, '$1')
      .replace(/(^|[^\u0600-\u06FF])اللي(?=[^\u0600-\u06FF]|$)/g, '$1الذي')
      .replace(/(^|[^\u0600-\u06FF])علشان(?=[^\u0600-\u06FF]|$)/g, '$1من أجل')
      .replace(/(^|[^\u0600-\u06FF])عشان(?=[^\u0600-\u06FF]|$)/g, '$1من أجل');
  }

  t = t
    .split('\n')
    .map((line) => line.replace(/^[\-\*•]\s+/, '— '))
    .join('\n');

  if (!isStudy && t.length > 120 && !/والله الموفق|أعانكم الله|وتفضلوا|وتقبلوا/.test(t)) {
    t = `${t.replace(/\s+$/, '')}\n\nوالله الموفق،،،`;
  }

  return t.replace(/\n{3,}/g, '\n\n').trim();
}

export function proofreadReport(before: string, after: string): string {
  if (before === after) return 'لم يُرصد تعديل إملائي جوهري على النص الحالي.';
  const samples: string[] = [];
  if (/فضيله/.test(before) && /فضيلة/.test(after)) samples.push('فضيله → فضيلة');
  if (/سعاده/.test(before) && /سعادة/.test(after)) samples.push('سعاده → سعادة');
  if (/بناءا/.test(before) && /بناءً/.test(after)) samples.push('بناءا → بناءً');
  const tip = samples.length ? ` أمثلة: ${samples.join('، ')}.` : '';
  return `تم التدقيق محلياً (إملاء وصياغة قضائية خفيفة).${tip} راجع النص قبل الاعتماد.`;
}

export type PolishIssue = {
  type: 'spelling' | 'style';
  found: string;
  suggestion: string;
  message: string;
};

export type LegalPhraseSuggestion = {
  found: string;
  suggestion: string;
  message: string;
};

const STYLE_MARKERS: { found: string; suggestion: string; message: string }[] = [
  { found: 'طيب', suggestion: '—', message: 'لفظ غير رسمي — يُحذف في الصياغة القضائية' },
  { found: 'اللي', suggestion: 'الذي', message: 'صيغة عامية — يُفضّل «الذي»' },
  { found: 'علشان', suggestion: 'من أجل', message: 'صيغة عامية — يُفضّل «من أجل»' },
  { found: 'عشان', suggestion: 'من أجل', message: 'صيغة عامية — يُفضّل «من أجل»' },
  { found: 'يعني', suggestion: 'أي', message: 'صيغة غير رسمية — يُفضّل «أي»' },
];

/** Informal / weak openings → concise formal judicial phrasing */
const LEGAL_PHRASE_RULES: { found: string; suggestion: string; message: string }[] = [
  { found: 'نحب نبلغكم', suggestion: 'نود إشعاركم', message: 'افتتاح غير رسمي' },
  { found: 'نحب نحيطكم', suggestion: 'نحيطكم علماً', message: 'افتتاح غير رسمي' },
  { found: 'نبغى نبلغكم', suggestion: 'نود إشعاركم', message: 'افتتاح عامي' },
  { found: 'نبي نبلغكم', suggestion: 'نود إشعاركم', message: 'افتتاح عامي' },
  { found: 'يرجى العلم', suggestion: 'نحيطكم علماً', message: 'صياغة أقصر وأقوى' },
  { found: 'نرجو العلم', suggestion: 'نحيطكم علماً', message: 'صياغة قضائية مختصرة' },
  { found: 'نود إفادتكم', suggestion: 'نحيطكم علماً', message: 'صياغة قضائية مختصرة' },
  { found: 'حابين نبلغكم', suggestion: 'نود إشعاركم', message: 'افتتاح عامي' },
  { found: 'بصراحة', suggestion: '—', message: 'لفظ غير قضائي — يُحذف' },
  { found: 'طيب', suggestion: '—', message: 'لفظ غير رسمي — يُحذف' },
  { found: 'اللي', suggestion: 'الذي', message: 'صيغة عامية' },
  { found: 'علشان', suggestion: 'من أجل', message: 'صيغة عامية' },
  { found: 'عشان', suggestion: 'من أجل', message: 'صيغة عامية' },
  { found: 'ما فيه', suggestion: 'لا يوجد', message: 'صيغة عامية' },
  { found: 'مافي', suggestion: 'لا يوجد', message: 'صيغة عامية' },
  { found: 'لازم', suggestion: 'يتعين', message: 'صيغة غير رسمية' },
  { found: 'بالسرعة', suggestion: 'على وجه السرعة', message: 'صياغة قضائية' },
  { found: 'بأقرب وقت', suggestion: 'في أقرب وقت ممكن', message: 'صياغة أوضح' },
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasArabicWord(text: string, word: string): boolean {
  const re = new RegExp(`(?:^|[^\\u0600-\\u06FF])${escapeRe(word)}(?:[^\\u0600-\\u06FF]|$)`);
  return re.test(text);
}

function stripEdgeJunk(s: string): string {
  return s.replace(/^[^\u0600-\u06FFa-zA-Z0-9]+|[^\u0600-\u06FFa-zA-Z0-9]+$/g, '');
}

function tokenize(s: string): string[] {
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function collectTokenDiffs(before: string, after: string): { found: string; suggestion: string }[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const out: { found: string; suggestion: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    if (j + 1 < b.length && a[i] === b[j + 1]) {
      j += 1;
      continue;
    }
    if (i + 1 < a.length && a[i + 1] === b[j]) {
      i += 1;
      continue;
    }
    out.push({ found: a[i], suggestion: b[j] });
    i += 1;
    j += 1;
  }
  return out;
}

function isForbiddenFlip(found: string, suggestion: string): boolean {
  const f = stripEdgeJunk(found);
  const s = stripEdgeJunk(suggestion);
  for (const [ok, bad] of FORBIDDEN_FLIPS) {
    if (f === ok && s === bad) return true;
    // multi-word only: e.g. «المدعى عليه» → «المدعي عليه»
    if (ok.includes(' ') && f === ok && s === bad) return true;
  }
  // Never suggest changing a protected form into a ي-ending corrupt twin
  for (const p of PROTECTED_FORMS) {
    if (f === p && s !== p && s.replace(/ى/g, 'ي') === f.replace(/ى/g, 'ي')) {
      if (f.includes('ى') && s.includes('ي') && !s.includes('ى')) return true;
    }
  }
  // Correct compound already present must never be flipped back
  if (f === 'المدعى عليه' && s === 'المدعي عليه') return true;
  if (f === 'المدعى عليها' && s === 'المدعي عليها') return true;
  if (f === 'الدعوى' && s === 'الدعوي') return true;
  return false;
}

function isProtectedToken(token: string): boolean {
  const t = stripEdgeJunk(token);
  return (PROTECTED_FORMS as readonly string[]).includes(t);
}

function shouldSkipAmbiguousName(raw: string, found: string, suggestion: string): boolean {
  if (found === suggestion) return true;
  if (!NAME_LIKE_ALIASES.has(found) && found !== 'علي') return false;
  if (found === 'علي' && suggestion === 'على') {
    const idx = raw.indexOf('علي');
    if (idx !== -1 && isNameLikeAli(raw, idx)) return true;
  }
  return false;
}

/**
 * Short formal rewrite proposals for common informal/weak openings.
 * Returns 1–3 concise suggestions when body text contains matchable phrases.
 */
export function suggestLegalPhrases(text: string): LegalPhraseSuggestion[] {
  const raw = String(text || '');
  if (!raw.trim()) return [];
  const out: LegalPhraseSuggestion[] = [];
  const seen = new Set<string>();
  for (const rule of LEGAL_PHRASE_RULES) {
    if (!raw.includes(rule.found) && !hasArabicWord(raw, rule.found)) continue;
    // require word-ish presence for short tokens
    if (rule.found.length <= 4 && !hasArabicWord(raw, rule.found)) continue;
    if (rule.found.length > 4 && !raw.includes(rule.found)) continue;
    if (isProtectedBlessingHit(raw, rule.found)) continue;
    if (rule.found === 'والله' || (rule.suggestion === '—' && /والله/.test(rule.found))) continue;
    const key = `${rule.found}→${rule.suggestion}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      found: rule.found,
      suggestion: rule.suggestion,
      message: rule.message,
    });
    if (out.length >= 3) break;
  }
  return out;
}

/**
 * Detect spelling + informal-style issues without rewriting the input.
 * Discrete replacements only; callers must never mutate form state from this.
 */
export function findPolishIssues(text: string): PolishIssue[] {
  const raw = String(text || '');
  if (!raw.trim()) return [];

  const issues: PolishIssue[] = [];
  const seen = new Set<string>();

  const add = (issue: PolishIssue) => {
    const found = stripEdgeJunk(issue.found) || issue.found.trim();
    const suggestion = stripEdgeJunk(issue.suggestion) || issue.suggestion.trim();
    if (!found || found === suggestion) return;
    if (isProtectedBlessingHit(raw, found)) return;
    if (found === 'والله') return;
    if (isProtectedToken(found) && isForbiddenFlip(found, suggestion)) return;
    if (isForbiddenFlip(found, suggestion)) return;
    // Bare «المدعي» (plaintiff) must never become «المدعى» — only the compound «المدعي عليه/عليها»
    if (found === 'المدعي' && suggestion === 'المدعى') return;
    // Never flag a protected correct form as an error at all
    if (isProtectedToken(found) && suggestion.replace(/ى/g, 'ي') === found.replace(/ى/g, 'ي')) return;
    if (shouldSkipAmbiguousName(raw, found, suggestion)) return;
    const key = `${issue.type}:${found}→${suggestion}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({
      type: issue.type,
      found,
      suggestion,
      message: issue.message,
    });
  };

  // Honorifics — substring scan so «فضيله قاضيا التشكيل» is always flagged
  if (raw.includes('فضيله')) {
    add({
      type: 'spelling',
      found: 'فضيله',
      suggestion: 'فضيلة',
      message: 'إملائي: «فضيله» → «فضيلة»',
    });
  }
  if (raw.includes('سعاده')) {
    add({
      type: 'spelling',
      found: 'سعاده',
      suggestion: 'سعادة',
      message: 'إملائي: «سعاده» → «سعادة»',
    });
  }

  // Explicit judicial MSA corrections (correct direction only)
  // Check feminine first so «المدعي عليها» is not also matched as «المدعي عليه»
  if (raw.includes('المدعي عليها')) {
    add({
      type: 'spelling',
      found: 'المدعي عليها',
      suggestion: 'المدعى عليها',
      message: 'إملائي قضائي: «المدعي عليها» → «المدعى عليها»',
    });
  }
  if (/(^|[^\u0600-\u06FF])المدعي عليه(?=[^\u0600-\u06FF]|$)/.test(raw)) {
    add({
      type: 'spelling',
      found: 'المدعي عليه',
      suggestion: 'المدعى عليه',
      message: 'إملائي قضائي: «المدعي عليه» → «المدعى عليه»',
    });
  }
  if (/(^|[^\u0600-\u06FF])الدعوي(?=[^\u0600-\u06FF]|$)/.test(raw) || raw.includes('الدعوي')) {
    // only if actually الدعوي (with ي), not الدعوى
    if (raw.includes('الدعوي')) {
      add({
        type: 'spelling',
        found: 'الدعوي',
        suggestion: 'الدعوى',
        message: 'إملائي قضائي: «الدعوي» → «الدعوى»',
      });
    }
  }
  if (hasArabicWord(raw, 'دعوي')) {
    add({
      type: 'spelling',
      found: 'دعوي',
      suggestion: 'دعوى',
      message: 'إملائي قضائي: «دعوي» → «دعوى»',
    });
  }

  // Discrete replacements from polishSpelling vs input (detection only)
  const polished = polishSpelling(raw);
  for (const d of collectTokenDiffs(raw, polished)) {
    const from = stripEdgeJunk(d.found);
    const to = stripEdgeJunk(d.suggestion);
    if (!from || !to || from === to) continue;
    const fromClean = from.replace(/[\u0640\u200f\u200e]/g, '');
    const toClean = to.replace(/[\u0640\u200f\u200e]/g, '');
    if (fromClean === toClean) continue;
    add({
      type: 'spelling',
      found: from,
      suggestion: to,
      message: `إملائي: «${from}» → «${to}»`,
    });
  }

  // Per-token fallback so isolated known wrong forms are not missed
  const tokens = Array.from(
    new Set(
      tokenize(raw)
        .map(stripEdgeJunk)
        .filter(Boolean),
    ),
  );
  for (const token of tokens) {
    if (isProtectedToken(token)) continue;
    if (token === 'علي') {
      // only flag if at least one occurrence is not name-like
      let i = 0;
      let anyPrep = false;
      while ((i = raw.indexOf('علي', i)) !== -1) {
        if (!isNameLikeAli(raw, i)) {
          anyPrep = true;
          break;
        }
        i += 3;
      }
      if (!anyPrep) continue;
    }
    const solo = polishSpelling(token);
    const soloTok = stripEdgeJunk(solo);
    if (!soloTok || soloTok === token) continue;
    if (solo.includes('\n') || soloTok.split(/\s+/).length > 2) continue;
    add({
      type: 'spelling',
      found: token,
      suggestion: soloTok,
      message: `إملائي: «${token}» → «${soloTok}»`,
    });
  }

  // Informal style markers — whole words only
  for (const m of STYLE_MARKERS) {
    if (!hasArabicWord(raw, m.found)) continue;
    add({
      type: 'style',
      found: m.found,
      suggestion: m.suggestion,
      message: `صياغي: ${m.message}`,
    });
  }

  return issues;
}

/** Apply one issue fix: replace the first occurrence of `found` with `suggestion`.
 *  If suggestion is empty or «—», remove the word and collapse surrounding spaces.
 */
export function applyPolishFix(text: string, found: string, suggestion: string): string {
  const src = String(text || '');
  const needle = String(found || '');
  if (!src || !needle) return src;
  // For علي→على, prefer first non-name-like occurrence
  if (needle === 'علي' && String(suggestion).trim() === 'على') {
    let i = 0;
    while ((i = src.indexOf('علي', i)) !== -1) {
      if (!isNameLikeAli(src, i)) {
        return src.slice(0, i) + 'على' + src.slice(i + 3);
      }
      i += 3;
    }
    return src;
  }
  const idx = src.indexOf(needle);
  if (idx === -1) return src;
  const before = src.slice(0, idx);
  const after = src.slice(idx + needle.length);
  const trimmedSug = String(suggestion || '').trim();
  const isDelete = !trimmedSug || trimmedSug === '—' || trimmedSug === '-';
  if (isDelete) {
    const left = before.replace(/[ \t]+$/, '');
    const right = after.replace(/^[ \t]+/, '');
    const needSpace =
      left.length > 0 &&
      right.length > 0 &&
      !/[\n]$/.test(left) &&
      !/^[\n]/.test(right);
    return `${left}${needSpace ? ' ' : ''}${right}`;
  }
  return before + suggestion + after;
}

/** One-shot full polish for all document text fields */
export function polishDocumentFields(fields: {
  subject?: string;
  recipients?: string;
  parties?: string;
  reasons?: string;
  studyFields?: string;
  body?: string;
}) {
  return {
    subject: polishSpelling(fields.subject || ''),
    recipients: polishSpelling(fields.recipients || ''),
    parties: polishSpelling(fields.parties || ''),
    reasons: polishLegalStyle(fields.reasons || ''),
    studyFields: polishSpelling(fields.studyFields || ''),
    body: polishLegalStyle(fields.body || ''),
  };
}
