import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { currentUser } from '@/lib/server-user';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const user = await currentUser();
  const templates = await prisma.template.findMany({ orderBy: { sortOrder: 'asc' } });
  const docs = templates.filter((t) => t.category === 'document');
  const free = templates.filter((t) => t.category === 'freeform');

  return (
    <AppShell user={user}>
      <PageHeader title="القوالب" subtitle="18 قالب وثيقة فارغ + 4 تصاميم حرة" />
      <h2 className="font-semibold text-moj-green mb-2">قوالب الوثائق</h2>
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {docs.map((t) => (
          <div key={t.id} className="bg-white border rounded-xl p-4">
            <div className="font-medium">{t.name}</div>
            <div className="text-xs text-gray-500">{t.isEmpty ? 'فارغ — جاهز للتعبئة' : 'مخصص'}</div>
            <Link href={`/documents/new`} className="text-sm text-moj-green underline mt-2 inline-block">
              استخدام
            </Link>
          </div>
        ))}
      </div>
      <h2 className="font-semibold text-moj-gold mb-2">تصاميم حرة</h2>
      <div className="grid md:grid-cols-2 gap-3">
        {free.map((t) => (
          <div key={t.id} className="bg-white border border-moj-gold/30 rounded-xl p-4">
            <div className="font-medium">{t.name}</div>
            <Link href={`/documents/new`} className="text-sm text-moj-green underline mt-2 inline-block">
              استخدام
            </Link>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
