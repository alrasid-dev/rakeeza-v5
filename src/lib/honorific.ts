/** Address lines for internal correspondence — peer titles, not سعادة */

export type HonorificEmployee = {
  name: string;
  gender?: string | null;
  notes?: string | null;
  position?: { title?: string | null; honorific?: string | null } | null;
};

const FEMALE_FIRST_NAMES = new Set(
  [
    'فاطمة',
    'نورة',
    'نورا',
    'سارة',
    'مريم',
    'عائشة',
    'هند',
    'منال',
    'ريم',
    'لينا',
    'نوف',
    'أمل',
    'هدى',
    'هيا',
    'غادة',
    'سمية',
    'خديجة',
    'رقية',
    'زينب',
    'إيمان',
    'ايمان',
    'منى',
    'منال',
    'وفاء',
    'سعاد',
    'لطيفة',
    'حصة',
    'مها',
    'لمياء',
    'أسماء',
    'اسماء',
    'جواهر',
    'العنود',
    'الجوهرة',
    'شيخة',
    'موضي',
    'نوال',
    'هيفاء',
    'خلود',
    'دانة',
    'دلال',
    'راوية',
    'سمر',
    'شيماء',
    'عالية',
    'غزل',
    'فوزية',
    'كمال',
    'لميس',
    'ميساء',
    'نجلاء',
    'هناء',
    'ياسمين',
    'أروى',
    'اروى',
    'بشرى',
    'تالا',
    'جمانة',
    'حنان',
    'خولة',
    'رولا',
    'سلمى',
    'شروق',
    'عبير',
    'غادة',
    'فجر',
    'قمر',
    'كوثر',
    'ليلى',
    'ليان',
    'مديحة',
    'نادين',
    'هالة',
    'وداد',
    'يسرى',
  ].map((n) => n.trim()),
);

/** Infer gender from explicit field, notes, or Arabic name heuristics */
export function inferGender(
  emp: HonorificEmployee,
): 'male' | 'female' | 'unknown' {
  const g = String(emp.gender || '')
    .trim()
    .toLowerCase();
  if (g === 'f' || g === 'female' || g === 'أنثى' || g === 'انثى' || g === 'بنت') return 'female';
  if (g === 'm' || g === 'male' || g === 'ذكر' || g === 'ولد') return 'male';

  const notes = String(emp.notes || '');
  if (/أنثى|انثى|female|\bف\b|جنس\s*[:：]?\s*أ?نث/i.test(notes)) return 'female';
  if (/ذكر|male|\bم\b|جنس\s*[:：]?\s*ذكر/i.test(notes)) return 'male';

  const name = String(emp.name || '').trim();
  if (!name) return 'unknown';
  const first = name.split(/\s+/)[0]?.replace(/[^\u0600-\u06FFa-zA-Z]/g, '') || '';
  if (FEMALE_FIRST_NAMES.has(first)) return 'female';
  // Common feminine endings: ة (ta marbuta), اء for some names
  if (/ة$/.test(first) && first.length >= 3) return 'female';
  // بنت in full name
  if (/\bبنت\b/.test(name)) return 'female';
  // بنت فلان / ابنة
  if (/ابنة|إبنة/.test(name)) return 'female';

  return 'unknown';
}

function isVipHonorific(h: string) {
  return /^(فضيلة|معالي|سمو|صاحب)/.test(h.trim());
}

function isSaadaOrEmptyStaff(h: string) {
  const t = h.trim();
  if (!t) return true;
  // Strip bare سعادة / سعادة/ used for generic staff
  if (/^سعاد[ةه]\s*\/?\s*$/.test(t)) return true;
  if (/^سعاد[ةه]\s/.test(t) && !isVipHonorific(t)) return true;
  return false;
}

/** Peer address: زميلنا الأستاذ / زميلتنا الأستاذة — never سعادة for staff */
export function peerTitleFor(emp: HonorificEmployee): string {
  const gender = inferGender(emp);
  if (gender === 'female') return 'زميلتنا الأستاذة';
  return 'زميلنا الأستاذ'; // male or uncertain → أستاذ
}

/** Default internal peer address */
export function addressEmployee(emp: HonorificEmployee, opts?: { peerPrefix?: string }) {
  const rawHonorific = emp.position?.honorific?.trim() || '';

  // Keep judicial / VIP honorifics (فضيلة، معالي، سمو)
  if (rawHonorific && isVipHonorific(rawHonorific) && !isSaadaOrEmptyStaff(rawHonorific)) {
    return `${rawHonorific} / ${emp.name}`.replace(/\s+/g, ' ').trim();
  }

  // Ignore سعادة and generic staff honorifics — use gender-aware peer form
  const peer = opts?.peerPrefix?.trim() || peerTitleFor(emp);
  return `${peer} / ${emp.name}`.replace(/\s+/g, ' ').trim();
}

export function addressEmployees(emps: HonorificEmployee[]) {
  return emps.map((e) => addressEmployee(e)).join('\n');
}

export function buildTitle(honorific: string, position: string, name?: string) {
  const base = honorific || position || '';
  return name ? `${base} / ${name}` : base;
}

/** True when document has an official outgoing number (صادر-…) */
export function hasOfficialOutgoingNumber(number?: string | null): boolean {
  if (!number) return false;
  return /صادر\s*[-–—]?\s*\d{4}\s*[-–—]?\s*\d+/i.test(String(number).trim());
}
