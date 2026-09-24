import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { hasOfficialOutgoingNumber } from '@/lib/honorific';
import { attachmentDisposition } from '@/lib/download-headers';
import { officialDateDisplay } from '@/lib/hijri';
import { loadEmblemPng, BRAND } from '@/lib/brand-assets';
import ExcelJS from 'exceljs';
import { parseAnyHtmlTable, parseCaseCard, type HtmlTable } from '@/lib/case-card';

/** Official template olive header + gold strip (MOJ letterhead). */
const HEADER = '2E9E5C';
const GREEN = HEADER; // alias for legacy call sites in this file
const GOLD = 'C5A059';
const LIGHT = 'E6F2EB';
const INK = '111111';

const THIN_HEADER = {
  top: { style: 'thin' as const, color: { argb: `FF${HEADER}` } },
  bottom: { style: 'thin' as const, color: { argb: `FF${HEADER}` } },
  left: { style: 'thin' as const, color: { argb: `FF${HEADER}` } },
  right: { style: 'thin' as const, color: { argb: `FF${HEADER}` } },
};

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
    fgColor: { argb: `FF${opts?.fill || HEADER}` },
  };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
  cell.border = {
    top: { style: 'thin', color: { argb: `FF${GOLD}` } },
    bottom: { style: 'thin', color: { argb: `FF${GOLD}` } },
    left: { style: 'thin', color: { argb: `FF${HEADER}` } },
    right: { style: 'thin', color: { argb: `FF${HEADER}` } },
  };
}

function styleKvLabel(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: `FF${HEADER}` }, size: 11, name: 'Arial' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${LIGHT}` } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl', wrapText: true };
  cell.border = THIN_HEADER;
}

function styleKvValue(cell: ExcelJS.Cell) {
  cell.font = { size: 11, name: 'Arial', color: { argb: `FF${INK}` } };
  cell.alignment = { horizontal: 'right', vertical: 'top', readingOrder: 'rtl', wrapText: true };
  cell.border = THIN_HEADER;
}

/**
 * Render a parsed case-card as real Excel rows (label in column A with green
 * fill, value in column B..D with gold border) instead of raw HTML text.
 */
function addCaseCardTable(ws: ExcelJS.Worksheet, rows: { label: string; value: string }[]): void {
  if (!rows.length) return;
  const ban = ws.addRow(['بطاقة القضية']);
  ws.mergeCells(ban.number, 1, ban.number, 4);
  styleHeaderCell(ban.getCell(1), { fill: HEADER });

  const goldBorder = {
    top: { style: 'thin' as const, color: { argb: `FF${GOLD}` } },
    bottom: { style: 'thin' as const, color: { argb: `FF${GOLD}` } },
    left: { style: 'thin' as const, color: { argb: `FF${GOLD}` } },
    right: { style: 'thin' as const, color: { argb: `FF${GOLD}` } },
  };

  for (const row of rows) {
    const r = ws.addRow([row.label, row.value]);
    ws.mergeCells(r.number, 2, r.number, 4);

    const label = r.getCell(1);
    label.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' };
    label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${HEADER}` } };
    label.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl', wrapText: true };
    label.border = {
      top: { style: 'thin', color: { argb: `FF${HEADER}` } },
      bottom: { style: 'thin', color: { argb: `FF${HEADER}` } },
      left: { style: 'thin', color: { argb: `FF${HEADER}` } },
      right: { style: 'thin', color: { argb: `FF${GOLD}` } },
    };

    for (let c = 2; c <= 4; c++) {
      const cell = r.getCell(c);
      cell.font = { size: 11, name: 'Arial', color: { argb: `FF${INK}` } };
      cell.alignment = { horizontal: 'right', vertical: 'top', readingOrder: 'rtl', wrapText: true };
      cell.border = goldBorder;
    }

    const lines = row.value.split('\n').length;
    r.height = Math.min(140, 18 + Math.ceil(row.value.length / 55) * 14 + (lines - 1) * 14);
  }
  ws.addRow([]);
}

/**
 * Render a generic HTML table (not a case-card) as real Excel cells instead of
 * raw HTML text — each `<tr>` = an Excel row, each `<td>`/`<th>` = an Excel
 * cell, respecting `colspan`/`rowspan` via merged cells, RTL right-aligned.
 */
function addHtmlTable(ws: ExcelJS.Worksheet, table: HtmlTable): void {
  const rowCount = table.rows.length;
  if (!rowCount) return;

  let totalCols = 0;
  for (const r of table.rows) {
    let span = 0;
    for (const c of r.cells) span += c.colspan;
    totalCols = Math.max(totalCols, span);
  }
  totalCols = Math.max(1, totalCols);

  // Grid layout (rowspan-aware) so merged cells reserve their columns.
  const occupied: boolean[][] = Array.from({ length: rowCount }, () =>
    Array<boolean>(totalCols).fill(false),
  );
  const placed: { r: number; c: number; cell: HtmlTable['rows'][number]['cells'][number] }[] = [];

  for (let r = 0; r < rowCount; r += 1) {
    let c = 0;
    for (const cell of table.rows[r].cells) {
      while (c < totalCols && occupied[r][c]) c += 1;
      if (c >= totalCols) break;
      const cEnd = Math.min(totalCols, c + cell.colspan) - 1;
      const rEnd = Math.min(rowCount, r + cell.rowspan) - 1;
      for (let rr = r; rr <= rEnd; rr += 1) {
        for (let cc = c; cc <= cEnd; cc += 1) occupied[rr][cc] = true;
      }
      placed.push({ r, c, cell });
      c = cEnd + 1;
    }
  }

  const startRow = ws.rowCount + 1;
  for (let i = 0; i < rowCount; i += 1) ws.addRow([]);

  const thinBorder = {
    top: { style: 'thin' as const, color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFCCCCCC' } },
    left: { style: 'thin' as const, color: { argb: 'FFCCCCCC' } },
    right: { style: 'thin' as const, color: { argb: 'FFCCCCCC' } },
  };

  for (const p of placed) {
    const cell = ws.getRow(startRow + p.r).getCell(p.c + 1);
    cell.value = p.cell.content;
    cell.font = {
      name: 'Arial',
      size: 11,
      bold: p.cell.isHeader,
      color: { argb: `FF${INK}` },
    };
    cell.alignment = {
      horizontal: 'right',
      vertical: 'middle',
      wrapText: true,
      readingOrder: 'rtl',
    };
    cell.border = thinBorder;
    if (p.cell.isHeader) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${LIGHT}` } };
    }
    if (p.cell.colspan > 1 || p.cell.rowspan > 1) {
      ws.mergeCells(startRow + p.r, p.c + 1, startRow + p.r + p.cell.rowspan - 1, p.c + p.cell.colspan);
    }
  }
  ws.addRow([]);
}

/**
 * ExcelJS interactive table matching the official bordered form.
 * Returns the next free row index after the table.
 */
function addOfficialTable(
  ws: ExcelJS.Worksheet,
  opts: {
    name: string;
    startRow: number;
    columns: string[];
    rows: (string | number)[][];
  },
): number {
  const colCount = opts.columns.length;
  const dataRows = opts.rows.length ? opts.rows : [opts.columns.map(() => '—')];
  const endRow = opts.startRow + dataRows.length; // header + data
  const endColLetter = String.fromCharCode('A'.charCodeAt(0) + colCount - 1);
  const ref = `A${opts.startRow}:${endColLetter}${endRow}`;

  ws.addTable({
    name: opts.name,
    ref,
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
    },
    columns: opts.columns.map((name) => ({ name, filterButton: true })),
    rows: dataRows,
  });

  const header = ws.getRow(opts.startRow);
  for (let c = 1; c <= colCount; c++) {
    styleHeaderCell(header.getCell(c), { fill: HEADER, size: 10 });
  }
  for (let r = opts.startRow + 1; r <= endRow; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= colCount; c++) {
      styleKvValue(row.getCell(c));
    }
  }
  return endRow + 2;
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
      judgmentCard?: { label: string; value: string }[];
      judgmentBriefing?: boolean;
      briefingTitle?: string;
      observationText?: string;
      mechanismText?: string;
      qrDataUrl?: string;
      paperLayout?: string;
      style?: { fontFamily?: string; fontSizePt?: number };
      copyTo?: string;
    };
    const isBriefing = Boolean(fields.judgmentBriefing && fields.judgmentCard?.length);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ركيزة';
    wb.company = 'وزارة العدل — المحكمة العمالية بالرياض';

    const ws = wb.addWorksheet('المكاتبة', {
      views: [{ rightToLeft: true }],
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
    styleHeaderCell(r1.getCell(1), { fill: HEADER, size: 14 });
    r1.height = 24;

    const r2 = ws.addRow(['وزارة العدل']);
    ws.mergeCells(r2.number, 1, r2.number, 4);
    styleHeaderCell(r2.getCell(1), { fill: HEADER, size: 13 });

    const r3 = ws.addRow(['المحكمة العمالية بالرياض']);
    ws.mergeCells(r3.number, 1, r3.number, 4);
    styleHeaderCell(r3.getCell(1), { fill: HEADER, size: 14 });
    r3.height = 22;

    const r4 = ws.addRow([BRAND.platform]);
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
    addKv('النوع', isBriefing ? (fields.briefingTitle || 'بطاقة عرض') : doc.docType);
    addKv('إلى', doc.recipients);
    if (fields.copyTo?.trim()) addKv('نسخة إلى', fields.copyTo);
    addKv('الموضوع', doc.subject);
    if (!isBriefing) {
      addKv('الأطراف', doc.parties, true);
      addKv('الأسباب', doc.reasons, true);
      if (doc.body) {
        const caseCard = parseCaseCard(doc.body);
        if (caseCard) {
          addCaseCardTable(ws, caseCard);
          const rest = String(doc.body)
            .replace(/<table\b[^>]*class="[^"]*case-card[^"]*"[^>]*>[\s\S]*?<\/table>/i, '')
            .trim();
          if (rest) addKv('نص المكاتبة', rest, true);
        } else {
          // جدول HTML عادي (ليس case-card) → خلايا Excel فعلية بدل نص خام.
          const anyTable = parseAnyHtmlTable(doc.body);
          if (anyTable) {
            addHtmlTable(ws, anyTable);
            const rest = String(doc.body)
              .replace(/<table\b[^>]*>[\s\S]*?<\/table>/i, '')
              .trim();
            if (rest) addKv('نص المكاتبة', rest, true);
          } else {
            addKv('نص المكاتبة', doc.body, true);
          }
        }
      }
      addKv('الدراسة', doc.studyFields, true);
    } else {
      if (fields.observationText?.trim()) addKv('الملاحظة', fields.observationText, true);
      if (fields.mechanismText?.trim()) addKv('آلية المعالجة', fields.mechanismText, true);
    }

    const ss = fields.studySections;
    if (ss) {
      const ban = ws.addRow(['بيانات القضية']);
      ws.mergeCells(ban.number, 1, ban.number, 4);
      styleHeaderCell(ban.getCell(1), { fill: HEADER });
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

    if (fields.judgmentCard?.length) {
      const ban = ws.addRow([fields.briefingTitle || 'بطاقة عرض — مدخلات الأحكام']);
      ws.mergeCells(ban.number, 1, ban.number, 4);
      styleHeaderCell(ban.getCell(1), { fill: GOLD, color: '1A1A1A' });
      const start = ban.number + 1;
      addOfficialTable(ws, {
        name: 'JudgmentCard',
        startRow: start,
        columns: ['الحقل', 'القيمة'],
        rows: fields.judgmentCard.map((row) => [row.label, row.value]),
      });
      // widen value column already set; ensure merges for visual form
      for (let r = start + 1; r <= start + Math.max(fields.judgmentCard.length, 1); r++) {
        try {
          ws.mergeCells(r, 2, r, 4);
        } catch {
          /* table may own cells */
        }
      }
      ws.addRow([]);
    }

    if (fields.tableRows?.length) {
      const ban = ws.addRow(['جدول الأسماء']);
      ws.mergeCells(ban.number, 1, ban.number, 4);
      styleHeaderCell(ban.getCell(1), { fill: GOLD, color: '1A1A1A' });
      addOfficialTable(ws, {
        name: 'PartyNames',
        startRow: ban.number + 1,
        columns: ['تسلسل', 'الاسم', 'رقم الهوية', 'ملاحظات'],
        rows: fields.tableRows.map((r, i) => [i + 1, r.name, r.id || '', r.extra || '']),
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
    styleHeaderCell(mTitle.getCell(1), { fill: HEADER });

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
  ws.getRow(1).eachCell((c) => styleHeaderCell(c, { fill: HEADER, size: 11 }));
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
