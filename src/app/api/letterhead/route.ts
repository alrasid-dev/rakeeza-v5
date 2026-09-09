import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, audit } from '@/lib/auth';

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const letterhead = await prisma.letterhead.findFirst({ where: { name: 'default' } });
  return NextResponse.json({ letterhead });
}

export async function PUT(req: NextRequest) {
  const s = await getSession();
  if (!s || s.role !== 'Admin') return NextResponse.json({ error: 'ممنوع' }, { status: 403 });
  const body = await req.json();
  const existing = await prisma.letterhead.findFirst({ where: { name: 'default' } });
  if (!existing) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  const letterhead = await prisma.letterhead.update({
    where: { id: existing.id },
    data: {
      header: body.header ?? existing.header,
      footer: body.footer ?? existing.footer,
      logoUrl: body.logoUrl ?? existing.logoUrl,
    },
  });
  await audit('update_letterhead', 'Letterhead', letterhead.id, undefined, s.id);
  return NextResponse.json({ letterhead });
}
