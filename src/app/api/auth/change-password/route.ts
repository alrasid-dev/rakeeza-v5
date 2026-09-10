import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession, destroySession, getSession, hashPassword, audit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const { password, pin } = await req.json();
  const value = String(pin || password || '').trim();
  if (!/^\d{6}$/.test(value)) {
    return NextResponse.json({ error: 'رمز المرور يجب أن يكون ٦ أرقام' }, { status: 400 });
  }
  const passwordHash = await hashPassword(value);
  const user = await prisma.user.update({
    where: { id: s.id },
    data: { passwordHash, mustChangePassword: false },
  });
  await destroySession();
  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: false,
  });
  await audit('change_pin', 'User', user.id, undefined, user.id);
  return NextResponse.json({ ok: true });
}
