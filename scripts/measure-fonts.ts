/**
 * قياس فعلي للخطوط: buildOfficialLetterHtml → Puppeteer → getComputedStyle.fontFamily
 * لكل خط (Diwani/Thuluth/Amiri/Traditional Arabic) × وضع (preview/pdf/outlook).
 */
import fs from 'node:fs';
import { buildOfficialLetterHtml, type OfficialLetterDoc } from '../src/lib/official-letter-html';

const FONTS = ['Diwani', 'Thuluth', 'Amiri', 'Traditional Arabic'];

const BASE_DOC: OfficialLetterDoc = {
  number: '1',
  subject: 'موضوع الاختبار',
  recipients: 'سعادة',
  dateGregorian: '2026-09-22',
  body: [
    '<table class="case-card">',
    '  <tr><td class="label" data-col-type="label"><p>التشكيل</p></td><td class="value" data-col-type="value"><p>الدائرة الثامنة</p></td></tr>',
    '</table>',
    '<p>نص الموضوع التجريبي</p>',
  ].join('\n'),
  docType: 'خطاب',
  fontFamily: 'Traditional Arabic',
  fontSizePt: 14,
};

const MEASURE_EVAL = `(() => {
  const findText = (text) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if ((walker.currentNode.textContent || '').includes(text)) {
        return walker.currentNode.parentElement;
      }
    }
    return null;
  };
  const gs = (el) => (el ? getComputedStyle(el).fontFamily : null);
  return {
    body: gs(document.body),
    header: gs(findText('المملكة')),
    subject: gs(findText('موضوع الاختبار')),
    label: gs(document.querySelector('td[data-col-type="label"]')),
    value: gs(document.querySelector('td[data-col-type="value"]')),
  };
})()`;

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
    defaultViewport: { width: 900, height: 1200, deviceScaleFactor: 1 },
    executablePath: exe,
    headless: true,
  });
  const page = await browser.newPage();

  const modes: { name: string; opts: Record<string, boolean> }[] = [
    { name: 'preview', opts: {} },
    { name: 'pdf', opts: { forPdf: true } },
    { name: 'outlook', opts: { forOutlook: true } },
  ];

  const out: Record<string, unknown>[] = [];
  for (const font of FONTS) {
    for (const mode of modes) {
      const html = buildOfficialLetterHtml({ ...BASE_DOC, fontFamily: font }, mode.opts);
      await page.setContent(html, { waitUntil: 'load', timeout: 45000 });
      await page.evaluate(async () => {
        await (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready?.catch?.(() => undefined);
      }).catch(() => undefined);
      const m = await page.evaluate(MEASURE_EVAL);
      out.push({ font, mode: mode.name, ...(m as Record<string, unknown>) });
    }
  }

  await browser.close().catch(() => undefined);

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
