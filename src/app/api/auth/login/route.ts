import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession, isMojEmail, verifyPassword, audit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'البريد وكلمة المرور مطلوبان' }, { status: 400 });
    }
    if (!isMojEmail(email)) {
      return NextResponse.json({ error: 'البريد يجب أن ينتهي بـ @moj.gov.sa' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !user.active) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });
    await audit('login', 'User', user.id, undefined, user.id);
    return NextResponse.json({
      ok: true,
      mustChangePassword: user.mustChangePassword,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'خطأ داخلي' }, { status: 500 });
  }
}
