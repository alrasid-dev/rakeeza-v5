'use client';

import type { StudySections } from '@/lib/parse-study';
import type { DocStyle } from '@/components/StyleToolbar';

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
};

function EmblemImg() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/moj-emblem.svg"
      alt="شعار الوزارة"
      className="w-16 h-16 shrink-0 rounded-xl border-2 border-moj-gold bg-white object-contain p-0.5"
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-semibold text-moj-green border-b border-moj-gold pb-0.5 mb-1">{children}</div>
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

export default function OfficialPaperPreview({
  doc,
  className = '',
  onFieldClick,
  style,
}: {
  doc: OfficialPaperFields;
  className?: string;
  onFieldClick?: (field: string) => void;
  style?: DocStyle;
}) {
  const court = doc.courtName || 'المحكمة العمالية بالرياض';
  const footer = doc.footer || 'للاستخدام الداخلي فقط';
  const fontFamily = style?.fontFamily || 'Noto Naskh Arabic, Traditional Arabic, serif';
  const fontSize = style?.fontSizePt ? `${style.fontSizePt}pt` : undefined;
  const textAlign = style?.align || 'right';
  const hasStudy = doc.studySections && (doc.studySections.caseNumber || doc.studySections.plaintiff || doc.studySections.recommendation);
  // Avoid dumping study data as dumb name table when we have structured sections
  const showTable =
    !hasStudy && doc.tableRows && doc.tableRows.length > 0 && doc.tableRows.some((r) => r.id || (r.name && r.name.length < 80));

  return (
    <div className="w-full max-w-full overflow-x-auto">
      <div
        dir="rtl"
        className={`bg-white rounded-lg overflow-hidden shadow-sm font-arabic min-w-[min(100%,20rem)] max-w-full ${className}`}
        style={{ border: '2px solid #006C35', fontFamily, fontSize, textAlign }}
      >
        <div
          className="text-center text-white font-bold py-2 text-sm border-b-[3px]"
          style={{ background: '#006C35', borderColor: '#C5A059' }}
        >
          بسم الله الرحمن الرحيم
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-moj-gold">
          {/* RTL: first = right side */}
          <EmblemImg />
          <div className="flex-1 text-center">
            <div className="text-[11px] text-moj-green font-semibold">المملكة العربية السعودية</div>
            <div className="text-[11px] text-moj-green font-semibold">وزارة العدل</div>
            <div className="text-moj-green font-extrabold text-base mt-0.5">{court}</div>
            <div className="text-moj-gold text-xs mt-0.5">منصة ركيزة الذكية</div>
          </div>
          {doc.qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.qrDataUrl}
              alt="QR"
              className="w-16 h-16 rounded-lg border border-moj-gold bg-white"
            />
          ) : (
            <div className="w-16 h-16 shrink-0 rounded-xl border-2 border-dashed border-moj-gold bg-white flex items-center justify-center text-[9px] text-moj-green">
              QR
            </div>
          )}
        </div>

        <div className="mx-4 my-3 rounded-lg border border-moj-green bg-[#E6F2EB] px-3 py-2 text-sm grid sm:grid-cols-2 gap-1.5">
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

        <div className="px-4 pb-3 space-y-3 text-sm">
          {hasStudy && doc.studySections && (
            <Clickable field="studyFields" onFieldClick={onFieldClick}>
              <StudyFormView s={doc.studySections} />
            </Clickable>
          )}

          {showTable && (
            <div>
              <SectionTitle>جدول الأسماء / الهوية</SectionTitle>
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
              <SectionTitle>الأطراف</SectionTitle>
              <pre className="whitespace-pre-wrap text-sm">{doc.parties}</pre>
            </Clickable>
          )}
          {/* الوقائع removed from UI — keep silent if legacy data exists */}
          {doc.reasons && !hasStudy && (
            <Clickable field="reasons" onFieldClick={onFieldClick}>
              <SectionTitle>الأسباب</SectionTitle>
              <pre className="whitespace-pre-wrap text-sm">{doc.reasons}</pre>
            </Clickable>
          )}
          {doc.body && !hasStudy && (
            <Clickable field="body" onFieldClick={onFieldClick}>
              <SectionTitle>النص</SectionTitle>
              <pre className="whitespace-pre-wrap text-sm leading-8">{doc.body}</pre>
            </Clickable>
          )}
          {doc.studyFields && !hasStudy && (
            <Clickable field="studyFields" onFieldClick={onFieldClick}>
              <SectionTitle>الدراسة</SectionTitle>
              <pre className="whitespace-pre-wrap text-sm">{doc.studyFields}</pre>
            </Clickable>
          )}
        </div>

        <div
          className="text-center text-xs text-gray-500 py-2.5 border-t-2 bg-[#fafcfb]"
          style={{ borderColor: '#C5A059' }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}
