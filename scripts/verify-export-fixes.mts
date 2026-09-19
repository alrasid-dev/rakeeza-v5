/**
 * Verify the 3 critical export fixes.
 * Run: npx tsx scripts/verify-export-fixes.mts
 */
import fs from 'fs';
import path from 'path';
import { buildOfficialLetterHtml } from '../src/lib/official-letter-html.ts';
import {
  buildLetterHtml,
  outlookHtmlIsTableBased,
  outlookHeaderHasQrNumberDate,
} from '../src/lib/outlook-clipboard.ts';
import { buildPdfEmbeddedFontCss } from '../src/lib/pdf-font-css.ts';
import { htmlHasInlineParagraphFont } from '../src/lib/stamp-inline-font.ts';
import { pdfInlineFontName } from '../src/lib/arabic-font-library.ts';

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('ok ', msg);
}

const sample = {
  number: 'صادر-1448-0001',
  subject: 'موضوع تجريبي للتحقق',
  dateGregorian: '2026-09-19',
  dateHijri: '1448/03/28هـ',
  recipients: 'فضيلة رئيس المحكمة سلمه الله',
  copyTo: 'وكيل الوزارة',
  body: 'نص الخطاب التجريبي للتحقق من الخط.',
  footer: 'للاستخدام الداخلي فقط',
  courtName: 'المحكمة العمالية بالرياض',
  fontFamily: 'Amiri',
  fontSizePt: 14,
  paperLayout: 'classic-green',
  qrDataUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  judgmentBriefing: true,
  judgmentCard: [
    { label: 'التشكيل', value: 'الثالثة عشر' },
    { label: 'رقم القضية', value: '4772814332' },
  ],
  briefingTitle: 'بطاقة عرض',
};

const tmp = path.join(process.cwd(), 'tmp');
fs.mkdirSync(tmp, { recursive: true });

// 1) PDF font engine
{
  const css = buildPdfEmbeddedFontCss('Amiri');
  assert(!/fonts\.googleapis\.com/.test(css), 'PDF CSS has no Google Fonts URL');
  assert(/@font-face/.test(css) && /data:font\/ttf;base64,/.test(css), 'PDF CSS embeds Base64 @font-face');
  assert(css.includes('Amiri'), 'PDF CSS registers Amiri');

  const embedded = buildPdfEmbeddedFontCss(sample.fontFamily);
  const html = buildOfficialLetterHtml(sample, { forPdf: true, embeddedFontCss: embedded });
  fs.writeFileSync(path.join(tmp, 'verify-pdf-font-fix.html'), html, 'utf8');
  assert(/@font-face/.test(html), 'PDF HTML includes @font-face');
  assert(/data:font\/ttf;base64,/.test(html), 'PDF HTML embeds Base64 fonts');
  assert(htmlHasInlineParagraphFont(html, 'Amiri'), 'PDF HTML stamps inline font-family on <p>');
  const inlineName = pdfInlineFontName('Amiri');
  assert(
    html.includes(`font-family: '${inlineName}'`) || html.includes("font-family: 'Amiri'"),
    'PDF HTML uses selected Amiri family inline',
  );

  const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/export/pdf/route.ts'), 'utf8');
  const i = route.indexOf('async function renderHtmlToPdf');
  assert(i >= 0, 'renderHtmlToPdf exists');
  const slice = route.slice(i, i + 900);
  const noComments = slice
    .split('\n')
    .map((line) => {
      const c = line.indexOf('//');
      return c >= 0 ? line.slice(0, c) : line;
    })
    .join('\n');
  assert(noComments.includes('document.fonts.ready'), 'renderHtmlToPdf awaits document.fonts.ready');
  assert(noComments.includes('page.pdf('), 'renderHtmlToPdf calls page.pdf()');
  assert(
    noComments.indexOf('document.fonts.ready') < noComments.indexOf('page.pdf('),
    'fonts.ready appears BEFORE page.pdf() inside renderHtmlToPdf',
  );
}

// 2) Outlook letterhead
{
  const html = buildLetterHtml({ ...sample, origin: 'https://example.moj.gov.sa' });
  fs.writeFileSync(path.join(tmp, 'verify-outlook-letterhead.html'), html, 'utf8');
  assert(outlookHtmlIsTableBased(html), 'Outlook HTML is table-based / MSO-compatible');
  assert(outlookHeaderHasQrNumberDate(html), 'Outlook left col has QR + الرقم + التاريخ');
  assert(/class="official-center"/i.test(html), 'Outlook has official-center');
  assert(/class="official-right"/i.test(html), 'Outlook has official-right');
  assert(
    /align="left"/i.test(html) && /align="center"/i.test(html) && /align="right"/i.test(html),
    'Outlook uses align=left|center|right',
  );
  assert(!/display\s*:\s*flex/i.test(html), 'Outlook HTML has ZERO display:flex');
  assert(!/display\s*:\s*grid/i.test(html), 'Outlook HTML has ZERO display:grid');
  assert(/بطاقة عرض|تعميم/.test(html), 'Outlook center has بطاقة عرض / badge');
  assert(/المملكة العربية السعودية/.test(html), 'Outlook right has kingdom letterhead');
}

// 3) Excel official template wiring
{
  const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/export/xlsx/route.ts'), 'utf8');
  assert(/from ['"]exceljs['"]/.test(route), 'xlsx route uses ExcelJS');
  assert(/rightToLeft:\s*true/.test(route), 'xlsx sets worksheet.views rightToLeft');
  assert(/1B4D3E/.test(route), 'xlsx uses olive header #1B4D3E');
  assert(/C5A059/.test(route), 'xlsx uses gold strip #C5A059');
  assert(/addTable\(|addOfficialTable\(/.test(route), 'xlsx builds interactive Excel table');
  assert(/border/.test(route), 'xlsx applies cell borders');
}

console.log('\nAll export-fix checks PASSED');
