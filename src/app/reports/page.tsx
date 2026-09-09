import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import ChartsPlaceholder from '@/components/ChartsPlaceholder';
import { currentUser } from '@/lib/server-user';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const user = await currentUser();
  if (user.role !== 'Admin' && user.role !== 'CourtManager') redirect('/');
  const [docs, issued, drafts, archived, employees, users] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({ where: { status: 'issued' } }),
    prisma.document.count({ where: { status: 'draft' } }),
    prisma.document.count({ where: { archived: true } }),
    prisma.employee.count(),
    prisma.user.count(),
  ]);

  return (
    <AppShell user={user}>
      <PageHeader title="التقارير" subtitle="للإدارة" actions={<a className="btn-outline" href="/api/export/xlsx">تصدير المكاتبات</a>} />
      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Card title="مكاتبات" value={docs} />
        <Card title="صادرة" value={issued} />
        <Card title="مسودات" value={drafts} />
        <Card title="مؤرشف" value={archived} />
        <Card title="موظفون" value={employees} />
        <Card title="مستخدمون" value={users} />
      </div>
      <ChartsPlaceholder />
    </AppShell>
  );
}
