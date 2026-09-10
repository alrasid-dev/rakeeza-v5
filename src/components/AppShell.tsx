'use client';

import Sidebar from './Sidebar';
import RakeezaAiFab from './RakeezaAiFab';

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: { name: string; role: string; email?: string } | null;
}) {
  return (
    <div className="flex min-h-screen bg-moj-light font-arabic dark:bg-transparent" dir="rtl">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto rounded-s-3xl bg-white/60 dark:bg-[#1a2b25]/75 m-2 shadow-sm border border-white/40 dark:border-white/10 min-h-[calc(100vh-1rem)] p-6 text-[var(--ink)]">
        {children}
      </main>
      <RakeezaAiFab />
    </div>
  );
}
