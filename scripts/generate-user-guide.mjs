/**
 * Writes public/Rakiza_User_Guide.pdf using the same generator as /api/guide.
 * Run: node --import tsx scripts/generate-user-guide.mjs
 *   or: npx tsx scripts/generate-user-guide.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

async function main() {
  // Dynamic import of TS module via tsx when launched with tsx / --import tsx
  const modUrl = pathToFileURL(path.join(root, 'src/lib/user-guide-pdf.ts')).href;
  const { generateUserGuidePdf, GUIDE_PDF_FILENAME } = await import(modUrl);
  const buf = await generateUserGuidePdf();
  const out = path.join(root, 'public', GUIDE_PDF_FILENAME);
  fs.writeFileSync(out, buf);
  console.log(`Wrote ${out} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
