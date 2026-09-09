import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { currentUser } from '@/lib/server-user';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ArchivePage() {
  const user = await currentUser();
  const documents = await prisma.document.findMany({
    where: { archived: true },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <AppShell user={user}>
      <PageHeader title="الأرشيف" />
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>الرقم</th>
              <th>الموضوع</th>
              <th>التاريخ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id}>
                <td dir="ltr">{d.number || '—'}</td>
                <td>{d.subject}</td>
                <td>{d.dateGregorian}</td>
                <td>
                  <Link href={`/documents/${d.id}`} className="text-moj-green underline">عرض</Link>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">الأرشيف فارغ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
