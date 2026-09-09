import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, hashPassword, isMojEmail, audit } from '@/lib/auth';

export async function GET() {
  const s = await getSession();
  if (!s || s.role !== 'Admin') return NextResponse.json({ error: 'ممنوع' }, { status: 403 });
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, active: true, mustChangePassword: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s || s.role !== 'Admin') return NextResponse.json({ error: 'ممنوع' }, { status: 403 });
  const body = await req.json();
  if (!isMojEmail(body.email || '')) {
    return NextResponse.json({ error: 'البريد يجب أن ينتهي بـ @moj.gov.sa' }, { status: 400 });
  }
  const roles = ['Admin', 'CourtManager', 'Judge', 'Employee'];
  if (!roles.includes(body.role)) {
    return NextResponse.json({ error: 'دور غير صالح' }, { status: 400 });
  }
  const passwordHash = await hashPassword(body.password || 'ChangeMe123!');
  const user = await prisma.user.create({
    data: {
      email: String(body.email).trim().toLowerCase(),
      name: body.name || 'مستخدم',
      role: body.role,
      passwordHash,
      mustChangePassword: true,
    },
  });
  await audit('create_user', 'User', user.id, user.email, s.id);
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
