/** Local Arabic spelling/style polish — no paid API */

const REPLACEMENTS: [RegExp, string][] = [
  [/ +/g, ' '],
  [/\u0640+/g, ''], // tatweel
  [/ى(?=\s|$|[.،؛:!؟])/g, 'ي'],
  [/\bان\b/g, 'أن'],
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
  [/لان/g, 'لأن'],
  [/هاذا/g, 'هذا'],
  [/هاذه/g, 'هذه'],
  [/اولائك|أولائك/g, 'أولئك'],
  [/مسؤلية/g, 'مسؤولية'],
  [/مسئولية/g, 'مسؤولية'],
  [/شئون/g, 'شؤون'],
  [/هيئة/g, 'هيئة'],
  [/السلام عليكم ورحمة الله وبركاته\s*و?بعد\s*[:-]*/g, 'السلام عليكم ورحمة الله وبركاته وبعد:-'],
  [/\n{3,}/g, '\n\n'],
];

export function polishSpelling(raw: string): string {
  let t = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!t) return '';
  for (const [re, to] of REPLACEMENTS) t = t.replace(re, to);
  return t.trim();
}

/** Light formal restructuring for correspondence body */
export function polishLegalStyle(raw: string): string {
  let t = polishSpelling(raw);
  if (!t) return '';

  // Ensure formal opening if letter-like
  if (!/السلام عليكم/.test(t) && t.length > 40 && !/رقم القضية|ملخص الدعوى/.test(t)) {
    t = `السلام عليكم ورحمة الله وبركاته وبعد:-\n\n${t}`;
  }

  // Normalize bullets
  t = t
    .split('\n')
    .map((line) => line.replace(/^[\-\*•]\s+/, '— '))
    .join('\n');

  // Closing courtesy if missing on longer letters
  if (t.length > 120 && !/والله الموفق|أعانكم الله|وتفضلوا/.test(t) && !/رقم القضية/.test(t)) {
    t = `${t.replace(/\s+$/, '')}\n\nوالله الموفق،،،`;
  }

  return t.replace(/\n{3,}/g, '\n\n').trim();
}

export function proofreadReport(before: string, after: string): string {
  if (before === after) return 'لم يُرصد تعديل إملائي جوهري.';
  const n = Math.abs(after.length - before.length);
  return `تم التدقيق محلياً (بدون خدمة مدفوعة). فرق تقريبي في الطول: ${n} حرفاً. راجع النص قبل الاعتماد.`;
}
