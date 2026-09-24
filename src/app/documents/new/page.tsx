'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import OfficialPaperPreview, { normalizeBodyText } from '@/components/OfficialPaperPreview';
import RecipientCascade from '@/components/RecipientCascade';
import StyleToolbar, { type DocStyle } from '@/components/StyleToolbar';
import TiptapBodyEditor, {
  type TiptapBodyEditorHandle,
  editorApplyAlign,
  editorApplyBackground,
  editorApplyBold,
  editorApplyColor,
  editorApplyEnlarge,
  editorApplyFontFamily,
  editorApplyFontSize,
  editorClearMarks,
  editorInsertTable,
  editorInsertAdaptedTable,
} from '@/components/TiptapBodyEditor';
import { formatCourtPresidentLine } from '@/lib/honorific';
import PaperLayoutPicker from '@/components/PaperLayoutPicker';
import ExportToolbar from '@/components/ExportToolbar';
import { type TableRow } from '@/lib/parse-paste';
import { adaptPastedTable, htmlToPasteText, looksLikeExcelTsv, sanitizeClipboardHtml } from '@/lib/universal-table-parser';
import AdaptedTablePreview, {
  type AdaptedTablePreviewData,
} from '@/components/AdaptedTablePreview';
import AdaptedTableInsertDialog from '@/components/AdaptedTableInsertDialog';
import { buildPasteStatePatch } from '@/lib/paste-state';
import type { StudySections } from '@/lib/parse-study';
import { clearDraft, clearAllDrafts, loadDraft, saveDraft } from '@/lib/draft-store';
import { suggestFont } from '@/lib/font-suggest';
import { applyPolishFix, findPolishIssues, suggestLegalPhrases, type PolishIssue, type LegalPhraseSuggestion } from '@/lib/arabic-polish';
import {
  LINTER_DEBOUNCE_MS,
  acceptLinterSuggestion,
  dismissSuggestion,
  locateSuggestionsInEditor,
  rejectLinterSuggestion,
  scanBodySuggestions,
  scanProtocolSuggestions,
  type LinterSuggestion,
} from '@/lib/body-linter';
import LetterAssistantPanel from '@/components/LetterAssistantPanel';
import { DEFAULT_PAPER_LAYOUT, normalizePaperLayout, type PaperLayoutId } from '@/lib/paper-layouts';
import {
  BRIEFING_TITLES,
  JUDGMENT_CARD_RECIPIENTS,
  JUDGMENT_CARD_SEED,
  JUDGMENT_CARD_SUBJECT,
  MECHANISM_LABEL,
  PROCESSING_MECHANISMS,
  defaultJudgmentLetterBody,
  isBriefingTitle,
  isJudgmentBriefingFormSlug,
  isJudgmentBriefingMeta,
  normalizeJudgmentCard,
  parseTemplateFieldsJson,
  setJudgmentCardValue,
  type BriefingTitle,
  type JudgmentCardRow,
  type JudgmentPriority,
} from '@/lib/judgment-card';
import { fontStackFor } from '@/lib/font-stacks';
import {
  formatHijri,
  normalizeHijriDisplay,
  syncDatesFromGregorian,
  todayGregorianISO,
  todayHijri,
} from '@/lib/hijri';

type Template = {
  id: string;
  name: string;
  category: string;
  bodyHtml?: string;
  fieldsJson?: string;
  isEmpty?: boolean;
};
type User = { name: string; role: string };

const EMPTY_FORM = {
  subject: '',
  recipients: '',
  copyTo: '',
  parties: '',
  reasons: '',
  studyFields: '',
  body: '',
  dateGregorian: todayGregorianISO(),
  dateHijri: todayHijri(),
  docType: 'مكاتبة',
};

/** Visible proof that strict-paste wire-up is loaded in the client bundle. */
const PASTE_BUILD_ID = 'RAKEEZA-PASTE-20260919-B';

function NewDocumentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formSlug = searchParams.get('form') || '';
  const formName = searchParams.get('name') || '';
  const templateIdParam = searchParams.get('templateId') || '';
  const layoutParam = searchParams.get('layout') || '';
  // إصلاح 2: ?new=1 يطلب مستنداً نظيفاً (يمسح المسودة)
  const newParam = searchParams.get('new') || '';

  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [paste, setPaste] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const undoStackRef = useRef<string[]>([]);
  const skipUndoPushRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [editorCanUndo, setEditorCanUndo] = useState(false);
  const [editorCanRedo, setEditorCanRedo] = useState(false);

  const pushUndoSnapshot = useCallback((nextForm: typeof form) => {
    if (skipUndoPushRef.current) return;
    const json = JSON.stringify(nextForm);
    const stack = undoStackRef.current;
    if (stack[stack.length - 1] === json) return;
    stack.push(json);
    if (stack.length > 40) stack.shift();
    setCanUndo(stack.length > 1);
  }, []);

  function undoLastChange() {
    const stack = undoStackRef.current;
    if (stack.length < 2) return;
    stack.pop(); // drop current
    const prev = stack[stack.length - 1];
    if (!prev) return;
    try {
      skipUndoPushRef.current = true;
      setForm(JSON.parse(prev));
      setCanUndo(stack.length > 1);
    } finally {
      requestAnimationFrame(() => {
        skipUndoPushRef.current = false;
      });
    }
  }

  useEffect(() => {
    pushUndoSnapshot(form);
  }, [form, pushUndoSnapshot]);


  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [observationText, setObservationText] = useState('');
  const [mechanismText, setMechanismText] = useState('');
  const [judgmentCard, setJudgmentCard] = useState<JudgmentCardRow[] | null>(null);
  // المرحلة الثانية: خيارات آلية المعالجة — تتغير حسب القالب المختار (افتراضياً القائمة العامة)
  const [mechanismOptions, setMechanismOptions] = useState<string[]>([...PROCESSING_MECHANISMS]);
  const [briefingTitle, setBriefingTitle] = useState<BriefingTitle>('بطاقة عرض');
  const [judgmentPriority, setJudgmentPriority] = useState<JudgmentPriority>('عادي');
  const [studySections, setStudySections] = useState<StudySections | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const [detectedKind, setDetectedKind] = useState<string>('');
  const [pasteToast, setPasteToast] = useState('');
  const [tablePreview, setTablePreview] = useState<AdaptedTablePreviewData | null>(null);
  const [adaptedInsertOpen, setAdaptedInsertOpen] = useState(false);
  const [fontCorrections, setFontCorrections] = useState<
    { location: string; issue: string; suggestion: string }[]
  >([]);
  const [polishIssues, setPolishIssues] = useState<PolishIssue[]>([]);
  const [legalPhrases, setLegalPhrases] = useState<LegalPhraseSuggestion[]>([]);
  const [bodyLinterSuggestions, setBodyLinterSuggestions] = useState<LinterSuggestion[]>([]);
  const [linterDismissed, setLinterDismissed] = useState<Set<string>>(() => new Set());
  const [style, setStyle] = useState<DocStyle>({
    fontFamily: 'Traditional Arabic',
    fontSizePt: 16,
    align: 'right',
  });
  const [paperLayout, setPaperLayout] = useState<PaperLayoutId>(DEFAULT_PAPER_LAYOUT);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [subjectManual, setSubjectManual] = useState(false);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const bodyEditorRef = useRef<TiptapBodyEditorHandle | null>(null);
  const skipSave = useRef(true);

  useEffect(() => {
    skipSave.current = true;

    // إصلاح 2: استئناف العمل تلقائياً — المسح فقط عند ?new=1 أو زر "مستند جديد"
    if (formSlug && newParam === '1') clearDraft(formSlug);

    const draft = formSlug ? loadDraft(formSlug) : null;
    if (draft) {
      const restoredBody = normalizeBodyText(draft.form.body || '');
      setForm({
        ...EMPTY_FORM,
        ...draft.form,
        body: restoredBody,
        dateGregorian: draft.form.dateGregorian || EMPTY_FORM.dateGregorian,
        dateHijri:
          draft.form.dateHijri ||
          (draft.form.dateGregorian
            ? formatHijri(draft.form.dateGregorian)
            : EMPTY_FORM.dateHijri),
        docType: formName || draft.form.docType || EMPTY_FORM.docType,
      });
      if (draft.templateId) setTemplateId(draft.templateId);
      if (typeof draft.paste === 'string') setPaste(draft.paste);
      if (typeof draft.step === 'number') setStep(draft.step);
      try {
        const tr = (draft.form as { tableRowsJson?: string }).tableRowsJson;
        if (tr) setTableRows(JSON.parse(tr));
        const jc = (draft.form as { judgmentCardJson?: string }).judgmentCardJson;
        if (jc) setJudgmentCard(normalizeJudgmentCard(JSON.parse(jc)));
        const bt = (draft.form as { briefingTitle?: string }).briefingTitle;
        if (bt && isBriefingTitle(bt)) setBriefingTitle(bt);
        const jp = (draft.form as { judgmentPriority?: string }).judgmentPriority;
        if (jp === 'عاجل' || jp === 'عادي') setJudgmentPriority(jp);
        const ss = (draft.form as { studySectionsJson?: string }).studySectionsJson;
        if (ss) setStudySections(JSON.parse(ss));
        const st = (draft.form as { styleJson?: string }).styleJson;
        if (st) setStyle(JSON.parse(st));
        const pl = (draft.form as { paperLayout?: string }).paperLayout;
        if (pl) setPaperLayout(normalizePaperLayout(pl));
      } catch {
        /* ignore */
      }
      setDraftRestored(true);
    } else {
      setForm({
        ...EMPTY_FORM,
        dateGregorian: todayGregorianISO(),
        dateHijri: todayHijri(),
        docType: formName || 'مكاتبة',
      });
      setPaste('');
      setStep(formSlug || templateIdParam ? 2 : 1);
      setTemplateId(templateIdParam || '');
      setTableRows([]);
      if (isJudgmentBriefingFormSlug(formSlug)) {
        const seedCard = JUDGMENT_CARD_SEED.map((r) => ({ ...r }));
        setJudgmentCard(seedCard);
        // المرحلة الثانية: إعادة ضبط خيارات آلية المعالجة للقائمة العامة
        setMechanismOptions([...PROCESSING_MECHANISMS]);
        setBriefingTitle('بطاقة عرض');
        setJudgmentPriority('عادي');
        setStudySections(null);
        setObservationText('');
        setMechanismText('');
        setForm((f) => ({
          ...f,
          body: defaultJudgmentLetterBody(seedCard),
          subject: JUDGMENT_CARD_SUBJECT,
          recipients: JUDGMENT_CARD_RECIPIENTS,
        }));
      } else {
        setJudgmentCard(null);
        setBriefingTitle('بطاقة عرض');
        setJudgmentPriority('عادي');
        setStudySections(null);
      }
      if (layoutParam) setPaperLayout(normalizePaperLayout(layoutParam));
      setSavedDocId(null);
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
  }, [formSlug, formName, newParam]);

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
          if (match) {
            setTemplateId(match.id);
          } else {
            // المرحلة الثانية: guard — الاسم في ?name= غير مفعّل (isActive=false)
            // فلا نضبط docType منه ولا نعرضه في المحرر
            setForm((f) => ({ ...f, docType: f.docType === nameQ ? 'مكاتبة' : f.docType }));
          }
        }
      });
  }, [searchParams]);

  useEffect(() => {
    if (!formName || templateId || !templates.length) return;
    const match = templates.find((t) => t.name === formName);
    if (match) setTemplateId(match.id);
  }, [templates, formName, templateId]);

  useEffect(() => {
    if (!templateId || !templates.length) return;
    const match = templates.find((t) => t.id === templateId);
    if (!match || match.isEmpty === true) return;
    const meta = parseTemplateFieldsJson(match.fieldsJson);
    const seed = meta.seed;

    const briefing =
      isJudgmentBriefingMeta(meta) || isJudgmentBriefingFormSlug(formSlug);

    // المرحلة الثانية: اعتمد آليات المعالجة الخاصة بالقالب إن وُجدت
    setMechanismOptions(
      meta.mechanisms && meta.mechanisms.length ? meta.mechanisms : [...PROCESSING_MECHANISMS],
    );

    setForm((f) => {
      const next = { ...f, docType: formName || match.name || f.docType };
      if (briefing) {
        // Judgment briefing: content lives in preamble + table — never inject letter body
        next.body = '';
        next.parties = '';
        next.reasons = '';
        next.studyFields = '';
        if (!next.recipients?.trim()) {
          next.recipients = seed?.recipients || JUDGMENT_CARD_RECIPIENTS;
        }
        if (!next.subject?.trim()) {
          next.subject = seed?.subject || JUDGMENT_CARD_SUBJECT;
        }
      } else if ((!next.body || !next.body.trim()) && match.bodyHtml) {
        next.body = match.bodyHtml;
      }
      if ((!next.subject || !next.subject.trim()) && seed?.subject) {
        next.subject = seed.subject;
      }
      if ((!next.recipients || !next.recipients.trim()) && seed?.recipients) {
        next.recipients = seed.recipients;
      }
      return next;
    });

    if (briefing) {
      setStudySections(null);
      if (seed?.judgmentCard?.length) {
        setJudgmentCard((prev) => (prev && prev.length ? prev : seed.judgmentCard!));
      } else {
        setJudgmentCard((prev) =>
          prev && prev.length ? prev : JUDGMENT_CARD_SEED.map((r) => ({ ...r })),
        );
      }
      setForm((f) =>
        f.body.trim()
          ? f
          : {
              ...f,
              body: defaultJudgmentLetterBody(
                seed?.judgmentCard?.length
                  ? seed.judgmentCard!
                  : JUDGMENT_CARD_SEED.map((r) => ({ ...r })),
              ),
              subject: f.subject || seed?.subject || JUDGMENT_CARD_SUBJECT,
              recipients: f.recipients || seed?.recipients || JUDGMENT_CARD_RECIPIENTS,
            },
      );
    } else {
      // Switching away from judgment: clear card so leftover state cannot force briefing
      setJudgmentCard(null);
    }

    // Prefer URL layoutParam; otherwise template defaultPaperLayout
    if (!layoutParam && meta.defaultPaperLayout) {
      setPaperLayout(normalizePaperLayout(meta.defaultPaperLayout));
    }
  }, [templateId, templates, formName, layoutParam, formSlug]);

  useEffect(() => {
    if (!formSlug || skipSave.current) return;
    const handle = window.setTimeout(() => {
      saveDraft(formSlug, {
        templateId,
        paste,
        step,
        form: {
          ...form,
          body: normalizeBodyText(form.body),
          tableRowsJson: JSON.stringify(tableRows),
          judgmentCardJson: JSON.stringify(judgmentCard || []),
          briefingTitle,
          judgmentPriority,
          studySectionsJson: JSON.stringify(studySections),
          styleJson: JSON.stringify(style),
          paperLayout,
        },
      });
      setDraftRestored(true);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [formSlug, templateId, paste, step, form, tableRows, judgmentCard, briefingTitle, judgmentPriority, studySections, style, paperLayout]);

  // Background linter: exactly LINTER_DEBOUNCE_MS (1500) after last body/field change
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const blob = [form.body, form.reasons, form.studyFields, form.subject, form.parties, form.recipients, form.copyTo].join('\n');
      setPolishIssues(findPolishIssues(blob));
      setLegalPhrases(suggestLegalPhrases(form.body || form.reasons || blob));
      const scanned = scanBodySuggestions(form.body || '', linterDismissed);
      const protocol = scanProtocolSuggestions(form.recipients || form.subject || '', linterDismissed);
      const merged = [...scanned.suggestions, ...protocol];
      const located = locateSuggestionsInEditor(bodyEditorRef.current?.getEditor() || null, merged);
      setBodyLinterSuggestions(located);
    }, LINTER_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [form.body, form.reasons, form.studyFields, form.subject, form.parties, form.recipients, form.copyTo, linterDismissed]);

  /** Smart paste: apply strictPatch as sole source of truth for form/card/study. */
  function applyPaste() {
    const tpl = templates.find((t) => t.id === templateId);
    const meta = parseTemplateFieldsJson(tpl?.fieldsJson);
    const templateIsBriefing =
      isJudgmentBriefingMeta(meta) || isJudgmentBriefingFormSlug(formSlug);

    const strictPatch = buildPasteStatePatch(paste, {
      // Explicit briefing template forces card path; otherwise paste detection wins
      // (displayCard/reminder→briefing, study→study, letter/notice/memo→letter).
      briefingTemplate: templateIsBriefing,
      formName: formName || undefined,
      keepDates: {
        gregorian: form.dateGregorian || todayGregorianISO(),
        hijri: form.dateHijri || todayHijri(),
      },
    });

    const patchForm = strictPatch.form;
    const nextBody = normalizeBodyText(patchForm.body || '');
    const nextDocType =
      patchForm.docType ||
      formName ||
      form.docType ||
      (strictPatch.detectedKind === 'study'
        ? 'نموذج تحليل حكم (شكوى)'
        : strictPatch.detectedKind === 'briefing'
          ? 'مدخلات الأحكام بطاقة عرض'
          : 'مكاتبة');

    setForm({
      ...EMPTY_FORM,
      subject: patchForm.subject ?? '',
      recipients: patchForm.recipients ?? '',
      copyTo: patchForm.copyTo ?? '',
      parties: patchForm.parties ?? '',
      reasons: patchForm.reasons ?? '',
      studyFields: patchForm.studyFields ?? '',
      body: nextBody,
      dateGregorian: patchForm.dateGregorian || todayGregorianISO(),
      dateHijri: patchForm.dateHijri || todayHijri(),
      docType: nextDocType,
    });
    setJudgmentCard(strictPatch.judgmentCard);
    setStudySections(strictPatch.studySections);
    setTableRows(strictPatch.tableRows || []);
    setDetectedKind(strictPatch.detectedKind);
    if (strictPatch.briefingTitle) setBriefingTitle(strictPatch.briefingTitle);
    if (strictPatch.judgmentPriority) setJudgmentPriority(strictPatch.judgmentPriority);
    setObservationText(strictPatch.observationText || '');
    setMechanismText(strictPatch.mechanismText || '');

    if (strictPatch.raw.fontHint) {
      setStyle((s) => ({
        ...s,
        fontFamily: strictPatch.raw.fontHint!.family,
        fontSizePt: strictPatch.raw.fontHint!.sizePt,
      }));
    }

    // Paper layout heuristics (study / تعميم)
    if (
      strictPatch.detectedKind === 'study' ||
      strictPatch.json.templateKind === 'study'
    ) {
      setPaperLayout('study-report');
    } else if (
      (strictPatch.detectedKind === 'letter' ||
        strictPatch.json.templateKind === 'officialLetter' ||
        strictPatch.json.templateKind === 'notice' ||
        strictPatch.json.templateKind === 'memorandum') &&
      /تعميم/.test(patchForm.subject || paste)
    ) {
      setPaperLayout('taameem-circular');
    }

    const { corrections } = suggestFont(nextDocType, nextBody);
    setFontCorrections(corrections);

    const filled: string[] = [];
    if ((patchForm.subject || '').trim()) filled.push('الموضوع');
    if ((patchForm.recipients || '').trim()) filled.push('إلى');
    if (nextBody.trim()) filled.push('الجسم');
    if ((patchForm.copyTo || '').trim()) filled.push('نسخة');
    if ((patchForm.parties || '').trim()) filled.push('الأطراف');
    if ((patchForm.reasons || '').trim()) filled.push('الأسباب');
    if ((patchForm.studyFields || '').trim()) filled.push('حقول الدراسة');
    if (strictPatch.judgmentCard?.some((r) => (r.value || '').trim())) filled.push('بطاقة');
    if (strictPatch.studySections) filled.push('دراسة');
    if ((strictPatch.tableRows || []).length) filled.push('جدول');

    console.log(
      '[RAKEEZA]',
      PASTE_BUILD_ID,
      strictPatch.json.templateKind,
      strictPatch.form,
    );
    setPasteToast(
      `تم تطبيق اللصق — حقول: ${filled.length ? filled.join(' / ') : '—'}`,
    );

    // Live table preview — show how the adaptor reformatted/merged the grid.
    // قالب معقد (isComplexTemplate) → لصق كما هو بدون نافذة معاينة.
    const htmlTable = /<table\b/i.test(sanitizeClipboardHtml(paste));
    if (htmlTable || strictPatch.detectedKind === 'table' || strictPatch.tableRows.length >= 2) {
      const preview = adaptPastedTable(paste);
      if (preview?.isComplexTemplate === true) {
        setTablePreview(null);
      } else {
        setTablePreview(
          preview
            ? {
                originalHtml: preview.originalHtml,
                adaptedHtml: preview.adaptedHtml,
                editorHtml: preview.editorHtml,
                mergedCount: preview.mergedCount,
              }
            : null,
        );
      }
    } else {
      setTablePreview(null);
    }

    setSavedDocId(null);
    setStep(3);
  }


  function clearLocalDraft() {
    if (formSlug) clearDraft(formSlug);
    else clearAllDrafts();
    setForm({
      ...EMPTY_FORM,
      dateGregorian: todayGregorianISO(),
      dateHijri: todayHijri(),
      docType: formName || 'مكاتبة',
    });
    setJudgmentCard(null);
    setBriefingTitle('بطاقة عرض');
    setJudgmentPriority('عادي');
    setPaste('');
    setTableRows([]);
    setStudySections(null);
    setDetectedKind('');
    setFontCorrections([]);
    setPolishIssues([]);
    setLegalPhrases([]);
    setBodyLinterSuggestions([]);
    setLinterDismissed(new Set());
    setSavedDocId(null);
    setDraftRestored(false);
    setStep(formSlug || templateIdParam ? 2 : 1);
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


  const POLISH_FIELDS = ['body', 'reasons', 'studyFields', 'subject', 'parties', 'recipients', 'copyTo'] as const;

  function acceptPolishIssue(issue: PolishIssue) {
    const next = { ...form };
    let applied = false;
    const kind = issue.kind;
    if (kind === 'add') {
      const base = next.body || '';
      const fixed = applyPolishFix(base, issue.found, issue.suggestion, 'add');
      if (fixed !== base) {
        next.body = fixed;
        applied = true;
      }
    } else {
      for (const key of POLISH_FIELDS) {
        const val = next[key] || '';
        if (!val.includes(issue.found)) continue;
        const fixed = applyPolishFix(val, issue.found, issue.suggestion, kind);
        if (fixed === val) continue;
        next[key] = fixed;
        applied = true;
      }
    }
    if (!applied) return;
    setForm(next);
    const blob = POLISH_FIELDS.map((k) => next[k] || '').join('\n');
    setPolishIssues(findPolishIssues(blob));
    setLegalPhrases(suggestLegalPhrases(next.body || next.reasons || blob));
  }

  function acceptLegalPhrase(phrase: LegalPhraseSuggestion) {
    acceptPolishIssue({
      type: 'style',
      found: phrase.found,
      suggestion: phrase.suggestion,
      message: phrase.message,
      kind: phrase.kind,
    });
  }

  function acceptBodyLinter(s: LinterSuggestion) {
    const ed = bodyEditorRef.current?.getEditor() || null;
    const result = acceptLinterSuggestion(ed, s, form.body);
    if (!result.ok) return;
    // TipTap onUpdate will sync form.body when usedChain; else apply plain fallback
    if (!result.usedChain && result.nextText != null) {
      setForm((f) => ({ ...f, body: result.nextText! }));
    }
    setBodyLinterSuggestions((prev) => dismissSuggestion(prev, s.id));
    setLinterDismissed((prev) => rejectLinterSuggestion(prev, s.id));
  }

  function rejectBodyLinter(s: LinterSuggestion) {
    setBodyLinterSuggestions((prev) => dismissSuggestion(prev, s.id));
    setLinterDismissed((prev) => rejectLinterSuggestion(prev, s.id));
  }

  function renderPolishIssueRow(iss: PolishIssue, i: number, compact = false) {
    const isAdd = iss.kind === 'add';
    const sugEmpty = !iss.suggestion.trim() || iss.suggestion === '—' || iss.suggestion === '-';
    const sugLabel = isAdd ? iss.suggestion : sugEmpty ? 'حذف' : iss.suggestion;
    return (
      <li
        key={`${iss.type}-${iss.found}-${iss.suggestion}-${i}`}
        className={`flex flex-wrap items-center gap-1.5 rounded-lg border border-moj-gold/30 bg-white/80 dark:bg-black/20 px-2 py-1.5 ${compact ? 'text-[11px]' : 'text-xs'}`}
      >
        <span
          className={`rounded px-1.5 py-0.5 font-bold ${
            isAdd
              ? 'bg-emerald-200 text-emerald-950 dark:bg-emerald-400/30 dark:text-emerald-50'
              : iss.type === 'spelling'
                ? 'bg-amber-200 text-amber-950 dark:bg-amber-400/30 dark:text-amber-50'
                : 'bg-orange-200 text-orange-950 dark:bg-orange-400/30 dark:text-orange-50'
          }`}
        >
          {isAdd ? 'إضافة' : iss.type === 'spelling' ? 'إملائي' : 'صياغي'}
        </span>
        {isAdd ? (
          <>
            <span className="text-moj-gold font-bold">اقترح إضافة:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">«{sugLabel}»</span>
          </>
        ) : (
          <>
            <span className="font-bold text-red-700 dark:text-red-300">«{iss.found}»</span>
            <span className="text-moj-gold font-bold">← اقترح:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">«{sugLabel}»</span>
          </>
        )}
        <div className="flex gap-1 mr-auto">
          <button
            type="button"
            className="btn-outline text-[11px] py-0.5 px-2"
            onClick={() => {
              const id = `${iss.type}|${iss.kind || 'replace'}|${iss.found}→${iss.suggestion}`;
              setPolishIssues((prev) => prev.filter((p) => !(p.found === iss.found && p.suggestion === iss.suggestion && p.type === iss.type)));
              setLinterDismissed((prev) => rejectLinterSuggestion(prev, id));
            }}
          >
            رفض
          </button>
          <button
            type="button"
            className="btn-primary text-[11px] py-0.5 px-2"
            onClick={() => acceptPolishIssue(iss)}
          >
            اعتمد التعديل
          </button>
        </div>
      </li>
    );
  }


  function focusField(field: string) {
    setStep(3);
    window.setTimeout(() => {
      if (field === 'body') {
        bodyEditorRef.current?.focus();
        const shell = document.querySelector('.tiptap-body-shell');
        shell?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const el = fieldRefs.current[field];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if ('focus' in el) (el as HTMLInputElement).focus();
      }
    }, 50);
  }

  function setBodyField(value: string) {
    setForm((f) => ({ ...f, body: value }));
    refreshEditorHistory();
  }

  async function persistDocument(issue: boolean): Promise<{ id: string } | null> {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        body: normalizeBodyText(form.body),
        facts: '',
        templateId: templateId || null,
        issue,
        assignNumber: issue,
        fields: {
          tableRows,
          judgmentCard: isBriefing ? judgmentCard : null,
          observationText: isBriefing ? observationText : undefined,
          mechanismText: isBriefing ? mechanismText : undefined,

          briefingTitle: isBriefing ? briefingTitle : undefined,
          judgmentPriority: isBriefing ? judgmentPriority : undefined,
          studySections: isBriefing ? null : studySections,
          style,
          paperLayout,
          copyTo: form.copyTo,
          judgmentBriefing: isBriefing,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'فشل الحفظ');
      return null;
    }
    setSavedDocId(data.document.id);
    if (formSlug) clearDraft(formSlug);
    return { id: data.document.id as string };
  }

  async function save(issue: boolean) {
    setSaving(true);
    setError('');
    try {
      const saved = await persistDocument(issue);
      if (!saved) return;
      router.push(`/documents/${saved.id}`);
    } catch {
      setError('خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  }

  async function ensureSavedId(): Promise<string | null> {
    if (savedDocId) return savedDocId;
    setSaving(true);
    setError('');
    try {
      const saved = await persistDocument(false);
      return saved?.id || null;
    } catch {
      setError('تعذّر حفظ المسودة قبل التصدير');
      return null;
    } finally {
      setSaving(false);
    }
  }

  const activeTpl = templates.find((t) => t.id === templateId);
  const activeMeta = parseTemplateFieldsJson(activeTpl?.fieldsJson);
  const isBriefing =
    isJudgmentBriefingMeta(activeMeta) || isJudgmentBriefingFormSlug(formSlug);

  const title = formName || 'مكاتبة جديدة';
  const previewBody = normalizeBodyText(form.body);
  const editorFontStyle: React.CSSProperties = {
    fontFamily: fontStackFor(style.fontFamily),
    fontSize: style.fontSizePt ? `${style.fontSizePt}pt` : undefined,
  };

  const requireBodyEditor = () => {
    const ed = bodyEditorRef.current?.getEditor() || null;
    if (!ed) {
      setError('محرر المكاتبة غير جاهز — انتظر لحظة ثم أعد المحاولة');
      return null;
    }
    setError('');
    return ed;
  };

  function refreshEditorHistory() {
    const ed = bodyEditorRef.current?.getEditor() || null;
    setEditorCanUndo(ed ? ed.can().undo() : false);
    setEditorCanRedo(ed ? ed.can().redo() : false);
  }

  const undoEditorBody = () => {
    const ed = requireBodyEditor();
    if (!ed) return;
    ed.commands.undo();
    refreshEditorHistory();
  };

  const redoEditorBody = () => {
    const ed = requireBodyEditor();
    if (!ed) return;
    ed.commands.redo();
    refreshEditorHistory();
  };

  const applyBodyAlign = (align: DocStyle['align']) => {
    const ed = requireBodyEditor();
    if (!ed) return;
    editorApplyAlign(ed, align);
  };

  const applyBodyColor = (hex: string) => {
    const ed = requireBodyEditor();
    if (!ed) return;
    if (ed.state.selection.empty) {
      setError('حدّد نصاً أولاً ثم اضغط اللون (مثل وورد)');
      return;
    }
    editorApplyColor(ed, hex);
  };
  const applyBodyBackground = (hex: string) => {
    const ed = requireBodyEditor();
    if (!ed) return;
    if (ed.state.selection.empty) {
      setError('حدّد نصاً أولاً ثم اضغط لون الخلفية');
      return;
    }
    editorApplyBackground(ed, hex);
  };
  const applyBodyEnlarge = (level: 1 | 2) => {
    const ed = requireBodyEditor();
    if (!ed) return;
    if (ed.state.selection.empty) {
      setError('حدّد نصاً أولاً ثم اضغط أ⁺');
      return;
    }
    editorApplyEnlarge(ed, level);
  };
  const applyBodyBold = () => {
    const ed = requireBodyEditor();
    if (!ed) return;
    editorApplyBold(ed);
  };
  const clearBodyInline = () => {
    const ed = requireBodyEditor();
    if (!ed) return;
    editorClearMarks(ed);
  };
  const applyBodyFontFamily = (fontFamily: string) => {
    const ed = bodyEditorRef.current?.getEditor() || null;
    if (!ed || ed.state.selection.empty) return;
    editorApplyFontFamily(ed, fontFamily);
  };
  const applyBodyFontSize = (pt: number) => {
    const ed = bodyEditorRef.current?.getEditor() || null;
    if (!ed || ed.state.selection.empty) return;
    editorApplyFontSize(ed, pt);
  };
  const insertBodyTable = (rows: number, cols: number) => {
    const ed = requireBodyEditor();
    if (!ed) return;
    editorInsertTable(ed, rows, cols);
  };

  /** Adopt the adapted/aggregated table into the TipTap body editor. */
  const adoptAdaptedTable = () => {
    if (!tablePreview) return;
    const ed = bodyEditorRef.current?.getEditor() || null;
    if (ed && !ed.isDestroyed) {
      editorInsertAdaptedTable(ed, tablePreview.editorHtml);
    } else {
      // Editor not mounted yet — append the HTML to the body string instead.
      const next = form.body.trim()
        ? `${form.body.trim()}\n${tablePreview.editorHtml}`
        : tablePreview.editorHtml;
      setForm((f) => ({ ...f, body: next }));
    }
    setTablePreview(null);
    setStep(3);
  };

  /** Insert an adapted table (from the toolbar dialog) into the body editor. */
  const handleAdoptAdaptedTable = (editorHtml: string) => {
    const ed = bodyEditorRef.current?.getEditor() || null;
    if (ed && !ed.isDestroyed) {
      editorInsertAdaptedTable(ed, editorHtml);
    } else {
      const next = form.body.trim() ? `${form.body.trim()}\n${editorHtml}` : editorHtml;
      setForm((f) => ({ ...f, body: next }));
    }
    setAdaptedInsertOpen(false);
  };


  const exportDoc = {
    id: savedDocId || undefined,
    number: null as string | null,
    subject: form.subject,
    dateGregorian: form.dateGregorian,
    dateHijri: form.dateHijri,
    recipients: form.recipients,
    copyTo: form.copyTo,
    parties: isBriefing ? '' : form.parties,
    reasons: isBriefing ? '' : form.reasons,
    studyFields: isBriefing ? '' : form.studyFields,
    body: previewBody,
    docType: form.docType,
    paperLayout,
    studySections: isBriefing ? null : studySections,
    judgmentCard: isBriefing ? judgmentCard : null,
    tableRows: isBriefing ? [] : tableRows,
    judgmentBriefing: isBriefing,
    observationText: isBriefing ? observationText : undefined,

    mechanismText: isBriefing ? mechanismText : undefined,

    briefingTitle: isBriefing ? briefingTitle : undefined,
    judgmentPriority: isBriefing ? judgmentPriority : undefined,
    fontFamily: style.fontFamily,
    fontSizePt: style.fontSizePt,
    align: style.align,
  };

  return (
    <AppShell user={user}>
      {/* Tiny build stamp — proof only, not a product feature */}
      <div
        className="mb-2 inline-flex items-center rounded border border-moj-gold/40 bg-moj-gold/10 px-2 py-0.5 text-[10px] font-mono text-moj-green/80 dark:text-white/50"
        data-paste-build={PASTE_BUILD_ID}
        title="ختم تحقق مؤقت — يؤكد أن نسخة اللصق الصارم محمّلة"
      >
        {PASTE_BUILD_ID}
      </div>
      {(formName || formSlug) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-moj-gold/30 bg-gradient-to-l from-moj-gold/15 to-moj-green/5 px-3 py-2 text-sm text-moj-green">
          <span className="font-medium">مساحة العمل</span>
          <span className="text-moj-gold">·</span>
          <span>{formName || formSlug}</span>
          {draftRestored && (
            <>
              <span className="text-moj-gold">·</span>
              <span className="text-xs text-gray-600">المسودة محفوظة محلياً</span>
              <button type="button" className="text-xs underline text-red-700" onClick={clearLocalDraft}>
                مسح المسودة
              </button>
            </>
          )}
        </div>
      )}
      <PageHeader
        title={title}
        subtitle="معالج من 3 خطوات مع صندوق لصق ذكي ومعاينة رسمية"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                if (window.history.length > 1) router.back();
                else router.push('/');
              }}
            >
              → رجوع
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                // إصلاح 2: امسح المسودة ثم أعد تحميل الصفحة لبدء مستند نظيف
                if (formSlug) clearDraft(formSlug);
                else clearAllDrafts();
                window.location.reload();
              }}
            >
              مستند جديد
            </button>
          </div>
        }
      />
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
          <PaperLayoutPicker value={paperLayout} onChange={setPaperLayout} compact />
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

      {pasteToast && (
        <div
          className="mb-3 rounded-lg border border-moj-gold/50 bg-moj-gold/10 px-3 py-1.5 text-xs text-moj-green dark:text-white/80"
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-arabic leading-relaxed">{pasteToast}</span>
            <button
              type="button"
              className="shrink-0 text-xs opacity-70 hover:opacity-100"
              onClick={() => setPasteToast('')}
              aria-label="إغلاق"
            >
              ✕
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
            onPaste={(e) => {
              const cd = e.clipboardData;
              if (!cd) return;
              const rawHtml = cd.getData('text/html');
              const html = rawHtml ? sanitizeClipboardHtml(rawHtml) : '';
              let source: string | null = null;
              if (html && /<table\b/i.test(html)) {
                source = rawHtml;
              } else {
                const plain = cd.getData('text/plain');
                if (plain && looksLikeExcelTsv(plain)) source = plain;
              }
              if (!source) return;
              const preview = adaptPastedTable(source);
              const tsv = /<table\b/i.test(html) ? htmlToPasteText(source) : source;
              e.preventDefault();
              if (tsv) setPaste(tsv);
              // قالب معقد (isComplexTemplate) → لصق كما هو بدون نافذة معاينة
              if (preview && preview.isComplexTemplate !== true) {
                setTablePreview({
                  originalHtml: preview.originalHtml,
                  adaptedHtml: preview.adaptedHtml,
                  editorHtml: preview.editorHtml,
                  mergedCount: preview.mergedCount,
                });
              } else {
                setTablePreview(null);
              }
            }}
            placeholder={`مثال خطاب:\nالرقم: ...\nإلى: ...\nالموضوع: ...\n\nأو الصق صفوف نموذج تحليل حكم (شكوى) من Excel مباشرة — أو الصق جدولاً منسقاً من Word/Excel/Outlook.`}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button className="btn-primary w-full sm:w-auto" onClick={applyPaste}>
              توزيع الحقول (كشف تلقائي)
            </button>
            <button className="btn-outline w-full sm:w-auto" onClick={() => setStep(3)}>
              تخطي
            </button>
            <button
              type="button"
              className="btn-outline w-full sm:w-auto text-red-700 border-red-300"
              onClick={() => {
                setPaste('');
                setForm((f) => ({ ...f, body: '', parties: '', reasons: '', studyFields: '', subject: f.subject }));
                setTableRows([]);
                setStudySections(null);
              }}
            >
              مسح اللصق والحقول
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <StyleToolbar
              value={style}
              onChange={setStyle}
              onUndo={undoEditorBody}
              onRedo={redoEditorBody}
              canUndo={editorCanUndo}
              canRedo={editorCanRedo}
              onAlignSelection={applyBodyAlign}
              onColorSelection={applyBodyColor}
              onBackgroundSelection={applyBodyBackground}
              onEnlargeSelection={applyBodyEnlarge}
              onBoldSelection={applyBodyBold}
              onClearInline={clearBodyInline}
              onFontFamilySelection={applyBodyFontFamily}
              onFontSizeSelection={applyBodyFontSize}
              onInsertTable={insertBodyTable}
              onInsertAdaptedTable={() => setAdaptedInsertOpen(true)}
            />
            <button
              type="button"
              className="btn-outline text-sm px-3 py-2 disabled:opacity-40"
              disabled={!canUndo}
              title="تراجع عن آخر تعديل في الحقول"
              onClick={undoLastChange}
            >
              تراجع
            </button>
          </div>
          <LetterAssistantPanel
            getEditor={() => bodyEditorRef.current?.getEditor() || null}
            className="mb-0"
          />
          <div className="rounded-xl border-2 border-moj-gold bg-[#fff8e8] dark:bg-[#2a2418] p-3 space-y-2 shadow-md ring-2 ring-moj-gold/40">
            <div className="text-sm font-bold text-moj-green flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-moj-gold animate-pulse" />
              التدقيق والصياغة القضائية
            </div>
            <div
              dir="rtl"
              className={`rounded-lg border px-3 py-2 space-y-1.5 ${
                polishIssues.length > 0 || legalPhrases.length > 0
                  ? 'border-amber-500/70 bg-amber-50 dark:bg-amber-950/40'
                  : 'border-moj-gold/40 bg-white/80 dark:bg-white/5'
              }`}
            >
              {polishIssues.length > 0 ? (
                <>
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-100">
                    مقترحات التدقيق ({polishIssues.length}) — اضغط «اعتمد التعديل»
                  </div>
                  <ul className="space-y-1.5 text-amber-950 dark:text-amber-50">
                    {polishIssues.map((iss, i) => renderPolishIssueRow(iss, i))}
                  </ul>
                </>
              ) : (form.body || form.reasons || form.subject || form.parties || form.studyFields) ? (
                <div className="text-xs text-moj-green dark:text-emerald-300 space-y-1">
                  <div className="font-bold">لا ملاحظات إملائية حالياً على النص الظاهر.</div>
                  <div className="text-[11px] opacity-80">
                    تُفحص تلقائياً ألفاظ شائعة مثل: فضيلة، سعادة، المدعى عليه، الدعوى، بناءً على.
                  </div>
                </div>
              ) : (
                <div className="text-xs text-moj-gold/90 font-medium">
                  اكتب أو الصق نص المكاتبة ليظهر مقترح اختصار بصيغة قانونية هنا فوراً.
                </div>
              )}
            </div>
            {(form.body.trim() || form.reasons.trim() || legalPhrases.length > 0) && (
              <div className="rounded-lg border-2 border-moj-green/40 bg-moj-green/5 px-3 py-2 space-y-1.5" dir="rtl">
                <div className="text-xs font-bold text-moj-green">صياغة قانونية مختصرة</div>
                {legalPhrases.length > 0 ? (
                  <ul className="space-y-1.5">
                    {legalPhrases.map((ph, i) => {
                      const isAdd = ph.kind === 'add';
                      const sugEmpty = !ph.suggestion.trim() || ph.suggestion === '—' || ph.suggestion === '-';
                      return (
                        <li
                          key={`lp-${ph.found}-${ph.suggestion}-${i}`}
                          className="flex flex-wrap items-center gap-1.5 rounded-lg border border-moj-green/25 bg-white/90 dark:bg-black/20 px-2 py-1.5 text-xs"
                        >
                          <span
                            className={`rounded px-1.5 py-0.5 font-bold ${
                              isAdd ? 'bg-emerald-200 text-emerald-950' : 'bg-moj-green/15 text-moj-green'
                            }`}
                          >
                            {isAdd ? 'إضافة' : ph.kind === 'delete' ? 'حذف' : 'صياغة'}
                          </span>
                          {isAdd ? (
                            <>
                              <span className="text-moj-gold font-bold">اقترح إضافة:</span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                «{ph.suggestion}»
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-red-700 dark:text-red-300">«{ph.found}»</span>
                              <span className="text-moj-gold font-bold">← اقترح:</span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                «{sugEmpty ? 'حذف' : ph.suggestion}»
                              </span>
                            </>
                          )}
                          <div className="flex gap-1 mr-auto">
                            <button
                              type="button"
                              className="btn-outline text-[11px] py-0.5 px-2"
                              onClick={() => {
                                setLegalPhrases((prev) =>
                                  prev.filter(
                                    (p) => !(p.found === ph.found && p.suggestion === ph.suggestion),
                                  ),
                                );
                                const id = `judicial|${ph.kind || 'replace'}|${ph.found}→${ph.suggestion}`;
                                setLinterDismissed((d) => rejectLinterSuggestion(d, id));
                              }}
                            >
                              رفض
                            </button>
                            <button
                              type="button"
                              className="btn-primary text-[11px] py-0.5 px-2"
                              onClick={() => acceptLegalPhrase(ph)}
                            >
                              اعتمد التعديل
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-[11px] text-gray-600 dark:text-white/60">
                    لم يُرصد افتتاح عامّي — جرّب عبارات مثل «نحب نبلغكم» أو «يرجى العلم» لترى مقترح الصياغة.
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-[var(--surface)] rounded-xl border dark:border-white/10 p-3">
            <PaperLayoutPicker value={paperLayout} onChange={setPaperLayout} compact />
          </div>
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
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="label mb-0">الموضوع</label>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-moj-gold/60 bg-moj-gold/10 px-2 py-1 text-[11px] font-semibold text-moj-green hover:bg-moj-gold/20 transition"
                      title="تحرير موضوع يدوي حر"
                      onClick={() => {
                        setSubjectManual(true);
                        const el = fieldRefs.current.subject as HTMLInputElement | null;
                        if (el) {
                          el.removeAttribute('readonly');
                          el.focus();
                          el.select();
                        }
                      }}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M12 20h9" strokeLinecap="round" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
                      </svg>
                      موضوع يدوي
                    </button>
                  </div>
                  <input
                    ref={(el) => {
                      fieldRefs.current.subject = el;
                    }}
                    className="input"
                    style={editorFontStyle}
                    value={form.subject}
                    placeholder="اكتب أي موضوع يدوياً…"
                    onChange={(e) => {
                      setSubjectManual(true);
                      setForm({ ...form, subject: e.target.value });
                    }}
                    onFocus={() => setSubjectManual(true)}
                  />
                  {subjectManual && (
                    <p className="text-[11px] text-moj-green/80 mt-1">يمكنك كتابة أي موضوع يدوياً — غير مقيّد بالقالب.</p>
                  )}
                </div>
                <div>
                  <label className="label">التاريخ (هجري)</label>
                  <div className="flex flex-col gap-1">
                    <input
                      ref={(el) => {
                        fieldRefs.current.dateGregorian = el;
                      }}
                      className="input font-medium tracking-wide"
                      dir="ltr"
                      inputMode="text"
                      placeholder="1448/03/28هـ"
                      value={form.dateHijri}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm({ ...form, dateHijri: v });
                      }}
                      onBlur={() => {
                        if (form.dateHijri?.trim()) {
                          setForm({
                            ...form,
                            dateHijri: normalizeHijriDisplay(form.dateHijri),
                          });
                        }
                      }}
                    />
                    <label className="text-[11px] text-gray-500 dark:text-white/40">
                      اختيار من التقويم الميلادي (يُحوَّل تلقائياً للهجري)
                    </label>
                    <input
                      className="input text-sm"
                      type="date"
                      value={form.dateGregorian}
                      onChange={(e) => {
                        const synced = syncDatesFromGregorian(e.target.value);
                        setForm({ ...form, ...synced });
                      }}
                    />
                  </div>
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
                    onChange={(line) => setForm({ ...form, recipients: formatCourtPresidentLine(line) })}
                  />
                </div>
              </div>

              <div>
                <label className="label">نسخة إلى</label>
                <div
                  ref={(el) => {
                    fieldRefs.current.copyTo = el;
                  }}
                  id="field-copyTo"
                >
                  <RecipientCascade
                    value={form.copyTo}
                    onChange={(line) => setForm({ ...form, copyTo: formatCourtPresidentLine(line) })}
                  />
                </div>
              </div>

              {isBriefing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">نوع البطاقة / العنوان</label>
                    <select
                      className="input"
                      value={briefingTitle}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (isBriefingTitle(v)) setBriefingTitle(v);
                      }}
                    >
                      {BRIEFING_TITLES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">الأولوية</label>
                    <select
                      className="input"
                      value={judgmentPriority}
                      onChange={(e) =>
                        setJudgmentPriority(e.target.value === 'عاجل' ? 'عاجل' : 'عادي')
                      }
                    >
                      <option value="عادي">عادي</option>
                      <option value="عاجل">عاجل</option>
                    </select>
                    {judgmentPriority === 'عاجل' && (
                      <div className="mt-1 text-xs font-bold text-red-700 flex items-center gap-1">
                        <span aria-hidden>⚠</span> عاجل — يظهر في كليشيه الورق
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {isBriefing ? (
                <div className="space-y-2" ref={(el) => { fieldRefs.current.judgmentCard = el; }}>
                  <div className="flex items-center justify-between gap-2">
                    <label className="label mb-0">بطاقة رصد مدخلات الأحكام</label>
                    <span className="text-[11px] text-moj-green/80">توزَّع الحقول تلقائياً في الجدول</span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-moj-green/40">
                    <table className="w-full text-sm" dir="rtl">
                      <tbody>
                        {(judgmentCard || []).map((row, i) => (
                          <tr key={`${row.label}-${i}`} className="odd:bg-white even:bg-moj-light/30 dark:odd:bg-transparent dark:even:bg-white/5">
                            <th className="p-2 border-b border-moj-green/20 text-moj-green font-bold text-right whitespace-nowrap w-[38%] align-middle">
                              {row.label}
                            </th>
                            <td className="p-1.5 border-b border-moj-green/20 align-middle">
                              {row.label === MECHANISM_LABEL ? (
                                <select
                                  className="input py-1.5 text-sm"
                                  style={editorFontStyle}
                                  // المرحلة الثانية: استخدم خيارات آلية المعالجة الخاصة بالقالب
                                  value={row.value || mechanismOptions[0] || ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setJudgmentCard((prev) =>
                                      setJudgmentCardValue(prev || [], MECHANISM_LABEL, v),
                                    );
                                  }}
                                >
                                  {row.value && !mechanismOptions.includes(row.value) ? (
                                    <option value={row.value}>{row.value}</option>
                                  ) : null}
                                  {mechanismOptions.map((m) => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  className="input py-1.5 text-sm"
                                  style={editorFontStyle}
                                  value={row.value}
                                  dir="auto"
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setJudgmentCard((prev) =>
                                      setJudgmentCardValue(prev || [], row.label, v),
                                    );
                                  }}
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-white/40">
                    الجدول أعلاه للحقول — ونص الخطاب أدناه قابل للتحرير مثل Word (مسافات + يمين/وسط/يسار).
                  </p>
                  <div>
                    <label className="label">نص بطاقة العرض (التحية → الخاتمة)</label>
                    <p className="text-[10px] text-gray-500 mb-1">
                      حدّد سطراً ثم يمين/وسط/يسار من شريط التنسيق. اضغط Space في بداية السطر لإزاحة أفقية مثل Word.
                      التحية والخاتمة جزء من النص — ليست قفلًا تلقائياً.
                    </p>
                    <TiptapBodyEditor
                      ref={bodyEditorRef}
                      value={form.body}
                      onChange={setBodyField}
                      style={style}
                      minHeight={200}
                      placeholder="نص بطاقة العرض (التحية → الخاتمة) — حدّد ثم نسّق من الشريط"
                      linterSuggestions={bodyLinterSuggestions}
                      onAcceptLinter={acceptBodyLinter}
                      onRejectLinter={rejectBodyLinter}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="label">الأطراف</label>
                    <textarea
                      ref={(el) => {
                        fieldRefs.current.parties = el;
                      }}
                      className="input min-h-[60px]"
                      style={editorFontStyle}
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
                      style={editorFontStyle}
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
                      style={editorFontStyle}
                      value={form.studyFields}
                      onChange={(e) => setForm({ ...form, studyFields: e.target.value })}
                      placeholder="التوصية: ..."
                    />
                  </div>

                  <div>
                    <label className="label">نص المكاتبة</label>
                    {polishIssues.length > 0 && (
                      <div
                        dir="rtl"
                        className="mb-2 rounded-lg border border-amber-400/80 bg-amber-50/90 dark:bg-amber-950/30 px-2.5 py-1.5 space-y-1"
                      >
                        <div className="text-[11px] font-bold text-amber-900 dark:text-amber-100">
                          تدقيق سريع ({polishIssues.length})
                        </div>
                        <ul className="space-y-1">
                          {polishIssues.map((iss, i) => renderPolishIssueRow(iss, i, true))}
                        </ul>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-500 mb-1">
                      حدّد سطراً أو فقرة ثم يمين / وسط / يسار من شريط التنسيق.
                      Space في بداية السطر يزيح النص أفقياً مثل Word. التحية/الخاتمة تُوسَّطان افتراضياً ويمكن تغييرهما.
                    </p>
                    <TiptapBodyEditor
                      ref={bodyEditorRef}
                      value={form.body}
                      onChange={setBodyField}
                      style={style}
                      minHeight={140}
                      placeholder="نص المكاتبة — حدّد كلمة ثم اللون / الوسط / الجدول من الشريط"
                      linterSuggestions={bodyLinterSuggestions}
                      onAcceptLinter={acceptBodyLinter}
                      onRejectLinter={rejectBodyLinter}
                    />
                  </div>
                </>
              )}

              {tableRows.length > 0 && !studySections && !isBriefing && (
                <div className="text-xs text-moj-green bg-moj-light rounded-lg p-2">
                  تم استخراج {tableRows.length} صف/صفوف من جدول الأسماء والهويات — تظهر في المعاينة.
                </div>
              )}
              {isBriefing && judgmentCard && judgmentCard.length > 0 && (
                <div className="text-xs text-moj-green bg-moj-light rounded-lg p-2">
                  {briefingTitle} ({judgmentCard.length} صفوف) مع ديباجة آلية المعالجة تظهر تحت بيانات الخطاب.
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
                  إصدار برقم رسمي
                </button>
              </div>
            </div>

            <div className="min-w-0 space-y-3">
              <ExportToolbar doc={exportDoc} ensureSavedId={ensureSavedId} onRequestIssue={() => save(true)} onFocusCopyTo={() => focusField('copyTo')} />
              <div className="text-sm font-medium text-gray-500 dark:text-white/50">
                معاينة ورقية رسمية — انقر قسماً للتحرير
              </div>
              <OfficialPaperPreview
                key={`preview-${paperLayout}-${style.fontFamily}-${style.fontSizePt}-${previewBody.length}`}
                style={style}
                paperLayout={paperLayout}
                onFieldClick={focusField}
                doc={{
                  number: null,
                  subject: form.subject,
                  dateGregorian: form.dateGregorian,
                  dateHijri: form.dateHijri,
                  recipients: form.recipients,
                  copyTo: form.copyTo,
                  parties: isBriefing ? '' : form.parties,
                  reasons: isBriefing ? '' : form.reasons,
                  studyFields: isBriefing ? '' : form.studyFields,
                  body: previewBody,
                  docType: form.docType,
                  tableRows: isBriefing ? [] : tableRows,
                  judgmentCard: isBriefing ? judgmentCard : null,
                  judgmentBriefing: isBriefing,
                  briefingTitle: isBriefing ? briefingTitle : undefined,
                  judgmentPriority: isBriefing ? judgmentPriority : undefined,
                  observationText: isBriefing ? observationText : undefined,
                  mechanismText: isBriefing ? mechanismText : undefined,
                  studySections: isBriefing ? null : studySections,
                  paperLayout,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <AdaptedTablePreview
        data={tablePreview}
        onClose={() => setTablePreview(null)}
        onAdopt={adoptAdaptedTable}
      />
      <AdaptedTableInsertDialog
        open={adaptedInsertOpen}
        onClose={() => setAdaptedInsertOpen(false)}
        onAdopt={handleAdoptAdaptedTable}
      />
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
