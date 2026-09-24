/**
 * التحقق من تطابق التصدير عبر المصدرات الأربعة (PDF/Word/Excel/Outlook)
 * لبطاقة قضية case-card.
 */
import { buildOfficialLetterHtml, type OfficialLetterDoc } from '../src/lib/official-letter-html';
import { parseAnyHtmlTable, parseCaseCard, inlineCaseCardStyles } from '../src/lib/case-card';
import { Document, Packer, Table, TableRow, TableCell, Paragraph } from 'docx';

const CASE_CARD_HTML = [
  '<table class="case-card">',
  '  <tr><td class="label" data-col-type="label"><p>التشكيل</p></td><td class="value" data-col-type="value"><p>الدائرة الثامنة</p></td></tr>',
  '  <tr><td class="label" data-col-type="label"><p>رقم القضية</p></td><td class="value" data-col-type="value"><p>4571449052</p></td></tr>',
  '</table>',
].join('\n');

const doc: OfficialLetterDoc = {
  number: '1',
  subject: 'ت',
  recipients: 'إ',
  body: CASE_CARD_HTML,
  docType: 'خطاب',
  fontFamily: 'Traditional Arabic',
};

async function main() {
  const results: Record<string, unknown> = {};

  // 1) PDF
  const pdf = buildOfficialLetterHtml(doc, { forPdf: true });
  results.pdfGreen = pdf.includes('#2e9e5c');
  results.pdfCaseCard = pdf.includes('table.case-card');

  // 2) Word (docx): parseCaseCard هو مصدر بيانات جدول docx
  const card = parseCaseCard(CASE_CARD_HTML);
  results.wordCardRows = card?.length ?? 0;

  // حزم جدول docx حقيقي والتحقق من <w:tbl> في XML
  let wtbl = false;
  try {
    const wdoc = new Document({
      sections: [
        {
          children: [
            new Table({
              rows: [
                new TableRow({
                  children: [new TableCell({ children: [new Paragraph('x')] })],
                }),
              ],
            }),
          ],
        },
      ],
    });
    const wbuf = await Packer.toBuffer(wdoc);
    // ابحث عن <w:tbl في XML غير المضغوط أو استخدم JSZip لفك الضغط
    wtbl = wbuf.includes(Buffer.from('<w:tbl'));
    if (!wtbl) {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(wbuf as unknown as Uint8Array);
        const xml = await zip.file('word/document.xml')?.async('string');
        wtbl = !!xml && xml.includes('<w:tbl');
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    results.docxError = String(e);
  }
  results.wordHasWtbl = wtbl;

  // 3) Excel: parseCaseCard هو مصدر بيانات خلايا xlsx
  results.excelCardRows = card?.length ?? 0;

  // 4) Outlook: inlineCaseCardStyles (أنماط inline على كل خلية)
  const outlook = inlineCaseCardStyles(CASE_CARD_HTML);
  results.outlookGreen = outlook.toLowerCase().includes('#2e9e5c');
  results.outlookNowrap = outlook.includes('white-space:nowrap');

  // 5) جدول HTML عادي (ليس case-card) → parseAnyHtmlTable يعيد خلايا Excel
  const genericTableHtml = [
    '<table>',
    '  <tr><th>الاسم</th><th>رقم القضية</th><th>ملاحظات</th></tr>',
    '  <tr><td>فهد العتيبي</td><td>4670855622</td><td>أجور متأخرة</td></tr>',
    '  <tr><td>فهد العتيبي</td><td>4670855623</td><td>فصل تعسفي</td></tr>',
    '</table>',
  ].join('\n');
  const generic = parseAnyHtmlTable(genericTableHtml);
  results.genericNotCaseCard = parseCaseCard(genericTableHtml) === null;
  results.genericTableRows = generic?.rows.length ?? 0;
  results.genericHeaderCells = generic?.rows[0]?.cells.length ?? 0;
  results.genericHeaderIsHeader = generic?.rows[0]?.cells[0]?.isHeader ?? false;
  results.genericFirstDataCell = generic?.rows[1]?.cells[0]?.content ?? '';

  // 6) جدول بخلايا مدموجة (colspan) → تحترم الدمج
  const mergedTableHtml = [
    '<table>',
    '  <tr><td colspan="2">بيانات القضية</td></tr>',
    '  <tr><td>المدعي</td><td>أحمد</td></tr>',
    '  <tr><td>المدعى عليه</td><td>شركة</td></tr>',
    '</table>',
  ].join('\n');
  const merged = parseAnyHtmlTable(mergedTableHtml);
  results.mergedColspan = merged?.rows[0]?.cells[0]?.colspan ?? 0;
  results.mergedRows = merged?.rows.length ?? 0;

  // 7) لا يوجد جدول → null (يسقط على النص العادي)
  results.noTableNull = parseAnyHtmlTable('<p>نص عادي بدون جدول</p>') === null;

  console.log(JSON.stringify({ ...results, card, generic, merged }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
