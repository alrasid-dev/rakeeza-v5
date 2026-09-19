import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, audit } from '@/lib/auth';

/** Ensure acting (مكلف) titles exist so directory picks show the right line. */
const ENSURE_POSITIONS: { title: string; honorific: string; rank: number }[] = [
  { title: 'رئيس محكمة', honorific: 'فضيلة رئيس المحكمة', rank: 100 },
  { title: 'رئيس محكمة مكلف', honorific: 'فضيلة رئيس المحكمة المكلف', rank: 98 },
  { title: 'مدير الموارد البشرية', honorific: 'الأستاذ', rank: 60 },
  { title: 'مدير الموارد البشرية المكلف', honorific: 'الأستاذ مدير الموارد البشرية المكلف', rank: 59 },
];

async function ensureActingPositions() {
  for (const row of ENSURE_POSITIONS) {
    const existing = await prisma.position.findFirst({ where: { title: row.title } });
    if (!existing) {
      await prisma.position.create({ data: row });
    } else if (existing.honorific !== row.honorific) {
      await prisma.position.update({
        where: { id: existing.id },
        data: { honorific: row.honorific, rank: row.rank },
      });
    }
  }
}

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  try {
    await ensureActingPositions();
  } catch {
    /* non-fatal — listing still works */
  }
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
