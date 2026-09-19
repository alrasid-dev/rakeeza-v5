/** Address lines for internal correspondence — peer titles, not سعادة */

export type HonorificEmployee = {
  name: string;
  gender?: string | null;
  notes?: string | null;
  position?: { title?: string | null; honorific?: string | null } | null;
};

/** Normalize Arabic first-name keys (alef/hamza variants) for lookup */
function normalizeNameKey(s: string): string {
  return String(s || '')
    .trim()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ً|ٌ|ٍ|َ|ُ|ِ|ْ|ّ|ٰ/g, '');
}

const FEMALE_FIRST_NAMES = new Set(
  [
    // Explicitly reported / common Saudi female names
    'ابتسام',
    'فاطمة',
    'نورة',
    'نورا',
    'سارة',
    'مريم',
    'عائشة',
    'عايشة',
    'خديجة',
    'هند',
    'منال',
    'نوف',
    'ريم',
    'لينا',
    'امل',
    'هدى',
    'ايمان',
    'هيا',
    'غادة',
    'سمية',
    'رقية',
    'زينب',
    'منى',
    'وفاء',
    'سعاد',
    'لطيفة',
    'حصة',
    'مها',
    'لمياء',
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
    'لميس',
    'ميساء',
    'نجلاء',
    'هناء',
    'ياسمين',
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
    'بدرية',
    'جواهر',
    'حصة',
    'رغد',
    'ريناد',
    'سحر',
    'شذى',
    'شهد',
    'صبا',
    'ضحى',
    'عفاف',
    'غيداء',
    'فرح',
    'فيروز',
    'لمى',
    'ماجدة',
    'ملاك',
    'نادية',
    'نسرين',
    'نوال',
    'هدى',
    'وعد',
    'ياسمينة',
    'الجازي',
    'الجازية',
    'مشاعل',
    'موضي',
    'نوره',
    'ابتهاج',
    'اسيل',
    'اليا',
    'تسنيم',
    'جنى',
    'جوري',
    'حلا',
    'دانيا',
    'رغداء',
    'ريما',
    'سدين',
    'شوق',
    'صفا',
    'لطيفة',
    'مرام',
    'مي',
    'ميس',
    'ناديا',
    'نرمين',
    'هنادي',
    'وئام',
    'وسن',
  ].map((n) => normalizeNameKey(n)),
);

/** Infer gender from explicit field, notes, title, or Arabic name heuristics */
export function inferGender(
  emp: HonorificEmployee,
): 'male' | 'female' | 'unknown' {
  const g = String(emp.gender || '')
    .trim()
    .toLowerCase();
  if (g === 'f' || g === 'female' || g === 'أنثى' || g === 'انثى' || g === 'بنت' || g === 'انثي')
    return 'female';
  if (g === 'm' || g === 'male' || g === 'ذكر' || g === 'ولد') return 'male';

  const notes = String(emp.notes || '');
  if (/أنثى|انثى|female|\bف\b|جنس\s*[:：]?\s*أ?نث/i.test(notes)) return 'female';
  if (/ذكر|male|\bم\b|جنس\s*[:：]?\s*ذكر/i.test(notes)) return 'male';

  const title = String(emp.position?.title || '');
  const honorific = String(emp.position?.honorific || '');
  const titleBlob = `${title} ${honorific}`;
  if (/قاضية|أستاذة|استاذة|باحثة|مستشارة|موظفة|مديرة|رئيسة|سكرتيرة|أخصائية|اخصائية/.test(titleBlob)) {
    return 'female';
  }
  if (/قاضي(?!ة)|أستاذ(?!ة)|استاذ(?!ة)|باحث(?!ة)|مستشار(?!ة)|مدير(?!ة)|رئيس(?!ة)/.test(titleBlob)) {
    // weak male signal from title — only if not already female-marked
  }

  const name = String(emp.name || '').trim();
  if (!name) return 'unknown';
  const firstRaw = name.split(/\s+/)[0]?.replace(/[^\u0600-\u06FFa-zA-Z]/g, '') || '';
  const first = normalizeNameKey(firstRaw);
  if (FEMALE_FIRST_NAMES.has(first)) return 'female';
  // Common feminine endings: ة (ta marbuta)
  if (/ة$/.test(firstRaw) && firstRaw.length >= 3) return 'female';
  // بنت / ابنة in full name
  if (/\bبنت\b/.test(name) || /ابنة|إبنة/.test(name)) return 'female';

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

/** Gender-aware judicial VIP line: فضيلة القاضي / فضيلة القاضية */
export function vipHonorificFor(emp: HonorificEmployee, rawHonorific: string): string {
  const gender = inferGender(emp);
  const h = rawHonorific.trim();
  if (/^فضيلة/.test(h)) {
    if (/قاض/.test(h) || /قاض/.test(String(emp.position?.title || ''))) {
      return gender === 'female' ? 'فضيلة القاضية' : 'فضيلة القاضي';
    }
    // Keep معالي/سمو-style as provided if already complete
    if (gender === 'female' && /القاضي\b/.test(h)) return h.replace(/القاضي\b/, 'القاضية');
  }
  return h;
}

/** Peer address: الأستاذ / الأستاذة — never سعادة or زميل for staff */
export function peerTitleFor(emp: HonorificEmployee): string {
  const gender = inferGender(emp);
  if (gender === 'female') return 'الأستاذة';
  return 'الأستاذ'; // male or uncertain → أستاذ
}

/** Default internal peer address */
/** True when title/honorific marks an acting (مكلف) appointment */
export function isActingAppointment(title?: string | null, honorific?: string | null): boolean {
  return /مكلف/.test(String(title || '')) || /مكلف/.test(String(honorific || ''));
}

/**
 * Infer judicial VIP line from position title.
 * Examples: رئيس محكمة مكلف → فضيلة رئيس المحكمة المكلف
 */
export function courtPresidentHonorificFromTitle(title?: string | null): string | null {
  const t = String(title || '').trim();
  if (!t) return null;
  if (/رئيس\s*(محكمة|المحكمة)\s*الم?كلف|رئيس\s*محكمة\s*مكلف/.test(t)) {
    return 'فضيلة رئيس المحكمة المكلف';
  }
  if (/رئيس\s*(محكمة|المحكمة)/.test(t) && !/مساعد|تشكيل|مكلف/.test(t)) {
    return 'فضيلة رئيس المحكمة';
  }
  if (/رئيس\s*تشكيل|رئيس\s*التشكيل/.test(t)) {
    return /مكلف/.test(t) ? 'فضيلة رئيس التشكيل المكلف' : 'فضيلة رئيس التشكيل';
  }
  if (/الرئيس\s*المساعد|مساعد\s*رئيس/.test(t)) {
    return /مكلف/.test(t) ? 'فضيلة الرئيس المساعد المكلف' : 'فضيلة الرئيس المساعد';
  }
  return null;
}

/**
 * Address line for internal letters.
 * If the person is مكلف, include the full acting title so the letter shows e.g.
 * «فضيلة رئيس المحكمة المكلف / …» or «الأستاذ مدير الموارد البشرية المكلف / …».
 */
export function addressEmployee(emp: HonorificEmployee, opts?: { peerPrefix?: string }) {
  const rawHonorific = emp.position?.honorific?.trim() || '';
  const title = emp.position?.title?.trim() || '';
  const acting = isActingAppointment(title, rawHonorific);
  const fromTitle = courtPresidentHonorificFromTitle(title);

  let vipLine = '';
  if (rawHonorific && isVipHonorific(rawHonorific) && !isSaadaOrEmptyStaff(rawHonorific)) {
    vipLine = vipHonorificFor(emp, rawHonorific);
  }
  if (fromTitle) {
    if (!vipLine || acting || /مكلف/.test(fromTitle)) {
      vipLine = fromTitle;
    }
  }
  if (/رئيس\s*المحكمة\s*المكلف/.test(rawHonorific)) {
    vipLine = 'فضيلة رئيس المحكمة المكلف';
  }

  if (vipLine) {
    return `${vipLine} / ${emp.name}`.replace(/\s+/g, ' ').trim();
  }

  const peer = opts?.peerPrefix?.trim() || peerTitleFor(emp);

  // Acting staff (non-VIP): show peer + full title with المكلف
  if (acting && title) {
    let role = title;
    role = role.replace(/^الأستاذة?\s*/, '').replace(/^سعاد[ةه]\s*/, '').trim();
    if (!/مكلف/.test(role)) role = `${role} المكلف`;
    return `${peer} ${role} / ${emp.name}`.replace(/\s+/g, ' ').trim();
  }

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

/**
 * Excel «دارس القضية» = ناظر القضية (case overseer). Never label as الباحث.
 */
export function researcherRoleLabel(_name?: string | null): string {
  return 'دارس القضية (الناظر)';
}

/** Alias for UI that prefers the shorter ناظر label */
export function caseOverseerRoleLabel(_name?: string | null): string {
  return 'ناظر القضية';
}

/**
 * معد الدراسة = study author (footer). Separate from دارس/ناظر.
 * Do NOT merge with الباحث.
 */
export function preparerRoleLabel(_name?: string | null): string {
  return 'معد الدراسة';
}
