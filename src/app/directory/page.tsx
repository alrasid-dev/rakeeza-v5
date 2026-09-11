import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { currentUser } from '@/lib/server-user';
import { prisma } from '@/lib/db';
import DirectoryClient from './DirectoryClient';

export const dynamic = 'force-dynamic';

export default async function DirectoryPage() {
  const user = await currentUser();
  const [orgUnits, employees] = await Promise.all([
    prisma.orgUnit.findMany({ orderBy: { name: 'asc' } }),
    prisma.employee.findMany({
      where: { active: true },
      include: { orgUnit: true, position: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const payload = {
    orgUnits: orgUnits.map((u) => ({ id: u.id, name: u.name })),
    employees: employees.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      phone: e.phone,
      orgUnitId: e.orgUnitId,
      orgUnitName: e.orgUnit?.name || null,
      positionTitle: e.position?.title || null,
      honorific: e.position?.honorific || null,
    })),
  };

  return (
    <AppShell user={user}>
      <PageHeader title="الدليل" subtitle="اختر قسماً ثم موظفين — مخاطبة جماعية ببادئة الأستاذ / الأستاذة" />
      <DirectoryClient initial={payload} />
    </AppShell>
  );
}
