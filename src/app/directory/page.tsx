import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { currentUser } from '@/lib/server-user';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DirectoryPage() {
  const user = await currentUser();
  const directory = await prisma.employee.findMany({
    where: { active: true },
    include: { orgUnit: true, position: true },
    orderBy: { name: 'asc' },
  });

  return (
    <AppShell user={user}>
      <PageHeader title="الدليل" subtitle="دليل الموظفين والألقاب" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {directory.map((e) => (
          <div key={e.id} className="bg-white rounded-xl border p-4">
            <div className="font-bold text-moj-green">{e.position?.honorific || 'الأستاذ'} / {e.name}</div>
            <div className="text-sm text-gray-600">{e.position?.title || '—'}</div>
            <div className="text-sm">{e.orgUnit?.name || '—'}</div>
            {e.email && <div className="text-xs text-gray-500 mt-1" dir="ltr">{e.email}</div>}
            {e.phone && <div className="text-xs" dir="ltr">{e.phone}</div>}
          </div>
        ))}
        {directory.length === 0 && (
          <div className="text-gray-500 col-span-full">لا يوجد موظفون — أضفهم من صفحة الموظفين أو الاستيراد.</div>
        )}
      </div>
    </AppShell>
  );
}
