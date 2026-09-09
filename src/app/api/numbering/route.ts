import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, audit } from '@/lib/auth';

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const rule = await prisma.numberingRule.findFirst({ where: { name: 'default' } });
  return NextResponse.json({ rule });
}

export async function PUT(req: NextRequest) {
  const s = await getSession();
  if (!s || s.role !== 'Admin') return NextResponse.json({ error: 'ممنوع' }, { status: 403 });
  const body = await req.json();
  const existing = await prisma.numberingRule.findFirst({ where: { name: 'default' } });
  if (!existing) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  const rule = await prisma.numberingRule.update({
    where: { id: existing.id },
    data: {
      pattern: body.pattern ?? existing.pattern,
      prefix: body.prefix ?? existing.prefix,
      nextSeq: body.nextSeq ?? existing.nextSeq,
      year: body.year ?? existing.year,
    },
  });
  await audit('update_numbering', 'NumberingRule', rule.id, undefined, s.id);
  return NextResponse.json({ rule });
}
