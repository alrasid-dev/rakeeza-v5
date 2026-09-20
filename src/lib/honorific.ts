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
 * Infer judicial VIP line from position title — base office only (no «المكلف»).
 * «المكلف» is added only when the user toggles the acting flag in the UI.
 */
export function courtPresidentHonorificFromTitle(title?: string | null): string | null {
  const t = String(title || '')
    .trim()
    .replace(/\s*الم?كلف\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return null;
  if (/رئيس\s*(محكمة|المحكمة)/.test(t) && !/مساعد|تشكيل/.test(t)) {
    return 'فضيلة رئيس المحكمة';
  }
  if (/رئيس\s*تشكيل|رئيس\s*التشكيل/.test(t)) return 'فضيلة رئيس التشكيل';
  if (/الرئيس\s*المساعد|مساعد\s*رئيس/.test(t)) return 'فضيلة الرئيس المساعد';
  return null;
}

/** Strip every «المكلف / المكلفة / مكلف / مكلفة» occurrence (Arabic has no reliable \b). */
export function stripActingMarker(line: string): string {
  return String(line || '')
    .replace(/المكلفة/g, '')
    .replace(/المكلف/g, '')
    .replace(/مكلفة/g, '')
    .replace(/مكلف/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([\/،,])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function lineHasActingMarker(line: string): boolean {
  return /مكلف/.test(String(line || ''));
}

/** Append «المكلف / المكلفة» to a role line (before سلمه الله or before / name). */
export function applyActingMarker(line: string, acting: boolean, female = false): string {
  const base = stripActingMarker(line);
  if (!acting || !base) return base;
  const word = female ? 'المكلفة' : 'المكلف';
  if (/\//.test(base)) {
    const i = base.indexOf('/');
    const role = base.slice(0, i).trim();
    const rest = base.slice(i + 1).trim();
    return `${role} ${word} / ${rest}`.replace(/\s+/g, ' ').trim();
  }
  if (/سلمه الله|سلمها الله/.test(base)) {
    return base.replace(/\s*(سلمه الله|سلمها الله)/, ` ${word} $1`).replace(/\s+/g, ' ').trim();
  }
  return `${base} ${word}`;
}

/**
 * Address line for internal letters — base title only.
 * Acting (مكلف) is opt-in via RecipientCascade toggle, not forced here.
 */
export function addressEmployee(emp: HonorificEmployee, opts?: { peerPrefix?: string }) {
  const rawHonorific = stripActingMarker(emp.position?.honorific?.trim() || '');
  const title = stripActingMarker(emp.position?.title?.trim() || '');
  const fromTitle = courtPresidentHonorificFromTitle(title);

  let vipLine = '';
  if (rawHonorific && isVipHonorific(rawHonorific) && !isSaadaOrEmptyStaff(rawHonorific)) {
    vipLine = vipHonorificFor(emp, rawHonorific);
  }
  if (fromTitle && (!vipLine || /رئيس\s*المحكمة|رئيس\s*التشكيل|الرئيس\s*المساعد/.test(fromTitle))) {
    vipLine = fromTitle;
  }

  if (vipLine) {
    return `${vipLine} / ${emp.name}`.replace(/\s+/g, ' ').trim();
  }

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


/** Canonical إلى-line for court president / judges correspondence. */
export function formatCourtPresidentLine(line: string): string {
  const raw = String(line || '').trim();
  if (!raw) return raw;
  const acting = lineHasActingMarker(raw);
  const base = stripActingMarker(raw);
  if (!/رئيس\s*(المحكمة|محكمة)/.test(base)) return raw;
  // Drop personal name after / — office formula only
  const formula = 'فضيلة رئيس المحكمة سلمه الله';
  return applyActingMarker(formula, acting);
}
