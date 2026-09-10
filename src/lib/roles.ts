/** Role helpers for ركيزة — display labels and capability checks */

export const ROLE_LABELS: Record<string, string> = {
  Admin: 'رئيس المحكمة',
  CourtManager: 'الأمين',
  Secretary: 'الأمين',
  Judge: 'قاضي',
  Employee: 'موظف',
};

/** بريد رئيس المحكمة داخل المنصة (ليس ناشر المشروع) */
export const PLATFORM_OWNER_EMAIL = 'snaswig@moj.gov.sa';

const PLATFORM_OWNER_EMAILS = new Set([
  PLATFORM_OWNER_EMAIL,
  'admin@moj.gov.sa', // حساب تقني احتياطي للبذرة فقط
]);

export function roleLabel(role: string, email?: string | null): string {
  const e = (email || '').trim().toLowerCase();
  if (role === 'Admin' && e === PLATFORM_OWNER_EMAIL) {
    return 'رئيس المحكمة';
  }
  if (role === 'Admin' && e === 'admin@moj.gov.sa') {
    return 'حساب تقني (بذرة)';
  }
  return ROLE_LABELS[role] || role;
}

/** دور Admin = رئيس المحكمة — صلاحيات كاملة */
export function isAdmin(role: string) {
  return role === 'Admin';
}

/** الأمين — أدوات إشرافية مفيدة (بدون مؤشرات حية) */
export function isAmin(role: string) {
  return role === 'CourtManager' || role === 'Secretary';
}

/** مؤشرات حية — رئيس المحكمة / المالك فقط (دور Admin) */
export function canSeeKpis(role: string) {
  return isAdmin(role);
}

/** قوائم الإدارة الكاملة — رئيس المحكمة فقط */
export function canSeeFullAdmin(role: string) {
  return isAdmin(role);
}

/** حسابات يُسمح لها بالدخول بدون ربط موظف */
export function isPlatformOwnerEmail(email: string) {
  return PLATFORM_OWNER_EMAILS.has(email.trim().toLowerCase());
}

export function isSeedOwnerEmail(email: string) {
  return isPlatformOwnerEmail(email);
}

export const ALL_ROLES = ['Admin', 'CourtManager', 'Secretary', 'Judge', 'Employee'] as const;
