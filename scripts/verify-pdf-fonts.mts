/**
 * Assert PDF Base64 font engine wiring:
 * 1) Each required family has @font-face with data:font base64 in generated CSS
 * 2) fonts.ready call present in pdf route before page.pdf()
 *
 * Run: npx tsx scripts/verify-pdf-fonts.mts
 */
import fs from 'fs';
import path from 'path';
import { REQUIRED_PDF_FONT_FAMILIES } from '../src/lib/arabic-font-library.ts';
import { buildPdfEmbeddedFontCss, buildAllPdfFontFacesCss } from '../src/lib/pdf-font-css.ts';
import { FONT_OPTIONS, tiptapFontFamilyCss } from '../src/lib/font-stacks.ts';

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('ok ', msg);
}

const REQUIRED_TOOLBAR = [
  'Traditional Arabic',
  'Amiri',
  'Cairo',
  'Tajawal',
  'Almarai',
  'IBM Plex Sans Arabic',
  'Scheherazade New',
  'Aref Ruqaa',
  'Reem Kufi',
];

// --- 1) Toolbar catalog ---
{
  const ids = new Set(FONT_OPTIONS.map((f) => f.id));
  for (const id of REQUIRED_TOOLBAR) {
    assert(ids.has(id), `FONT_OPTIONS includes ${id}`);
  }
}

// --- 2) TipTap inline CSS shape ---
{
  const css = tiptapFontFamilyCss('Amiri');
  assert(
    css.includes("'Amiri'") && /serif|sans-serif/.test(css),
    `tiptapFontFamilyCss('Amiri') → ${css}`,
  );
  assert(
    tiptapFontFamilyCss('Traditional Arabic').includes('Amiri'),
    'Traditional Arabic TipTap CSS falls back via Amiri',
  );
}

// --- 3) TTF files on disk ---
{
  const dir = path.join(process.cwd(), 'public', 'fonts');
  const need = [
    'Amiri-Regular.ttf',
    'Cairo-Regular.ttf',
    'Tajawal-Regular.ttf',
    'Almarai-Regular.ttf',
    'IBMPlexSansArabic-Regular.ttf',
    'ScheherazadeNew-Regular.ttf',
    'ArefRuqaa-Regular.ttf',
    'ReemKufi-Regular.ttf',
    'NotoNaskhArabic-Regular.ttf',
  ];
  for (const f of need) {
    const p = path.join(dir, f);
    assert(fs.existsSync(p) && fs.statSync(p).size > 1000, `TTF present: ${f}`);
  }
}

// --- 4) Generated PDF CSS has @font-face + data:font base64 for each required family ---
{
  const css = buildPdfEmbeddedFontCss('Amiri');
  assert(!/fonts\.googleapis\.com/.test(css), 'PDF CSS has no Google Fonts URL');
  assert(!/@import/.test(css), 'PDF CSS has no @import');

  const facesOnly = buildAllPdfFontFacesCss();
  for (const family of REQUIRED_PDF_FONT_FAMILIES) {
    const faceRe = new RegExp(
      `@font-face\\s*\\{[\\s\\S]*?font-family:\\s*'${family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[\\s\\S]*?src:\\s*url\\(data:font[^)]*base64,`,
      'i',
    );
    assert(faceRe.test(facesOnly) || faceRe.test(css), `@font-face data:font base64 for '${family}'`);
  }

  // Traditional Arabic must be aliased (Amiri bytes under that family name)
  assert(
    /font-family:\s*'Traditional Arabic'[\s\S]*?data:font/.test(facesOnly),
    "Traditional Arabic @font-face alias present",
  );
}

// --- 5) pdf route waits for document.fonts.ready before page.pdf() ---
{
  const route = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/export/pdf/route.ts'),
    'utf8',
  );
  assert(
    /document\.fonts\.ready/.test(route) || /fonts\.ready/.test(route),
    'pdf route awaits document.fonts.ready',
  );
  const readyIdx = route.search(/document\.fonts\.ready|fonts\.ready/);
  const pdfIdx = route.search(/page\.pdf\s*\(/);
  assert(readyIdx >= 0 && pdfIdx > readyIdx, 'fonts.ready appears BEFORE page.pdf()');
  assert(/buildPdfEmbeddedFontCss/.test(route), 'pdf route uses buildPdfEmbeddedFontCss');
}

console.log('\nAll PDF font checks passed.');
