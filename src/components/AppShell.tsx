'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import RakeezaAiFab from './RakeezaAiFab';

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: { name: string; role: string; email?: string } | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex min-h-screen bg-moj-light font-arabic dark:bg-transparent" dir="rtl">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center gap-3 h-14 px-3 bg-moj-green text-white shadow-md print:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition shrink-0"
          aria-label="فتح القائمة"
          aria-expanded={mobileOpen}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/moj-logo-gold.png" alt="شعار وزارة العدل" className="w-10 h-10 object-contain rounded-lg ring-1 ring-white/20 shrink-0 bg-white/95 p-0.5" />
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight truncate">ركيزة</div>
            <div className="text-[10px] text-moj-gold truncate">مكتبة المخاطبات والتعاميم</div>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      {mobileOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] print:hidden"
          aria-label="إغلاق القائمة"
          onClick={closeMobile}
        />
      )}

      <Sidebar user={user} mobileOpen={mobileOpen} onClose={closeMobile} />

      <main className="flex-1 w-full min-w-0 overflow-auto md:rounded-s-3xl bg-white/60 dark:bg-[#1a2b25]/75 md:m-2 mt-14 md:mt-2 shadow-sm border-0 md:border border-white/40 dark:border-white/10 min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-1rem)] p-3 sm:p-6 pb-24 sm:pb-6 text-[var(--ink)]">
        {children}
      </main>
      <RakeezaAiFab />
    </div>
  );
}
