import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isMojEmail } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email: raw } = await req.json();
    const email = String(raw || '').trim().toLowerCase();
    if (!email || !isMojEmail(email)) {
      return NextResponse.json({ error: 'بريد غير صالح' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return NextResponse.json({ exists: false, needsSetup: false });
    }
    return NextResponse.json({
      exists: true,
      needsSetup: !!user.mustChangePassword,
      name: user.name,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'خطأ داخلي' }, { status: 500 });
  }
}
