import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { hasOfficialOutgoingNumber } from '@/lib/honorific';
import ExcelJS from 'exceljs';

const GREEN = '006C35';
const GOLD = 'C5A059';

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  if (!hasOfficialOutgoingNumber(doc.number)) {
    return NextResponse.json({ error: 'أصدر الخطاب برقم رسمي أولاً لتتمكن من التصدير' }, { status: 403 });
  }
    const fields = JSON.parse(doc.fieldsJson || '{}') as {
      studySections?: Record<string, string | undefined>;
      tableRows?: { name: string; id?: string; extra?: string }[];
    };
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('المكاتبة');
    ws.views = [{ rightToLeft: true }];

    const addBanner = (title: string, fill = GREEN) => {
      const row = ws.addRow([title]);
      row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${fill}` } };
      ws.mergeCells(row.number, 1, row.number, 4);
    };

    const addKv = (label: string, value?: string | null) => {
      if (!value) return;
      ws.addRow([label, value]);
    };

    addBanner(doc.subject || doc.docType || 'مكاتبة');
    addKv('الرقم', doc.number);
    addKv('التاريخ', doc.dateGregorian);
    addKv('إلى', doc.recipients);
    addKv('الموضوع', doc.subject);
    addKv('الأطراف', doc.parties);
    addKv('الأسباب', doc.reasons);
    addKv('الدراسة', doc.studyFields);
    addKv('النص', doc.body);

    const ss = fields.studySections;
    if (ss) {
      addBanner('بيانات القضية');
      for (const [k, label] of [
        ['caseNumber', 'رقم القضية'],
        ['deedNumber', 'رقم الصك'],
        ['plaintiff', 'المدعي'],
        ['defendant', 'المدعى عليه'],
        ['jurisdiction', 'الاختصاص'],
        ['summaryPlaintiff', 'دعوى المدعي'],
        ['summaryDefendant', 'إجابة المدعى عليه'],
        ['problem', 'المشكلة'],
        ['legalOpinion', 'الرأي القانوني'],
        ['recommendation', 'التوصية'],
        ['preparer', 'معد الدراسة'],
      ] as const) {
        addKv(label, ss[k] as string | undefined);
      }
    }

    if (fields.tableRows?.length) {
      addBanner('جدول الأسماء', GOLD);
      ws.addRow(['#', 'الاسم', 'رقم الهوية', 'ملاحظات']);
      fields.tableRows.forEach((r, i) => ws.addRow([i + 1, r.name, r.id || '', r.extra || '']));
    }

    ws.getColumn(1).width = 22;
    ws.getColumn(2).width = 50;

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="rakeeza-${doc.number || doc.id}.xlsx"`,
      },
    });
  }

  const docs = await prisma.document.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('المكاتبات');
  ws.views = [{ rightToLeft: true }];
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
