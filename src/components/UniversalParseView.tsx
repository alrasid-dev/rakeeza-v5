'use client';

import type { UniversalParseResult } from '@/services/documentParser';

const CASE_FIELD_LABELS: Record<string, string> = {
  case_number: 'رقم القضية',
  deed_number: 'رقم الصك / الحكم',
  circuit: 'التشكيل / الدائرة',
  specialization: 'الاختصاص',
  judge_researcher: 'الناظر / دارس القضية',
  plaintiff: 'المدعي/ة',
  defendant: 'المدعى عليه/ا',
  claim_summary: 'دعوى المدعي',
  defendant_reply: 'إجابة المدعى عليه',
  claim_amount: 'مبلغ المطالبة',
  verdict_date: 'تاريخ الحكم',
  verdict_source: 'مصدر الحكم',
  problem: 'المشكلة',
  legal_opinion: 'الرأي القانوني',
  recommendation: 'التوصية',
  study_prepared_by: 'معد الدراسة',
};

const RECORD_FIELD_LABELS: Record<string, string> = {
  circuit: 'التشكيل / الدائرة',
  verdict_source: 'مصدر الحكم',
  deed_number: 'رقم الصك / الحكم',
  verdict_date: 'تاريخ الحكم',
  case_number: 'رقم القضية',
  claim_amount: 'مبلغ المطالبة',
  verdict_inputs: 'مدخلات الحكم',
  notes: 'ملاحظات',
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

function extraOf(v: unknown): Record<string, unknown> {
  return isRecord(v) && isRecord(v.extra_fields) ? v.extra_fields : {};
}

export default function UniversalParseView({ result }: { result: UniversalParseResult | null | undefined }) {
  if (!result) return null;

  const isTable = result.detected_type === 'TABLE';
  const records = Array.isArray(result.records) ? result.records : [];

  const extraCols: string[] = [];
  if (isTable) {
    for (const r of records) {
      for (const k of Object.keys(extraOf(r))) {
        if (!extraCols.includes(k)) extraCols.push(k);
      }
    }
  }

  return (
    <div className="rounded-xl border border-moj-green/20 bg-moj-light/50 p-3 space-y-3" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm font-bold text-moj-green">
          {isTable ? `جدول ممتد — ${records.length} صف/صفوف` : 'استمارة قضية واحدة'}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-white/50">{result.summary.source_format}</div>
      </div>

      {isTable ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/10">
          <table className="w-full min-w-[640px] text-right text-xs">
            <thead>
              <tr className="bg-moj-green/10 text-moj-green">
                {Object.keys(RECORD_FIELD_LABELS).map((k) => (
                  <th key={k} className="border-b border-gray-200 dark:border-white/10 px-2 py-1.5 font-semibold whitespace-nowrap">
                    {RECORD_FIELD_LABELS[k]}
                  </th>
                ))}
                {extraCols.map((k) => (
                  <th key={k} className="border-b border-gray-200 dark:border-white/10 px-2 py-1.5 font-semibold whitespace-nowrap">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50 dark:odd:bg-transparent dark:even:bg-white/5">
                  {Object.keys(RECORD_FIELD_LABELS).map((k) => (
                    <td key={k} className="border-b border-gray-100 dark:border-white/5 px-2 py-1.5 align-top">
                      {String(r[k] ?? '') || '—'}
                    </td>
                  ))}
                  {extraCols.map((k) => {
                    const ex = extraOf(r);
                    return (
                      <td key={k} className="border-b border-gray-100 dark:border-white/5 px-2 py-1.5 align-top">
                        {String(ex[k] ?? '') || '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 text-xs">
          {Object.keys(CASE_FIELD_LABELS).map((k) => {
            const v = String((result.case_data || {})[k] ?? '').trim();
            if (!v) return null;
            return (
              <div key={k} className="flex gap-2">
                <span className="font-semibold text-moj-green whitespace-nowrap">{CASE_FIELD_LABELS[k]}:</span>
                <span className="text-gray-800 dark:text-white/80 break-words">{v}</span>
              </div>
            );
          })}
          {Object.entries(extraOf(result.case_data)).map(([k, v]) =>
            String(v ?? '').trim() ? (
              <div key={k} className="flex gap-2">
                <span className="font-semibold text-moj-green whitespace-nowrap">{k}:</span>
                <span className="text-gray-800 dark:text-white/80 break-words">{String(v)}</span>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
