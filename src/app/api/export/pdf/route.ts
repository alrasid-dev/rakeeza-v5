import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { jsPDF } from 'jspdf';

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  const letterhead = await prisma.letterhead.findFirst({ where: { name: 'default' } });

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  // Note: jsPDF default fonts lack full Arabic shaping; export is functional placeholder.
  // Prefer DOCX/HTML for production Arabic typography.
  pdf.setFont('helvetica');
  pdf.setFontSize(14);
  let y = 20;
  const lines = [
    'Labor Court Riyadh / Rakeeza Export',
    `Number: ${doc.number || '-'}`,
    `Date: ${doc.dateGregorian || '-'}`,
    `Subject: ${doc.subject || '-'}`,
    `To: ${doc.recipients || '-'}`,
    '',
    ...(doc.body || '').split('\n').slice(0, 40),
    '',
    letterhead?.footer || 'Internal use only',
  ];
  for (const line of lines) {
    pdf.text(String(line).slice(0, 90), 20, y);
    y += 8;
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
  }
  const buffer = Buffer.from(pdf.output('arraybuffer'));
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rakeeza-${doc.number || doc.id}.pdf"`,
    },
  });
}
