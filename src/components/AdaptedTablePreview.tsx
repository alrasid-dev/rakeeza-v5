'use client';

/**
 * Live preview popup (معاينة حيّة) shown right after a table paste so the user
 * can see how the Universal Table & Model Adaptor reformatted the grid and
 * merged duplicated rows — before adopting it into the document.
 */

export type AdaptedTablePreviewData = {
  originalHtml: string;
  adaptedHtml: string;
  editorHtml: string;
  mergedCount: number;
};

type Props = {
  data: AdaptedTablePreviewData | null;
  onClose: () => void;
  onAdopt: () => void;
};

export default function AdaptedTablePreview({ data, onClose, onAdopt }: Props) {
  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="معاينة تكييف الجدول"
      data-adapted-table-preview
    >
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-moj-gold bg-white dark:bg-[#12201a] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-moj-gold/30 bg-gradient-to-l from-moj-green/90 to-[#0a8f4a] px-4 py-3 text-white">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-moj-gold animate-pulse" />
          <span className="flex-1 text-right text-sm font-bold">
            معاينة حيّة — تكييف الجدول ودمج البيانات
          </span>
          <button
            type="button"
            className="text-white/80 hover:text-white text-lg leading-none px-1"
            onClick={onClose}
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 p-4">
          {data.mergedCount > 0 && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
              ✨ تم دمج <strong>{data.mergedCount}</strong> صف/صفوف مكرّرة — ظهر الشخص/الجهة مرة واحدة مع تجميع
              قضاياه/ملاحظاته تحت سجله.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-gray-600 dark:text-white/60">الجدول الأصلي</div>
              <div
                className="overflow-x-auto rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-black/20 p-2 text-sm"
                dangerouslySetInnerHTML={{ __html: data.originalHtml }}
              />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-moj-green">بعد التكييف والدمج (هوية المنصة)</div>
              <div
                className="overflow-x-auto rounded-lg border-2 border-moj-gold bg-white dark:bg-black/20 p-2 text-sm"
                dangerouslySetInnerHTML={{ __html: data.adaptedHtml }}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-1">
            <button type="button" className="btn-outline text-sm px-4 py-2" onClick={onClose}>
              إغلاق
            </button>
            <button type="button" className="btn-primary text-sm px-4 py-2" onClick={onAdopt} data-adopt-table>
              اعتماد الجدول في المستند
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
