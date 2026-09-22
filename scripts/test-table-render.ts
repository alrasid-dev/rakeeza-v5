/**
 * تشخيص وقياس بطاقة القضية (label/value) في المعاينة الفعلية:
 * 1) يولّد HTML المعاينة عبر buildOfficialLetterHtml({}) — نفس مسار OfficialPaperPreview
 * 2) يطبع RAW خلية label + computed styles
 * 3) يفتحه في Puppeteer (Chrome/Edge محلي) ويقيّس عرض/ارتفاع label
 * 4) يلتقط screenshot
 * 5) يتحقق أن "التشكيل" في سطر واحد
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

// 1) RAW label cell
const labelCellMatch = html.match(/<td[^>]*data-col-type="label"[^>]*>[\s\S]*?<\/td>/i);
console.log('=== RAW خلية label (من HTML المعاينة) ===');
console.log(labelCellMatch ? labelCellMatch[0] : 'NOT FOUND');

// 2) relevant CSS rules
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
if (styleMatch) {
  const css = styleMatch[1];
  console.log('\n=== قواعد CSS المتعلقة ببطاقة القضية ===');
  for (const r of css.match(/[^{}]*case-card[^{}]*\{[^}]*\}/g) || []) {
    console.log(r.trim().replace(/\n+/g, ' '));
  }
  console.log('\nbody rule:', (css.match(/body\s*\{[^}]*\}/) || [''])[0].replace(/\n+/g, ' '));
  console.log('.body p rule:', (css.match(/\.body\s+p\s*\{[^}]*\}/) || [''])[0].replace(/\n+/g, ' '));
  console.log('.body td rule:', (css.match(/\.body\s+td[^{]*\{[^}]*\}/) || [''])[0].replace(/\n+/g, ' '));
}

async function main() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  const exe = candidates.find((p) => fs.existsSync(p));
  if (!exe) {
    console.log('\nلا يوجد Chrome/Edge — تعذّر القياس.');
    process.exit(1);
  }
  console.log('\nchromium:', exe);

  const puppeteer = await import('puppeteer-core');
  const browser = await puppeteer.default.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 900, height: 1200, deviceScaleFactor: 2 },
    executablePath: exe,
    headless: true,
  });
  const page = await browser.newPage();

  const measureAll = async (width: number) => {
    await page.setViewport({ width, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'load', timeout: 45000 });
    await page.evaluate(async () => {
      await (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready?.catch?.(() => undefined);
    }).catch(() => undefined);
    await new Promise((r) => setTimeout(r, 500));
    return page.evaluate(`(() => {
      const labelTds = Array.from(document.querySelectorAll('td[data-col-type="label"]'));
      const rows = labelTds.map((td) => {
        const p = td.querySelector('p');
        const tds = getComputedStyle(td);
        const ps = p ? getComputedStyle(p) : null;
        const rect = td.getBoundingClientRect();
        let lineRects = 0;
        if (p) {
          const range = document.createRange();
          range.selectNodeContents(p);
          lineRects = range.getClientRects().length;
        }
        return {
          label: (td.textContent || '').trim(),
          tdWidthPx: Math.round(rect.width * 100) / 100,
          tdMinWidth: tds.minWidth,
          tdMaxWidth: tds.maxWidth,
          tdOverflow: tds.overflow,
          tdBorderTop: tds.borderTopStyle,
          tdBorderBottom: tds.borderBottomStyle,
          tdBorderLeft: tds.borderLeftStyle,
          tdBorderLeftWidth: tds.borderLeftWidth,
          tdBorderRight: tds.borderRightStyle,
          pWhiteSpace: ps ? ps.whiteSpace : null,
          pLineRects: lineRects,
        };
      });
      const valueTd = document.querySelector('td[data-col-type="value"]');
      const valueBorders = valueTd ? {
        top: getComputedStyle(valueTd).borderTop,
        bottom: getComputedStyle(valueTd).borderBottom,
        left: getComputedStyle(valueTd).borderLeft,
        right: getComputedStyle(valueTd).borderRight,
      } : null;
      const table = document.querySelector('table.case-card');
      return { viewport: window.innerWidth, tableWidthPx: table ? Math.round(table.getBoundingClientRect().width * 100) / 100 : null, valueBorders, rows };
    })()`);
  };

  const all = [];
  for (const width of [420, 900]) {
    const r = await measureAll(width);
    all.push(r);
    console.log(`\n=== قياس عند viewport ${width}px ===`);
    console.log(JSON.stringify(r, null, 2));
  }

  // screenshot at narrow viewport (where the bug manifests)
  await page.setViewport({ width: 420, height: 1200, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'load', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 500));
  const shot = path.join(process.cwd(), 'table-render-shot.png');
  await page.screenshot({ path: shot, fullPage: false });
  console.log('\nscreenshot (420px):', shot);

  await browser.close().catch(() => undefined);

  const allRows = all.flatMap((r) => (r as { rows: { label: string; tdWidthPx: number; pLineRects: number; tdBorderTop: string; tdBorderBottom: string; tdBorderLeft: string; tdBorderLeftWidth: string }[] }).rows);
  const bad = allRows.filter((row) => row.tdWidthPx < 80 || row.pLineRects !== 1 || row.tdBorderTop !== 'none' || row.tdBorderBottom !== 'none' || row.tdBorderLeft !== 'solid' || row.tdBorderLeftWidth !== '1px');
  const ok = allRows.length > 0 && bad.length === 0;
  console.log('\n=== النتيجة ===');
  if (ok) {
    console.log(`✅ كل الـ labels في سطر واحد، عرض كافٍ، borderTop/bottom=none، borderLeft=1px solid (${allRows.length} خلية)`);
  } else {
    console.log('❌ يوجد كسر:');
    for (const b of bad) console.log('  -', JSON.stringify(b));
  }
  process.exit(ok ? 0 : 1);
}

main();
