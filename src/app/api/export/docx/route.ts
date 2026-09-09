import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  const letterhead = await prisma.letterhead.findFirst({ where: { name: 'default' } });

  const paragraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'المحكمة العمالية بالرياض', bold: true, size: 32 })],
    }),
    new Paragraph({ children: [new TextRun({ text: `الرقم: ${doc.number || '—'}`, size: 24 })] }),
    new Paragraph({ children: [new TextRun({ text: `التاريخ: ${doc.dateGregorian || '—'}`, size: 24 })] }),
    new Paragraph({ children: [new TextRun({ text: `الموضوع: ${doc.subject}`, size: 24 })] }),
    new Paragraph({ children: [new TextRun({ text: `إلى: ${doc.recipients}`, size: 24 })] }),
    new Paragraph({ children: [] }),
    ...String(doc.body || '')
      .split('\n')
      .map((line) => new Paragraph({ children: [new TextRun({ text: line || ' ', size: 24 })] })),
    new Paragraph({ children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: letterhead?.footer || 'للاستخدام الداخلي فقط', size: 18, italics: true })],
    }),
  ];

  const document = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });
  const buffer = await Packer.toBuffer(document);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="rakeeza-${doc.number || doc.id}.docx"`,
    },
  });
}
