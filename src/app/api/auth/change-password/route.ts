import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession, destroySession, getSession, hashPassword, audit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const { password } = await req.json();
  if (!password || String(password).length < 8) {
    return NextResponse.json({ error: 'كلمة المرور قصيرة' }, { status: 400 });
  }
  const passwordHash = await hashPassword(String(password));
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
  await audit('change_password', 'User', user.id, undefined, user.id);
  return NextResponse.json({ ok: true });
}
