import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, isMojEmail, audit } from '@/lib/auth';

/** Public: create pending RegistrationRequest */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const name = String(body.name || '').trim();
    const password = String(body.password || '');
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'الاسم والبريد ورمز المرور مطلوبة' }, { status: 400 });
    }
    if (!isMojEmail(email)) {
      return NextResponse.json({ error: 'البريد يجب أن ينتهي بـ @moj.gov.sa' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(password)) {
      return NextResponse.json({ error: 'رمز المرور المقترح يجب أن يكون ٦ أرقام' }, { status: 400 });
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'يوجد حساب بهذا البريد مسبقاً' }, { status: 409 });
    }
    const pending = await prisma.registrationRequest.findFirst({
      where: { email, status: 'pending' },
    });
    if (pending) {
      return NextResponse.json({ error: 'يوجد طلب معلق بهذا البريد' }, { status: 409 });
    }
    const passwordHash = await hashPassword(password);
    const row = await prisma.registrationRequest.create({
      data: {
        name,
        email,
        phone: body.phone ? String(body.phone) : null,
        nationalId: body.nationalId ? String(body.nationalId) : null,
        orgUnitName: body.orgUnitName ? String(body.orgUnitName) : null,
        passwordHash,
        status: 'pending',
      },
    });
    await audit('register_request', 'RegistrationRequest', row.id, email);
    return NextResponse.json({ ok: true, id: row.id, message: 'تم إرسال الطلب وبانتظار موافقة الرئيس' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'خطأ داخلي' }, { status: 500 });
  }
}
