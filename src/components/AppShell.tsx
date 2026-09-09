'use client';

import Sidebar from './Sidebar';

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: { name: string; role: string } | null;
}) {
  return (
    <div className="flex min-h-screen bg-moj-light font-arabic" dir="rtl">
      <Sidebar user={user} />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
