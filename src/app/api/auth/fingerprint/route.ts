import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession, getSession, audit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action as string;
    const credentialId = String(body.credentialId || '').trim();
    if (!credentialId) return NextResponse.json({ error: 'معرف البصمة مطلوب' }, { status: 400 });

    if (action === 'register') {
      const s = await getSession();
      if (!s) return NextResponse.json({ error: 'سجّل الدخول بالرمز أولاً' }, { status: 401 });
      await prisma.setting.upsert({
        where: { key: `webauthn:${credentialId}` },
        create: { key: `webauthn:${credentialId}`, value: s.id },
        update: { value: s.id },
      });
      await audit('fingerprint_register', 'User', s.id, undefined, s.id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'login') {
      const row = await prisma.setting.findUnique({ where: { key: `webauthn:${credentialId}` } });
      if (!row?.value) return NextResponse.json({ error: 'البصمة غير مسجّلة على هذا الجهاز' }, { status: 401 });
      const user = await prisma.user.findUnique({ where: { id: row.value } });
      if (!user || !user.active) return NextResponse.json({ error: 'الحساب غير متاح' }, { status: 401 });
      await createSession({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: false,
      });
      await audit('login_fingerprint', 'User', user.id, undefined, user.id);
      return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'خطأ داخلي' }, { status: 500 });
  }
}
