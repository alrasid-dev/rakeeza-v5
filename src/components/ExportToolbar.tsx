'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildLetterHtml, copyOutlookHtml } from '@/lib/outlook-clipboard';
import { normalizeBodyText } from '@/components/OfficialPaperPreview';
import { hasOfficialOutgoingNumber } from '@/lib/honorific';
import { bodyToPlainText } from '@/lib/body-html-bridge';
import { officialDateDisplay } from '@/lib/hijri';
import type { PaperLayoutId } from '@/lib/paper-layouts';
import type { StudySections } from '@/lib/parse-study';

export type ExportDoc = {
  id?: string;
  number?: string | null;
  subject?: string | null;
  dateGregorian?: string | null;
  dateHijri?: string | null;
  recipients?: string | null;
  copyTo?: string | null;
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
  qrDataUrl?: string | null;
  headerLines?: string[] | null;
  judgmentCard?: { label: string; value: string }[] | null;
  judgmentBriefing?: boolean | null;
  briefingTitle?: string | null;
  observationText?: string | null;
  mechanismText?: string | null;
  judgmentPriority?: string | null;
  align?: 'right' | 'center' | 'left' | null;
};

type FormatId = 'docx' | 'xlsx' | 'pdf' | 'pptx' | 'outlook';

const FORMATS: { id: FormatId; label: string; hint: string }[] = [
  { id: 'docx', label: 'Word (DOCX)', hint: 'جاهز للفتح في Word' },
  { id: 'xlsx', label: 'Excel (XLSX)', hint: 'جداول وبيانات' },
  { id: 'pdf', label: 'PDF', hint: 'طباعة ومشاركة' },
  { id: 'pptx', label: 'PowerPoint', hint: 'عرض تقديمي' },
  { id: 'outlook', label: 'Outlook', hint: 'HTML جاهز للصق في البريد' },
];

const BLOCK_MSG = 'أصدر الخطاب برقم رسمي أولاً لتتمكن من التصدير';

function contentFingerprint(doc: ExportDoc) {
  return [
    doc.subject || '',
    doc.recipients || '',
    doc.copyTo || '',
    doc.parties || '',
    doc.reasons || '',
    doc.studyFields || '',
    normalizeBodyText(doc.body),
    doc.dateGregorian || '',
    doc.dateHijri || '',
    doc.paperLayout || '',
    doc.number || '',
  ].join('\u0001');
}

function buildPlainLetter(doc: ExportDoc) {
  const body = bodyToPlainText(normalizeBodyText(doc.body));
  const lines = [
    'المملكة العربية السعودية',
    'وزارة العدل',
    doc.courtName || 'المحكمة العمالية بالرياض',
    '',
    `الرقم: ${doc.number || '—'}`,
    `التاريخ: ${officialDateDisplay(doc.dateHijri, doc.dateGregorian)}`,
    `إلى: ${doc.recipients || '—'}`,
    ...(doc.copyTo?.trim() ? [`نسخة إلى: ${doc.copyTo.trim()}`] : []),
    `الموضوع: ${doc.subject || '—'}`,
    '',
  ];
  if (doc.parties?.trim()) {
    lines.push('الأطراف', doc.parties.trim(), '');
  }
  if (doc.reasons?.trim()) {
    lines.push('الأسباب', doc.reasons.trim(), '');
  }
  if (doc.judgmentBriefing && doc.judgmentCard?.length) {
    lines.push(doc.briefingTitle || 'بطاقة عرض', '');
    if (doc.observationText?.trim()) lines.push(doc.observationText.trim(), '');
    if (doc.mechanismText?.trim()) lines.push(doc.mechanismText.trim(), '');
    for (const row of doc.judgmentCard) {
      lines.push(`${row.label}: ${row.value}`);
    }
    lines.push('');
  } else if (body) {
    lines.push(body, '');
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
  ensureSavedId,
  onExported,
  onRequestIssue,
  onFocusCopyTo,
}: {
  doc: ExportDoc;
  className?: string;
  /** Called when a file export needs a persisted id; should save draft and return document id */
  ensureSavedId?: () => Promise<string | null>;
  onExported?: () => void;
  /** Optional: jump user to official issue action */
  onRequestIssue?: () => void;
  /** Focus the «نسخة إلى» form field */
  onFocusCopyTo?: () => void;
}) {
  const [picked, setPicked] = useState<FormatId | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [exportedOnce, setExportedOnce] = useState(false);
  const [exportedForFp, setExportedForFp] = useState<string | null>(null);
  const fp = useMemo(() => contentFingerprint(doc), [doc]);
  const canExport = hasOfficialOutgoingNumber(doc.number);

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

  function blockUnlessNumbered(): boolean {
    if (canExport) return false;
    setMsg(BLOCK_MSG);
    onRequestIssue?.();
    return true;
  }

  async function runExport(format: FormatId) {
    if (blockUnlessNumbered()) return;
    setBusy(true);
    setMsg('');
    try {
      if (format === 'outlook') {
        const html = buildLetterHtml({
          number: doc.number ?? undefined,
          subject: doc.subject || '',
          dateGregorian: doc.dateGregorian ?? undefined,
          dateHijri: doc.dateHijri ?? undefined,
          recipients: doc.recipients || '',
          copyTo: doc.copyTo || '',
          parties: doc.parties || '',
          reasons: doc.reasons || '',
          studyFields: doc.studyFields || '',
          body: normalizeBodyText(doc.body),
          footer: doc.footer ?? undefined,
          courtName: doc.courtName || undefined,
          qrDataUrl: doc.qrDataUrl,
          headerLines: doc.headerLines,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          judgmentCard: doc.judgmentCard,
          judgmentBriefing: doc.judgmentBriefing,
          briefingTitle: doc.briefingTitle || undefined,
          observationText: doc.observationText || undefined,
          mechanismText: doc.mechanismText || undefined,
          judgmentPriority: doc.judgmentPriority,
          underLogoLabel: doc.judgmentBriefing ? doc.briefingTitle || 'بطاقة عرض' : undefined,
          fontFamily: doc.fontFamily || undefined,
          fontSizePt: doc.fontSizePt || undefined,
          align: doc.align || undefined,
          paperLayout: doc.paperLayout,
          studySections: doc.studySections,
        });
        const ok = await copyOutlookHtml(html, buildPlainLetter(doc));
        if (ok) {
          markExported();
          setMsg('تم النسخ، افتح Outlook واضغط Ctrl+V');
        } else {
          setMsg('فشل نسخ Outlook — اسمح بالوصول للحافظة');
        }
        return;
      }

      const id = await resolveId();
      if (!id) {
        setMsg('احفظ المسودة أولاً ثم أصدر برقم رسمي قبل التصدير');
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

      const res = await fetch(path, { credentials: 'same-origin' });
      const ctype = res.headers.get('content-type') || '';
      if (!res.ok || ctype.includes('application/json')) {
        let err = 'فشل التصدير';
        try {
          const j = await res.json();
          if (j?.error) err = String(j.error);
        } catch {
          /* ignore */
        }
        setMsg(err);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') || '';
      const m = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
      const fallback =
        format === 'docx'
          ? 'rakeeza.docx'
          : format === 'xlsx'
            ? 'rakeeza.xlsx'
            : format === 'pdf'
              ? 'rakeeza.pdf'
              : 'rakeeza.pptx';
      let filename = fallback;
      if (m?.[1]) {
        try {
          filename = decodeURIComponent(m[1].replace(/"/g, '').trim());
        } catch {
          filename = m[1].replace(/"/g, '').trim() || fallback;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      markExported();
      setMsg(
        format === 'docx'
          ? 'تم تنزيل Word'
          : format === 'xlsx'
            ? 'تم تنزيل Excel'
            : format === 'pdf'
              ? 'تم تنزيل PDF'
              : 'تم تنزيل PowerPoint',
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyPlainSelectable() {
    if (!canExport) {
      setMsg(BLOCK_MSG);
      onRequestIssue?.();
      return;
    }
    const plain = buildPlainLetter(doc);
    try {
      await navigator.clipboard.writeText(plain);
      markExported();
      setMsg('تم نسخ النص — يمكن للمستلم لصقه في Word أو البريد أو أي محرر');
    } catch {
      setMsg('تعذّر النسخ — اسمح بالوصول للحافظة');
    }
  }

  async function copyFullLetter() {
    if (!canExport) {
      setMsg(BLOCK_MSG);
      onRequestIssue?.();
      return;
    }
    if (!exportedOnce) {
      setMsg('صدر الخطاب أولاً لتتمكن من النسخ');
      return;
    }
    const plain = buildPlainLetter(doc);
    const html = buildLetterHtml({
      number: doc.number,
      subject: doc.subject || '',
      dateGregorian: doc.dateGregorian,
      dateHijri: doc.dateHijri,
      recipients: doc.recipients || '',
      copyTo: doc.copyTo || '',
      parties: doc.parties || '',
      reasons: doc.reasons || '',
      studyFields: doc.studyFields || '',
      body: normalizeBodyText(doc.body),
      footer: doc.footer ?? undefined,
      courtName: doc.courtName || undefined,
      qrDataUrl: doc.qrDataUrl,
      headerLines: doc.headerLines,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      judgmentCard: doc.judgmentCard,
      judgmentBriefing: doc.judgmentBriefing,
      briefingTitle: doc.briefingTitle || undefined,
      observationText: doc.observationText || undefined,
      mechanismText: doc.mechanismText || undefined,
      judgmentPriority: doc.judgmentPriority,
      underLogoLabel: doc.judgmentBriefing ? doc.briefingTitle || 'بطاقة عرض' : undefined,
      fontFamily: doc.fontFamily || undefined,
      fontSizePt: doc.fontSizePt || undefined,
      align: doc.align || undefined,
      paperLayout: doc.paperLayout,
      studySections: doc.studySections,
    });
    try {
      const ok = await copyOutlookHtml(html, plain);
      if (ok) {
        setMsg('تم النسخ، افتح Outlook واضغط Ctrl+V');
        return;
      }
      await navigator.clipboard.writeText(plain);
      setMsg('تم نسخ النص فقط — جرّب تصدير Outlook مرة أخرى');
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
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-moj-green dark:text-moj-gold">تصدير الخطاب</div>
          {onFocusCopyTo && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-moj-green/30 text-moj-green hover:bg-moj-light/60"
              onClick={onFocusCopyTo}
              title="نسخة إلى"
            >
              <span aria-hidden>⧉</span>
              نسخة إلى
            </button>
          )}
        </div>
        {canExport ? (
          exportedOnce ? (
            <span className="text-[11px] text-moj-green bg-moj-light/80 rounded-full px-2 py-0.5">
              تم التصدير — النسخ متاح
            </span>
          ) : (
            <span className="text-[11px] text-amber-800 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-200 rounded-full px-2 py-0.5">
              رقم رسمي: {doc.number} — صدّر ثم انسخ
            </span>
          )
        ) : (
          <span className="text-[11px] text-amber-900 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-100 rounded-full px-2 py-0.5">
            يلزم إصدار برقم رسمي قبل التصدير
          </span>
        )}
      </div>

      {!canExport && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/40 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          {BLOCK_MSG}
          {onRequestIssue && (
            <button type="button" className="btn-primary text-xs mt-2 block" onClick={onRequestIssue}>
              إصدار برقم رسمي
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {FORMATS.map((f) => {
          const active = picked === f.id;
          return (
            <button
              key={f.id}
              type="button"
              disabled={busy || !canExport}
              onClick={() => {
                if (!canExport) {
                  setMsg(BLOCK_MSG);
                  return;
                }
                setPicked(f.id);
              }}
              className={`text-right rounded-xl border px-2.5 py-2 transition disabled:opacity-45 ${
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
          disabled={busy || !picked || !canExport}
          onClick={() => picked && runExport(picked)}
        >
          {busy
            ? 'جاري التصدير…'
            : !canExport
              ? 'التصدير بعد الإصدار الرسمي'
              : picked
                ? `تصدير — ${FORMATS.find((x) => x.id === picked)?.label}`
                : 'اختر صيغة ثم صدّر'}
        </button>
        <button
          type="button"
          className={`text-sm px-4 py-2.5 rounded-xl font-medium border transition ${
            canExport && exportedOnce
              ? 'btn-gold'
              : 'border-gray-300 text-gray-400 cursor-not-allowed bg-gray-50 dark:bg-white/5 dark:border-white/10'
          }`}
          onClick={copyFullLetter}
          title={
            !canExport
              ? BLOCK_MSG
              : exportedOnce
                ? 'نسخ الخطاب كامل (HTML للـ Outlook)'
                : 'صدر الخطاب أولاً لتتمكن من النسخ'
          }
        >
          نسخ الخطاب كامل
        </button>
        <button
          type="button"
          className={`text-sm px-4 py-2.5 rounded-xl font-medium border transition ${
            canExport
              ? 'btn-outline'
              : 'border-gray-300 text-gray-400 cursor-not-allowed bg-gray-50 dark:bg-white/5 dark:border-white/10'
          }`}
          disabled={!canExport || busy}
          onClick={() => void copyPlainSelectable()}
          title="نسخ نص الخطاب فقط — قابل للتحديد واللصق لدى المستلم"
        >
          نسخ النص
        </button>
      </div>

      <p className="text-[11px] text-gray-500 dark:text-white/45 leading-relaxed">
        بعد الإرسال: يمكن للمستلم تحديد النص من Outlook أو PDF ونسخه (Ctrl+C) ثم لصقه في أي مكان.
        داخل ركيزة: حدّد من المعاينة للنسخ، أو الصق في خانة المكاتبة بـ Ctrl+V.
      </p>

      {msg && (
        <div
          className={`text-sm rounded-lg px-3 py-2 ${
            msg.includes('أولاً') || msg.includes('رسمي')
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
