'use client';

import type { CSSProperties, MouseEvent } from 'react';
import { useMemo } from 'react';
import type { StudySections } from '@/lib/parse-study';
import type { DocStyle } from '@/components/StyleToolbar';
import {
  DEFAULT_PAPER_LAYOUT,
  normalizePaperLayout,
  type PaperLayoutId,
} from '@/lib/paper-layouts';
import { buildOfficialLetterHtml } from '@/lib/official-letter-html';
import { isJudgmentBriefingDoc, type JudgmentPriority } from '@/lib/judgment-card';
import { hasStudyContent } from '@/lib/study-display';

export type OfficialPaperFields = {
  number?: string | null;
  subject?: string | null;
  dateGregorian?: string | null;
  dateHijri?: string | null;
  recipients?: string | null;
  copyTo?: string | null;
  attachments?: string | null;
  parties?: string | null;
  facts?: string | null;
  reasons?: string | null;
  studyFields?: string | null;
  body?: string | null;
  docType?: string | null;
  footer?: string | null;
  qrDataUrl?: string | null;
  courtName?: string | null;
  tableRows?: { name: string; id?: string; extra?: string }[];
  judgmentCard?: { label: string; value: string }[] | null;
  /** Explicit judgment-briefing mode — never inferred from leftover card alone when study present */
  judgmentBriefing?: boolean | null;
  briefingTitle?: string | null;
  observationText?: string | null;
  mechanismText?: string | null;
  judgmentPriority?: JudgmentPriority | string | null;
  studySections?: StudySections | null;
  paperLayout?: PaperLayoutId | string | null;
};

/** Collapse accidental duplicated consecutive blocks (old+new paste ghost). */
export function normalizeBodyText(raw: string | null | undefined): string {
  const rawStr = String(raw ?? '');
  // TipTap HTML bodies: do not run marker/line dedupe — preserve structure for export.
  if (/<(p|div|table|h[1-6]|ul|ol|blockquote|span)\b/i.test(rawStr) && !/【|〔/.test(rawStr)) {
    return rawStr.replace(/\r\n/g, '\n').replace(/^\n+/, '').replace(/\n+$/, '');
  }
  // Preserve leading/trailing spaces on lines — Word-like Space positioning.
  // Only normalize newlines and strip blank lines at the very ends.
  let text = rawStr
    .replace(/\r\n/g, '\n');
  // Keep \u00a0 — converting to space collapses Word-like horizontal shifts in preview.
  text = text.replace(/^\n+/, '').replace(/\n+$/, '');
  if (!text.trim()) return '';
  // If the whole body is the same paragraph repeated twice, keep one.
  const half = Math.floor(text.length / 2);
  if (text.length >= 40 && text.length % 2 === 0) {
    const a = text.slice(0, half).replace(/^\n+|\n+$/g, '');
    const b = text.slice(half).replace(/^\n+|\n+$/g, '');
    if (a.trim() && a === b) return a;
  }
  const parts = text.split(/\n{2,}/).filter((p) => p.trim());
  if (parts.length >= 2 && parts.length % 2 === 0) {
    const mid = parts.length / 2;
    const left = parts.slice(0, mid).join('\n\n');
    const right = parts.slice(mid).join('\n\n');
    if (left === right) return left;
  }
  // Deduplicate consecutive identical lines (ignore pure-space twins)
  const lines = text.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if (out.length && out[out.length - 1] === line && line.trim().length > 20) continue;
    out.push(line);
  }
  return out.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
}


/**
 * Official paper preview — SAME HTML as PDF/Outlook via buildOfficialLetterHtml.
 * Single source of truth; no parallel React chrome that can drift.
 */
export default function OfficialPaperPreview({
  doc,
  className = '',
  onFieldClick,
  style,
  paperLayout: paperLayoutProp,
}: {
  doc: OfficialPaperFields;
  className?: string;
  onFieldClick?: (field: string) => void;
  style?: DocStyle;
  paperLayout?: PaperLayoutId | string | null;
}) {
  const layout = normalizePaperLayout(paperLayoutProp ?? doc.paperLayout ?? DEFAULT_PAPER_LAYOUT);
  const hasStudy = hasStudyContent(doc.studySections || null);
  const isBriefing =
    !hasStudy &&
    isJudgmentBriefingDoc({
      judgmentBriefing: doc.judgmentBriefing,
      judgmentCard: doc.judgmentCard,
      studySections: doc.studySections,
    });

  const bodyOnce = normalizeBodyText(doc.body);

  const { styleCss, paperHtml } = useMemo(() => {
    const full = buildOfficialLetterHtml(
      {
        number: doc.number,
        subject: doc.subject,
        dateGregorian: doc.dateGregorian,
        dateHijri: doc.dateHijri,
        recipients: doc.recipients,
        copyTo: doc.copyTo,
        attachments: doc.attachments,
        parties: isBriefing || hasStudy ? '' : doc.parties,
        reasons: isBriefing || hasStudy ? '' : doc.reasons,
        studyFields: isBriefing || hasStudy ? '' : doc.studyFields,
        // Briefing: body is the editable letter (salutation→closing); study clears body.
        body: hasStudy ? '' : bodyOnce,
        docType: doc.docType,
        footer: doc.footer || 'للاستخدام الداخلي فقط',
        qrDataUrl: doc.qrDataUrl,
        courtName: doc.courtName,
        studySections: isBriefing ? null : doc.studySections,
        judgmentCard: doc.judgmentCard,
        judgmentBriefing: doc.judgmentBriefing,
        briefingTitle: doc.briefingTitle,
        observationText: doc.observationText || (isBriefing ? bodyOnce : null),
        mechanismText: doc.mechanismText,
        judgmentPriority: doc.judgmentPriority,
        fontFamily: style?.fontFamily || 'Traditional Arabic',
        fontSizePt: style?.fontSizePt,
        align: style?.align || 'right',
        paperLayout: layout,
        tableRows: isBriefing || hasStudy ? [] : doc.tableRows,
      },
      // Preview: CSS-var stacks (next/font). PDF/Outlook pass forPdf/forOutlook.
      {},
    );
    const styleMatch = full.match(/<style>([\s\S]*?)<\/style>/i);
    const bodyMatch = full.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return {
      styleCss: styleMatch ? styleMatch[1] : '',
      paperHtml: bodyMatch ? bodyMatch[1] : full,
    };
  }, [
    doc.number,
    doc.subject,
    doc.dateGregorian,
    doc.dateHijri,
    doc.recipients,
    doc.copyTo,
    doc.attachments,
    doc.parties,
    doc.reasons,
    doc.studyFields,
    bodyOnce,
    doc.docType,
    doc.footer,
    doc.qrDataUrl,
    doc.courtName,
    doc.studySections,
    doc.judgmentCard,
    doc.judgmentBriefing,
    doc.briefingTitle,
    doc.observationText,
    doc.mechanismText,
    doc.judgmentPriority,
    style?.fontFamily,
    style?.fontSizePt,
    style?.align,
    layout,
    isBriefing,
    hasStudy,
  ]);

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (!onFieldClick) return;
    // Allow copy/paste: if the user selected text, do not jump to the editor field
    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    if (sel && String(sel.toString() || '').trim()) return;
    const el = (e.target as HTMLElement | null)?.closest?.('[data-field]');
    if (!el) return;
    const field = el.getAttribute('data-field');
    if (field) onFieldClick(field);
  }

  const wrapStyle: CSSProperties = {
    maxWidth: '100%',
  };

  return (
    <div className={`w-full max-w-full overflow-x-auto ${className}`} style={wrapStyle}>
      {/* Inject generator styles so preview === PDF/Outlook chrome */}
      <style>{styleCss}</style>
      <div
        className="official-paper-root official-paper-html-preview shadow-sm rounded-lg overflow-hidden select-text"
        onClick={handleClick}
        role={onFieldClick ? 'presentation' : undefined}
        dangerouslySetInnerHTML={{ __html: paperHtml }}
      />
    </div>
  );
}
