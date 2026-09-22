/**
 * تشخيص مباشر لمسار تصدير PDF:
 * 1) هل يحتوي HTML المرسل إلى Chromium على بطاقة القضية؟
 * 2) هل <p> داخل خلية label يتلقّى white-space:pre-wrap (يفسد منع الكسر)؟
 * 3) هل يعمل Chromium (Chrome/Edge) فعلاً على هذا الجهاز؟
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { OfficialLetterDoc } from '../src/lib/official-letter-html';
import { buildOfficialLetterHtml } from '../src/lib/official-letter-html';

const CASE_CARD_HTML = [
  '<table class="case-card">',
  '  <tr><td class="label" data-col-type="label"><p>التشكيل</p></td><td class="value" data-col-type="value"><p>الدائرة الثامنة / التشكيل الخامس عشر - الفردية</p></td></tr>',
  '  <tr><td class="label" data-col-type="label"><p>رقم القضية</p></td><td class="value" data-col-type="value"><p>4571449052</p></td></tr>',
  '  <tr><td class="label" data-col-type="label"><p>المعالجة المقترحة</p></td><td class="value" data-col-type="value"><p>إصدار صك مستبدل</p><p>إعادة نظر</p></td></tr>',
  '</table>',
].join('\n');

const doc: OfficialLetterDoc = {
  number: 'صادر-1448-0001',
  subject: 'تشخيص PDF',
  dateGregorian: '2026-09-21',
  dateHijri: '1448/04/06هـ',
  recipients: 'سعادة رئيس المحكمة',
  body: CASE_CARD_HTML,
  docType: 'خطاب',
  paperLayout: 'classic-green',
  fontFamily: 'Traditional Arabic',
  fontSizePt: 14,
};

const html = buildOfficialLetterHtml(doc, { forPdf: true });

console.log('=== 1) HTML المرسل إلى Chromium ===');
console.log('size:', html.length);
console.log('table.case-card present:', html.includes('table.case-card'));
console.log('green #006C35 present:', html.includes('#006C35'));
console.log('gold #C5A059 present:', html.includes('#C5A059'));

const labelPTag = html.match(/<td[^>]*label[^>]*>[\s\S]*?<p[^>]*>/i);
console.log('\n=== 2) وسم <p> داخل خلية label ===');
console.log(labelPTag ? labelPTag[0] : 'NOT FOUND');

const hasPreWrapOnLabelP = labelPTag ? /white-space:\s*pre-wrap/.test(labelPTag[0]) : false;
console.log('label <p> فيه white-space:pre-wrap:', hasPreWrapOnLabelP, '(إن كان true فهذا يفسد منع الكسر)');

async function main() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  const exe = candidates.find((p) => fs.existsSync(p));
  console.log('\n=== 3) Chromium ===');
  console.log('executable:', exe || 'NONE');

  if (!exe) {
    console.log('=> لا يوجد Chrome/Edge: سيسقط الكود إلى jsPDF (نص فقط، يطبع HTML خام)');
    process.exit(1);
  }

  try {
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

    console.log('PDF buffer size:', buf.length);
    console.log('PDF header:', buf.slice(0, 8).toString());
    const out = path.join(os.tmpdir(), 'rakeza-pdf-test.pdf');
    fs.writeFileSync(out, buf);
    console.log('PDF written to:', out);
    console.log(buf.length > 1000 ? '\n=> Chromium يعمل: PDF سليم (بطاقة القضية ستظهر)' : '\n=> PDF صغير جداً (مشكلة)');
    process.exit(buf.length > 1000 ? 0 : 1);
  } catch (e) {
    console.error('\nChromium render FAILED:', e);
    console.log('=> سيسقط الكود إلى jsPDF (نص فقط، يطبع HTML خام)');
    process.exit(1);
  }
}

main();
