'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { canSeeFullAdmin, isAmin, roleLabel } from '@/lib/roles';
import ThemeToggle from '@/components/ThemeToggle';

type NavLeaf = { href: string; label: string; formSlug?: string };
type NavGroup = { id: string; label: string; children: NavLeaf[] };

const FORM_ITEMS: { slug: string; name: string }[] = [
  { slug: 'khitab-sadir', name: 'خطاب صادر' },
  { slug: 'muthakkira-dakhiliya', name: 'مذكرة داخلية' },
  { slug: 'taameem-farigh', name: 'تعميم (فارغ)' },
  { slug: 'mahdar-jalsa', name: 'محضر جلسة' },
  { slug: 'taqrir-dirasa', name: 'تقرير دراسة' },
  { slug: 'talab-ihala', name: 'طلب إحالة' },
  { slug: 'ifada', name: 'إفادة' },
  { slug: 'ishar-mawid', name: 'إشعار موعد' },
  { slug: 'radd-istifsar', name: 'رد على استفسار' },
  { slug: 'muthakkira-qanuniya', name: 'مذكرة قانونية' },
  { slug: 'namudhaj-hifz', name: 'نموذج حفظ' },
  { slug: 'namudhaj-arshafa', name: 'نموذج أرشفة' },
  { slug: 'khitab-shukr', name: 'خطاب شكر' },
  { slug: 'khitab-tanbih', name: 'خطاب تنبيه إداري' },
  { slug: 'talab-bayanat', name: 'طلب بيانات' },
  { slug: 'namudhaj-mutabaa', name: 'نموذج متابعة' },
  { slug: 'namudhaj-ihata', name: 'نموذج إحاطة' },
  { slug: 'namudhaj-aam', name: 'نموذج عام' },
  { slug: 'freeform-khitab', name: 'تصميم حر — خطاب' },
  { slug: 'freeform-taqrir', name: 'تصميم حر — تقرير' },
  { slug: 'freeform-mahdar', name: 'تصميم حر — محضر' },
  { slug: 'freeform-taameem', name: 'تصميم حر — تعميم' },
  { slug: 'study-complaint', name: 'نموذج تحليل حكم (شكوى)' },
  { slug: 'email-signature', name: 'التوقيع الرقمي للبريد الإلكتروني' },
  { slug: 'report-cover', name: 'غلاف تقرير / عرض تقديمي' },
];

function formHref(slug: string, name: string) {
  return `/documents/new?form=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`;
}

const formsGroup: NavGroup = {
  id: 'forms',
  label: 'النماذج',
  children: FORM_ITEMS.map((f) => ({
    href: formHref(f.slug, f.name),
    label: f.name,
    formSlug: f.slug,
  })),
};

function libraryChildren(role?: string): NavLeaf[] {
  const items: NavLeaf[] = [
    { href: '/templates', label: 'القوالب' },
    { href: '/archive', label: 'أرشيفي' },
    { href: '/directory', label: 'دليلي' },
  ];
  if (role && (canSeeFullAdmin(role) || isAmin(role))) {
    items.push({ href: '/import', label: 'الاستيراد الذكي' });
  }
  if (role && (canSeeFullAdmin(role) || isAmin(role))) {
    items.push({ href: '/assistant', label: 'المساعد الذكي' });
  }
  return items;
}

const adminGroup: NavGroup = {
  id: 'admin',
  label: 'إدارة',
  children: [
    { href: '/admin/registrations', label: 'طلبات التسجيل' },
    { href: '/admin/users', label: 'المستخدمون' },
    { href: '/admin/pins', label: 'رموز الدخول' },
    { href: '/admin/org', label: 'الوحدات التنظيمية' },
    { href: '/admin/titles', label: 'المناصب والألقاب' },
    { href: '/admin/numbering', label: 'الترقيم' },
    { href: '/admin/letterhead', label: 'الترويسة' },
    { href: '/settings/legal', label: 'المراجع النظامية' },
    { href: '/employees', label: 'الموظفون' },
    { href: '/reports', label: 'التقارير' },
    { href: '/audit', label: 'سجل التدقيق' },
    { href: '/documents', label: 'المكاتبات' },
    { href: '/settings/password', label: 'تغيير الرمز' },
  ],
};

const aminExtras: NavLeaf[] = [
  { href: '/employees', label: 'الموظفون' },
  { href: '/audit', label: 'سجل التدقيق' },
];

const OPEN_KEY = 'rakeeza-sidebar-open';

function IconHome({ active }: { active?: boolean }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${active ? 'sidebar-icon-glow text-moj-gold' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5z" strokeLinejoin="round" />
    </svg>
  );
}

function IconForms({ open }: { open?: boolean }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 transition-all ${open ? 'sidebar-icon-glow text-moj-gold' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      {open ? (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M8 3h7l5 5v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path d="M15 3v5h5" />
        </>
      )}
    </svg>
  );
}

function IconLibrary({ open }: { open?: boolean }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 transition-all ${open ? 'sidebar-icon-glow text-moj-gold' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
      <path d="M6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2z" />
      {open && <path d="M9 7h7M9 11h5" strokeLinecap="round" />}
    </svg>
  );
}

function IconAdmin({ open }: { open?: boolean }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 transition-all ${open ? 'sidebar-icon-glow text-moj-gold' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function IconChevron({ open }: { open?: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ${open ? 'rotate-90 text-moj-gold' : 'rotate-0 opacity-70'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      {/* RTL: chevron points left when closed; rotate to point down when open */}
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDot() {
  return <span className="sidebar-active-dot inline-block w-1.5 h-1.5 rounded-full bg-moj-gold shrink-0" />;
}

function leafActive(pathname: string, search: string, leaf: NavLeaf) {
  if (leaf.formSlug) {
    if (!pathname.startsWith('/documents/new')) return false;
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    return params.get('form') === leaf.formSlug;
  }
  if (leaf.href === '/') return pathname === '/';
  const base = leaf.href.split('?')[0];
  return pathname === base || pathname.startsWith(base + '/');
}

function groupHasActive(pathname: string, search: string, children: NavLeaf[]) {
  return children.some((c) => leafActive(pathname, search, c));
}

function TreeGroup({
  group,
  open,
  onToggle,
  pathname,
  search,
  icon,
}: {
  group: NavGroup;
  open: boolean;
  onToggle: () => void;
  pathname: string;
  search: string;
  icon: React.ReactNode;
}) {
  const anyActive = groupHasActive(pathname, search, group.children);
  return (
    <div className="mb-0.5">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
          open || anyActive
            ? 'bg-gradient-to-l from-moj-gold/30 to-white/15 text-moj-gold'
            : 'hover:bg-white/10'
        }`}
        aria-expanded={open}
      >
        {icon}
        <span className="flex-1 text-right font-medium">{group.label}</span>
        <IconChevron open={open} />
      </button>
      <div className={`sidebar-tree ${open ? 'open' : ''}`}>
        <div>
          <ul className="pr-2 mt-0.5 space-y-0.5 border-r border-white/15 mr-4">
            {group.children.map((child) => {
              const active = leafActive(pathname, search, child);
              return (
                <li key={child.href + child.label}>
                  <Link
                    href={child.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition ${
                      active
                        ? 'bg-gradient-to-l from-moj-gold/30 to-white/15 text-moj-gold font-medium'
                        : 'hover:bg-white/10 text-white/90'
                    }`}
                  >
                    {active ? <IconDot /> : <span className="w-1.5 shrink-0" />}
                    <span className="truncate">{child.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SidebarInner({ user }: { user?: { name: string; role: string; email?: string } | null }) {
  const path = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';
  const router = useRouter();
  const role = user?.role;

  const libGroup: NavGroup = useMemo(
    () => ({ id: 'library', label: 'المكتبة', children: libraryChildren(role) }),
    [role],
  );

  const isAdmin = role ? canSeeFullAdmin(role) : false;
  const isAminRole = role ? isAmin(role) : false;

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({
    forms: false,
    library: false,
    admin: false,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPEN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setOpenMap((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-expand group when a child is active
  useEffect(() => {
    setOpenMap((prev) => {
      const next = { ...prev };
      let changed = false;
      if (groupHasActive(path, search, formsGroup.children) && !next.forms) {
        next.forms = true;
        changed = true;
      }
      if (groupHasActive(path, search, libGroup.children) && !next.library) {
        next.library = true;
        changed = true;
      }
      if (isAdmin && groupHasActive(path, search, adminGroup.children) && !next.admin) {
        next.admin = true;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [path, search, libGroup.children, isAdmin]);

  const persist = useCallback((next: Record<string, boolean>) => {
    setOpenMap(next);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  function toggle(id: string) {
    persist({ ...openMap, [id]: !openMap[id] });
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const homeActive = path === '/';
  const homeLabel = isAdmin ? 'لوحة التحكم' : 'الرئيسية';

  return (
    <aside className="w-64 min-h-screen bg-moj-green text-white flex flex-col shrink-0 print:hidden">
      <div className="p-4 border-b border-white/20 flex items-center gap-3">
        <img src="/logo.svg" alt="شعار" className="w-12 h-12 rounded-xl ring-1 ring-white/20 shadow-[0_0_16px_rgba(61,143,106,0.4)]" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-tight">ركيزة</div>
          <div className="text-[10px] text-moj-gold leading-tight">مكتبة المخاطبات والتعاميم</div>
          <div className="text-[10px] text-white/50">v5.0.0</div>
        </div>
        <ThemeToggle className="!border-white/25 !bg-white/10 !text-moj-gold hover:!bg-white/20" />
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 text-sm">
        <Link
          href="/"
          className={`flex items-center gap-2 rounded-xl px-3 py-2 transition ${
            homeActive
              ? 'bg-gradient-to-l from-moj-gold/30 to-white/15 text-moj-gold'
              : 'hover:bg-white/10'
          }`}
        >
          <IconHome active={homeActive} />
          <span className="font-medium">{homeLabel}</span>
        </Link>

        <TreeGroup
          group={formsGroup}
          open={!!openMap.forms}
          onToggle={() => toggle('forms')}
          pathname={path}
          search={search}
          icon={<IconForms open={!!openMap.forms} />}
        />

        <TreeGroup
          group={libGroup}
          open={!!openMap.library}
          onToggle={() => toggle('library')}
          pathname={path}
          search={search}
          icon={<IconLibrary open={!!openMap.library} />}
        />

        {isAminRole &&
          !isAdmin &&
          aminExtras.map((l) => {
            const active = leafActive(path, search, l);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 transition ${
                  active
                    ? 'bg-gradient-to-l from-moj-gold/30 to-white/15 text-moj-gold'
                    : 'hover:bg-white/10'
                }`}
              >
                {active ? <IconDot /> : <span className="w-1.5" />}
                <span>{l.label}</span>
              </Link>
            );
          })}

        {isAdmin && (
          <TreeGroup
            group={adminGroup}
            open={!!openMap.admin}
            onToggle={() => toggle('admin')}
            pathname={path}
            search={search}
            icon={<IconAdmin open={!!openMap.admin} />}
          />
        )}

        {!isAdmin && (
          <>
            <Link
              href="/documents"
              className={`flex items-center gap-2 rounded-xl px-3 py-2 transition ${
                path === '/documents' || (path.startsWith('/documents/') && !path.startsWith('/documents/new'))
                  ? 'bg-gradient-to-l from-moj-gold/30 to-white/15 text-moj-gold'
                  : 'hover:bg-white/10'
              }`}
            >
              <span>مكاتباتي</span>
            </Link>
            <Link
              href="/settings/password"
              className={`flex items-center gap-2 rounded-xl px-3 py-2 transition ${
                path.startsWith('/settings/password')
                  ? 'bg-gradient-to-l from-moj-gold/30 to-white/15 text-moj-gold'
                  : 'hover:bg-white/10'
              }`}
            >
              <span>تغيير الرمز</span>
            </Link>
          </>
        )}
      </nav>

      {user && (
        <div className="p-3 border-t border-white/20 text-xs space-y-2">
          <div>{user.name}</div>
          <div className="text-moj-gold">{roleLabel(user.role, user.email)}</div>
          <button onClick={logout} className="w-full bg-white/10 hover:bg-white/20 rounded-xl py-1.5 transition">
            تسجيل الخروج
          </button>
        </div>
      )}
    </aside>
  );
}

export default function Sidebar({ user }: { user?: { name: string; role: string; email?: string } | null }) {
  return (
    <Suspense
      fallback={
        <aside className="w-64 min-h-screen bg-moj-green text-white flex flex-col shrink-0 print:hidden">
          <div className="p-4 text-sm text-white/70">جاري التحميل...</div>
        </aside>
      }
    >
      <SidebarInner user={user} />
    </Suspense>
  );
}
