/**
 * Download OFL Google Fonts TTFs into public/fonts/ for PDF Base64 embedding.
 * Run: npx tsx scripts/download-arabic-fonts.mts
 */
import fs from 'fs';
import path from 'path';

const OUT = path.join(process.cwd(), 'public', 'fonts');

const FILES: { file: string; cssFamily: string }[] = [
  { file: 'Amiri-Regular.ttf', cssFamily: 'Amiri' },
  { file: 'Cairo-Regular.ttf', cssFamily: 'Cairo' },
  { file: 'Tajawal-Regular.ttf', cssFamily: 'Tajawal' },
  { file: 'Almarai-Regular.ttf', cssFamily: 'Almarai' },
  { file: 'IBMPlexSansArabic-Regular.ttf', cssFamily: 'IBM Plex Sans Arabic' },
  { file: 'ScheherazadeNew-Regular.ttf', cssFamily: 'Scheherazade New' },
  { file: 'ArefRuqaa-Regular.ttf', cssFamily: 'Aref Ruqaa' },
  { file: 'ReemKufi-Regular.ttf', cssFamily: 'Reem Kufi' },
  { file: 'NotoNaskhArabic-Regular.ttf', cssFamily: 'Noto Naskh Arabic' },
];

async function resolveTtfUrl(family: string): Promise<string> {
  const q = encodeURIComponent(family).replace(/%20/g, '+');
  const cssUrl = `https://fonts.googleapis.com/css2?family=${q}:wght@400&display=swap`;
  const res = await fetch(cssUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RakeezaFontBot/1.0)' },
  });
  if (!res.ok) throw new Error(`CSS fetch failed for ${family}: ${res.status}`);
  const css = await res.text();
  const m = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/);
  if (!m) throw new Error(`No TTF url in CSS for ${family}`);
  return m[1];
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const { file, cssFamily } of FILES) {
    const dest = path.join(OUT, file);
    process.stdout.write(`→ ${file} (${cssFamily}) ... `);
    const url = await resolveTtfUrl(cssFamily);
    const bin = Buffer.from(await (await fetch(url)).arrayBuffer());
    if (bin.length < 1000) throw new Error(`Too small: ${file}`);
    fs.writeFileSync(dest, bin);
    console.log(`${bin.length} bytes`);
  }
  console.log('Done. Traditional Arabic remains an Amiri alias (proprietary).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
