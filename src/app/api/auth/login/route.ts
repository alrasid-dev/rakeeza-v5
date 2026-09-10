import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession, isMojEmail, verifyPassword, audit } from '@/lib/auth';
import { isPlatformOwnerEmail } from '@/lib/roles';

function isPin(v: unknown) {
  return typeof v === 'string' && /^\d{6}$/.test(v);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const pin = String(body.pin || body.password || '').trim();
    if (!email || !pin) {
      return NextResponse.json({ error: 'البريد ورمز المرور مطلوبان' }, { status: 400 });
    }
    if (!isMojEmail(email)) {
      return NextResponse.json({ error: 'البريد يجب أن ينتهي بـ @moj.gov.sa' }, { status: 400 });
    }
    if (!isPin(pin)) {
      return NextResponse.json({ error: 'رمز المرور يجب أن يكون ٦ أرقام فقط' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }
    if (!user.employeeId && !isPlatformOwnerEmail(user.email)) {
      return NextResponse.json(
        { error: 'الحساب غير مرتبط بسجل موظف. قدّم طلب تسجيل أو راجع الرئيس.' },
        { status: 403 },
      );
    }
    const ok = await verifyPassword(pin, user.passwordHash);
    if (!ok) {
      if (user.mustChangePassword) {
        return NextResponse.json(
          { error: 'لم يُبرمج الرمز بعد. اختر أول دخول' },
          { status: 401 },
        );
      }
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: false,
    });
    await audit('login', 'User', user.id, undefined, user.id);
    return NextResponse.json({
      ok: true,
      mustChangePassword: false,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'خطأ داخلي' }, { status: 500 });
  }
}
