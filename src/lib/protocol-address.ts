/**
 * Judicial Context & Protocol Engine (محرك التدقيق اللغوي والألقاب القضائية).
 *
 * Detects the addressee's judicial/administrative capacity from a pasted or
 * typed correspondence line and returns the canonical MOJ protocol address.
 * Powers one-click protocol suggestions in the background linter bar.
 */

import { applyActingMarker } from '@/lib/honorific';

export type ProtocolRole =
  | 'judge'
  | 'judicialLieutenant'
  | 'courtPresident'
  | 'courtSecretary'
  | 'departmentDirector'
  | 'staff'
  | 'unknown';

export type ProtocolAddress = {
  role: ProtocolRole;
  canonical: string;
  alternative?: string;
  name?: string;
  department?: string;
  female?: boolean;
  matched?: string;
  confidence: number;
};

export type ProtocolSuggestion = {
  found: string;
  suggestion: string;
  message: string;
  role: ProtocolRole;
  kind: 'replace' | 'add';
};

/** Category controlling the leading honorific: judicial → فضيلة, admin → سعادة. */
export type ProtocolCategory = 'judicial' | 'administrative';

/** A single addressee selection for the multi-recipient builder. */
export type ProtocolRecipient = {
  role?: ProtocolRole;
  category?: ProtocolCategory;
  name?: string;
  department?: string;
  female?: boolean;
  /** Opt-in تكليف (مكلف/مكلفة) — appended contextually. */
  acting?: boolean;
  /** Free-text role/title override (e.g. «قاضي التشكيل الثالث»). */
  custom?: string;
};

const COURT_PRESIDENT = 'فضيلة رئيس المحكمة العمالية بالرياض سلمه الله';
const COURT_SECRETARY = 'سعادة أمين المحكمة العمالية بالرياض';

function cleanName(raw: string): string {
  return String(raw || '')
    .replace(/^(?:فضيلة|سعادة|معالي|سمو|الأستاذ|الاستاذ|الأستاذة|الاستاذة|الشيخ|القاضي|القاضية)\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanDepartment(raw: string): string {
  return String(raw || '').replace(/^(?:إدارة|ادارة)\s*/g, '').replace(/\s+/g, ' ').trim();
}

function isFemaleName(raw: string): boolean {
  return /ة$/.test(cleanName(raw));
}

/** True when a role is judicial (فضيلة…) rather than administrative (سعادة…). */
export function isJudicialRole(role: ProtocolRole): boolean {
  return role === 'judge' || role === 'judicialLieutenant' || role === 'courtPresident';
}

/** Leading honorific for a role: judicial → فضيلة, administrative → سعادة. */
export function honorificForRole(role: ProtocolRole): 'فضيلة' | 'سعادة' {
  return isJudicialRole(role) ? 'فضيلة' : 'سعادة';
}

/** Map a detected role + captured tokens to canonical address lines. */
export function canonicalFor(
  role: ProtocolRole,
  opts?: { name?: string; department?: string; female?: boolean; acting?: boolean },
): { canonical: string; alternative?: string } {
  const name = opts?.name ? cleanName(opts.name) : '';
  const dept = opts?.department ? cleanDepartment(opts.department) : '';
  const female = opts?.female ?? (name ? isFemaleName(name) : false);
  const acting = opts?.acting ?? false;

  let canonical = '';
  let alternative: string | undefined;

  switch (role) {
    case 'courtPresident':
      canonical = COURT_PRESIDENT;
      break;
    case 'courtSecretary':
      canonical = COURT_SECRETARY;
      break;
    case 'judicialLieutenant':
      canonical = name ? `فضيلة الملازم القضائي بالتشكيل ${name}` : 'فضيلة الملازم القضائي بالتشكيل';
      break;
    case 'judge':
      canonical = name ? `فضيلة قاضي التشكيل ${name}` : 'فضيلة قاضي التشكيل';
      alternative = name ? `فضيلة الشيخ ${name}` : 'فضيلة الشيخ';
      break;
    case 'departmentDirector':
      canonical = dept ? `سعادة مدير إدارة ${dept}` : 'سعادة مدير الإدارة المختصة';
      break;
    case 'staff':
      canonical = name
        ? female
          ? `سعادة / الأستاذة ${name}`
          : `سعادة / الأستاذ ${name}`
        : female
          ? 'سعادة / الأستاذة'
          : 'سعادة / الأستاذ';
      break;
    default:
      return { canonical: '' };
  }

  if (acting && canonical) {
    canonical = applyActingMarker(canonical, true, female);
    if (alternative) alternative = applyActingMarker(alternative, true, female);
  }

  return { canonical, alternative };
}

/** Build the «إلى» line for one addressee (judicial/admin honorific + تكليف). */
export function addressForRecipient(r: ProtocolRecipient): string {
  const custom = String(r.custom || '').trim();
  if (custom) {
    return r.acting ? applyActingMarker(custom, true, r.female) : custom;
  }
  const role = r.role || 'staff';
  return canonicalFor(role, {
    name: r.name,
    department: r.department,
    female: r.female,
    acting: r.acting,
  }).canonical;
}

/** Compose multiple addressees (أول/ثاني/ثالث…) into a single multi-line «إلى» text. */
export function buildRecipientsLine(recipients: ProtocolRecipient[]): string {
  return (recipients || [])
    .map((r) => addressForRecipient(r))
    .filter((line) => line.trim())
    .join('\n');
}

/* ------------------------------------------------------------------ */
/* Detection                                                           */
/* ------------------------------------------------------------------ */

const ROLE_PATTERNS: { role: ProtocolRole; re: RegExp }[] = [
  { role: 'courtPresident', re: /رئيس\s*(?:المحكمة|محكمة)\s*(?:العمالية\s*بالرياض)?/ },
  { role: 'courtSecretary', re: /أمين\s*(?:المحكمة|محكمة)\s*(?:العمالية\s*بالرياض)?/ },
  { role: 'judicialLieutenant', re: /الملازم\s*القضائي(?:\s*بالتشكيل)?|ملازم\s*قضائي/ },
  { role: 'departmentDirector', re: /مدير\s*إدارة\s*[^\n،,؛:]{0,40}/ },
  { role: 'judge', re: /قاض[يية]\s*(?:التشكيل)?|فضيلة\s*الشيخ|الشيخ\s+[^\n،,؛:]{0,40}/ },
  { role: 'staff', re: /الأستاذ(?:ة)?\s+[^\n،,؛:]{0,40}|الموظف(?:ة)?\s+[^\n،,؛:]{0,40}/ },
];

/** Detect the most confident protocol role(s) present in a correspondence line. */
export function detectProtocolAddresses(text: string): ProtocolAddress[] {
  const raw = String(text || '');
  const out: ProtocolAddress[] = [];

  for (const { role, re } of ROLE_PATTERNS) {
    const m = raw.match(re);
    if (!m) continue;
    const matched = m[0].trim();
    let name = '';
    let department = '';
    let female = false;

    if (role === 'judge') {
      const nameM = raw.match(/(?:فضيلة\s*)?(?:الشيخ|القاضي|قاضي)\s+([^\n،,؛:]{0,60})/);
      if (nameM) name = nameM[1].trim();
    } else if (role === 'departmentDirector') {
      const deptM = matched.match(/إدارة\s*(.+)/);
      if (deptM) department = deptM[1].trim();
    } else if (role === 'staff') {
      const nameM = matched.match(/الأستاذ(?:ة)?\s+(.+)|الموظف(?:ة)?\s+(.+)/);
      if (nameM) name = (nameM[1] || nameM[2] || '').trim();
      female = /الأستاذة|الموظفة/.test(matched);
    } else if (role === 'judicialLieutenant') {
      const nameM = raw.match(/الملازم\s*القضائي\s*(?:بالتشكيل)?\s*([^\n،,؛:]{0,60})/);
      if (nameM) name = nameM[1].trim();
    }

    const { canonical, alternative } = canonicalFor(role, { name, department, female });
    if (!canonical) continue;
    out.push({
      role,
      canonical,
      alternative,
      name: name || undefined,
      department: department || undefined,
      female: female || undefined,
      matched,
      confidence: name || department ? 0.9 : 0.7,
    });
  }

  return out.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Produce one-click protocol suggestions for the linter Suggestions Bar.
 * - replace: an existing non-canonical honorific phrase → canonical formula.
 * - add: no honorific at all but a clear role keyword → propose canonical line.
 */
export function suggestProtocolAddresses(text: string): ProtocolSuggestion[] {
  const raw = String(text || '');
  if (!raw.trim()) return [];
  const detections = detectProtocolAddresses(raw);
  const out: ProtocolSuggestion[] = [];
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

  for (const d of detections) {
    if (norm(raw).includes(norm(d.canonical))) continue;
    const found = d.matched || '';
    if (found && norm(found) !== norm(d.canonical)) {
      out.push({
        found,
        suggestion: d.canonical,
        message: `بروتوكولي: «${found}» ← «${d.canonical}»`,
        role: d.role,
        kind: 'replace',
      });
    } else if (!found) {
      out.push({
        found: '',
        suggestion: d.canonical,
        message: `بروتوكولي: اقترح المخاطبة بـ «${d.canonical}»`,
        role: d.role,
        kind: 'add',
      });
    }
  }

  return out;
}

/** Convenience: first canonical line for a role keyword, or ''. */
export function canonicalAddressForRole(
  role: ProtocolRole,
  opts?: { name?: string; department?: string },
): string {
  return canonicalFor(role, opts).canonical;
}

