import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const documents = await prisma.document.findMany({
    where: { archived: true },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ documents });
}
