'use client';

import type { StudySections } from '@/lib/parse-study';
import { researcherRoleLabel, preparerRoleLabel } from '@/lib/honorific';
import { formatClaimAmount, normalizeFormationOrdinal } from '@/lib/arabic-normalize';
import type { DocStyle } from '@/components/StyleToolbar';
import {
  DEFAULT_PAPER_LAYOUT,
  normalizePaperLayout,
  type PaperLayoutId,
} from '@/lib/paper-layouts';
import { officialDateDisplay } from '@/lib/hijri';
import { fontStackFor } from '@/lib/font-stacks';
import { enrichStudySections, hasStudyContent, studyDisplayMeta } from '@/lib/study-display';
import { BRAND } from '@/lib/brand';
import {
  JUDGMENT_CARD_RECIPIENTS,
  JUDGMENT_CLOSING,
  JUDGMENT_SALUTATION,
  MECHANISM_LABEL,
  buildJudgmentObservationParts,
  buildMechanismParagraph,
  getJudgmentCardValue,
  isJudgmentBriefingDoc,
  type JudgmentPriority,
} from '@/lib/judgment-card';

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
  judgmentPriority?: JudgmentPriority | string | null;
  studySections?: StudySections | null;
  paperLayout?: PaperLayoutId | string | null;
};

function EmblemImg({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/moj-logo-gold.png"
      alt="شعار وزارة العدل"
      className={`w-16 h-16 shrink-0 rounded-xl border-2 border-moj-gold bg-white object-contain p-0.5 ${className}`}
    />
  );
}

/** Subtle geometric hex/cube wireframes — CSS/SVG only (no phone-screenshot wallpaper). */
function HexMotifDecor({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <svg
        className="absolute left-0 top-10 w-[55%] h-[70%] opacity-[0.22]"
        viewBox="0 0 320 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* wireframe hex cluster — left/center */}
        <g stroke="#006C35" strokeWidth="1.4">
          <polygon points="48,20 88,42 88,86 48,108 8,86 8,42" fill="#006C35" fillOpacity="0.12" />
          <polygon points="110,8 158,34 158,86 110,112 62,86 62,34" fill="none" stroke="#C5A059" />
          <polygon points="170,50 210,72 210,116 170,138 130,116 130,72" fill="#C5A059" fillOpacity="0.14" stroke="#C5A059" />
          <polygon points="70,120 118,146 118,198 70,224 22,198 22,146" fill="none" />
          <polygon points="140,140 188,166 188,218 140,244 92,218 92,166" fill="#006C35" fillOpacity="0.08" stroke="#C5A059" />
          <polygon points="220,100 255,120 255,160 220,180 185,160 185,120" fill="none" stroke="#006C35" />
        </g>
        {/* cube / isometric accents */}
        <g stroke="#C5A059" strokeWidth="1.1" fill="none" opacity="0.85">
          <path d="M250 40 L280 55 L280 90 L250 105 L220 90 L220 55 Z" />
          <path d="M220 55 L250 40 L280 55" />
          <path d="M250 40 L250 105" />
          <path d="M40 200 L70 215 L70 250 L40 265 L10 250 L10 215 Z" stroke="#006C35" />
          <path d="M10 215 L40 200 L70 215" stroke="#006C35" />
        </g>
      </svg>
    </div>
  );
}

/** modern-hex cliché: cream header — LEFT QR, RIGHT logo + RTL letterhead text (keeps geometric chrome). */
function ModernHexHeader({
  qrDataUrl,
  court,
}: {
  qrDataUrl?: string | null;
  court: string;
}) {
  return (
    <div
      dir="ltr"
      className="relative grid grid-cols-[auto_1fr] items-center gap-3 px-5 py-3 border-b border-[#C5A059]/50 bg-[#F9F7F1]/80"
    >
      <div className="flex justify-start items-center min-w-0 z-[1]">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="QR"
            className="w-16 h-16 rounded-lg border border-dashed border-moj-gold bg-white object-contain p-0.5"
          />
        ) : (
          <div className="w-16 h-16 text-[10px] rounded-lg border-2 border-dashed border-moj-gold bg-white flex items-center justify-center text-moj-green font-semibold">
            QR
          </div>
        )}
      </div>
      <div className="flex justify-end items-center gap-3 min-w-0 z-[1]" dir="rtl">
        {/* logo first under RTL → far right; text sits beside it toward center */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/moj-logo-gold.png"
          alt="شعار وزارة العدل"
          className="w-[4.5rem] h-[4.5rem] shrink-0 rounded-xl border-2 border-moj-gold bg-white object-contain p-1 shadow-sm"
        />
        <div className="text-right min-w-0 leading-snug">
          <div className="text-[11px] text-moj-green font-semibold">{BRAND.kingdom}</div>
          <div className="text-[11px] text-moj-green font-semibold">{BRAND.ministry}</div>
          <div className="text-moj-green font-extrabold text-base mt-0.5 leading-snug">{court}</div>
          <div className="text-moj-gold text-xs mt-0.5">{BRAND.platform}</div>
        </div>
      </div>
    </div>
  );
}

function CcIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`cc-icon inline-block w-3.5 h-3.5 align-middle text-moj-green ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      style={{ display: 'inline-block', visibility: 'visible' }}
    >
      <rect x="3" y="5" width="14" height="11" rx="1.5" />
      <path d="M7 9h6M7 12h4" strokeLinecap="round" />
      <path d="M19 8v9a1.5 1.5 0 0 1-1.5 1.5H8" strokeLinecap="round" />
    </svg>
  );
}

function Clickable({
  field,
  onFieldClick,
  children,
  className = '',
}: {
  field?: string;
  onFieldClick?: (field: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (!onFieldClick || !field) return <div className={className}>{children}</div>;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onFieldClick(field)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onFieldClick(field);
      }}
      className={`${className} cursor-pointer rounded-md hover:ring-2 hover:ring-moj-gold/60 transition`}
      title="انقر للتحرير"
    >
      {children}
    </div>
  );
}

function SectionTitle({
  children,
  accent = 'green',
}: {
  children: React.ReactNode;
  accent?: 'green' | 'gold';
}) {
  const border = accent === 'gold' ? 'border-moj-gold' : 'border-moj-gold';
  const color = accent === 'gold' ? 'text-[#8a6b2e]' : 'text-moj-green';
  return (
    <div className={`font-semibold ${color} border-b ${border} pb-0.5 mb-1`}>{children}</div>
  );
}

function Kv({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm border-b border-moj-green/10 py-1 text-gray-900">
      <span className="text-moj-green font-bold shrink-0 min-w-[7rem]">{label}</span>
      <span className="flex-1 text-gray-900">{value}</span>
    </div>
  );
}

/** Collapse accidental duplicated consecutive blocks (old+new paste ghost). */
export function normalizeBodyText(raw: string | null | undefined): string {
  const text = String(raw ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();
  if (!text) return '';
  // If the whole body is the same paragraph repeated twice, keep one.
  const half = Math.floor(text.length / 2);
  if (text.length >= 40 && text.length % 2 === 0) {
    const a = text.slice(0, half).trim();
    const b = text.slice(half).trim();
    if (a && a === b) return a;
  }
  const parts = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && parts.length % 2 === 0) {
    const mid = parts.length / 2;
    const left = parts.slice(0, mid).join('\n\n');
    const right = parts.slice(mid).join('\n\n');
    if (left === right) return left;
  }
  // Deduplicate consecutive identical lines
  const lines = text.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if (out.length && out[out.length - 1] === line && line.trim().length > 20) continue;
    out.push(line);
  }
  return out.join('\n').trim();
}

/**
 * When parties/reasons are shown as their own sections, strip matching blocks
 * from the letter body so the preview never stacks the same text twice.
 */
function bodyWithoutDuplicatedSections(
  body: string,
  parties?: string | null,
  reasons?: string | null,
): string {
  let result = body;
  for (const block of [parties, reasons]) {
    const b = String(block || '').trim();
    if (b.length < 12) continue;
    if (result.includes(b)) {
      result = result.split(b).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
  }
  // Drop leftover section headers that belong to dedicated sections
  result = result
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      if (/^(الأطراف|الوقائع|الأسباب|الحيثيات)\s*[:：]?$/.test(t)) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return result;
}

/** Drop pieces already rendered in StudyFormView so fallback blocks stay useful. */
function leftoverBlock(
  raw: string | null | undefined,
  already: Array<string | null | undefined>,
): string {
  let result = String(raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();
  if (!result) return '';
  for (const block of already) {
    const b = String(block || '').trim();
    if (b.length >= 8 && result.includes(b)) {
      result = result.split(b).join('\n');
    }
  }
  return result
    .split('\n')
    .map((l) => l.trim())
    .filter((t) => {
      if (!t) return false;
      if (/^(الأطراف|الوقائع|الأسباب|الحيثيات|الدراسة|النص|الموضوع)\s*[:：]?$/.test(t)) return false;
      const labeled = t.match(/^[\u0600-\u06FF\s/()]+[:：]\s*(.+)$/);
      if (labeled?.[1] && already.some((a) => a && labeled[1].trim() === String(a).trim())) return false;
      if (already.some((a) => a && t === String(a).trim())) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function PartyBar({
  label,
  value,
  tone,
}: {
  label: string;
  value?: string;
  tone: 'plaintiff' | 'defendant';
}) {
  if (!value) return null;
  const cls =
    tone === 'plaintiff'
      ? 'bg-[#E6F2EB] border-moj-green text-moj-green'
      : 'bg-[#FFF8E8] border-moj-gold text-[#8a6b2e]';
  return (
    <div className={`rounded-md border-2 ${cls} px-3 py-2 flex gap-2 items-start`}>
      <span className="font-extrabold shrink-0 text-xs min-w-[6.5rem]">{label}</span>
      <span className="flex-1 text-sm text-gray-900 font-semibold leading-6">{value}</span>
    </div>
  );
}

function StudyFormView({ s }: { s: StudySections }) {
  const formation = normalizeFormationOrdinal(s.formation) || s.formation;
  const amount = formatClaimAmount(s.claimAmount) || s.claimAmount;
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg overflow-hidden border border-moj-green">
        <div className="bg-moj-green text-white text-center font-bold py-1.5 text-xs">بيانات القضية</div>
        <div className="p-2 bg-white space-y-2">
          <div className="grid sm:grid-cols-2 gap-x-3">
            <Kv label="رقم القضية" value={s.caseNumber} />
            <Kv label="رقم الصك" value={s.deedNumber} />
            <Kv label="التشكيل" value={formation} />
            <Kv label="الاختصاص النوعي" value={s.jurisdiction} />
            <Kv label="القبول" value={s.acceptance} />
            <Kv label="المطالبة" value={s.claimType} />
            {amount ? (
              <div className="flex gap-2 text-sm border-b border-moj-green/10 py-1">
                <span className="text-moj-green font-bold shrink-0 min-w-[7rem]">مقدارها</span>
                <span className="flex-1 font-semibold text-gray-900" dir="ltr" style={{ unicodeBidi: 'embed' }}>
                  {amount}
                </span>
              </div>
            ) : null}
            <Kv label="التمثيل" value={s.representation} />
            <Kv label={researcherRoleLabel(s.researcher)} value={s.researcher} />
            <Kv label={preparerRoleLabel(s.preparer)} value={s.preparer} />
          </div>
          <div className="space-y-2 pt-1">
            <PartyBar label="المدعي/ة" value={s.plaintiff} tone="plaintiff" />
            <PartyBar label="المدعى عليه/ا" value={s.defendant} tone="defendant" />
          </div>
        </div>
      </div>

      {(s.priorSettlement || s.priorGosi || s.priorDomestic) && (
        <div className="rounded-lg overflow-hidden border border-moj-green">
          <div className="bg-moj-green text-white text-center font-bold py-1.5 text-xs">
            إجراءات سابقة للدعوى
          </div>
          <div className="p-2">
            <Kv label="التسوية الودية" value={s.priorSettlement} />
            <Kv label="اعتراض التأمينات" value={s.priorGosi} />
            <Kv label="لجنة الخدمة المنزلية" value={s.priorDomestic} />
          </div>
        </div>
      )}

      {(s.summaryPlaintiff || s.summaryDefendant) && (
        <div className="rounded-lg overflow-hidden border border-moj-green">
          <div className="bg-moj-green text-white text-center font-bold py-1.5 text-xs">ملخص الدعوى</div>
          <div className="p-2 space-y-2">
            {s.summaryPlaintiff ? (
              <div className="rounded-md border border-moj-green/40 bg-[#f7faf8] p-2">
                <div className="text-xs font-bold text-moj-gold mb-1">دعوى المدعي</div>
                <pre className="whitespace-pre-wrap text-sm text-gray-900">{s.summaryPlaintiff}</pre>
              </div>
            ) : null}
            {s.summaryDefendant ? (
              <div className="rounded-md border border-moj-gold/50 bg-[#fffaf0] p-2">
                <div className="text-xs font-bold text-moj-gold mb-1">إجابة المدعى عليه</div>
                <pre className="whitespace-pre-wrap text-sm text-gray-900">{s.summaryDefendant}</pre>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {(s.plaintiffRequests.length > 0 || s.defendantRequests.length > 0) && (
        <div className="rounded-lg overflow-hidden border border-moj-gold">
          <div className="bg-[#C5A059] text-white text-center font-bold py-1.5 text-xs">تحليل الشكوى</div>
          {s.plaintiffRequests.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-bold bg-gray-100 rounded px-2 py-1 mb-1">طلبات المدعي</div>
              <ul className="list-disc pr-5 space-y-1">
                {s.plaintiffRequests.map((r, i) => (
                  <li key={i}>{r.request || r.details || r.opinion || '—'}</li>
                ))}
              </ul>
            </div>
          )}
          {s.defendantRequests.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-bold bg-gray-100 rounded px-2 py-1 mb-1">طلبات المدعى عليه</div>
              <ul className="list-disc pr-5 space-y-1">
                {s.defendantRequests.map((r, i) => (
                  <li key={i}>{r.request || r.details || r.opinion || '—'}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {(s.problem || s.legalOpinion || s.recommendation) && (
        <div className="rounded-lg overflow-hidden border border-moj-gold">
          <div className="bg-[#C5A059] text-white text-center font-bold py-1.5 text-xs">الخلاصة</div>
          <div className="p-2 space-y-1">
            <Kv label="المشكلة" value={s.problem} />
            <Kv label="الرأي القانوني" value={s.legalOpinion} />
            <Kv label="التوصية" value={s.recommendation} />
          </div>
        </div>
      )}

      {(s.researcher || s.preparer || s.supervisor || s.prepDate) && (
        <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-600 border-t border-moj-gold pt-2">
          {s.researcher && <div>{researcherRoleLabel(s.researcher)}: {s.researcher}</div>}
          {s.preparer && <div>{preparerRoleLabel(s.preparer)}: {s.preparer}</div>}
          {s.supervisor && <div>تصديق المشرف: {s.supervisor}</div>}
          {s.prepDate && <div>التاريخ: {s.prepDate}</div>}
        </div>
      )}
    </div>
  );
}

type LayoutChrome = {
  paperBorder: string;
  paperBg?: string;
  bismillahBg: string;
  bismillahBorder: string;
  brandBorder: string;
  metaClass: string;
  sectionPad: string;
  footClass: string;
  titleAccent: 'green' | 'gold';
  showCircularBadge: boolean;
  compact: boolean;
  identityFooter?: 'a' | 'b' | null;
  modernHex?: boolean;
  bismillahAlign?: 'right' | 'center';
};

function chromeFor(layout: PaperLayoutId): LayoutChrome {
  switch (layout) {
    case 'formal-gold':
      return {
        paperBorder: '2px solid #C5A059',
        bismillahBg: 'linear-gradient(90deg,#8a6b2e,#C5A059,#8a6b2e)',
        bismillahBorder: '#006C35',
        brandBorder: 'border-b-2 border-moj-green',
        metaClass:
          'mx-4 my-3 rounded-lg border-2 border-moj-gold bg-[#fffaf0] px-3 py-2 text-sm grid sm:grid-cols-2 gap-1.5',
        sectionPad: 'px-4 pb-3 space-y-3 text-sm',
        footClass: 'text-center text-xs text-gray-600 py-2.5 border-t-2 bg-[#fff8e8]',
        titleAccent: 'gold',
        showCircularBadge: false,
        compact: false,
      };
    case 'compact-memo':
      return {
        paperBorder: '1px solid #006C35',
        bismillahBg: '#006C35',
        bismillahBorder: '#C5A059',
        brandBorder: 'border-b border-moj-green/40',
        metaClass:
          'mx-3 my-2 rounded border border-moj-green/40 bg-[#f3f7f4] px-2 py-1.5 text-xs grid sm:grid-cols-2 gap-1',
        sectionPad: 'px-3 pb-2 space-y-2 text-sm',
        footClass: 'text-center text-[10px] text-gray-500 py-1.5 border-t bg-white',
        titleAccent: 'green',
        showCircularBadge: false,
        compact: true,
      };
    case 'taameem-circular':
      return {
        paperBorder: '2px solid #006C35',
        bismillahBg: '#004d26',
        bismillahBorder: '#C5A059',
        brandBorder: 'border-b-2 border-moj-gold',
        metaClass:
          'mx-4 my-3 rounded-full border border-moj-green bg-[#E6F2EB] px-4 py-2 text-sm grid sm:grid-cols-2 gap-1.5',
        sectionPad: 'px-4 pb-3 space-y-3 text-sm',
        footClass: 'text-center text-xs text-gray-500 py-2.5 border-t-2 bg-[#f0f7f3]',
        titleAccent: 'green',
        showCircularBadge: true,
        compact: false,
      };
    case 'study-report':
      return {
        paperBorder: '2px solid #006C35',
        bismillahBg: '#006C35',
        bismillahBorder: '#C5A059',
        brandBorder: 'border-b-[3px] border-moj-gold',
        metaClass:
          'mx-4 my-3 rounded-none border-y-2 border-moj-green bg-white px-3 py-2 text-sm grid sm:grid-cols-2 gap-1.5',
        sectionPad: 'px-4 pb-3 space-y-3 text-sm',
        footClass: 'text-center text-xs text-gray-500 py-2.5 border-t-4 border-double bg-[#fafcfb]',
        titleAccent: 'green',
        showCircularBadge: false,
        compact: false,
      };
    case 'identity-service-a':
      return {
        paperBorder: '2px solid #C5A059',
        paperBg: '#F7F1E3',
        bismillahBg: '#006C35',
        bismillahBorder: '#C5A059',
        brandBorder: 'border-b-2 border-[#C5A059]',
        metaClass:
          'mx-4 my-3 rounded-lg border border-[#E8DCC8] bg-white px-3 py-2 text-sm grid sm:grid-cols-2 gap-1.5 shadow-[0_0_0_1px_rgba(197,160,89,0.2)]',
        sectionPad: 'px-4 pb-3 space-y-3 text-sm',
        footClass: 'text-center text-xs text-gray-600 py-0 bg-transparent border-0',
        titleAccent: 'gold',
        showCircularBadge: false,
        compact: false,
        identityFooter: 'a',
      };
    case 'identity-service-b':
      return {
        paperBorder: '2px solid #0B6E4F',
        paperBg: '#ffffff',
        bismillahBg: 'linear-gradient(90deg,#004d26,#147A5F,#006C35)',
        bismillahBorder: '#C5A059',
        brandBorder: 'border-b-[3px] border-moj-gold',
        metaClass:
          'mx-4 my-3 rounded-md border border-[#0B6E4F99] bg-[#F0F7F4] px-3 py-2 text-sm grid sm:grid-cols-2 gap-1.5',
        sectionPad: 'px-4 pb-3 space-y-3 text-sm',
        footClass: 'text-center text-xs text-gray-600 py-0 bg-transparent border-0',
        titleAccent: 'green',
        showCircularBadge: false,
        compact: false,
        identityFooter: 'b',
      };
    case 'modern-hex':
      return {
        paperBorder: '2px solid #C5A059',
        paperBg: '#F9F7F1',
        bismillahBg: '#004d26',
        bismillahBorder: '#C5A059',
        brandBorder: 'border-b border-[#C5A059]/50',
        metaClass:
          'mx-6 my-3 rounded-lg border border-[#C5A059]/35 bg-white/95 px-4 py-2.5 text-sm grid sm:grid-cols-2 gap-1.5',
        sectionPad: 'px-8 pb-4 space-y-3 text-sm relative z-[1]',
        footClass: 'text-center text-xs text-white/90 py-0 bg-[#1B4332] border-0',
        titleAccent: 'gold',
        showCircularBadge: false,
        compact: false,
        identityFooter: null,
        modernHex: true,
        bismillahAlign: 'right' as const,
      };
    case 'classic-green':
    default:
      return {
        paperBorder: '2px solid #006C35',
        paperBg: '#ffffff',
        bismillahBg: '#006C35',
        bismillahBorder: '#C5A059',
        brandBorder: 'border-b-2 border-moj-gold',
        metaClass:
          'mx-4 my-3 rounded-lg border border-moj-green bg-[#E6F2EB] px-3 py-2 text-sm grid sm:grid-cols-2 gap-1.5',
        sectionPad: 'px-4 pb-3 space-y-3 text-sm',
        footClass: 'text-center text-xs text-gray-500 py-2.5 border-t-2 bg-[#fafcfb]',
        titleAccent: 'green',
        showCircularBadge: false,
        compact: false,
        identityFooter: null,
      };
  }
}

function BrandHeader({
  court,
  qrDataUrl,
  compact,
  showCircularBadge,
  brandBorder,
}: {
  court: string;
  qrDataUrl?: string | null;
  compact: boolean;
  showCircularBadge: boolean;
  brandBorder: string;
}) {
  const pad = compact ? 'px-3 py-2' : 'px-4 py-3';
  const box = compact ? 'w-12 h-12' : 'w-16 h-16';
  // Official Saudi letterhead (physical LTR): LEFT=QR, CENTER=emblem, RIGHT=kingdom/ministry/court
  return (
    <div
      dir="ltr"
      className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 ${pad} ${brandBorder}`}
    >
      <div className="flex justify-start items-center min-w-0">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="QR"
            className={`${box} rounded-lg border border-moj-gold bg-white`}
          />
        ) : (
          <div
            className={`${box} text-[9px] rounded-xl border-2 border-dashed border-moj-gold bg-white flex items-center justify-center text-moj-green`}
          >
            QR
          </div>
        )}
      </div>
      <div className="flex flex-col items-center justify-center gap-1">
        <EmblemImg className={compact ? '!w-12 !h-12' : ''} />
        {showCircularBadge && (
          <span className="text-[9px] font-bold text-moj-green border border-moj-gold rounded-full px-2 py-0.5">
            تعميم
          </span>
        )}
      </div>
      <div className="text-right min-w-0" dir="rtl">
        <div className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-moj-green font-semibold`}>
          المملكة العربية السعودية
        </div>
        <div className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-moj-green font-semibold`}>
          وزارة العدل
        </div>
        <div
          className={`text-moj-green font-extrabold ${compact ? 'text-sm' : 'text-base'} mt-0.5 leading-snug`}
        >
          {court}
        </div>
        {!compact && <div className="text-moj-gold text-xs mt-0.5">{BRAND.platform}</div>}
      </div>
    </div>
  );
}

function UrgentBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-red-600 text-white text-[11px] font-bold px-2.5 py-0.5 shadow-sm ${className}`}
      title="عاجل"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2L1 21h22L12 2zm0 4.5l7.5 13h-15L12 6.5zM11 10v5h2v-5h-2zm0 6v2h2v-2h-2z" />
      </svg>
      عاجل
    </span>
  );
}

function JudgmentBriefingView({
  card,
  recipients,
  title,
}: {
  card: { label: string; value: string }[];
  recipients?: string | null;
  title?: string | null;
}) {
  const address = (recipients && recipients.trim()) || JUDGMENT_CARD_RECIPIENTS;
  const heading = (title && title.trim()) || 'بطاقة عرض';
  const obs = buildJudgmentObservationParts(card);
  const mech = buildMechanismParagraph(getJudgmentCardValue(card, MECHANISM_LABEL));
  return (
    <div className="mt-1 space-y-3 text-sm leading-relaxed text-justify">
      <div className="font-bold">{address}</div>
      <div>{JUDGMENT_SALUTATION}</div>
      <div>
        {obs.beforeRed}
        <span className="text-red-700 font-bold">{obs.red}</span>
        {obs.afterRed}
      </div>
      {mech ? <div>{mech}</div> : null}
      <div className="font-semibold">{JUDGMENT_CLOSING}</div>
      <div>
        <SectionTitle accent="gold">{heading}</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-moj-green">
            <tbody>
              {card.map((r, i) => (
                <tr key={`${r.label}-${i}`} className="odd:bg-white even:bg-moj-light/40">
                  <th className="p-2 border border-moj-green/40 bg-moj-green/10 text-moj-green font-bold w-[38%] text-right align-middle whitespace-nowrap">
                    {r.label}
                  </th>
                  <td className="p-2 border border-moj-green/40 text-right align-middle font-semibold" dir="auto">
                    {r.value || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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
  const chrome = chromeFor(layout);
  const court = doc.courtName || 'المحكمة العمالية بالرياض';
  const footer = doc.footer || 'للاستخدام الداخلي فقط';
  const fontFamily = fontStackFor(style?.fontFamily);
  const fontSize = style?.fontSizePt ? `${style.fontSizePt}pt` : undefined;
  const textAlign = style?.align || 'right';
  const study = doc.studySections
    ? enrichStudySections(doc.studySections, {
        subject: doc.subject,
        parties: doc.parties,
        reasons: doc.reasons,
        studyFields: doc.studyFields,
        body: doc.body,
        recipients: doc.recipients,
      })
    : null;
  const hasStudy = hasStudyContent(study);
  const meta = studyDisplayMeta(study, {
    subject: doc.subject,
    recipients: doc.recipients,
  });
  const previewSubject =
    (doc.subject && doc.subject.trim() && doc.subject.trim() !== '—')
      ? doc.subject
      : meta.subject || (study?.caseNumber ? `دراسة شكوى — ${study.caseNumber}` : '') || '—';
  const showTable =
    !hasStudy &&
    doc.tableRows &&
    doc.tableRows.length > 0 &&
    doc.tableRows.some((r) => r.id || (r.name && r.name.length < 80));

  // Single canonical body string — never stack old+new
  const bodyOnce = normalizeBodyText(doc.body);
  const already = [
    study?.plaintiff,
    study?.defendant,
    study?.caseNumber,
    study?.deedNumber,
    study?.claimAmount,
    study?.representation,
    study?.recommendation,
    study?.problem,
    study?.legalOpinion,
    study?.summaryPlaintiff,
    study?.summaryDefendant,
    study?.jurisdiction,
    study?.researcher,
    study?.preparer,
  ];
  // When StudyFormView is on screen, hide form leftovers (empty label shells / duplicates).
  // Judgment briefing: never show الأطراف / النص / أسباب / دراسة shells.
  // Study always wins when studySections are present.
  const isBriefing =
    !hasStudy &&
    isJudgmentBriefingDoc({
      judgmentBriefing: doc.judgmentBriefing,
      judgmentCard: doc.judgmentCard,
      studySections: doc.studySections,
    });
  const isUrgent = isBriefing && doc.judgmentPriority === 'عاجل';
  const partiesLeftover = hasStudy || isBriefing ? '' : leftoverBlock(doc.parties, already);
  const reasonsLeftover = hasStudy || isBriefing ? '' : leftoverBlock(doc.reasons, already);
  const studyFieldsLeftover = hasStudy || isBriefing ? '' : leftoverBlock(doc.studyFields, already);
  const bodyForPreview =
    hasStudy || isBriefing
      ? ''
      : leftoverBlock(
          bodyOnce ? bodyWithoutDuplicatedSections(bodyOnce, doc.parties, doc.reasons) : '',
          already,
        );
  const showParties = Boolean(partiesLeftover);
  const showReasons = Boolean(reasonsLeftover);
  const showStudyFields = Boolean(studyFieldsLeftover);

  const letterFontStyle: React.CSSProperties = {
    fontFamily,
    fontSize,
    textAlign,
  };

  return (
    <div className="w-full max-w-full overflow-x-auto">
      <style>{`@media print { .cc-row, .cc-icon { display: inline-block !important; visibility: visible !important; } }
.official-paper-root, .official-paper-root *:not(img):not(svg):not(svg *) { font-family: inherit !important; }
`}</style>
      <div
        dir="rtl"
        className={`official-paper-root bg-white text-gray-900 rounded-lg overflow-hidden shadow-sm min-w-[min(100%,20rem)] max-w-full [&_pre]:text-gray-900 [&_pre]:opacity-100 relative ${className}`}
        style={{ border: chrome.paperBorder, background: chrome.paperBg || '#fff', ...letterFontStyle }}
        data-paper-layout={layout}
      >
        {chrome.modernHex && <HexMotifDecor />}
        <div
          className={`text-white font-bold ${chrome.compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} border-b-[3px] ${
            chrome.modernHex || chrome.bismillahAlign === 'right' ? 'text-right px-5' : 'text-center'
          } relative`}
          style={{ background: chrome.bismillahBg, borderColor: chrome.bismillahBorder, fontFamily }}
        >
          بسم الله الرحمن الرحيم
          {isUrgent ? (
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <UrgentBadge />
            </span>
          ) : null}
        </div>

        {chrome.modernHex ? (
          <ModernHexHeader qrDataUrl={doc.qrDataUrl} court={court} />
        ) : (
          <BrandHeader
            court={court}
            qrDataUrl={doc.qrDataUrl}
            compact={chrome.compact}
            showCircularBadge={chrome.showCircularBadge}
            brandBorder={chrome.brandBorder}
          />
        )}

        <div className={`${chrome.metaClass} text-gray-900`} style={letterFontStyle}>
          <Clickable field="number" onFieldClick={onFieldClick}>
            <span className="text-moj-green font-bold">الرقم: </span>
            <span dir="ltr">{doc.number || '—'}</span>
          </Clickable>
          <Clickable field="dateGregorian" onFieldClick={onFieldClick}>
            <span className="text-moj-green font-bold">التاريخ: </span>
            {officialDateDisplay(doc.dateHijri, doc.dateGregorian)}
          </Clickable>
          <Clickable field="recipients" onFieldClick={onFieldClick} className="sm:col-span-2">
            <span className="text-moj-green font-bold">إلى: </span>
            {doc.recipients || '—'}
          </Clickable>
          {doc.copyTo?.trim() ? (
            <Clickable field="copyTo" onFieldClick={onFieldClick} className="sm:col-span-2 cc-row">
              <span className="text-moj-green font-bold inline-flex items-center gap-1">
                <CcIcon />
                نسخة إلى:{' '}
              </span>
              {doc.copyTo}
            </Clickable>
          ) : null}
          {doc.attachments?.trim() ? (
            <div className="sm:col-span-2">
              <span className="text-moj-green font-bold">مرفقات: </span>
              {doc.attachments}
            </div>
          ) : null}
          <Clickable field="subject" onFieldClick={onFieldClick} className="sm:col-span-2">
            <span className="text-moj-green font-bold">الموضوع: </span>
            {previewSubject}
          </Clickable>
        </div>

        <div className={`${chrome.sectionPad} text-gray-900`} style={letterFontStyle}>
          {hasStudy && study && (
            <Clickable field="studyFields" onFieldClick={onFieldClick}>
              <StudyFormView s={study} />
            </Clickable>
          )}

          {showTable && (
            <div>
              <SectionTitle accent={chrome.titleAccent}>جدول الأسماء / الهوية</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-moj-green">
                  <thead>
                    <tr className="bg-moj-green text-white">
                      <th className="p-1.5 border border-moj-green">#</th>
                      <th className="p-1.5 border border-moj-green">الاسم</th>
                      <th className="p-1.5 border border-moj-green">رقم الهوية</th>
                      <th className="p-1.5 border border-moj-green">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.tableRows!.map((r, i) => (
                      <tr key={i} className="odd:bg-white even:bg-moj-light/40">
                        <td className="p-1.5 border border-moj-green/40 text-center">{i + 1}</td>
                        <td className="p-1.5 border border-moj-green/40">{r.name}</td>
                        <td className="p-1.5 border border-moj-green/40 text-center" dir="ltr">
                          {r.id || '—'}
                        </td>
                        <td className="p-1.5 border border-moj-green/40">{r.extra || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {isBriefing && doc.judgmentCard && doc.judgmentCard.length > 0 && (
            <JudgmentBriefingView
              card={doc.judgmentCard}
              recipients={doc.recipients}
              title={doc.briefingTitle}
            />
          )}
          {showParties && (
            <Clickable field="parties" onFieldClick={onFieldClick}>
              <SectionTitle accent={chrome.titleAccent}>الأطراف</SectionTitle>
              <pre className="whitespace-pre-wrap text-sm text-gray-900" style={{ fontFamily, fontSize }}>{partiesLeftover}</pre>
            </Clickable>
          )}
          {showReasons && (
            <Clickable field="reasons" onFieldClick={onFieldClick}>
              <SectionTitle accent={chrome.titleAccent}>الأسباب</SectionTitle>
              <pre className="whitespace-pre-wrap text-sm text-gray-900" style={{ fontFamily, fontSize }}>{reasonsLeftover}</pre>
            </Clickable>
          )}
          {bodyForPreview && (
            <Clickable field="body" onFieldClick={onFieldClick}>
              {/* key forces remount when body changes — prevents stale stacked spans */}
              <pre
                key={`body-${bodyForPreview.length}-${bodyForPreview.slice(0, 32)}`}
                className="whitespace-pre-wrap text-sm leading-8 text-gray-900"
                style={{ fontFamily, fontSize }}
              >
                {bodyForPreview}
              </pre>
            </Clickable>
          )}

          {showStudyFields && (
            <Clickable field="studyFields" onFieldClick={onFieldClick}>
              <SectionTitle accent={chrome.titleAccent}>الدراسة</SectionTitle>
              <pre className="whitespace-pre-wrap text-sm text-gray-900" style={{ fontFamily, fontSize }}>{studyFieldsLeftover}</pre>
            </Clickable>
          )}
        </div>

        <div className={chrome.footClass} style={{ borderColor: chrome.bismillahBorder }}>
          {chrome.identityFooter === 'a' && (
            <div className="leading-none" aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="48" viewBox="0 0 600 48" preserveAspectRatio="none">
                <rect width="600" height="48" fill="#EFE6D4" />
                <path d="M0 48 L40 0 L80 48 Z" fill="#006C35" opacity="0.35" />
                <path d="M60 48 L100 8 L140 48 Z" fill="#C5A059" opacity="0.55" />
                <path d="M120 48 L160 0 L200 48 Z" fill="#006C35" opacity="0.28" />
                <path d="M220 48 L260 12 L300 48 Z" fill="#C5A059" opacity="0.45" />
                <path d="M320 48 L360 0 L400 48 Z" fill="#006C35" opacity="0.32" />
                <path d="M400 48 L440 10 L480 48 Z" fill="#C5A059" opacity="0.5" />
                <path d="M500 48 L540 4 L580 48 Z" fill="#006C35" opacity="0.3" />
                <rect y="44" width="600" height="4" fill="#C5A059" />
              </svg>
            </div>
          )}
          {chrome.identityFooter === 'b' && (
            <div className="leading-none" aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="40" viewBox="0 0 600 40" preserveAspectRatio="none">
                <rect width="600" height="40" fill="#0B6E4F" />
                <path
                  d="M0 40 L50 5 L100 40 L150 8 L200 40 L250 5 L300 40 L350 10 L400 40 L450 6 L500 40 L550 12 L600 40 Z"
                  fill="#C5A059"
                  opacity="0.35"
                />
                <rect y="0" width="600" height="3" fill="#C5A059" />
              </svg>
            </div>
          )}
          {chrome.modernHex && (
            <div className="h-1 bg-[#C5A059]" aria-hidden />
          )}
          <div className={chrome.identityFooter || chrome.modernHex ? 'py-2.5 px-3' : undefined}>{footer}</div>
        </div>
      </div>
    </div>
  );
}
