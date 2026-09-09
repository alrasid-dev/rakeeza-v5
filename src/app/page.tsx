import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';
import ChartsPlaceholder from '@/components/ChartsPlaceholder';
import { currentUser } from '@/lib/server-user';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await currentUser();
  const [docs, issued, drafts, employees, templates] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({ where: { status: 'issued' } }),
    prisma.document.count({ where: { status: 'draft' } }),
    prisma.employee.count(),
    prisma.template.count(),
  ]);

  return (
    <AppShell user={user}>
      <PageHeader
        title="لوحة التحكم"
        subtitle="ركيزة للمكاتبات والنماذج القضائية — المحكمة العمالية بالرياض"
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card title="إجمالي المكاتبات" value={docs} href="/documents" />
        <Card title="صادرة" value={issued} href="/documents" />
        <Card title="مسودات" value={drafts} href="/documents" />
        <Card title="الموظفون / القوالب" value={`${employees} / ${templates}`} href="/employees" />
      </div>
      <ChartsPlaceholder />
      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <Card title="مكاتبة جديدة" hint="معالج إنشاء مع لصق ذكي" href="/documents/new" />
        <Card title="الاستيراد الذكي" hint="استخراج نص وتصنيف محلي" href="/import" />
        <Card title="المساعد الذكي" hint="محلي أو OpenAI اختياري" href="/assistant" />
      </div>
    </AppShell>
  );
}
