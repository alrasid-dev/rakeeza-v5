/**
 * تشخيص قياسات خلايا label في بطاقة القضية (دون تعديل).
 * يقيس scrollWidth/clientWidth/offsetWidth/overflow/textOverflow/tableLayout
 * لكل <td class="label"> وكذلك <p> الداخلي.
 */
import fs from 'node:fs';
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
  subject: 'تشخيص الجدول',
  dateGregorian: '2026-09-22',
  dateHijri: '1448/04/06هـ',
  recipients: 'سعادة رئيس المحكمة',
  body: CASE_CARD_HTML,
  docType: 'خطاب',
  paperLayout: 'classic-green',
  fontFamily: 'Traditional Arabic',
  fontSizePt: 14,
};

const html = buildOfficialLetterHtml(doc, {});

async function main() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  const exe = candidates.find((p) => fs.existsSync(p));
  if (!exe) {
    console.log('لا يوجد Chrome/Edge');
    process.exit(1);
  }

  const puppeteer = await import('puppeteer-core');
  const browser = await puppeteer.default.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 900, height: 1200, deviceScaleFactor: 2 },
    executablePath: exe,
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load', timeout: 45000 });
  await page.evaluate(async () => {
    await (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready?.catch?.(() => undefined);
  }).catch(() => undefined);
  await new Promise((r) => setTimeout(r, 800));

  const result = await page.evaluate(`(() => {
    const labelTds = Array.from(document.querySelectorAll('td[data-col-type="label"]'));
    return labelTds.map((td) => {
      const p = td.querySelector('p');
      const table = td.closest('table');
      const tr = td.parentElement;

      const tds = getComputedStyle(td);
      const tdRect = td.getBoundingClientRect();
      const tdOut = {
        tag: td.tagName,
        text: (td.textContent || '').trim(),
        scrollWidth: td.scrollWidth,
        clientWidth: td.clientWidth,
        offsetWidth: td.offsetWidth,
        rectWidth: Math.round(tdRect.width * 100) / 100,
        rectHeight: Math.round(tdRect.height * 100) / 100,
        overflow: tds.overflow,
        overflowX: tds.overflowX,
        textOverflow: tds.textOverflow,
        whiteSpace: tds.whiteSpace,
        wordBreak: tds.wordBreak,
        overflowWrap: tds.overflowWrap,
        width: tds.width,
        minWidth: tds.minWidth,
        maxWidth: tds.maxWidth,
        display: tds.display,
      };

      let pOut = null;
      if (p) {
        const ps = getComputedStyle(p);
        const pRect = p.getBoundingClientRect();
        pOut = {
          tag: p.tagName,
          text: (p.textContent || '').trim(),
          scrollWidth: p.scrollWidth,
          clientWidth: p.clientWidth,
          offsetWidth: p.offsetWidth,
          rectWidth: Math.round(pRect.width * 100) / 100,
          rectHeight: Math.round(pRect.height * 100) / 100,
          overflow: ps.overflow,
          overflowX: ps.overflowX,
          textOverflow: ps.textOverflow,
          whiteSpace: ps.whiteSpace,
          wordBreak: ps.wordBreak,
          overflowWrap: ps.overflowWrap,
          width: ps.width,
          minWidth: ps.minWidth,
          maxWidth: ps.maxWidth,
          display: ps.display,
        };
      }

      return {
        label: (td.textContent || '').trim(),
        td: tdOut,
        p: pOut,
        parentTrTableLayout: tr ? getComputedStyle(tr).tableLayout : null,
        tableTableLayout: table ? getComputedStyle(table).tableLayout : null,
        tableWidth: table ? Math.round(table.getBoundingClientRect().width * 100) / 100 : null,
      };
    });
  })()`);

  console.log('=== RAW قياسات خلايا label ===');
  console.log(JSON.stringify(result, null, 2));

  await browser.close().catch(() => undefined);
}

main();
