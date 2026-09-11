'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import OfficialPaperPreview from '@/components/OfficialPaperPreview';
import RecipientCascade from '@/components/RecipientCascade';
import StyleToolbar, { type DocStyle } from '@/components/StyleToolbar';
import { parsePaste, type TableRow } from '@/lib/parse-paste';
import type { StudySections } from '@/lib/parse-study';
import { clearDraft, loadDraft, saveDraft } from '@/lib/draft-store';
import { suggestFont } from '@/lib/font-suggest';

type Template = { id: string; name: string; category: string };
type User = { name: string; role: string };

const EMPTY_FORM = {
  subject: '',
  recipients: '',
  parties: '',
  reasons: '',
  studyFields: '',
  body: '',
  dateGregorian: new Date().toISOString().slice(0, 10),
  docType: 'مكاتبة',
};

function NewDocumentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formSlug = searchParams.get('form') || '';
  const formName = searchParams.get('name') || '';
  const templateIdParam = searchParams.get('templateId') || '';

  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [paste, setPaste] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [studySections, setStudySections] = useState<StudySections | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const [detectedKind, setDetectedKind] = useState<string>('');
  const [fontCorrections, setFontCorrections] = useState<
    { location: string; issue: string; suggestion: string }[]
  >([]);
  const [style, setStyle] = useState<DocStyle>({
    fontFamily: 'Traditional Arabic',
    fontSizePt: 16,
    align: 'right',
  });
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const skipSave = useRef(true);

  useEffect(() => {
    skipSave.current = true;

    const draft = formSlug ? loadDraft(formSlug) : null;
    if (draft) {
      setForm({
        ...EMPTY_FORM,
        ...draft.form,
        dateGregorian: draft.form.dateGregorian || EMPTY_FORM.dateGregorian,
        docType: formName || draft.form.docType || EMPTY_FORM.docType,
      });
      if (draft.templateId) setTemplateId(draft.templateId);
      if (typeof draft.paste === 'string') setPaste(draft.paste);
      if (typeof draft.step === 'number') setStep(draft.step);
      try {
        const tr = (draft.form as { tableRowsJson?: string }).tableRowsJson;
        if (tr) setTableRows(JSON.parse(tr));
        const ss = (draft.form as { studySectionsJson?: string }).studySectionsJson;
        if (ss) setStudySections(JSON.parse(ss));
        const st = (draft.form as { styleJson?: string }).styleJson;
        if (st) setStyle(JSON.parse(st));
      } catch {
        /* ignore */
      }
      setDraftRestored(true);
    } else {
      setForm({
        ...EMPTY_FORM,
        dateGregorian: new Date().toISOString().slice(0, 10),
        docType: formName || 'مكاتبة',
      });
      setPaste('');
      setStep(formSlug || templateIdParam ? 2 : 1);
      setTemplateId(templateIdParam || '');
      setTableRows([]);
      setStudySections(null);
      setDraftRestored(false);
      const hint = suggestFont(formName || 'مكاتبة');
      setStyle({
        fontFamily: hint.suggestion.family,
        fontSizePt: hint.suggestion.sizePt,
        align: hint.suggestion.align,
      });
    }

    const t = window.setTimeout(() => {
      skipSave.current = false;
    }, 50);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSlug, formName]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user));
    fetch('/api/templates')
      .then((r) => r.json())
      .then((d) => {
        const list: Template[] = d.templates || [];
        setTemplates(list);
        const q = searchParams.get('templateId');
        if (q) {
          setTemplateId(q);
          return;
        }
        const nameQ = searchParams.get('name');
        if (nameQ) {
          const match = list.find((t) => t.name === nameQ);
          if (match) setTemplateId(match.id);
        }
      });
  }, [searchParams]);

  useEffect(() => {
    if (!formName || templateId || !templates.length) return;
    const match = templates.find((t) => t.name === formName);
    if (match) setTemplateId(match.id);
  }, [templates, formName, templateId]);

  useEffect(() => {
    if (!formSlug || skipSave.current) return;
    const handle = window.setTimeout(() => {
      saveDraft(formSlug, {
        templateId,
        paste,
        step,
        form: {
          ...form,
          tableRowsJson: JSON.stringify(tableRows),
          studySectionsJson: JSON.stringify(studySections),
          styleJson: JSON.stringify(style),
        },
      });
      setDraftRestored(true);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [formSlug, templateId, paste, step, form, tableRows, studySections, style]);

  function applyPaste() {
    const parsed = parsePaste(paste);
    setTableRows(parsed.tableRows || []);
    setStudySections(parsed.studySections || null);
    setDetectedKind(parsed.detectedKind || '');
    if (parsed.fontHint) {
      setStyle((s) => ({
        ...s,
        fontFamily: parsed.fontHint!.family,
        fontSizePt: parsed.fontHint!.sizePt,
      }));
    }
    const { corrections } = suggestFont(form.docType || formName, parsed.body);
    setFontCorrections(corrections);
    setForm((f) => ({
      ...f,
      subject: parsed.subject || f.subject,
      recipients: parsed.recipients || f.recipients,
      parties: parsed.parties || f.parties,
      reasons: parsed.reasons || f.reasons,
      studyFields: parsed.studyFields || f.studyFields,
      body: parsed.body || f.body,
      dateGregorian: parsed.date || f.dateGregorian,
      docType:
        parsed.detectedKind === 'study'
          ? formName || 'نموذج تحليل حكم (شكوى)'
          : f.docType,
    }));
    setStep(3);
  }

  function adoptFontSuggestion() {
    const { suggestion, corrections } = suggestFont(form.docType || formName, form.body);
    setStyle({
      fontFamily: suggestion.family,
      fontSizePt: suggestion.sizePt,
      align: suggestion.align,
    });
    setFontCorrections(corrections);
  }

  function focusField(field: string) {
    setStep(3);
    window.setTimeout(() => {
      const el = fieldRefs.current[field];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if ('focus' in el) (el as HTMLInputElement).focus();
      }
    }, 50);
  }

  async function save(issue: boolean) {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          facts: '', // removed from UX
          templateId: templateId || null,
          issue,
          assignNumber: issue,
          fields: { tableRows, studySections, style },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل الحفظ');
        return;
      }
      if (formSlug) clearDraft(formSlug);
      router.push(`/documents/${data.document.id}`);
    } catch {
      setError('خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  }

  const title = formName || 'مكاتبة جديدة';

  return (
    <AppShell user={user}>
      {(formName || formSlug) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-moj-gold/30 bg-gradient-to-l from-moj-gold/15 to-moj-green/5 px-3 py-2 text-sm text-moj-green">
          <span className="font-medium">مساحة العمل</span>
          <span className="text-moj-gold">·</span>
          <span>{formName || formSlug}</span>
          {draftRestored && (
            <>
              <span className="text-moj-gold">·</span>
              <span className="text-xs text-gray-600">المسودة محفوظة محلياً</span>
            </>
          )}
        </div>
      )}
      <PageHeader title={title} subtitle="معالج من 3 خطوات مع صندوق لصق ذكي ومعاينة رسمية" />
      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => setStep(n)}
            className={`flex-1 sm:flex-none min-w-[5.5rem] px-3 py-2 rounded-full text-center ${step === n ? 'bg-moj-green text-white' : 'bg-white dark:bg-[var(--surface)] border dark:border-white/15'}`}
          >
            {n === 1 ? 'القالب' : n === 2 ? 'اللصق الذكي' : 'الحقول'}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white dark:bg-[var(--surface)] rounded-xl border dark:border-white/10 p-3 sm:p-4 space-y-3">
          <label className="label">اختر قالباً (اختياري) — يمكن تخطي واللصق مباشرة للكشف التلقائي</label>
          <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">— بدون قالب / حر —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="flex flex-col sm:flex-row gap-2">
            <button className="btn-primary w-full sm:w-auto" onClick={() => setStep(2)}>
              التالي — اللصق الذكي
            </button>
            <button className="btn-outline w-full sm:w-auto" onClick={() => setStep(3)}>
              تخطي إلى الحقول
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white dark:bg-[var(--surface)] rounded-xl border dark:border-white/10 p-3 sm:p-4 space-y-3">
          <label className="label">
            الصق نص المكاتبة أو نموذج الدراسة من Excel — يُكتشف النوع تلقائياً دون اختيار مسبق
          </label>
          <textarea
            className="input min-h-[220px] font-arabic"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={`مثال خطاب:\nالرقم: ...\nإلى: ...\nالموضوع: ...\n\nأو الصق صفوف نموذج تحليل حكم (شكوى) من Excel مباشرة.`}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button className="btn-primary w-full sm:w-auto" onClick={applyPaste}>
              توزيع الحقول (كشف تلقائي)
            </button>
            <button className="btn-outline w-full sm:w-auto" onClick={() => setStep(3)}>
              تخطي
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <StyleToolbar value={style} onChange={setStyle} />
          {(fontCorrections.length > 0 || detectedKind) && (
            <div className="rounded-xl border border-moj-gold/40 bg-moj-gold/10 p-3 text-sm space-y-2">
              {detectedKind && (
                <div>
                  نوع مكتشف: <b>{detectedKind === 'study' ? 'نموذج دراسة / شكوى' : detectedKind}</b>
                </div>
              )}
              {fontCorrections.length > 0 && (
                <ul className="list-disc pr-5 text-xs space-y-1">
                  {fontCorrections.map((c, i) => (
                    <li key={i}>
                      <b>{c.location}</b>: {c.issue} — {c.suggestion}
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" className="btn-gold text-xs" onClick={adoptFontSuggestion}>
                اعتمد المقترح
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[var(--surface)] rounded-xl border dark:border-white/10 p-3 sm:p-4 space-y-3 min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">الموضوع</label>
                  <input
                    ref={(el) => {
                      fieldRefs.current.subject = el;
                    }}
                    className="input"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">التاريخ</label>
                  <input
                    ref={(el) => {
                      fieldRefs.current.dateGregorian = el;
                    }}
                    className="input"
                    type="date"
                    value={form.dateGregorian}
                    onChange={(e) => setForm({ ...form, dateGregorian: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">إلى</label>
                <div
                  ref={(el) => {
                    fieldRefs.current.recipients = el;
                  }}
                >
                  <RecipientCascade
                    value={form.recipients}
                    onChange={(line) => setForm({ ...form, recipients: line })}
                  />
                </div>
              </div>

              <div>
                <label className="label">الأطراف</label>
                <textarea
                  ref={(el) => {
                    fieldRefs.current.parties = el;
                  }}
                  className="input min-h-[60px]"
                  value={form.parties}
                  onChange={(e) => setForm({ ...form, parties: e.target.value })}
                />
              </div>

              <div>
                <label className="label">الأسباب / الحيثيات</label>
                <textarea
                  ref={(el) => {
                    fieldRefs.current.reasons = el;
                  }}
                  className="input min-h-[80px]"
                  value={form.reasons}
                  onChange={(e) => setForm({ ...form, reasons: e.target.value })}
                />
              </div>

              <div>
                <label className="label">حقول الدراسة / التوصية</label>
                <textarea
                  ref={(el) => {
                    fieldRefs.current.studyFields = el;
                  }}
                  className="input min-h-[60px]"
                  value={form.studyFields}
                  onChange={(e) => setForm({ ...form, studyFields: e.target.value })}
                  placeholder="التوصية: ..."
                />
              </div>

              <div>
                <label className="label">نص المكاتبة</label>
                <textarea
                  ref={(el) => {
                    fieldRefs.current.body = el;
                  }}
                  className="input min-h-[140px]"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </div>

              {tableRows.length > 0 && !studySections && (
                <div className="text-xs text-moj-green bg-moj-light rounded-lg p-2">
                  تم استخراج {tableRows.length} صف/صفوف من جدول الأسماء والهويات — تظهر في المعاينة.
                </div>
              )}
              {studySections && (
                <div className="text-xs text-moj-green bg-moj-light rounded-lg p-2">
                  تم تحليل نموذج الدراسة إلى أقسام (قضية / ملخص / توصية) — المعاينة تعرض نموذجاً مقسماً وليس جدولاً واحداً.
                </div>
              )}
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <button className="btn-outline w-full sm:w-auto" disabled={saving} onClick={() => save(false)}>
                  حفظ مسودة
                </button>
                <button className="btn-primary w-full sm:w-auto" disabled={saving} onClick={() => save(true)}>
                  إصدار برقم صادر
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-500 dark:text-white/50 mb-2">
                معاينة ورقية رسمية — انقر قسماً للتحرير
              </div>
              <OfficialPaperPreview
                style={style}
                onFieldClick={focusField}
                doc={{
                  number: null,
                  subject: form.subject,
                  dateGregorian: form.dateGregorian,
                  recipients: form.recipients,
                  parties: form.parties,
                  reasons: form.reasons,
                  studyFields: form.studyFields,
                  body: form.body,
                  docType: form.docType,
                  tableRows,
                  studySections,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function NewDocumentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-moj-green" dir="rtl">جاري التحميل...</div>}>
      <NewDocumentInner />
    </Suspense>
  );
}
