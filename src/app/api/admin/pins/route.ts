import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, hashPassword, audit } from '@/lib/auth';
import { isAdmin } from '@/lib/roles';

function isPin(v: unknown) {
  return typeof v === 'string' && /^\d{6}$/.test(v);
}

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s || !isAdmin(s.role)) {
    return NextResponse.json({ error: 'ممنوع' }, { status: 403 });
  }
  const body = await req.json();
  const userId = String(body.userId || '').trim();
  const pin = String(body.pin || '').trim();
  if (!userId || !isPin(pin)) {
    return NextResponse.json({ error: 'معرّف المستخدم ورمز من ٦ أرقام مطلوبان' }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
  }
  const passwordHash = await hashPassword(pin);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });
  await audit('set_pin', 'User', userId, target.email, s.id);
  return NextResponse.json({ ok: true, userId, email: target.email });
}
