'use client';

import type { StudySections } from '@/lib/parse-study';
import type { DocStyle } from '@/components/StyleToolbar';
import {
  DEFAULT_PAPER_LAYOUT,
  normalizePaperLayout,
  type PaperLayoutId,
} from '@/lib/paper-layouts';

export type OfficialPaperFields = {
  number?: string | null;
  subject?: string | null;
  dateGregorian?: string | null;
  dateHijri?: string | null;
  recipients?: string | null;
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
  studySections?: StudySections | null;
  paperLayout?: PaperLayoutId | string | null;
};

function EmblemImg({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/moj-emblem.svg"
      alt="شعار الوزارة"
      className={`w-16 h-16 shrink-0 rounded-xl border-2 border-moj-gold bg-white object-contain p-0.5 ${className}`}
    />
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
    <div className="flex gap-2 text-sm border-b border-moj-green/10 py-1">
      <span className="text-moj-green font-bold shrink-0 min-w-[7rem]">{label}</span>
      <span className="flex-1">{value}</span>
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

function StudyFormView({ s }: { s: StudySections }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg overflow-hidden border border-moj-green">
        <div className="bg-moj-green text-white text-center font-bold py-1.5 text-xs">بيانات القضية</div>
        <div className="p-2 bg-white grid sm:grid-cols-2 gap-x-3">
          <Kv label="رقم القضية" value={s.caseNumber} />
          <Kv label="رقم الصك" value={s.deedNumber} />
          <Kv label="التشكيل" value={s.formation} />
          <Kv label="المدعي/ة" value={s.plaintiff} />
          <Kv label="المدعى عليه/ا" value={s.defendant} />
          <Kv label="الاختصاص النوعي" value={s.jurisdiction} />
          <Kv label="القبول" value={s.acceptance} />
          <Kv label="المطالبة" value={s.claimType} />
          <Kv label="مقدارها" value={s.claimAmount} />
          <Kv label="التمثيل" value={s.representation} />
          <Kv label="دارس القضية" value={s.researcher} />
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
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-moj-green/20">
            <div className="p-2">
              <div className="text-xs font-bold text-moj-gold mb-1">دعوى المدعي</div>
              <pre className="whitespace-pre-wrap text-sm">{s.summaryPlaintiff || '—'}</pre>
            </div>
            <div className="p-2">
              <div className="text-xs font-bold text-moj-gold mb-1">إجابة المدعى عليه</div>
              <pre className="whitespace-pre-wrap text-sm">{s.summaryDefendant || '—'}</pre>
            </div>
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

      <div className="rounded-lg overflow-hidden border border-moj-gold">
        <div className="bg-[#C5A059] text-white text-center font-bold py-1.5 text-xs">الخلاصة</div>
        <div className="p-2 space-y-1">
          <Kv label="المشكلة" value={s.problem} />
          <Kv label="الرأي القانوني" value={s.legalOpinion} />
          <Kv label="التوصية" value={s.recommendation} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-600 border-t border-moj-gold pt-2">
        <div>معد الدراسة: {s.preparer || s.researcher || '—'}</div>
        <div>تصديق المشرف: {s.supervisor || '—'}</div>
        {s.prepDate && <div className="sm:col-span-2">التاريخ: {s.prepDate}</div>}
      </div>
    </div>
  );
}

type LayoutChrome = {
  paperBorder: string;
  bismillahBg: string;
  bismillahBorder: string;
  brandBorder: string;
  metaClass: string;
  sectionPad: string;
  footClass: string;
  titleAccent: 'green' | 'gold';
  showCircularBadge: boolean;
  compact: boolean;
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
    case 'classic-green':
    default:
      return {
        paperBorder: '2px solid #006C35',
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
  return (
    <div
      dir="rtl"
      className={`flex items-center justify-between gap-3 ${pad} ${brandBorder}`}
    >
      {/* RTL flex: first child = RIGHT → emblem */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        <EmblemImg className={compact ? '!w-12 !h-12' : ''} />
        {showCircularBadge && (
          <span className="text-[9px] font-bold text-moj-green border border-moj-gold rounded-full px-2 py-0.5">
            تعميم
          </span>
        )}
      </div>
      {/* CENTER: kingdom / ministry / court — always beside emblem, never alone */}
      <div className="flex-1 text-center min-w-0">
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
        {!compact && <div className="text-moj-gold text-xs mt-0.5">منصة ركيزة الذكية</div>}
      </div>
      {/* LEFT in RTL: QR */}
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt="QR"
          className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} rounded-lg border border-moj-gold bg-white shrink-0`}
        />
      ) : (
        <div
          className={`${compact ? 'w-12 h-12 text-[8px]' : 'w-16 h-16 text-[9px]'} shrink-0 rounded-xl border-2 border-dashed border-moj-gold bg-white flex items-center justify-center text-moj-green`}
        >
          QR
        </div>
      )}
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
  const fontFamily = style?.fontFamily || 'Noto Naskh Arabic, Traditional Arabic, serif';
  const fontSize = style?.fontSizePt ? `${style.fontSizePt}pt` : undefined;
  const textAlign = style?.align || 'right';
  const hasStudy =
    doc.studySections &&
    (doc.studySections.caseNumber || doc.studySections.plaintiff || doc.studySections.recommendation);
  const showTable =
    !hasStudy &&
    doc.tableRows &&
    doc.tableRows.length > 0 &&
    doc.tableRows.some((r) => r.id || (r.name && r.name.length < 80));

  // Single canonical body string — never stack old+new
  const bodyOnce = normalizeBodyText(doc.body);
  const bodyForPreview =
    !hasStudy && bodyOnce
      ? bodyWithoutDuplicatedSections(bodyOnce, doc.parties, doc.reasons)
      : '';

  return (
    <div className="w-full max-w-full overflow-x-auto">
      <div
        dir="rtl"
        className={`bg-white rounded-lg overflow-hidden shadow-sm font-arabic min-w-[min(100%,20rem)] max-w-full ${className}`}
        style={{ border: chrome.paperBorder, fontFamily, fontSize, textAlign }}
        data-paper-layout={layout}
      >
        <div
          className={`text-center text-white font-bold ${chrome.compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} border-b-[3px]`}
          style={{ background: chrome.bismillahBg, borderColor: chrome.bismillahBorder }}
        >
          بسم الله الرحمن الرحيم
        </div>

        <BrandHeader
          court={court}
          qrDataUrl={doc.qrDataUrl}
          compact={chrome.compact}
          showCircularBadge={chrome.showCircularBadge}
          brandBorder={chrome.brandBorder}
        />

        <div className={chrome.metaClass}>
          <Clickable field="number" onFieldClick={onFieldClick}>
            <span className="text-moj-green font-bold">الرقم: </span>
            <span dir="ltr">{doc.number || '—'}</span>
          </Clickable>
          <Clickable field="dateGregorian" onFieldClick={onFieldClick}>
            <span className="text-moj-green font-bold">التاريخ: </span>
            {doc.dateGregorian || doc.dateHijri || '—'}
          </Clickable>
          <Clickable field="recipients" onFieldClick={onFieldClick} className="sm:col-span-2">
            <span className="text-moj-green font-bold">إلى: </span>
            {doc.recipients || '—'}
          </Clickable>
          <Clickable field="subject" onFieldClick={onFieldClick} className="sm:col-span-2">
            <span className="text-moj-green font-bold">الموضوع: </span>
            {doc.subject || '—'}
          </Clickable>
        </div>

        <div className={chrome.sectionPad}>
          {hasStudy && doc.studySections && (
            <Clickable field="studyFields" onFieldClick={onFieldClick}>
              <StudyFormView s={doc.studySections} />
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

          {doc.parties && !hasStudy && (
            <Clickable field="parties" onFieldClick={onFieldClick}>
              <SectionTitle accent={chrome.titleAccent}>الأطراف</SectionTitle>
              <pre className="whitespace-pre-wrap text-sm">{doc.parties}</pre>
            </Clickable>
          )}
          {doc.reasons && !hasStudy && (
            <Clickable field="reasons" onFieldClick={onFieldClick}>
              <SectionTitle accent={chrome.titleAccent}>الأسباب</SectionTitle>
              <pre className="whitespace-pre-wrap text-sm">{doc.reasons}</pre>
            </Clickable>
          )}
          {bodyForPreview && (
            <Clickable field="body" onFieldClick={onFieldClick}>
              <SectionTitle accent={chrome.titleAccent}>النص</SectionTitle>
              {/* key forces remount when body changes — prevents stale stacked spans */}
              <pre
                key={`body-${bodyForPreview.length}-${bodyForPreview.slice(0, 32)}`}
                className="whitespace-pre-wrap text-sm leading-8"
              >
                {bodyForPreview}
              </pre>
            </Clickable>
          )}
          {doc.studyFields && !hasStudy && (
            <Clickable field="studyFields" onFieldClick={onFieldClick}>
              <SectionTitle accent={chrome.titleAccent}>الدراسة</SectionTitle>
              <pre className="whitespace-pre-wrap text-sm">{doc.studyFields}</pre>
            </Clickable>
          )}
        </div>

        <div className={chrome.footClass} style={{ borderColor: chrome.bismillahBorder }}>
          {footer}
        </div>
      </div>
    </div>
  );
}
