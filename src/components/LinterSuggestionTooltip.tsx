'use client';

/**
 * Quick-accept / reject tooltip for an active background-linter suggestion.
 */

import type { LinterSuggestion } from '@/lib/body-linter';

type Props = {
  suggestion: LinterSuggestion | null;
  onAccept: (s: LinterSuggestion) => void;
  onReject: (s: LinterSuggestion) => void;
  onClose?: () => void;
  className?: string;
};

export default function LinterSuggestionTooltip({
  suggestion,
  onAccept,
  onReject,
  onClose,
  className = '',
}: Props) {
  if (!suggestion) return null;

  const isAdd = suggestion.kind === 'add';
  const sugEmpty =
    !suggestion.suggestion.trim() || suggestion.suggestion === '—' || suggestion.suggestion === '-';
  const sugLabel = isAdd ? suggestion.suggestion : sugEmpty ? 'حذف' : suggestion.suggestion;

  return (
    <div
      className={`rounded-xl border-2 border-moj-gold bg-[#fff8e8] dark:bg-[#2a2418] shadow-lg px-3 py-2 space-y-1.5 text-xs ${className}`}
      dir="rtl"
      data-linter-tooltip={suggestion.id}
      role="dialog"
      aria-label="اقتراح تدقيق"
    >
      <div className="flex items-start gap-2">
        <span
          className={`rounded px-1.5 py-0.5 font-bold shrink-0 ${
            suggestion.type === 'spelling'
              ? 'bg-amber-200 text-amber-950'
              : suggestion.type === 'judicial'
                ? 'bg-moj-green/20 text-moj-green'
                : suggestion.type === 'protocol'
                  ? 'bg-sky-200 text-sky-950'
                  : 'bg-orange-200 text-orange-950'
          }`}
        >
          {suggestion.type === 'spelling'
            ? 'إملائي'
            : suggestion.type === 'judicial'
              ? 'قضائي'
              : suggestion.type === 'protocol'
                ? 'بروتوكولي'
                : suggestion.type === 'grammar'
                  ? 'نحوي'
                  : 'صياغي'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-800 dark:text-white/90">{suggestion.message}</div>
          {isAdd ? (
            <div className="mt-0.5">
              <span className="text-moj-gold font-bold">اقترح إضافة: </span>
              <span className="font-bold text-emerald-700">«{sugLabel}»</span>
            </div>
          ) : (
            <div className="mt-0.5">
              <span className="font-bold text-red-700">«{suggestion.found}»</span>
              <span className="text-moj-gold font-bold"> ← </span>
              <span className="font-bold text-emerald-700">«{sugLabel}»</span>
            </div>
          )}
        </div>
        {onClose && (
          <button type="button" className="text-gray-400 hover:text-gray-700 text-base leading-none" onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        )}
      </div>
      <div className="flex gap-1.5 justify-end">
        <button
          type="button"
          className="btn-outline text-[11px] py-0.5 px-2"
          onClick={() => onReject(suggestion)}
          data-linter-reject
        >
          رفض
        </button>
        <button
          type="button"
          className="btn-primary text-[11px] py-0.5 px-2"
          onClick={() => onAccept(suggestion)}
          data-linter-accept
        >
          اعتماد
        </button>
      </div>
    </div>
  );
}
