import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, audit } from '@/lib/auth';

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const orgUnits = await prisma.orgUnit.findMany({ include: { court: true }, orderBy: { name: 'asc' } });
  const courts = await prisma.court.findMany();
  return NextResponse.json({ orgUnits, courts });
}

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s || s.role !== 'Admin') return NextResponse.json({ error: 'ممنوع' }, { status: 403 });
  const body = await req.json();
  const orgUnit = await prisma.orgUnit.create({
    data: { name: body.name, code: body.code || null, courtId: body.courtId || null },
  });
  await audit('create_org', 'OrgUnit', orgUnit.id, orgUnit.name, s.id);
  return NextResponse.json({ orgUnit });
}
