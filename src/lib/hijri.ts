/**
 * Official document dates — Umm al-Qura (islamic-umalqura), Saudi MOJ style.
 * Format: 1448/03/28هـ (Western digits). Technical timestamps stay Gregorian.
 */

const HIJRI_CAL = 'islamic-umalqura';
const TZ = 'Asia/Riyadh';

function toDate(input?: Date | string | null): Date | null {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const s = String(input).trim();
  if (!s) return null;
  // ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.length === 10 ? `${s}T12:00:00+03:00` : s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function partsFromGregorian(date: Date) {
  const fmt = new Intl.DateTimeFormat(`en-u-ca-${HIJRI_CAL}`, {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const bag: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') bag[p.type] = p.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
  };
}

/** `1448/03/28هـ` */
export function formatHijri(input?: Date | string | null): string {
  const d = toDate(input) ?? new Date();
  const { year, month, day } = partsFromGregorian(d);
  if (!year || !month || !day) return '—';
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}هـ`;
}

export function hijriYear(input?: Date | string | null): number {
  const d = toDate(input) ?? new Date();
  return partsFromGregorian(d).year;
}

export function todayGregorianISO(): string {
  // Local Riyadh civil date as ISO yyyy-mm-dd
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA → YYYY-MM-DD
  return fmt.format(new Date());
}

export function todayHijri(): string {
  return formatHijri(new Date());
}

/** Ensure suffix هـ and slash separators when value already looks Hijri. */
export function normalizeHijriDisplay(value: string): string {
  let v = value.trim().replace(/\s*هـ?\s*$/, '').replace(/\s*هجر[يى].*$/, '');
  // Arabic-Indic → Western
  v = v.replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
  const m = v.match(/(\d{3,4})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})/);
  if (m) {
    return `${m[1]}/${m[2].padStart(2, '0')}/${m[3].padStart(2, '0')}هـ`;
  }
  return /هـ/.test(value) ? value.trim() : `${value.trim()}هـ`;
}

export function looksLikeHijri(value: string): boolean {
  const v = value.trim();
  if (/هـ|هجر/.test(v)) return true;
  const m = v.match(/(\d{3,4})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})/);
  if (!m) return false;
  const y = Number(m[1]);
  return y >= 1300 && y <= 1600;
}

/**
 * Prefer stored Hijri; else convert Gregorian ISO; else raw fallback.
 * Used everywhere the user sees «التاريخ» on official paper.
 */
export function officialDateDisplay(
  dateHijri?: string | null,
  dateGregorian?: string | null,
): string {
  if (dateHijri && String(dateHijri).trim()) {
    return normalizeHijriDisplay(String(dateHijri));
  }
  if (dateGregorian && String(dateGregorian).trim()) {
    if (looksLikeHijri(String(dateGregorian))) {
      return normalizeHijriDisplay(String(dateGregorian));
    }
    const d = toDate(dateGregorian);
    if (d) return formatHijri(d);
  }
  return '—';
}

/** Keep both fields in sync when user picks a Gregorian day. */
export function syncDatesFromGregorian(iso: string): { dateGregorian: string; dateHijri: string } {
  const g = iso || todayGregorianISO();
  return { dateGregorian: g, dateHijri: formatHijri(g) };
}
