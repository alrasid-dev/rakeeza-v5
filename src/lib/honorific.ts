/** Address lines for internal correspondence */

export type HonorificEmployee = {
  name: string;
  position?: { title?: string | null; honorific?: string | null } | null;
};

/** Default internal peer address: زميلنا الأستاذ + name */
export function addressEmployee(emp: HonorificEmployee, opts?: { peerPrefix?: string }) {
  const honorific =
    emp.position?.honorific?.trim() ||
    opts?.peerPrefix ||
    'زميلنا الأستاذ';
  // If position already includes زميلنا / فضيلة / سعادة keep it; else prefix peer form
  const hasPrefix = /^(زميلنا|فضيلة|سعادة|معالي|سمو)/.test(honorific);
  const prefix = hasPrefix ? honorific : `زميلنا ${honorific}`;
  return `${prefix} / ${emp.name}`.replace(/\s+/g, ' ').trim();
}

export function addressEmployees(emps: HonorificEmployee[]) {
  return emps.map((e) => addressEmployee(e)).join('\n');
}


export function buildTitle(honorific: string, position: string, name?: string) {
  const base = honorific || position || '';
  return name ? `${base} / ${name}` : base;
}
