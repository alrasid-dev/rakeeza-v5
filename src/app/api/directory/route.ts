import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const employees = await prisma.employee.findMany({
    where: { active: true },
    include: { orgUnit: true, position: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ directory: employees });
}
