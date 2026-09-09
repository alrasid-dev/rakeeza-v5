import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-api-key');
  if (!key || key !== process.env.PUBLIC_API_KEY) {
    return NextResponse.json({ error: 'مفتاح API غير صالح' }, { status: 401 });
  }
  const number = req.nextUrl.searchParams.get('number');
  if (number) {
    const document = await prisma.document.findFirst({
      where: { number },
      select: {
        number: true,
        subject: true,
        status: true,
        dateGregorian: true,
        docType: true,
        createdAt: true,
      },
    });
    if (!document) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
    return NextResponse.json({ document });
  }
  const documents = await prisma.document.findMany({
    where: { status: 'issued' },
    select: {
      number: true,
      subject: true,
      status: true,
      dateGregorian: true,
      docType: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({ documents });
}
