/**
 * Step 4 verify: Outlook table-based HTML, Excel bordered td, PDF A4 print CSS.
 * Run: npx tsx scripts/verify-clipboard-a4.mts
 */
import fs from 'fs';
import path from 'path';
import {
  buildLetterHtml,
  outlookHtmlIsTableBased,
  outlookHtmlHasHostileLayout,
  outlookBodyUsesAlignAttribute,
} from '../src/lib/outlook-clipboard.ts';
import {
  buildExcelKvTableHtml,
  buildExcelTableHtml,
  excelTableHasBorderedTd,
} from '../src/lib/excel-clipboard.ts';
import { buildOfficialLetterHtml } from '../src/lib/official-letter-html.ts';
import {
  PDF_A4_PAGE_RULES,
  buildPdfPrintCss,
  pdfPrintCssHasA4Rules,
} from '../src/lib/pdf-print-css.ts';

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('ok ', msg);
}

const sampleDoc = {
  number: 'صادر-1448-0001',
  subject: 'موضوع تجريبي للتحقق',
  dateGregorian: '2026-09-19',
  dateHijri: '1448/03/28هـ',
  recipients: 'فضيلة رئيس المحكمة سلمه الله',
  copyTo: 'وكيل الوزارة',
  body: 'نص الخطاب التجريبي.',
  footer: 'للاستخدام الداخلي فقط',
  courtName: 'المحكمة العمالية بالرياض',
  fontFamily: 'Traditional Arabic',
  fontSizePt: 14,
  paperLayout: 'classic-green' as const,
  origin: 'https://example.moj.gov.sa',
  judgmentBriefing: true,
  judgmentCard: [
    { label: 'التشكيل', value: 'الثالثة عشر' },
    { label: 'رقم القضية', value: '4772814332' },
  ],
  briefingTitle: 'بطاقة عرض',
};

// --- 1) Outlook HTML is table-based + MSO-compatible ---
{
  const html = buildLetterHtml(sampleDoc);
  assert(outlookHtmlIsTableBased(html), 'Outlook HTML is table-based / MSO-compatible');
  assert(/<table[\s>]/i.test(html), 'Outlook HTML contains <table>');
  assert(/class="brand-row[^"]*official-header"/i.test(html) || /class="brand-row official-header"/i.test(html), 'brand-row official-header preserved');
  assert(/role="presentation"/i.test(html), 'presentation tables for Outlook');
  assert(!outlookHtmlHasHostileLayout(html), 'Outlook HTML ZERO hostile layout (overflow/height/flex/grid)');
  assert(outlookBodyUsesAlignAttribute(html), 'Outlook body uses align= attribute');
  assert(!/overflow\s*:/i.test(html), 'Outlook HTML ZERO overflow');
  assert(!/max-height\s*:/i.test(html), 'Outlook HTML ZERO max-height');
  assert(!(html.match(/<div/gi) || []).length, 'Outlook HTML ZERO div wrappers');
  // Write debug artifact
  const out = path.join(process.cwd(), 'tmp', 'verify-clipboard-outlook.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, 'utf8');
}

// --- 2) Excel table markup has bordered td ---
{
  const kv = buildExcelKvTableHtml([
    { label: 'الرقم', value: 'صادر-1' },
    { label: 'الموضوع', value: 'اختبار' },
  ]);
  assert(excelTableHasBorderedTd(kv), 'Excel KV table has bordered td (1px solid #ccc)');
  assert(/border:\s*1px\s+solid\s+#ccc/i.test(kv), 'Excel border style literal present');
  assert(/<table[\s>]/i.test(kv) && /<tr[\s>]/i.test(kv), 'Excel markup is <table><tr>…');

  const grid = buildExcelTableHtml(
    [
      ['أحمد', '123'],
      ['سارة', '456'],
    ],
    { headers: ['الاسم', 'الهوية'] },
  );
  assert(excelTableHasBorderedTd(grid), 'Excel grid table has bordered td');
  assert(/<th[^>]*border:\s*1px\s+solid\s+#ccc/i.test(grid), 'Excel th also bordered');
}

// --- 3) PDF CSS contains @page A4 rules + page-break-inside avoid ---
{
  assert(
    /size:\s*A4\s+portrait/i.test(PDF_A4_PAGE_RULES) &&
      /margin:\s*10mm\s+15mm\s+15mm\s+15mm/i.test(PDF_A4_PAGE_RULES),
    'PDF_A4_PAGE_RULES constant has exact @page A4 portrait margins',
  );
  const css = buildPdfPrintCss({ fontStack: "'Amiri', serif" });
  assert(pdfPrintCssHasA4Rules(css), 'buildPdfPrintCss passes pdfPrintCssHasA4Rules');
  assert(/table,\s*tr,\s*td,\s*\.card-block\s*\{[^}]*page-break-inside:\s*avoid/i.test(css), 'page-break-inside avoid on table/tr/td/.card-block');
  assert(/\.brand-row/.test(css), 'brand-row preserved in print CSS');

  const pdfHtml = buildOfficialLetterHtml(
    {
      ...sampleDoc,
      qrDataUrl: 'data:image/png;base64,AAA',
    },
    { forPdf: true },
  );
  assert(pdfPrintCssHasA4Rules(pdfHtml), 'official-letter-html forPdf embeds A4 @page rules');
  assert(/class="brand-row official-header"/i.test(pdfHtml), 'QR/header brand-row official-header in PDF HTML');
  assert(/card-block/i.test(pdfHtml), 'card-block class present for page-break avoidance');
  assert(/alt="QR"|QR/i.test(pdfHtml), 'QR element preserved');
}

// --- 4) Source files exist ---
{
  const root = process.cwd();
  for (const rel of [
    'src/lib/outlook-clipboard.ts',
    'src/lib/excel-clipboard.ts',
    'src/lib/pdf-print-css.ts',
    'src/components/ExportToolbar.tsx',
  ]) {
    assert(fs.existsSync(path.join(root, rel)), `file exists: ${rel}`);
  }
  const toolbar = fs.readFileSync(path.join(root, 'src/components/ExportToolbar.tsx'), 'utf8');
  assert(/copyExcelTable/.test(toolbar), 'ExportToolbar wires copyExcelTable');
  assert(/copyOutlookHtml|buildLetterHtml/.test(toolbar), 'ExportToolbar keeps Outlook copy');
}

console.log('\nAll clipboard / A4 checks passed.');
