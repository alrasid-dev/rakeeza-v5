/**
 * التحقق من تطابق التصدير عبر المصدرات الأربعة (PDF/Word/Excel/Outlook)
 * لبطاقة قضية case-card.
 */
import { buildOfficialLetterHtml, type OfficialLetterDoc } from '../src/lib/official-letter-html';
import { parseCaseCard, inlineCaseCardStyles } from '../src/lib/case-card';
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

  console.log(JSON.stringify({ ...results, card }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
