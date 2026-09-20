/**
 * Verify the Smart Upgrade (Non-destructive Refactoring):
 *  - Universal Table & Model Adaptor (HTML/plain parse + aggregation/dedup)
 *  - Judicial Protocol Engine (honorifics / canonical addresses)
 *  - Complete Arabic fonts integration (requested ten present)
 *  - Rich-paste aware parser
 * Run: npx tsx scripts/verify-smart-upgrade.mts
 */
import {
  parseAnyTable,
  parseHtmlTables,
  parsePlainTable,
  aggregateGrid,
  gridToTableRows,
  gridToTsv,
  htmlToPasteText,
  gridToHtmlTable,
  personKey,
  adaptPastedTable,
  gridToEditorTableHtml,
  sanitizeClipboardHtml,
  looksLikeExcelTsv,
  looksLikeTableHtml,
  wrapFloatingTableRows,
} from '../src/lib/universal-table-parser.ts';
import {
  detectProtocolAddresses,
  suggestProtocolAddresses,
  canonicalAddressForRole,
  canonicalFor,
  buildRecipientsLine,
  honorificForRole,
  addressForRecipient,
} from '../src/lib/protocol-address.ts';
import { applyActingMarker } from '../src/lib/honorific.ts';
import { runInBackground } from '../src/lib/background-engine.ts';
import { normalizeCssColor, normalizeHtmlColors } from '../src/lib/color-normalize.ts';
import { buildPdfPrintCss } from '../src/lib/pdf-print-css.ts';
import { FONT_OPTIONS } from '../src/lib/font-stacks.ts';
import { parseRichPaste } from '../src/lib/parse-paste.ts';

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('ok ', msg);
}

/* ---- 1) Universal Table & Model Adaptor ----------------------------- */
const HTML = `<table>
  <tr><th>الاسم</th><th>رقم القضية</th><th>ملاحظات</th></tr>
  <tr><td>فهد العتيبي</td><td>4670855622</td><td>أجور متأخرة</td></tr>
  <tr><td>فهد العتيبي</td><td>4670855623</td><td>فصل تعسفي</td></tr>
  <tr><td>نورة الدوسري</td><td>4670855624</td><td>إثبات علاقة</td></tr>
</table>`;

{
  const t = parseAnyTable(HTML);
  assert(t.source === 'html', `html table detected (${t.source})`);
  assert(t.grid.length === 4, `grid has header + 3 rows (${t.grid.length})`);
  assert(t.hasHeader && t.headerRowIndex === 0, 'header row detected at 0');

  const rows = gridToTableRows(t.grid);
  assert(rows.length === 3, `3 party rows extracted (${rows.length})`);
  assert(rows[0].name === 'فهد العتيبي' && rows[0].id === '4670855622', 'name/id mapped');
}

{
  const agg = aggregateGrid(parseAnyTable(HTML).grid);
  assert(agg.mergedCount === 1, `dedup merged 1 duplicate person row (${agg.mergedCount})`);
  const fahd = agg.grid.find((r) => r[0] === 'فهد العتيبي');
  assert(!!fahd, 'aggregated row keeps فهد once');
  assert((fahd || [])[1].includes('4670855622') && (fahd || [])[1].includes('4670855623'), 'case numbers merged under one person');
}

{
  const plain = 'الاسم\tرقم القضية\nسعد الحربي\t1111222233\nسعد الحربي\t1111222234';
  const t = parseAnyTable(plain);
  assert(t.source === 'plain', `plain TSV detected (${t.source})`);
  assert(t.grid.length === 3, `plain grid rows (${t.grid.length})`);
  const agg = aggregateGrid(t.grid);
  assert(agg.mergedCount === 1, 'plain dedup merged duplicate');
}

{
  assert(personKey('سعادة الأستاذ فهد بن محمد') === 'فهد بن محمد', `personKey strips honorific (${personKey('سعادة الأستاذ فهد بن محمد')})`);
  const tsv = htmlToPasteText(HTML);
  assert(tsv.includes('فهد العتيبي\t4670855622'), 'htmlToPasteText preserves structure');
  const reHtml = gridToHtmlTable([['الاسم', 'رقم'], ['فهد', '1111']]);
  assert(/<table dir="rtl"/.test(reHtml) && /<th[^>]*>الاسم/.test(reHtml), 'gridToHtmlTable emits RTL bordered table');
}

{
  const preview = adaptPastedTable(HTML);
  assert(!!preview && preview.hasTable === true, 'adaptPastedTable returns preview for HTML table');
  assert(preview.mergedCount === 1, `adaptPastedTable reports mergedCount (${preview.mergedCount})`);
  assert(preview.adaptedHtml.includes('4670855622') && preview.adaptedHtml.includes('4670855623'), 'adapted HTML keeps merged case numbers');
  assert(/<table\b/.test(preview.editorHtml) && !/<tbody>/.test(preview.editorHtml), 'editor HTML is TipTap-safe (no tbody)');
  assert(/<td><p>/.test(preview.editorHtml) || /<th><p>/.test(preview.editorHtml), 'editor cells wrap in <p>');
}

{
  const edHtml = gridToEditorTableHtml([['الاسم', 'رقم'], ['فهد', '1111']]);
  assert(/<table>/.test(edHtml) && /<th><p>الاسم<\/p><\/th>/.test(edHtml), 'gridToEditorTableHtml emits TipTap table with header');
  assert(adaptPastedTable('مجرد نص بدون جدول') === null, 'adaptPastedTable returns null for non-table text');
}

/* ---- 1b) Excel clipboard (CF_HTML + MSO comments + xl classes) ------- */
const EXCEL_CF_HTML = `Version:1.0\r
StartHTML:0000000105\r
EndHTML:0000001023\r
StartFragment:0000000281\r
EndFragment:0000000987\r
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv=Content-Type content="text/html; charset=utf-8">
<meta name=ProgId content=Excel.Sheet>
<meta name=Generator content="Microsoft Excel 15">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body>
<!--StartFragment-->
<table border=0 cellpadding=0 cellspacing=0 width=300 class="xl65">
 <tr><td class="xl66" style="border:1px solid #ccc">الاسم</td><td class="xl66" style="border:1px solid #ccc">رقم القضية</td><td class="xl66" style="border:1px solid #ccc">ملاحظات</td></tr>
 <tr><td class="xl66" style="border:1px solid #ccc">فهد العتيبي</td><td class="xl66" style="border:1px solid #ccc">4670855622</td><td class="xl66" style="border:1px solid #ccc">أجور متأخرة</td></tr>
 <tr><td class="xl66" style="border:1px solid #ccc">فهد العتيبي</td><td class="xl66" style="border:1px solid #ccc">4670855623</td><td class="xl66" style="border:1px solid #ccc">فصل تعسفي</td></tr>
 <tr><td class="xl66" style="border:1px solid #ccc">نورة الدوسري</td><td class="xl66" style="border:1px solid #ccc">4670855624</td><td class="xl66" style="border:1px solid #ccc">إثبات علاقة</td></tr>
</table>
<!--EndFragment-->
</body>
</html>`;

{
  const cleaned = sanitizeClipboardHtml(EXCEL_CF_HTML);
  assert(!/<!--/.test(cleaned), 'Excel sanitizer removes MSO/fragment comments');
  assert(!/Version\s*:/i.test(cleaned), 'Excel sanitizer removes CF_HTML header');
  const t = parseAnyTable(EXCEL_CF_HTML);
  assert(t.source === 'html', `Excel CF_HTML table detected (${t.source})`);
  assert(t.grid.length === 4, `Excel grid rows (${t.grid.length})`);
  assert(t.grid[0][0] === 'الاسم' && t.grid[1][1] === '4670855622', 'Excel cells parsed despite xl classes/xmlns');
}

{
  const preview = adaptPastedTable(EXCEL_CF_HTML);
  assert(!!preview && preview.mergedCount === 1, `Excel CF_HTML adaptPastedTable dedups (${preview?.mergedCount})`);
  assert(preview.adaptedHtml.includes('4670855622') && preview.adaptedHtml.includes('4670855623'), 'Excel adapted HTML keeps merged ids');
}

{
  const tsv = 'الاسم\tرقم القضية\nسعد الحربي\t1111222233\nسعد الحربي\t1111222234';
  assert(looksLikeExcelTsv(tsv) === true, 'looksLikeExcelTsv detects Excel TSV');
  assert(looksLikeExcelTsv('مجرد نص بدون جدول') === false, 'looksLikeExcelTsv rejects non-TSV text');
  const preview = adaptPastedTable(tsv);
  assert(!!preview, 'Excel TSV fallback adapts to preview');
}

{
  // Floating <tr>/<td> without an outer <table> (Excel/Word wrapped in div/span).
  const floating = '<html><body><div><tr><td>الاسم</td><td>القيمة</td></tr><tr><td>فهد</td><td>111</td></tr></div></body></html>';
  assert(looksLikeTableHtml(floating) === true, 'looksLikeTableHtml detects floating tr/td');
  const wrapped = wrapFloatingTableRows(sanitizeClipboardHtml(floating));
  assert(/<table\b/i.test(wrapped), 'wrapFloatingTableRows wraps floating rows in <table>');
  const parsed = parseAnyTable(floating);
  assert(parsed.source === 'html' && parsed.grid.length >= 2, `floating rows parsed as html table (${parsed.source}/${parsed.grid.length})`);
  assert(adaptPastedTable(floating) !== null, 'floating rows adapt to preview');
}

/* ---- 2) Judicial Protocol Engine ------------------------------------ */
{
  const p = detectProtocolAddresses('إلى سعادة رئيس المحكمة العمالية بالرياض');
  assert(p.length >= 1 && p[0].role === 'courtPresident', `court president detected (${p[0]?.role})`);
  assert(p[0].canonical === 'فضيلة رئيس المحكمة العمالية بالرياض سلمه الله', `canonical president (${p[0].canonical})`);
}
{
  const s = suggestProtocolAddresses('إلى سعادة رئيس المحكمة العمالية بالرياض');
  assert(s.length >= 1 && s[0].kind === 'replace', 'protocol replace suggestion emitted');
  assert(s[0].suggestion === 'فضيلة رئيس المحكمة العمالية بالرياض سلمه الله', 'protocol suggestion canonical');
}
{
  assert(canonicalAddressForRole('courtSecretary') === 'سعادة أمين المحكمة العمالية بالرياض', 'secretary canonical');
  assert(canonicalAddressForRole('judge', { name: 'عبدالله' }) === 'فضيلة قاضي التشكيل عبدالله', 'judge canonical');
  assert(canonicalAddressForRole('judicialLieutenant', { name: 'سعود' }) === 'فضيلة الملازم القضائي بالتشكيل سعود', 'lieutenant canonical');
  assert(canonicalAddressForRole('departmentDirector', { department: 'التقنية' }) === 'سعادة مدير إدارة التقنية', 'director canonical');
}
{
  assert(honorificForRole('judge') === 'فضيلة', 'judicial → فضيلة');
  assert(honorificForRole('departmentDirector') === 'سعادة', 'administrative → سعادة');
  assert(canonicalFor('courtPresident', { acting: true }).canonical === 'فضيلة رئيس المحكمة العمالية بالرياض المكلف سلمه الله', 'president acting');
  assert(canonicalFor('departmentDirector', { department: 'الخدمات القضائية', acting: true }).canonical === 'سعادة مدير إدارة الخدمات القضائية المكلف', 'director acting');
  assert(canonicalFor('judge', { name: 'عبدالله', acting: true }).canonical === 'فضيلة قاضي التشكيل عبدالله المكلف', 'judge acting');
  assert(canonicalFor('judge', { name: 'نورة', acting: true }).canonical.includes('المكلفة'), 'female judge acting uses المكلفة');
  assert(applyActingMarker('فضيلة القاضية', true, true) === 'فضيلة القاضية المكلفة', 'applyActingMarker female');
}

{
  const line = buildRecipientsLine([
    { role: 'judge', name: 'عبدالله' },
    { role: 'departmentDirector', department: 'الخدمات القضائية', acting: true },
    { custom: 'فضيلة رئيس الدائرة الأولى', acting: true },
  ]);
  assert(line.split('\n').length === 3, `multi-recipient line has 3 entries (${line.split('\n').length})`);
  assert(line.includes('فضيلة قاضي التشكيل عبدالله'), 'first recipient judicial honorific');
  assert(line.includes('سعادة مدير إدارة الخدمات القضائية المكلف'), 'second recipient admin + acting');
  assert(line.includes('فضيلة رئيس الدائرة الأولى المكلف'), 'third recipient custom + acting');
  assert(addressForRecipient({ role: 'courtSecretary', acting: true }) === 'سعادة أمين المحكمة العمالية بالرياض المكلف', 'secretary acting');
}

/* ---- 3) Complete Arabic fonts integration --------------------------- */
{
  const requested = ['Traditional Arabic', 'Amiri', 'Sakkal Majalla', 'Cairo', 'Tajawal', 'Scheherazade', 'Kufi', 'Naskh', 'Lotus', 'Sultan'];
  const ids = new Set(FONT_OPTIONS.map((f) => f.id));
  for (const f of requested) {
    assert(ids.has(f), `font "${f}" present in dropdown`);
  }
  assert(FONT_OPTIONS[0].id === 'Traditional Arabic', 'Traditional Arabic remains default first option');
  // no duplicates
  assert(ids.size === FONT_OPTIONS.length, `no duplicate font ids (${FONT_OPTIONS.length})`);
}

/* ---- 4) Rich-paste aware parser ------------------------------------- */
{
  const rp = parseRichPaste(HTML);
  assert(rp.detectedKind === 'table', `rich paste detects table (${rp.detectedKind})`);
  assert(rp.tableRows.length === 3, `rich paste table rows (${rp.tableRows.length})`);
}

/* ---- 5) Background engine ------------------------------------------- */
{
  const v = await runInBackground(() => 42, { yieldMs: 0 });
  assert(v === 42, 'background engine returns task result');
}

/* ---- 6) Color normalisation for Outlook/PDF ------------------------- */
{
  assert(normalizeCssColor('rgb(1, 2, 3)') === '#010203', `rgb → hex (${normalizeCssColor('rgb(1, 2, 3)')})`);
  assert(normalizeCssColor('rgba(255,0,0,0.5)') === '#FF0000', 'rgba → hex (drops alpha)');
  assert(normalizeCssColor('#0a0') === '#00AA00', `#RGB → #RRGGBB (${normalizeCssColor('#0a0')})`);
  assert(normalizeCssColor('#aabbccdd') === '#AABBCC', '8-hex → 6-hex');
  assert(normalizeCssColor('red') === 'red', 'named color kept as-is');
  const html = normalizeHtmlColors('<p><span style="color: rgb(1, 2, 3)">نص</span><span style="background-color:#0a0">خلفية</span></p>');
  assert(html.includes('color:#010203'), 'inline color rgb → hex');
  assert(html.includes('background-color:#00AA00'), 'inline background short → hex');
}

{
  const css = buildPdfPrintCss();
  assert(!/color\s*:\s*#111\s*!important/i.test(css), 'PDF print CSS no longer forces black with !important');
  assert(/\.paper\s*\{[^}]*color\s*:\s*#111\s*;/.test(css), 'PDF print CSS keeps default color without !important');
}

console.log('\nAll smart-upgrade checks passed.');
