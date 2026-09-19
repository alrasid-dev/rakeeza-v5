import fs from 'fs';
import {
  buildLetterHtml,
  outlookHtmlIsTableBased,
  outlookHeaderHasQrNumberDate,
  outlookHtmlHasHostileLayout,
  outlookBodyUsesAlignAttribute,
} from '../src/lib/outlook-clipboard.ts';

const sample = {
  number: 'صادر-1448-0001',
  subject: 'بشأن متابعة سلامة مدخلات الأحكام',
  dateGregorian: '2026-09-19',
  dateHijri: '1448/03/28هـ',
  recipients: 'فضيلة رئيس المحكمة سلمه الله',
  copyTo: 'وكيل الوزارة',
  attachments: 'مرفق 1',
  body: 'السلام عليكم ورحمة الله وبركاته،\n\n〔وسط〕نص في الوسط للتحقق.\n\nنفيد فضيلتكم بأنه تم رصد ملاحظة على الحكم.\n\nوتقبلوا فائق الاحترام.',
  footer: 'للاستخدام الداخلي فقط',
  courtName: 'المحكمة العمالية بالرياض',
  fontFamily: 'Traditional Arabic',
  fontSizePt: 14,
  paperLayout: 'classic-green',
  origin: 'https://example.moj.gov.sa',
  judgmentBriefing: true,
  judgmentCard: [
    { label: 'التشكيل', value: 'الثالثة عشر' },
    { label: 'رقم القضية', value: '4772814332' },
    { label: 'مصدر الحكم فضيلة الشيخ', value: 'أحمد بن محمد' },
    { label: 'رقم الحكم', value: '4830350652' },
    { label: 'الرصد', value: 'اختيار الحكم غير نهائي' },
    { label: 'آلية المعالجة المقترحة', value: 'إصدار صك مستبدل' },
  ],
  briefingTitle: 'بطاقة عرض',
  observationText: 'تم رصد اختيار الحكم غير نهائي',
  mechanismText: 'إصدار صك مستبدل',
};

const html = buildLetterHtml(sample as any);
fs.mkdirSync('tmp', { recursive: true });
fs.writeFileSync('tmp/outlook-mso-rewrite.html', html, 'utf8');

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
  console.log('ok ', msg);
}

assert(outlookHtmlIsTableBased(html), 'table-based / MSO');
assert(outlookHeaderHasQrNumberDate(html), 'QR + الرقم + التاريخ');
assert(!outlookHtmlHasHostileLayout(html), 'NO hostile layout (overflow/height/flex/grid/absolute)');
assert(outlookBodyUsesAlignAttribute(html), 'body uses align= attribute');
assert(!/overflow\s*:/i.test(html), 'NO overflow');
assert(!/max-height\s*:/i.test(html), 'NO max-height');
assert(!/min-height\s*:/i.test(html), 'NO min-height');
assert(!/display\s*:\s*flex/i.test(html), 'NO flex');
assert(!/display\s*:\s*grid/i.test(html), 'NO grid');
assert(!/position\s*:\s*absolute/i.test(html), 'NO absolute');
assert(!/user-select\s*:\s*none/i.test(html), 'NO user-select:none');
assert(!/pointer-events\s*:\s*none/i.test(html), 'NO pointer-events:none');
assert(!/contenteditable\s*=\s*["']?false/i.test(html), 'NO contenteditable=false');
assert(!/fonts\.googleapis/i.test(html), 'NO google fonts');
assert(!/#[0-9a-fA-F]{8}\b/.test(html), 'NO 8-digit hex');
assert(/width="700"|width:700px/i.test(html), 'width 700');
assert(/المملكة العربية السعودية/.test(html), 'kingdom text');
assert(/alt="QR"|\/api\/public\/qr/i.test(html), 'QR present');
assert(/الرقم/.test(html), 'الرقم present');
assert(/التاريخ/.test(html), 'التاريخ present');
assert(/data:image\/png;base64,/.test(html), 'emblem data-uri');
assert(/<!--\[if mso\]/i.test(html), 'mso conditional');
assert(/class="official-left"/i.test(html), 'official-left');
assert(/التشكيل/.test(html), 'judgment card content');
assert(/<p[^>]*\balign=/i.test(html), 'paragraphs have align=');

console.log('bytes', html.length);
console.log('tables', (html.match(/<table/gi) || []).length);
console.log('divs', (html.match(/<div/gi) || []).length);
console.log('\nALL outlook MSO rewrite checks PASSED');
