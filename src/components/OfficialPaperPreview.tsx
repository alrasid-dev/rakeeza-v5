'use client';

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
};

function Emblem({ label }: { label: string }) {
  return (
    <div className="w-16 h-16 shrink-0 rounded-xl border-2 border-moj-gold bg-white flex items-center justify-center text-[9px] text-center leading-tight text-moj-green px-1 whitespace-pre-line">
      {label}
    </div>
  );
}

export default function OfficialPaperPreview({
  doc,
  className = '',
}: {
  doc: OfficialPaperFields;
  className?: string;
}) {
  const court = doc.courtName || 'المحكمة العمالية بالرياض';
  const footer = doc.footer || 'للاستخدام الداخلي فقط';

  return (
    <div className="w-full max-w-full overflow-x-auto">
    <div
      dir="rtl"
      className={`bg-white rounded-lg overflow-hidden shadow-sm font-arabic min-w-[min(100%,20rem)] max-w-full ${className}`}
      style={{ border: '2px solid #006C35' }}
    >
      <div
        className="text-center text-white font-bold py-2 text-sm border-b-[3px]"
        style={{ background: '#006C35', borderColor: '#C5A059' }}
      >
        بسم الله الرحمن الرحيم
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-moj-gold">
        <Emblem label={"شعار الوزارة"} />
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
          <Emblem label="QR" />
        )}
      </div>

      <div className="mx-4 my-3 rounded-lg border border-moj-green bg-[#E6F2EB] px-3 py-2 text-sm grid sm:grid-cols-2 gap-1.5">
        <div>
          <span className="text-moj-green font-bold">الرقم: </span>
          <span dir="ltr">{doc.number || '—'}</span>
        </div>
        <div>
          <span className="text-moj-green font-bold">التاريخ: </span>
          {doc.dateGregorian || doc.dateHijri || '—'}
        </div>
        <div className="sm:col-span-2">
          <span className="text-moj-green font-bold">إلى: </span>
          {doc.recipients || '—'}
        </div>
        <div className="sm:col-span-2">
          <span className="text-moj-green font-bold">الموضوع: </span>
          {doc.subject || '—'}
        </div>
      </div>

      <div className="px-4 pb-3 space-y-3 text-sm">
        {doc.tableRows && doc.tableRows.length > 0 && (
          <div>
            <div className="font-semibold text-moj-green border-b border-moj-gold pb-0.5 mb-1">
              جدول الأسماء / الهوية
            </div>
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
                  {doc.tableRows.map((r, i) => (
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

        {doc.parties && (
          <div>
            <div className="font-semibold text-moj-green border-b border-moj-gold pb-0.5 mb-1">
              الأطراف
            </div>
            <pre className="whitespace-pre-wrap text-sm">{doc.parties}</pre>
          </div>
        )}
        {doc.facts && (
          <div>
            <div className="font-semibold text-moj-green border-b border-moj-gold pb-0.5 mb-1">
              الوقائع
            </div>
            <pre className="whitespace-pre-wrap text-sm">{doc.facts}</pre>
          </div>
        )}
        {doc.reasons && (
          <div>
            <div className="font-semibold text-moj-green border-b border-moj-gold pb-0.5 mb-1">
              الأسباب
            </div>
            <pre className="whitespace-pre-wrap text-sm">{doc.reasons}</pre>
          </div>
        )}
        {doc.body && (
          <div>
            <div className="font-semibold text-moj-green border-b border-moj-gold pb-0.5 mb-1">
              النص
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-8">{doc.body}</pre>
          </div>
        )}
        {doc.studyFields && (
          <div>
            <div className="font-semibold text-moj-green border-b border-moj-gold pb-0.5 mb-1">
              الدراسة
            </div>
            <pre className="whitespace-pre-wrap text-sm">{doc.studyFields}</pre>
          </div>
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
