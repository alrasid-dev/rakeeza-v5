import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ensureTemplates } from '@/lib/ensure-templates';

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  await ensureTemplates();
  const templates = await prisma.template.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json({ templates });
}
