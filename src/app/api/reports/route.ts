import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/roles';

export async function GET() {
  const s = await getSession();
  if (!s || !isAdmin(s.role)) {
    return NextResponse.json({ error: 'ممنوع' }, { status: 403 });
  }
  const [docs, issued, drafts, archived, employees, users] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({ where: { status: 'issued' } }),
    prisma.document.count({ where: { status: 'draft' } }),
    prisma.document.count({ where: { archived: true } }),
    prisma.employee.count(),
    prisma.user.count(),
  ]);
  return NextResponse.json({
    stats: { docs, issued, drafts, archived, employees, users },
  });
}
