import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { jsPDF } from 'jspdf';
const require = createRequire(import.meta.url);

const fontB64 = fs.readFileSync('public/fonts/NotoNaskhArabic-Regular.ttf').toString('base64');

async function chromiumPdf() {
  const chromium = (await import('@sparticuz/chromium')).default;
  const puppeteer = await import('puppeteer-core');
  try {
    const anyCr = chromium;
    if (typeof anyCr.setGraphicsMode === 'function') anyCr.setGraphicsMode(false);
  } catch {}
  const executablePath = await chromium.executablePath();
  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/>
<style>
@font-face{font-family:'Noto Naskh Arabic';src:url(data:font/ttf;base64,${fontB64}) format('truetype');}
body{font-family:'Noto Naskh Arabic',serif;direction:rtl;margin:0}
.bismillah{background:#006C35;color:#fff;text-align:center;padding:10px;font-size:16px;font-weight:700}
.court{color:#006C35;text-align:center;font-weight:800;margin:8px}
</style></head><body>
<div class="bismillah">بسم الله الرحمن الرحيم</div>
<div class="court">المملكة العربية السعودية</div>
<div class="court">وزارة العدل</div>
<div class="court">المحكمة العمالية بالرياض</div>
<p style="padding:16px;text-align:right">إلى: زميلتنا الأستاذة / ابتسام العتيبي</p>
<p style="padding:0 16px;text-align:right">الموضوع: اختبار تصدير PDF</p>
<p style="padding:16px">الباحث: محمد العتيبي — معد الدراسة هو الباحث</p>
</body></html>`;
  const browser = await puppeteer.default.launch({
    args: [...chromium.args, '--font-render-hinting=none', '--disable-dev-shm-usage', '--no-sandbox'],
    defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
    executablePath,
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 400));
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  fs.writeFileSync('/tmp/rakeeza-verify-chromium.pdf', Buffer.from(pdf));
  return pdf.length;
}

function jspdfLogical() {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  pdf.addFileToVFS('NotoNaskhArabic-Regular.ttf', fontB64);
  pdf.addFont('NotoNaskhArabic-Regular.ttf', 'NotoNaskhArabic', 'normal');
  pdf.setFont('NotoNaskhArabic');
  pdf.setFillColor(0, 108, 53);
  pdf.rect(10, 8, 190, 12, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(13);
  // logical only — no reshape
  pdf.text('بسم الله الرحمن الرحيم', 105, 16, { align: 'center', lang: 'ar' });
  pdf.setTextColor(0, 108, 53);
  pdf.setFontSize(12);
  pdf.text('المملكة العربية السعودية', 105, 32, { align: 'center', lang: 'ar' });
  pdf.text('وزارة العدل', 105, 40, { align: 'center', lang: 'ar' });
  fs.writeFileSync('/tmp/rakeeza-verify-jspdf.pdf', Buffer.from(pdf.output('arraybuffer')));
}

const n = await chromiumPdf();
jspdfLogical();
console.log('chromium bytes', n);
