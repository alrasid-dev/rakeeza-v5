import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession, isMojEmail, hashPassword, audit } from '@/lib/auth';
import { isPlatformOwnerEmail } from '@/lib/roles';

function isPin(v: unknown) {
  return typeof v === 'string' && /^\d{6}$/.test(v);
}

/** أول دخول: المستخدم يبرمج رمزه بنفسه ثم يُحفظ */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const pin = String(body.pin || '').trim();
    const pinConfirm = String(body.pinConfirm || '').trim();

    if (!email || !pin) {
      return NextResponse.json({ error: 'البريد والرمز مطلوبان' }, { status: 400 });
    }
    if (!isMojEmail(email)) {
      return NextResponse.json({ error: 'البريد يجب أن ينتهي بـ @moj.gov.sa' }, { status: 400 });
    }
    if (!isPin(pin) || !isPin(pinConfirm)) {
      return NextResponse.json({ error: 'الرمز يجب أن يكون ٦ أرقام' }, { status: 400 });
    }
    if (pin !== pinConfirm) {
      return NextResponse.json({ error: 'الرمزان غير متطابقين' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'الحساب غير موجود. قدّم طلب تسجيل أو راجع الإدارة.' },
        { status: 404 },
      );
    }
    if (!user.employeeId && !isPlatformOwnerEmail(user.email)) {
      return NextResponse.json(
        { error: 'الحساب غير مرتبط بسجل موظف.' },
        { status: 403 },
      );
    }

    // يسمح ببرمجة الرمز فقط إذا لم يُضبط بعد (mustChangePassword)
    if (!user.mustChangePassword) {
      return NextResponse.json(
        { error: 'تم ضبط الرمز مسبقاً. استخدم تسجيل الدخول العادي أو اطلب إعادة التعيين من الإدارة.' },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(pin);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    await createSession({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      mustChangePassword: false,
    });
    await audit('setup_pin', 'User', updated.id, 'first_pin', updated.id);

    return NextResponse.json({
      ok: true,
      message: 'تم حفظ رمزك السري. استخدمه في الدخول القادم.',
      user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'خطأ داخلي' }, { status: 500 });
  }
}
