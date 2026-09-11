'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildLetterHtml, copyOutlookHtml } from '@/lib/outlook-clipboard';
import { buildOfficialLetterHtml } from '@/lib/official-letter-html';
import { normalizeBodyText } from '@/components/OfficialPaperPreview';
import type { PaperLayoutId } from '@/lib/paper-layouts';
import type { StudySections } from '@/lib/parse-study';

export type ExportDoc = {
  id?: string;
  number?: string | null;
  subject?: string | null;
  dateGregorian?: string | null;
  dateHijri?: string | null;
  recipients?: string | null;
  parties?: string | null;
  reasons?: string | null;
  studyFields?: string | null;
  body?: string | null;
  footer?: string | null;
  courtName?: string | null;
  paperLayout?: PaperLayoutId | string | null;
  studySections?: StudySections | null;
  fontFamily?: string | null;
  fontSizePt?: number | null;
};

type FormatId = 'docx' | 'xlsx' | 'pdf' | 'pptx' | 'outlook';

const FORMATS: { id: FormatId; label: string; hint: string }[] = [
  { id: 'docx', label: 'Word (DOCX)', hint: 'جاهز للفتح في Word' },
  { id: 'xlsx', label: 'Excel (XLSX)', hint: 'جداول وبيانات' },
  { id: 'pdf', label: 'PDF', hint: 'طباعة ومشاركة' },
  { id: 'pptx', label: 'PowerPoint', hint: 'عرض تقديمي' },
  { id: 'outlook', label: 'Outlook', hint: 'HTML جاهز للصق في البريد' },
];

function contentFingerprint(doc: ExportDoc) {
  return [
    doc.subject || '',
    doc.recipients || '',
    doc.parties || '',
    doc.reasons || '',
    doc.studyFields || '',
    normalizeBodyText(doc.body),
    doc.dateGregorian || '',
    doc.paperLayout || '',
  ].join('\u0001');
}

function buildPlainLetter(doc: ExportDoc) {
  const body = normalizeBodyText(doc.body);
  const lines = [
    'بسم الله الرحمن الرحيم',
    '',
    'المملكة العربية السعودية',
    'وزارة العدل',
    doc.courtName || 'المحكمة العمالية بالرياض',
    '',
    `الرقم: ${doc.number || '—'}`,
    `التاريخ: ${doc.dateGregorian || doc.dateHijri || '—'}`,
    `إلى: ${doc.recipients || '—'}`,
    `الموضوع: ${doc.subject || '—'}`,
    '',
  ];
  if (doc.parties?.trim()) {
    lines.push('الأطراف', doc.parties.trim(), '');
  }
  if (doc.reasons?.trim()) {
    lines.push('الأسباب', doc.reasons.trim(), '');
  }
  if (body) {
    lines.push('النص', body, '');
  }
  if (doc.studyFields?.trim()) {
    lines.push('الدراسة', doc.studyFields.trim(), '');
  }
  lines.push(doc.footer || 'للاستخدام الداخلي فقط');
  return lines.join('\n');
}

export default function ExportToolbar({
  doc,
  className = '',
  /** Called when a file export needs a persisted id; should save draft and return document id */
  ensureSavedId,
  onExported,
}: {
  doc: ExportDoc;
  className?: string;
  ensureSavedId?: () => Promise<string | null>;
  onExported?: () => void;
}) {
  const [picked, setPicked] = useState<FormatId | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [exportedOnce, setExportedOnce] = useState(false);
  const [exportedForFp, setExportedForFp] = useState<string | null>(null);
  const fp = useMemo(() => contentFingerprint(doc), [doc]);

  // Reset copy gate when content materially changes after an export
  useEffect(() => {
    if (exportedForFp && exportedForFp !== fp) {
      setExportedOnce(false);
      setExportedForFp(null);
      setMsg('');
    }
  }, [fp, exportedForFp]);

  function markExported() {
    setExportedOnce(true);
    setExportedForFp(fp);
    onExported?.();
  }

  async function resolveId(): Promise<string | null> {
    if (doc.id) return doc.id;
    if (!ensureSavedId) return null;
    return ensureSavedId();
  }

  async function runExport(format: FormatId) {
    setBusy(true);
    setMsg('');
    try {
      if (format === 'outlook') {
        const html = buildLetterHtml({
          number: doc.number ?? undefined,
          subject: doc.subject || '',
          dateGregorian: doc.dateGregorian ?? undefined,
          recipients: doc.recipients || '',
          body: normalizeBodyText(doc.body),
          footer: doc.footer ?? undefined,
        });
        const ok = await copyOutlookHtml(html);
        if (ok) {
          markExported();
          setMsg('تم تجهيز نسخة Outlook — الصق في البريد');
        } else {
          setMsg('فشل نسخ Outlook');
        }
        return;
      }

      const id = await resolveId();
      if (!id) {
        setMsg('احفظ المسودة أولاً ثم صدّر الملف');
        return;
      }
      const path =
        format === 'docx'
          ? `/api/export/docx?id=${encodeURIComponent(id)}`
          : format === 'xlsx'
            ? `/api/export/xlsx?id=${encodeURIComponent(id)}`
            : format === 'pdf'
              ? `/api/export/pdf?id=${encodeURIComponent(id)}`
              : `/api/export/pptx?id=${encodeURIComponent(id)}`;

      // Trigger download via navigation — marks export on click
      const a = document.createElement('a');
      a.href = path;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      markExported();
      setMsg(
        format === 'docx'
          ? 'جاري تنزيل Word…'
          : format === 'xlsx'
            ? 'جاري تنزيل Excel…'
            : format === 'pdf'
              ? 'جاري تنزيل PDF…'
              : 'جاري تنزيل PowerPoint…',
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyFullLetter() {
    if (!exportedOnce) {
      setMsg('صدر الخطاب أولاً لتتمكن من النسخ');
      return;
    }
    const plain = buildPlainLetter(doc);
    const html = buildOfficialLetterHtml({
      number: doc.number,
      subject: doc.subject,
      dateGregorian: doc.dateGregorian,
      dateHijri: doc.dateHijri,
      recipients: doc.recipients,
      parties: doc.parties,
      reasons: doc.reasons,
      studyFields: doc.studyFields,
      body: normalizeBodyText(doc.body),
      footer: doc.footer,
      courtName: doc.courtName,
      paperLayout: doc.paperLayout,
      studySections: doc.studySections,
      fontFamily: doc.fontFamily,
      fontSizePt: doc.fontSizePt ?? undefined,
    });
    try {
      const ok = await copyOutlookHtml(html);
      if (ok) {
        try {
          await navigator.clipboard.writeText(plain);
        } catch {
          /* html already copied */
        }
        setMsg('تم نسخ الخطاب كامل');
        return;
      }
      await navigator.clipboard.writeText(plain);
      setMsg('تم نسخ الخطاب كامل');
    } catch {
      setMsg('فشل النسخ');
    }
  }

  return (
    <div
      className={`rounded-xl border border-moj-green/25 bg-white dark:bg-[var(--surface)] p-3 space-y-3 ${className}`}
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-moj-green dark:text-moj-gold">تصدير الخطاب</div>
        {exportedOnce ? (
          <span className="text-[11px] text-moj-green bg-moj-light/80 rounded-full px-2 py-0.5">
            تم التصدير — النسخ متاح
          </span>
        ) : (
          <span className="text-[11px] text-amber-800 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-200 rounded-full px-2 py-0.5">
            صدّر أولاً ثم انسخ
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {FORMATS.map((f) => {
          const active = picked === f.id;
          return (
            <button
              key={f.id}
              type="button"
              disabled={busy}
              onClick={() => setPicked(f.id)}
              className={`text-right rounded-xl border px-2.5 py-2 transition ${
                active
                  ? 'border-moj-green ring-2 ring-moj-green/25 bg-moj-light/40'
                  : 'border-moj-green/20 hover:border-moj-gold/50'
              }`}
            >
              <div className="text-xs font-semibold text-moj-green dark:text-moj-gold">{f.label}</div>
              <div className="text-[10px] text-gray-500 dark:text-white/45 mt-0.5">{f.hint}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary text-sm disabled:opacity-50"
          disabled={busy || !picked}
          onClick={() => picked && runExport(picked)}
        >
          {busy ? 'جاري التصدير…' : picked ? `تصدير — ${FORMATS.find((x) => x.id === picked)?.label}` : 'اختر صيغة ثم صدّر'}
        </button>
        <button
          type="button"
          className={`text-sm px-4 py-2.5 rounded-xl font-medium border transition ${
            exportedOnce
              ? 'btn-gold'
              : 'border-gray-300 text-gray-400 cursor-not-allowed bg-gray-50 dark:bg-white/5 dark:border-white/10'
          }`}
          onClick={copyFullLetter}
          title={exportedOnce ? 'نسخ الخطاب كامل' : 'صدر الخطاب أولاً لتتمكن من النسخ'}
        >
          نسخ الخطاب كامل
        </button>
      </div>

      {msg && (
        <div
          className={`text-sm rounded-lg px-3 py-2 ${
            msg.includes('صدر الخطاب أولاً')
              ? 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-700/40'
              : 'bg-moj-light/70 text-moj-green border border-moj-green/20'
          }`}
          role="status"
        >
          {msg}
        </div>
      )}
    </div>
  );
}
