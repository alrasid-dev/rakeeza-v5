'use client';

import { buildLetterHtml, copyOutlookHtml } from '@/lib/outlook-clipboard';
import { buildOfficialLetterHtml } from '@/lib/official-letter-html';

type DocLike = {
  id?: string;
  number?: string | null;
  subject?: string | null;
  dateGregorian?: string | null;
  recipients?: string | null;
  parties?: string | null;
  reasons?: string | null;
  studyFields?: string | null;
  body?: string | null;
  footer?: string | null;
};

export default function ExportToolbar({
  doc,
  className = '',
}: {
  doc: DocLike;
  className?: string;
}) {
  async function copyOutlook() {
    const html = buildLetterHtml({
      number: doc.number ?? undefined,
      subject: doc.subject || '',
      dateGregorian: doc.dateGregorian ?? undefined,
      recipients: doc.recipients || '',
      body: doc.body || '',
      footer: doc.footer ?? undefined,
    });
    const ok = await copyOutlookHtml(html);
    alert(ok ? 'تم النسخ لـ Outlook' : 'فشل النسخ');
  }

  async function copyLetter(asHtml: boolean) {
    const html = buildOfficialLetterHtml({
      number: doc.number,
      subject: doc.subject,
      dateGregorian: doc.dateGregorian,
      recipients: doc.recipients,
      parties: doc.parties,
      reasons: doc.reasons,
      studyFields: doc.studyFields,
      body: doc.body,
      footer: doc.footer,
    });
    if (asHtml) {
      const ok = await copyOutlookHtml(html);
      alert(ok ? 'تم نسخ الخطاب (HTML)' : 'فشل النسخ');
      return;
    }
    const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    try {
      await navigator.clipboard.writeText(plain);
      alert('تم نسخ الخطاب (نص)');
    } catch {
      alert('فشل النسخ');
    }
  }

  const id = doc.id;
  const btn = 'btn-outline text-xs sm:text-sm px-2.5 py-1.5';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {id && (
        <>
          <a className={btn} href={`/api/export/pdf?id=${id}`}>
            PDF
          </a>
          <a className={btn} href={`/api/export/docx?id=${id}`}>
            Word / DOCX
          </a>
          <a className={btn} href={`/api/export/xlsx?id=${id}`}>
            Excel / XLSX
          </a>
          <a className={btn} href={`/api/export/pptx?id=${id}`}>
            PPTX
          </a>
        </>
      )}
      <button type="button" className="btn-gold text-xs sm:text-sm px-2.5 py-1.5" onClick={copyOutlook}>
        Outlook HTML
      </button>
      <button type="button" className={btn} onClick={() => copyLetter(false)}>
        نسخ الخطاب
      </button>
      <button type="button" className={btn} onClick={() => copyLetter(true)}>
        نسخ HTML
      </button>
    </div>
  );
}
