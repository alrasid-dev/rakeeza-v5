import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, hashPassword, isMojEmail, audit } from '@/lib/auth';
import { ALL_ROLES, isAdmin } from '@/lib/roles';

export async function GET() {
  const s = await getSession();
  if (!s || !isAdmin(s.role)) return NextResponse.json({ error: 'ممنوع' }, { status: 403 });
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      mustChangePassword: true,
      employeeId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s || !isAdmin(s.role)) return NextResponse.json({ error: 'ممنوع' }, { status: 403 });
  const body = await req.json();
  if (!isMojEmail(body.email || '')) {
    return NextResponse.json({ error: 'البريد يجب أن ينتهي بـ @moj.gov.sa' }, { status: 400 });
  }
  if (!(ALL_ROLES as readonly string[]).includes(body.role)) {
    return NextResponse.json({ error: 'دور غير صالح' }, { status: 400 });
  }
  const passwordHash = await hashPassword(body.password || 'ChangeMe123!');
  let employeeId: string | undefined = body.employeeId || undefined;
  // If no employeeId, create a linked Employee so login policy is satisfied
  if (!employeeId) {
    const emp = await prisma.employee.create({
      data: {
        name: body.name || 'مستخدم',
        email: String(body.email).trim().toLowerCase(),
        active: true,
      },
    });
    employeeId = emp.id;
  }
  const user = await prisma.user.create({
    data: {
      email: String(body.email).trim().toLowerCase(),
      name: body.name || 'مستخدم',
      role: body.role,
      passwordHash,
      mustChangePassword: true,
      employeeId,
    },
  });
  await audit('create_user', 'User', user.id, user.email, s.id);
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, employeeId: user.employeeId },
  });
}
