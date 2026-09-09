import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import ExcelJS from 'exceljs';

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const docs = await prisma.document.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('المكاتبات');
  ws.columns = [
    { header: 'الرقم', key: 'number', width: 20 },
    { header: 'النوع', key: 'docType', width: 14 },
    { header: 'الموضوع', key: 'subject', width: 40 },
    { header: 'الحالة', key: 'status', width: 12 },
    { header: 'التاريخ', key: 'dateGregorian', width: 14 },
    { header: 'إلى', key: 'recipients', width: 24 },
  ];
  for (const d of docs) {
    ws.addRow({
      number: d.number || '',
      docType: d.docType,
      subject: d.subject,
      status: d.status,
      dateGregorian: d.dateGregorian || '',
      recipients: d.recipients,
    });
  }
  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="rakeeza-documents.xlsx"',
    },
  });
}
