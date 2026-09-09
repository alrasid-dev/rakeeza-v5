'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { href: '/', label: 'لوحة التحكم' },
  { href: '/documents', label: 'المكاتبات' },
  { href: '/documents/new', label: 'مكاتبة جديدة' },
  { href: '/employees', label: 'الموظفون' },
  { href: '/directory', label: 'الدليل' },
  { href: '/templates', label: 'القوالب' },
  { href: '/archive', label: 'الأرشيف' },
  { href: '/audit', label: 'سجل التدقيق' },
  { href: '/reports', label: 'التقارير' },
  { href: '/assistant', label: 'المساعد الذكي' },
  { href: '/import', label: 'الاستيراد الذكي' },
  { href: '/admin/users', label: 'المستخدمون' },
  { href: '/admin/org', label: 'الوحدات التنظيمية' },
  { href: '/admin/titles', label: 'المناصب والألقاب' },
  { href: '/admin/numbering', label: 'الترقيم' },
  { href: '/admin/letterhead', label: 'الترويسة' },
  { href: '/settings/legal', label: 'المراجع النظامية' },
  { href: '/settings/password', label: 'تغيير كلمة المرور' },
];

export default function Sidebar({ user }: { user?: { name: string; role: string } | null }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-64 min-h-screen bg-moj-green text-white flex flex-col shrink-0 print:hidden">
      <div className="p-4 border-b border-white/20 flex items-center gap-3">
        <img src="/logo.svg" alt="شعار" className="w-12 h-12" />
        <div>
          <div className="font-bold text-sm leading-tight">ركيزة</div>
          <div className="text-xs text-moj-gold">v5.0.0</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 text-sm">
        {links.map((l) => {
          const active = path === l.href || (l.href !== '/' && path.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded px-3 py-2 transition ${
                active ? 'bg-white/20 text-moj-gold' : 'hover:bg-white/10'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      {user && (
        <div className="p-3 border-t border-white/20 text-xs space-y-2">
          <div>{user.name}</div>
          <div className="text-moj-gold">{user.role}</div>
          <button onClick={logout} className="w-full bg-white/10 hover:bg-white/20 rounded py-1.5">
            تسجيل الخروج
          </button>
        </div>
      )}
    </aside>
  );
}
