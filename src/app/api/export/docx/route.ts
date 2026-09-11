import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { hasOfficialOutgoingNumber } from '@/lib/honorific';
import { attachmentDisposition } from '@/lib/download-headers';
import { officialDateDisplay } from '@/lib/hijri';
import { loadEmblemPng, dataUrlToBuffer } from '@/lib/brand-assets';
import QRCode from 'qrcode';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  convertInchesToTwip,
  ImageRun,
  VerticalAlign,
} from 'docx';

const GREEN = '006C35';
const GOLD = 'C5A059';
const LIGHT = 'E6F2EB';
const PAGE_W = 9360;

function cell(
  text: string,
  opts: { bold?: boolean; fill?: string; color?: string; width?: number; center?: boolean } = {},
) {
  return new TableCell({
    width: { size: opts.width || 2340, type: WidthType.DXA },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: GREEN },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN },
      left: { style: BorderStyle.SINGLE, size: 8, color: GREEN },
      right: { style: BorderStyle.SINGLE, size: 8, color: GREEN },
    },
    children: [
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: text || ' ',
            bold: opts.bold,
            color: opts.color || '111111',
            size: 20,
            font: 'Arial',
            rightToLeft: true,
          }),
        ],
      }),
    ],
  });
}

function banner(title: string, fill = GOLD) {
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: PAGE_W, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 12, color: GREEN },
              bottom: { style: BorderStyle.SINGLE, size: 12, color: GREEN },
              left: { style: BorderStyle.SINGLE, size: 12, color: GREEN },
              right: { style: BorderStyle.SINGLE, size: 12, color: GREEN },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    color: 'FFFFFF',
                    size: 26,
                    font: 'Arial',
                    rightToLeft: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function bodyLines(text: string) {
  return String(text || '')
    .split('\n')
    .map(
      (line) =>
        new Paragraph({
          alignment: AlignmentType.BOTH,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: line || ' ',
              size: 22,
              font: 'Arial',
              rightToLeft: true,
            }),
          ],
        }),
    );
}

function imageCell(buf: Buffer | null, placeholder: string, widthDxa: number) {
  const kids: Paragraph[] = [];
  if (buf && buf.length > 20) {
    kids.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: 'png',
            data: buf,
            transformation: { width: 64, height: 64 },
          }),
        ],
      }),
    );
  } else {
    kids.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: placeholder,
            color: GREEN,
            size: 16,
            font: 'Arial',
            rightToLeft: true,
          }),
        ],
      }),
    );
  }
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.SINGLE, size: 18, color: GOLD },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    children: kids,
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
    if (!hasOfficialOutgoingNumber(doc.number)) {
      return NextResponse.json({ error: 'أصدر الخطاب برقم رسمي أولاً لتتمكن من التصدير' }, { status: 403 });
    }
    const letterhead = await prisma.letterhead.findFirst({ where: { name: 'default' } });
    const headerLines = (letterhead?.header || 'المملكة العربية السعودية\nوزارة العدل\nالمحكمة العمالية بالرياض')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let qrDataUrl: string | null = null;
    try {
      const fields = JSON.parse(doc.fieldsJson || '{}') as { qrDataUrl?: string };
      qrDataUrl = fields.qrDataUrl || null;
    } catch {
      qrDataUrl = null;
    }
    if (!qrDataUrl && (doc.qrPayload || doc.number)) {
      try {
        qrDataUrl = await QRCode.toDataURL(String(doc.qrPayload || doc.number), { margin: 1, width: 160 });
      } catch {
        qrDataUrl = null;
      }
    }

    const emblemBuf = loadEmblemPng();
    const qrBuf = qrDataUrl ? dataUrlToBuffer(qrDataUrl) : null;

    const children: (Paragraph | Table)[] = [];

    // Basmala green bar
    children.push(
      new Table({
        width: { size: PAGE_W, type: WidthType.DXA },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: PAGE_W, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: GREEN },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: GREEN },
                  bottom: { style: BorderStyle.SINGLE, size: 24, color: GOLD },
                  left: { style: BorderStyle.SINGLE, size: 4, color: GREEN },
                  right: { style: BorderStyle.SINGLE, size: 4, color: GREEN },
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: 'بسم الله الرحمن الرحيم',
                        bold: true,
                        color: 'FFFFFF',
                        size: 24,
                        font: 'Arial',
                        rightToLeft: true,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );

    // Official header: physical LTR columns in Word table — col0=QR(left), col1=center, col2=emblem(right)
    // Word RTL docs still lay table columns left→right in OOXML.
    const centerParas = [
      ...headerLines.map(
        (line, i) =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: line,
                bold: true,
                color: GREEN,
                size: i === headerLines.length - 1 ? 26 : 20,
                font: 'Arial',
                rightToLeft: true,
              }),
            ],
          }),
      ),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: 'منصة ركيزة الذكية',
            color: GOLD,
            size: 18,
            font: 'Arial',
            rightToLeft: true,
          }),
        ],
      }),
    ];

    children.push(
      new Table({
        width: { size: PAGE_W, type: WidthType.DXA },
        columnWidths: [1400, 6560, 1400],
        rows: [
          new TableRow({
            children: [
              imageCell(qrBuf, 'QR', 1400),
              new TableCell({
                width: { size: 6560, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.SINGLE, size: 18, color: GOLD },
                  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                },
                children: centerParas,
              }),
              imageCell(emblemBuf, 'شعار', 1400),
            ],
          }),
        ],
      }),
    );

    children.push(new Paragraph({ children: [], spacing: { after: 120 } }));

    // Metadata
    children.push(
      new Table({
        width: { size: PAGE_W, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({
            children: [
              cell(`الرقم: ${doc.number || '—'}`, { fill: LIGHT, bold: true, width: 3120, center: true }),
              cell(`التاريخ: ${officialDateDisplay(doc.dateHijri, doc.dateGregorian)}`, {
                fill: LIGHT,
                bold: true,
                width: 3120,
                center: true,
              }),
              cell(`النوع: ${doc.docType || 'مكاتبة'}`, { fill: LIGHT, bold: true, width: 3120, center: true }),
            ],
          }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 120 },
        alignment: AlignmentType.RIGHT,
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: GREEN, space: 4 },
        },
        children: [
          new TextRun({ text: 'الموضوع: ', bold: true, color: GREEN, size: 22, font: 'Arial', rightToLeft: true }),
          new TextRun({ text: doc.subject || '—', size: 22, font: 'Arial', rightToLeft: true }),
        ],
      }),
    );

    children.push(new Paragraph({ children: [], spacing: { after: 200 } }));

    if (doc.recipients) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: 'إلى: ', bold: true, color: GREEN, size: 22, font: 'Arial', rightToLeft: true }),
            new TextRun({ text: doc.recipients, size: 22, font: 'Arial', rightToLeft: true }),
          ],
        }),
      );
    }

    if (doc.parties && doc.parties.trim()) {
      children.push(new Paragraph({ children: [], spacing: { after: 120 } }));
      children.push(banner('أطراف القضية', GREEN));
      children.push(
        new Table({
          width: { size: PAGE_W, type: WidthType.DXA },
          columnWidths: [2808, 1872, 1872, 1404, 1404],
          rows: [
            new TableRow({
              children: [
                cell('الاسم', { bold: true, fill: GREEN, color: 'FFFFFF', width: 2808, center: true }),
                cell('نوع الهوية', { bold: true, fill: GREEN, color: 'FFFFFF', width: 1872, center: true }),
                cell('رقم الهوية', { bold: true, fill: GREEN, color: 'FFFFFF', width: 1872, center: true }),
                cell('الجنسية', { bold: true, fill: GREEN, color: 'FFFFFF', width: 1404, center: true }),
                cell('الصفة', { bold: true, fill: GREEN, color: 'FFFFFF', width: 1404, center: true }),
              ],
            }),
            ...String(doc.parties)
              .split(/\n|;/)
              .filter(Boolean)
              .slice(0, 12)
              .map(
                (p) =>
                  new TableRow({
                    children: [
                      cell(p.trim(), { width: 2808, center: true }),
                      cell('', { width: 1872 }),
                      cell('', { width: 1872 }),
                      cell('', { width: 1404 }),
                      cell('', { width: 1404 }),
                    ],
                  }),
              ),
          ],
        }),
      );
    }

    if (doc.reasons && doc.reasons.trim()) {
      children.push(new Paragraph({ children: [], spacing: { after: 160 } }));
      children.push(banner('الأسباب', '8B7355'));
      children.push(...bodyLines(doc.reasons));
    }

    if (doc.body && doc.body.trim()) {
      children.push(new Paragraph({ children: [], spacing: { after: 160 } }));
      children.push(banner('نص المكاتبة', GREEN));
      children.push(...bodyLines(doc.body));
    }

    if (doc.studyFields && doc.studyFields.trim()) {
      children.push(new Paragraph({ children: [], spacing: { after: 160 } }));
      children.push(banner('حقول الدراسة', GREEN));
      children.push(...bodyLines(doc.studyFields));
    }

    children.push(new Paragraph({ children: [], spacing: { before: 200 } }));
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 8 },
        },
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: letterhead?.footer || 'للاستخدام الداخلي فقط',
            italics: true,
            color: '555555',
            size: 18,
            font: 'Arial',
            rightToLeft: true,
          }),
        ],
      }),
    );

    const document = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.55),
                bottom: convertInchesToTwip(0.65),
                left: convertInchesToTwip(0.55),
                right: convertInchesToTwip(0.55),
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  border: {
                    bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 4 },
                  },
                  children: [
                    new TextRun({
                      text: 'وزارة العدل — المحكمة العمالية بالرياض',
                      color: GREEN,
                      size: 16,
                      font: 'Arial',
                      rightToLeft: true,
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  border: {
                    top: { style: BorderStyle.SINGLE, size: 18, color: GREEN, space: 6 },
                  },
                  children: [
                    new TextRun({
                      text: 'للاستخدام الداخلي فقط  |  صفحة ',
                      color: GREEN,
                      size: 14,
                      font: 'Arial',
                      rightToLeft: true,
                    }),
                    new TextRun({ children: [PageNumber.CURRENT], color: GOLD, size: 14 }),
                  ],
                }),
              ],
            }),
          },
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(document);
    const base = `rakeeza-${doc.number || doc.id}`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': attachmentDisposition(base, 'docx'),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('docx export failed', e);
    return NextResponse.json({ error: 'تعذر إنشاء ملف DOCX. جرب تصدير PDF حالياً.' }, { status: 500 });
  }
}
