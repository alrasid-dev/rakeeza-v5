import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { hasOfficialOutgoingNumber } from '@/lib/honorific';
import { attachmentDisposition } from '@/lib/download-headers';
import { officialDateDisplay } from '@/lib/hijri';
import { loadEmblemPng } from '@/lib/brand-assets';
import ExcelJS from 'exceljs';

const GREEN = '006C35';
const GOLD = 'C5A059';
const LIGHT = 'E6F2EB';

function styleHeaderCell(cell: ExcelJS.Cell, opts?: { fill?: string; color?: string; bold?: boolean; size?: number }) {
  cell.font = {
    bold: opts?.bold !== false,
    color: { argb: `FF${opts?.color || 'FFFFFF'}` },
    size: opts?.size || 12,
    name: 'Arial',
  };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${opts?.fill || GREEN}` },
  };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
  cell.border = {
    top: { style: 'thin', color: { argb: `FF${GOLD}` } },
    bottom: { style: 'thin', color: { argb: `FF${GOLD}` } },
    left: { style: 'thin', color: { argb: `FF${GREEN}` } },
    right: { style: 'thin', color: { argb: `FF${GREEN}` } },
  };
}

function styleKvLabel(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: `FF${GREEN}` }, size: 11, name: 'Arial' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${LIGHT}` } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: `FF${GREEN}` } },
    bottom: { style: 'thin', color: { argb: `FF${GREEN}` } },
    left: { style: 'thin', color: { argb: `FF${GREEN}` } },
    right: { style: 'thin', color: { argb: `FF${GREEN}` } },
  };
}

function styleKvValue(cell: ExcelJS.Cell) {
  cell.font = { size: 11, name: 'Arial', color: { argb: 'FF111111' } };
  cell.alignment = { horizontal: 'right', vertical: 'top', readingOrder: 'rtl', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: `FF${GREEN}` } },
    bottom: { style: 'thin', color: { argb: `FF${GREEN}` } },
    left: { style: 'thin', color: { argb: `FF${GREEN}` } },
    right: { style: 'thin', color: { argb: `FF${GREEN}` } },
  };
}

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
      qrDataUrl?: string;
    };

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ركيزة';
    wb.company = 'وزارة العدل — المحكمة العمالية بالرياض';

    const ws = wb.addWorksheet('المكاتبة', {
      views: [{ rightToLeft: true, state: 'normal', showGridLines: false }],
      properties: { defaultRowHeight: 18 },
    });
    ws.columns = [
      { width: 22 },
      { width: 55 },
      { width: 18 },
      { width: 18 },
    ];

    // Row 1–3: official merged header
    const r1 = ws.addRow(['المملكة العربية السعودية']);
    ws.mergeCells(r1.number, 1, r1.number, 4);
    styleHeaderCell(r1.getCell(1), { fill: GREEN, size: 14 });
    r1.height = 24;

    const r2 = ws.addRow(['وزارة العدل']);
    ws.mergeCells(r2.number, 1, r2.number, 4);
    styleHeaderCell(r2.getCell(1), { fill: GREEN, size: 13 });

    const r3 = ws.addRow(['المحكمة العمالية بالرياض']);
    ws.mergeCells(r3.number, 1, r3.number, 4);
    styleHeaderCell(r3.getCell(1), { fill: GREEN, size: 14 });
    r3.height = 22;

    const r4 = ws.addRow(['منصة ركيزة الذكية']);
    ws.mergeCells(r4.number, 1, r4.number, 4);
    styleHeaderCell(r4.getCell(1), { fill: GOLD, color: '1A1A1A', size: 11 });

    // Try embed emblem
    try {
      const emblem = loadEmblemPng();
      const imgId = wb.addImage({ buffer: emblem as unknown as ExcelJS.Buffer, extension: 'png' });
      ws.addImage(imgId, {
        tl: { col: 3.2, row: 0.2 },
        ext: { width: 56, height: 56 },
      });
    } catch {
      /* ignore */
    }

    ws.addRow([]);

    const basmala = ws.addRow(['بسم الله الرحمن الرحيم']);
    ws.mergeCells(basmala.number, 1, basmala.number, 4);
    styleHeaderCell(basmala.getCell(1), { fill: GREEN, size: 12 });

    ws.addRow([]);

    const addKv = (label: string, value?: string | null, tall = false) => {
      if (value == null || String(value).trim() === '') return;
      const row = ws.addRow([label, String(value)]);
      ws.mergeCells(row.number, 2, row.number, 4);
      styleKvLabel(row.getCell(1));
      styleKvValue(row.getCell(2));
      styleKvValue(row.getCell(3));
      styleKvValue(row.getCell(4));
      if (tall) row.height = Math.min(120, 18 + Math.ceil(String(value).length / 50) * 14);
    };

    addKv('الرقم', doc.number);
    addKv('التاريخ', officialDateDisplay(doc.dateHijri, doc.dateGregorian));
    addKv('النوع', doc.docType);
    addKv('إلى', doc.recipients);
    addKv('الموضوع', doc.subject);
    addKv('الأطراف', doc.parties, true);
    addKv('الأسباب', doc.reasons, true);
    addKv('النص', doc.body, true);
    addKv('الدراسة', doc.studyFields, true);

    const ss = fields.studySections;
    if (ss) {
      const ban = ws.addRow(['بيانات القضية']);
      ws.mergeCells(ban.number, 1, ban.number, 4);
      styleHeaderCell(ban.getCell(1), { fill: GREEN });
      for (const [k, label] of [
        ['caseNumber', 'رقم القضية'],
        ['deedNumber', 'رقم الصك'],
        ['formation', 'التشكيل'],
        ['plaintiff', 'المدعي'],
        ['defendant', 'المدعى عليه'],
        ['jurisdiction', 'الاختصاص'],
        ['summaryPlaintiff', 'دعوى المدعي'],
        ['summaryDefendant', 'إجابة المدعى عليه'],
        ['problem', 'المشكلة'],
        ['legalOpinion', 'الرأي القانوني'],
        ['recommendation', 'التوصية'],
        ['preparer', 'معد الدراسة'],
        ['researcher', 'ناظر القضية'],
      ] as const) {
        addKv(label, ss[k] as string | undefined, true);
      }
    }

    if (fields.tableRows?.length) {
      const ban = ws.addRow(['جدول الأسماء']);
      ws.mergeCells(ban.number, 1, ban.number, 4);
      styleHeaderCell(ban.getCell(1), { fill: GOLD, color: '1A1A1A' });
      const head = ws.addRow(['#', 'الاسم', 'رقم الهوية', 'ملاحظات']);
      head.eachCell((c) => styleHeaderCell(c, { fill: GREEN, size: 10 }));
      fields.tableRows.forEach((r, i) => {
        const row = ws.addRow([i + 1, r.name, r.id || '', r.extra || '']);
        row.eachCell((c) => styleKvValue(c));
      });
    }

    ws.addRow([]);
    const foot = ws.addRow(['للاستخدام الداخلي فقط']);
    ws.mergeCells(foot.number, 1, foot.number, 4);
    foot.getCell(1).font = { italic: true, color: { argb: 'FF666666' }, size: 10, name: 'Arial' };
    foot.getCell(1).alignment = { horizontal: 'center', readingOrder: 'rtl' };

    // Sheet 2 — metadata / QR
    const meta = wb.addWorksheet('بيانات المستند', {
      views: [{ rightToLeft: true }],
    });
    meta.columns = [{ width: 28 }, { width: 48 }];
    const mTitle = meta.addRow(['بيانات المستند الرسمية']);
    meta.mergeCells(mTitle.number, 1, mTitle.number, 2);
    styleHeaderCell(mTitle.getCell(1));

    const metaRows: [string, string][] = [
      ['رقم الصادر', doc.number || '—'],
      ['التاريخ الهجري', officialDateDisplay(doc.dateHijri, doc.dateGregorian)],
      ['النوع', doc.docType || '—'],
      ['الموضوع', doc.subject || '—'],
      ['المستلم', doc.recipients || '—'],
      ['قيمة التحقق / QR', String(doc.qrPayload || doc.number || '—')],
      ['الحالة', doc.status || '—'],
      ['المعرّف الداخلي', doc.id],
    ];
    for (const [lab, val] of metaRows) {
      const row = meta.addRow([lab, val]);
      styleKvLabel(row.getCell(1));
      styleKvValue(row.getCell(2));
    }
    const mFoot = meta.addRow(['للاستخدام الداخلي فقط', '']);
    meta.mergeCells(mFoot.number, 1, mFoot.number, 2);
    mFoot.getCell(1).font = { italic: true, color: { argb: 'FF666666' }, size: 10 };
    mFoot.getCell(1).alignment = { horizontal: 'center', readingOrder: 'rtl' };

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': attachmentDisposition(`rakeeza-${doc.number || doc.id}`, 'xlsx'),
        'Cache-Control': 'no-store',
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
  ws.getRow(1).eachCell((c) => styleHeaderCell(c, { size: 11 }));
  for (const d of docs) {
    ws.addRow({
      number: d.number || '',
      docType: d.docType,
      subject: d.subject,
      status: d.status,
      dateGregorian: officialDateDisplay(d.dateHijri, d.dateGregorian),
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
