/**
 * معاينة نهائية: يبني خطاباً ببطاقة قضية → يحوّله PDF عبر Chromium → يحفظه على سطح المكتب.
 * ويتحقق من: الأخضر الجديد + حدود كل td + حدود فاصلة في الترويسة.
 */
import fs from 'node:fs';
import { buildOfficialLetterHtml } from '../src/lib/official-letter-html';

const CASE_CARD_HTML = [
  '<table class="case-card">',
  '  <tr><td class="label" data-col-type="label"><p>التشكيل</p></td><td class="value" data-col-type="value"><p>الدائرة الثامنة / التشكيل الخامس عشر - الفردية</p></td></tr>',
  '  <tr><td class="label" data-col-type="label"><p>رقم القضية</p></td><td class="value" data-col-type="value"><p>4571449052</p></td></tr>',
  '  <tr><td class="label" data-col-type="label"><p>مصدر الحكم</p></td><td class="value" data-col-type="value"><p>حسن بن زيد بن محمد سهلي</p></td></tr>',
  '  <tr><td class="label" data-col-type="label"><p>ملاحظة</p></td><td class="value" data-col-type="value"></td></tr>',
  '</table>',
].join('\n');

const doc = {
  number: 'صادر-1448-0001',
  subject: 'معاينة نهائية — بطاقة قضية',
  dateGregorian: '2026-09-21',
  dateHijri: '1448/04/06هـ',
  recipients: 'سعادة رئيس المحكمة',
  body: CASE_CARD_HTML,
  docType: 'خطاب',
  paperLayout: 'classic-green',
  fontFamily: 'Traditional Arabic',
  fontSizePt: 14,
} as never;

async function main() {
  const html = buildOfficialLetterHtml(doc, { forPdf: true });

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  const exe = candidates.find((p) => fs.existsSync(p));
  if (!exe) {
    console.error('لا يوجد Chrome/Edge');
    process.exit(1);
  }

  const puppeteer = await import('puppeteer-core');
  const browser = await puppeteer.default.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
    executablePath: exe,
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load', timeout: 45000 });
  await page.evaluate(async () => {
    await (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
  });
  await new Promise((r) => setTimeout(r, 1200));
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '10mm', right: '15mm', bottom: '15mm', left: '15mm' },
  });
  const buf = Buffer.from(pdf);
  await browser.close().catch(() => undefined);

  const out = 'C:\\Users\\asus\\Desktop\\preview-final.pdf';
  fs.writeFileSync(out, buf);

  console.log('PDF size:', buf.length, 'bytes');
  console.log('PDF header:', buf.slice(0, 8).toString());
  console.log('saved to:', out);
  console.log('--- تحقق ---');
  console.log('الأخضر #1f7a3f موجود:', html.includes('#1f7a3f'));
  console.log('حد label = أخضر:', html.includes('border: 1px solid #1f7a3f'));
  console.log('حد value = ذهبي:', html.includes('border: 1px solid #C5A059'));
  console.log('empty-cells: show:', html.includes('empty-cells: show'));
  console.log('حد فاصل في الترويسة:', html.includes('border-bottom:1px solid #C5A059'));
  console.log('@page A4:', html.includes('@page { size: A4 portrait'));
}

main();
