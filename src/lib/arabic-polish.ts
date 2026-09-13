/** Local Arabic spelling / grammar / judicial style polish — no paid API */

const REPLACEMENTS: [RegExp, string][] = [
  [/ +/g, ' '],
  [/\u0640+/g, ''], // tatweel
  [/\u200f|\u200e/g, ''],

  // Arabic-safe (avoid \b)
  [/بناءاً?(?=\s|$)/g, 'بناءً'],
  [/(^|[\s،.])ان(?=[\s]|$)/g, '$1أن'],
  [/(^|[\s،.])علي(?=[\s]|$)/g, '$1على'],
  [/(^|[\s،.])الي(?=[\s]|$)/g, '$1إلى'],
  [/(^|[\s،.])لدي(?=[\s]|$)/g, '$1لدى'],
  [/(^|[\s،.])حتي(?=[\s]|$)/g, '$1حتى'],
  [/(^|[\s،.])اذا(?=[\s]|$)/g, '$1إذا'],
  [/(^|[\s،.])او(?=[\s]|$)/g, '$1أو'],

  // hamza / common typos
  [/ى(?=\s|$|[.،؛:!؟\)])/g, 'ي'],
  [/(^|\s)ان(?=\s|$)/g, '$1أن'],
  [/\bان لا\b/g, 'ألا'],
  [/\bعلي\b/g, 'على'],
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
  [/الدعوي(?!\s)/g, 'الدعوى'],
  [/دعوي\b/g, 'دعوى'],
  [/قضيه/g, 'قضية'],
  [/شكوي/g, 'شكوى'],
  [/مذكره/g, 'مذكرة'],
  [/محضره/g, 'محضرة'],
  [/نتيجه/g, 'نتيجة'],
  [/توصيه/g, 'توصية'],
  [/صلاحيه/g, 'صلاحية'],
  [/مخالصه/g, 'مخالصة'],
  [/تسويه/g, 'تسوية'],
  [/المطالبه/g, 'المطالبة'],
  [/الأهليه|الاهليه/g, 'الأهلية'],

  // honorifics — user's test case and variants
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

export function polishSpelling(raw: string): string {
  let t = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!t) return '';
  for (const [re, to] of REPLACEMENTS) t = t.replace(re, to as string);
  // Extra pass for honorifics + علي
  t = t.replace(/فضيله/g, 'فضيلة');
  t = t.replace(/سعاده/g, 'سعادة');
  t = t.replace(/(^|[\s،.:؛])علي(?=$|[\s،.:؛])/g, (_, a) => `${a}على`);
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
    // Prefer formal connectors
    t = t
      .replace(/\bيعني\b/g, 'أي')
      .replace(/\bطيب\b/g, '')
      .replace(/\bاللي\b/g, 'الذي')
      .replace(/\bعلشان\b/g, 'من أجل')
      .replace(/\bعشان\b/g, 'من أجل');
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

const STYLE_MARKERS: { found: string; suggestion: string; message: string }[] = [
  { found: 'طيب', suggestion: '—', message: 'لفظ غير رسمي — يُحذف في الصياغة القضائية' },
  { found: 'اللي', suggestion: 'الذي', message: 'صيغة عامية — يُفضّل «الذي»' },
  { found: 'علشان', suggestion: 'من أجل', message: 'صيغة عامية — يُفضّل «من أجل»' },
  { found: 'عشان', suggestion: 'من أجل', message: 'صيغة عامية — يُفضّل «من أجل»' },
  { found: 'يعني', suggestion: 'أي', message: 'صيغة غير رسمية — يُفضّل «أي»' },
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

  // Informal style markers from polishLegalStyle — detect only, never rewrite
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
