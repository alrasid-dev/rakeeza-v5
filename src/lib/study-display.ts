/** Merge studySections ↔ form text so preview/exports never show empty shells */

import type { StudySections } from '@/lib/parse-study';
import { normalizeClaimAmount, normalizeFormationOrdinal } from '@/lib/arabic-normalize';
import { dedupePhrases } from '@/lib/parse-study';

export type StudyFormBlob = {
  subject?: string | null;
  parties?: string | null;
  reasons?: string | null;
  studyFields?: string | null;
  body?: string | null;
  recipients?: string | null;
};

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Pull "Label: value" (or Label：value) from a free-text blob — first hit wins. */
function labeled(blob: string, labels: string[]): string {
  const text = String(blob || '');
  if (!text.trim()) return '';
  for (const label of labels) {
    const re = new RegExp(
      `(?:^|[\\n\\r])\\s*${escapeRe(label)}\\s*[:：]\\s*([^\\n\\r]+)`,
      'm',
    );
    const m = text.match(re);
    if (m?.[1]) {
      const v = dedupePhrases(m[1]);
      if (v) return v;
    }
  }
  return '';
}

function digitsId(v: string): string {
  const m = String(v || '').match(/[0-9٠-٩]{5,}/);
  return m ? m[0] : dedupePhrases(v);
}

function firstNonEmpty(...vals: (string | undefined | null)[]): string {
  for (const v of vals) {
    const t = String(v || '').trim();
    if (t) return t;
  }
  return '';
}

/**
 * Prefer structured studySections; backfill gaps from form textareas
 * (parties / reasons / studyFields / body) that studyToFormFields wrote.
 */
export function enrichStudySections(
  study: StudySections | null | undefined,
  form?: StudyFormBlob | null,
): StudySections | null {
  if (!study && !form) return null;
  const s: StudySections = {
    plaintiffRequests: study?.plaintiffRequests || [],
    defendantRequests: study?.defendantRequests || [],
    ...(study || {}),
  };
  const blob = [form?.parties, form?.reasons, form?.studyFields, form?.body, form?.subject]
    .filter(Boolean)
    .join('\n');

  const set = (key: keyof StudySections, value: string) => {
    const cur = s[key];
    if (typeof cur === 'string' && cur.trim()) return;
    if (Array.isArray(cur) && cur.length) return;
    if (!value?.trim()) return;
    (s as Record<string, unknown>)[key] = value.trim();
  };

  set('caseNumber', digitsId(labeled(blob, ['رقم القضية']) || s.caseNumber || ''));
  set('deedNumber', digitsId(labeled(blob, ['رقم الصك']) || s.deedNumber || ''));
  set(
    'formation',
    normalizeFormationOrdinal(
      labeled(blob, ['رقم التشكيل', 'التشكيل', 'رقم الدائرة', 'الدائرة']) || s.formation || '',
    ),
  );
  set('plaintiff', labeled(blob, ['المدعي/ة', 'المدعي']));
  set('defendant', labeled(blob, ['المدعى عليه/ا', 'المدعى عليه']));
  set('jurisdiction', labeled(blob, ['الاختصاص النوعي', 'الاختصاص']));
  set('acceptance', labeled(blob, ['القبول']));
  set('claimType', labeled(blob, ['المطالبة']));
  set(
    'claimAmount',
    normalizeClaimAmount(
      labeled(blob, ['مقدار المطالبة', 'مقدارها']) || s.claimAmount || '',
    ),
  );
  set('representation', labeled(blob, ['التمثيل']));
  set(
    'researcher',
    labeled(blob, ['دارس القضية', 'ناظر القضية', 'الباحث', 'الباحثة', 'باحث', 'باحثة']),
  );
  set('summaryPlaintiff', labeled(blob, ['دعوى المدعي', 'ملخص دعوى المدعي']));
  set('summaryDefendant', labeled(blob, ['إجابة المدعى عليه', 'رد المدعى عليه']));
  set('problem', labeled(blob, ['المشكلة']));
  set('legalOpinion', labeled(blob, ['الرأي القانوني']));
  set('recommendation', labeled(blob, ['التوصية']));
  set('preparer', labeled(blob, ['اسم معد الدراسة', 'معد الدراسة']));
  set('supervisor', labeled(blob, ['تصديق المشرف', 'المشرف']));
  set('prepDate', labeled(blob, ['تاريخ اعداد الدراسة', 'تاريخ إعداد الدراسة', 'تاريخ الإعداد']));
  set('priorSettlement', labeled(blob, ['التسوية الودية', 'سبق رفع الدعوى إلى التسوية الودية']));
  set('priorGosi', labeled(blob, ['اعتراض التأمينات', 'التأمينات الاجتماعية']));
  set('priorDomestic', labeled(blob, ['لجنة الخدمة المنزلية', 'عمال الخدمة المنزلية']));

  // Normalize known fields even when already set
  if (s.formation) s.formation = normalizeFormationOrdinal(s.formation) || s.formation;
  if (s.claimAmount) s.claimAmount = normalizeClaimAmount(s.claimAmount) || s.claimAmount;
  if (s.caseNumber) s.caseNumber = digitsId(s.caseNumber);
  if (s.deedNumber) s.deedNumber = digitsId(s.deedNumber);

  const hasAny =
    s.caseNumber ||
    s.plaintiff ||
    s.defendant ||
    s.recommendation ||
    s.claimAmount ||
    s.jurisdiction ||
    (s.plaintiffRequests?.length ?? 0) > 0;
  return hasAny ? s : study || null;
}

/** Subject / meta lines for preview + exports — never leave blank when study has case # */
export function studyDisplayMeta(
  study: StudySections | null | undefined,
  form?: StudyFormBlob | null,
): { subject: string; recipients: string } {
  const enriched = enrichStudySections(study, form);
  const subject = firstNonEmpty(
    form?.subject,
    enriched?.caseNumber ? `دراسة شكوى — ${String(enriched.caseNumber).replace(/\s+/g, '')}` : '',
    'دراسة شكوى',
  );
  // Only force "دراسة شكوى" when we actually have study content
  const hasStudy =
    enriched &&
    (enriched.caseNumber || enriched.plaintiff || enriched.recommendation || enriched.claimAmount);
  return {
    subject: hasStudy
      ? firstNonEmpty(form?.subject, enriched?.caseNumber ? `دراسة شكوى — ${enriched.caseNumber}` : '', subject)
      : firstNonEmpty(form?.subject),
    recipients: firstNonEmpty(form?.recipients),
  };
}

export function hasStudyContent(s: StudySections | null | undefined): boolean {
  if (!s) return false;
  return Boolean(
    s.caseNumber ||
      s.plaintiff ||
      s.defendant ||
      s.recommendation ||
      s.claimAmount ||
      s.jurisdiction ||
      s.deedNumber ||
      (s.plaintiffRequests?.length ?? 0) > 0,
  );
}
