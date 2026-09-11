/** Arabic ordinal gender + money amount normalization for Excel paste / study display */

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Convert Arabic-Indic / Eastern digits → ASCII 0-9 */
export function toAsciiDigits(raw: string): string {
  return String(raw || '')
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EASTERN_DIGITS.indexOf(d)));
}

/**
 * التشكيل / الدائرة ordinals are masculine in court usage.
 * الأولى→الأول، الثانية→الثاني، الثالثة→الثالث، الرابعة→الرابع، الخامسة→الخامس…
 */
const FEM_TO_MASC_ORDINAL: Record<string, string> = {
  الأولى: 'الأول',
  الاولى: 'الأول',
  الثانية: 'الثاني',
  الثالثه: 'الثالث',
  الثالثة: 'الثالث',
  الرابعة: 'الرابع',
  الرابعه: 'الرابع',
  الخامسة: 'الخامس',
  الخامسه: 'الخامس',
  السادسة: 'السادس',
  السادسه: 'السادس',
  السابعة: 'السابع',
  السابعه: 'السابع',
  الثامنة: 'الثامن',
  الثامنه: 'الثامن',
  التاسعة: 'التاسع',
  التاسعه: 'التاسع',
  العاشرة: 'العاشر',
  العاشره: 'العاشر',
};

export function normalizeFormationOrdinal(raw?: string | null): string {
  let v = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!v) return '';
  // Strip optional "التشكيل" / "رقم" wrappers leaving the ordinal
  for (const [fem, masc] of Object.entries(FEM_TO_MASC_ORDINAL)) {
    if (v === fem || v.endsWith(fem) || v.includes(fem)) {
      v = v.split(fem).join(masc);
    }
  }
  // Also bare without ال: رابعة → رابع
  v = v
    .replace(/\bرابعة\b/g, 'رابع')
    .replace(/\bثالثة\b/g, 'ثالث')
    .replace(/\bثانية\b/g, 'ثاني')
    .replace(/\bأولى\b/g, 'أول')
    .replace(/\bاولى\b/g, 'أول')
    .replace(/\bخامسة\b/g, 'خامس');
  return v.replace(/\s+/g, ' ').trim();
}

/**
 * Parse Excel / European / Arabic separators into a finite number.
 * Never reverses digit groups — only interprets separators.
 * Examples:
 *   ٧٥٣٬٠٧٨٫٤٨ → 753078.48
 *   753,078.48 → 753078.48
 *   753.078,48 → 753078.48 (European)
 *   753078.48  → 753078.48
 */
export function parseMoneyNumber(raw?: string | null): number | null {
  if (raw == null) return null;
  let s = toAsciiDigits(String(raw)).trim();
  if (!s) return null;
  // Arabic thousands ٬ (U+066C) and decimal ٫ (U+066B)
  s = s.replace(/\u066C/g, ',').replace(/\u066B/g, '.');
  // Strip currency words / spaces around
  s = s.replace(/[^\d.,\s-]/g, '').replace(/\s+/g, '').trim();
  if (!s) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    // Whichever separator appears last is the decimal
    if (lastDot > lastComma) {
      // 753,078.48 — US/Arabic western
      s = s.replace(/,/g, '');
    } else {
      // 753.078,48 — European
      s = s.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma && !hasDot) {
    // 753,078 or 078,48 — if exactly 3 digits after last comma → thousands; else decimal
    const parts = s.split(',');
    const last = parts[parts.length - 1] || '';
    if (parts.length === 2 && last.length > 0 && last.length <= 2) {
      s = parts[0] + '.' + last; // decimal
    } else {
      s = parts.join(''); // thousands groups
    }
  } else if (hasDot && !hasComma) {
    const parts = s.split('.');
    const last = parts[parts.length - 1] || '';
    if (parts.length > 2) {
      // 753.078.48 unlikely — treat last as decimal
      s = parts.slice(0, -1).join('') + '.' + last;
    } else if (parts.length === 2 && last.length === 3 && parts[0].length <= 3) {
      // Ambiguous 753.078 — prefer thousands if 3-digit group (European thousands without decimals)
      // But Excel money usually has decimals. Keep as decimal if last length is 1–2; if 3 and left is small, thousands.
      s = parts.join('');
    }
    // else keep as decimal 753078.48 style already fine
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Display amount as 753,078.48 (Western grouping) — safe for dir=ltr embed */
export function formatClaimAmount(raw?: string | null): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const n = parseMoneyNumber(trimmed);
  if (n == null) {
    // Fallback: ascii digits, keep as-is but strip weird bidi marks
    return toAsciiDigits(trimmed).replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
  }
  return n.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Normalize claim amount on parse: store canonical Western display form */
export function normalizeClaimAmount(raw?: string | null): string {
  return formatClaimAmount(raw);
}
