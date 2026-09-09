import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { currentUser } from '@/lib/server-user';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const user = await currentUser();
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <AppShell user={user}>
      <PageHeader title="سجل التدقيق" />
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>الوقت</th>
              <th>المستخدم</th>
              <th>الإجراء</th>
              <th>الكيان</th>
              <th>تفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-xs" dir="ltr">
                  {new Date(l.createdAt).toLocaleString('ar-SA')}
                </td>
                <td>{l.user?.name || '—'}</td>
                <td>{l.action}</td>
                <td>{l.entity || '—'}</td>
                <td className="text-xs">{l.details || l.entityId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
