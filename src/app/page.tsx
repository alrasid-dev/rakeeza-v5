import Link from 'next/link';
import AppShell from '@/components/AppShell';
import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';
import ChartsPlaceholder from '@/components/ChartsPlaceholder';
import { currentUser } from '@/lib/server-user';
import { prisma } from '@/lib/db';
import { canSeeKpis, roleLabel } from '@/lib/roles';
import FingerprintEnable from '@/components/FingerprintEnable';

export const dynamic = 'force-dynamic';

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun
  x.setDate(x.getDate() - day);
  return x;
}

export default async function DashboardPage() {
  const user = await currentUser();
  const showKpis = canSeeKpis(user.role);

  if (!showKpis) {
    // Employee / Judge — light home
    return (
      <AppShell user={user}>
        <PageHeader
          title={`مرحباً، ${user.name}`}
          subtitle={`${roleLabel(user.role, user.email)} — ابدأ من هنا دون تشتيت`}
        />
        <div className="max-w-3xl mx-auto mt-4 space-y-6">
          <Link
            href="/documents/new"
            className="block rounded-2xl bg-moj-green text-white text-center py-10 sm:py-14 px-4 shadow-lg hover:bg-moj-green/90 transition border-b-4 border-moj-gold"
          >
            <div className="text-2xl sm:text-3xl font-bold mb-2">مستند جديد</div>
            <div className="text-sm text-moj-gold">إنشاء مكاتبة أو فتح قالب رسمي</div>
          </Link>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Card title="أرشيفي" hint="المكاتبات المحفوظة والمؤرشفة" href="/archive" />
            <Card title="دليلي" hint="دليل الموظفين والألقاب" href="/directory" />
          </div>
          <FingerprintEnable email={user.email} />
          <p className="text-center text-xs text-gray-400">للاستخدام الداخلي فقط · المحكمة العمالية بالرياض</p>
        </div>
      </AppShell>
    );
  }

  const today = startOfDay();
  const week = startOfWeek();

  const [
    docsToday,
    docsWeek,
    pending,
    issued,
    drafts,
    archived,
    byTypeRaw,
    employees,
    pendingRegs,
  ] = await Promise.all([
    prisma.document.count({ where: { createdAt: { gte: today } } }),
    prisma.document.count({ where: { createdAt: { gte: week } } }),
    prisma.document.count({ where: { status: 'draft' } }),
    prisma.document.count({ where: { status: 'issued' } }),
    prisma.document.count({ where: { status: 'draft' } }),
    prisma.document.count({ where: { OR: [{ status: 'archived' }, { archived: true }] } }),
    prisma.document.groupBy({ by: ['docType'], _count: { _all: true } }),
    prisma.employee.count(),
    user.role === 'Admin'
      ? prisma.registrationRequest.count({ where: { status: 'pending' } })
      : Promise.resolve(0),
  ]);

  const byType = byTypeRaw.map((r) => ({ name: r.docType || 'أخرى', count: r._count._all }));
  const byStatus = [
    { name: 'مسودة', value: drafts },
    { name: 'صادرة', value: issued },
    { name: 'مؤرشفة', value: archived },
  ];

  return (
    <AppShell user={user}>
      <PageHeader
        title="لوحة التحكم"
        subtitle={`${roleLabel(user.role, user.email)} — مؤشرات حية من قاعدة البيانات`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card title="اليوم" value={docsToday} href="/documents" />
        <Card title="هذا الأسبوع" value={docsWeek} href="/documents" />
        <Card title="مسودات معلّقة" value={pending} href="/documents" />
        <Card title="صادرة" value={issued} href="/documents" />
      </div>
      <ChartsPlaceholder byStatus={byStatus} byType={byType} />
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card title="مستند جديد" hint="معالج إنشاء مع لصق ذكي" href="/documents/new" />
        <Card title="الموظفون" hint={`${employees} سجل`} href="/employees" />
        <Card
          title="طلبات التسجيل"
          hint={pendingRegs ? `${pendingRegs} معلق` : 'لا طلبات معلقة'}
          href="/admin/registrations"
        />
        <Card title="التقارير" hint="إحصاءات وإشراف" href="/reports" />
      </div>
      <div className="mt-6 max-w-xl">
        <FingerprintEnable email={user.email} />
      </div>
    </AppShell>
  );
}
