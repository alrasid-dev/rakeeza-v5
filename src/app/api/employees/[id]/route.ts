import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, audit } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const body = await req.json();
  const employee = await prisma.employee.update({
    where: { id },
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      nationalId: body.nationalId,
      orgUnitId: body.orgUnitId,
      positionId: body.positionId,
      notes: body.notes,
      active: body.active,
    },
  });
  await audit('update_employee', 'Employee', employee.id, undefined, s.id);
  return NextResponse.json({ employee });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  await prisma.employee.delete({ where: { id } });
  await audit('delete_employee', 'Employee', id, undefined, s.id);
  return NextResponse.json({ ok: true });
}
