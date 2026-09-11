import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { currentUser } from '@/lib/server-user';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const user = await currentUser();
  const documents = await prisma.document.findMany({
    where: { archived: false },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <AppShell user={user}>
      <PageHeader
        title="المكاتبات"
        actions={
          <>
            <Link href="/documents/new" className="btn-primary">مكاتبة جديدة</Link>
            <a href="/api/export/xlsx" className="btn-outline">تصدير Excel</a>
          </>
        }
      />
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>الرقم</th>
              <th>الموضوع</th>
              <th>النوع</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-8">لا توجد مكاتبات بعد</td>
              </tr>
            )}
            {documents.map((d) => (
              <tr key={d.id}>
                <td dir="ltr" className="text-left">{d.number || '—'}</td>
                <td>{d.subject || '—'}</td>
                <td>{d.docType}</td>
                <td>{d.status === 'issued' ? 'صادرة' : d.status === 'draft' ? 'مسودة' : d.status}</td>
                <td>{d.dateHijri || d.dateGregorian || '—'}</td>
                <td>
                  <Link className="text-moj-green underline" href={`/documents/${d.id}`}>عرض</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
