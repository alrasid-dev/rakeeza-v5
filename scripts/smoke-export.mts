import { attachmentDisposition } from '../src/lib/download-headers';
import { formatHijri, officialDateDisplay, hijriYear, todayHijri } from '../src/lib/hijri';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const disp = attachmentDisposition('rakeeza-صادر-1448-0001', 'docx');
console.log('disp', disp);
try {
  new Response('x', { headers: { 'Content-Disposition': disp } });
  console.log('Response headers OK');
} catch (e) {
  console.error('Response FAIL', e);
}
console.log('today', todayHijri(), 'year', hijriYear());
console.log('from iso', formatHijri('2026-09-11'));
console.log('display', officialDateDisplay(null, '2026-09-11'));
console.log('display hijri', officialDateDisplay('1448/03/28هـ', '2026-09-11'));

const document = new Document({
  sections: [{ children: [new Paragraph({ children: [new TextRun({ text: 'اختبار', rightToLeft: true })] })] }],
});
const buffer = await Packer.toBuffer(document);
const base = 'rakeeza-صادر-1448-0001';
const res = new Response(new Uint8Array(buffer), {
  headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': attachmentDisposition(base, 'docx'),
  },
});
console.log('docx response', res.status, res.headers.get('content-disposition'), 'bytes', buffer.length);

try {
  new Response(new Uint8Array(buffer), {
    headers: { 'Content-Disposition': `attachment; filename="rakeeza-${'صادر-1448-0001'}.pdf"` },
  });
  console.log('OLD unexpectedly ok');
} catch (e) {
  console.log('OLD fails as expected:', String(e).slice(0, 100));
}
