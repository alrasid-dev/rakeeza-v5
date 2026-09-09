import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, audit } from '@/lib/auth';

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const employees = await prisma.employee.findMany({
    include: { orgUnit: true, position: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
  const employee = await prisma.employee.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      nationalId: body.nationalId || null,
      orgUnitId: body.orgUnitId || null,
      positionId: body.positionId || null,
      notes: body.notes || null,
    },
  });
  await audit('create_employee', 'Employee', employee.id, employee.name, s.id);
  return NextResponse.json({ employee });
}
