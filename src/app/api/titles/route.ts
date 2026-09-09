import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, audit } from '@/lib/auth';

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const positions = await prisma.position.findMany({ orderBy: { rank: 'desc' } });
  return NextResponse.json({ positions });
}

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s || s.role !== 'Admin') return NextResponse.json({ error: 'ممنوع' }, { status: 403 });
  const body = await req.json();
  const position = await prisma.position.create({
    data: { title: body.title, honorific: body.honorific, rank: body.rank || 0 },
  });
  await audit('create_position', 'Position', position.id, position.title, s.id);
  return NextResponse.json({ position });
}
