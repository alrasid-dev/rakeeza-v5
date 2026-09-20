'use client';

/**
 * Quick dialog for the TipTap toolbar "إدراج جدول مكيّف" button.
 * Paste raw text / Word / Excel / Outlook table → adaptPastedTable →
 * live preview (original vs adapted) → adopt into the editor.
 */

import { useEffect, useState } from 'react';
import { adaptPastedTable, htmlToPasteText, looksLikeExcelTsv, sanitizeClipboardHtml } from '@/lib/universal-table-parser';
import type { AdaptedTablePreviewData } from '@/components/AdaptedTablePreview';

type Props = {
  open: boolean;
  onClose: () => void;
  onAdopt: (editorHtml: string) => void;
};

export default function AdaptedTableInsertDialog({ open, onClose, onAdopt }: Props) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<AdaptedTablePreviewData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setText('');
      setPreview(null);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const run = () => {
    const raw = text.trim();
    if (!raw) {
      setError('الصق نصاً أو جدولاً أولاً.');
      setPreview(null);
      return;
    }
    const p = adaptPastedTable(raw);
    if (!p) {
      setError('لم يُتعرّف على جدول في النص الملصوق. جرّب جدولاً من Word/Excel/Outlook أو صفوفاً مفصولة بـ Tab.');
      setPreview(null);
      return;
    }
    setError('');
    setPreview({
      originalHtml: p.originalHtml,
      adaptedHtml: p.adaptedHtml,
      editorHtml: p.editorHtml,
      mergedCount: p.mergedCount,
    });
  };

  const reset = () => {
    setText('');
    setPreview(null);
    setError('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="إدراج جدول مكيّف"
      data-adapted-insert-dialog
    >
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-moj-gold bg-white dark:bg-[#12201a] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-moj-gold/30 bg-gradient-to-l from-moj-green/90 to-[#0a8f4a] px-4 py-3 text-white">
          <span aria-hidden="true" className="text-lg leading-none">▦</span>
          <span className="flex-1 text-right text-sm font-bold">إدراج جدول مكيّف</span>
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
          {!preview ? (
            <>
              <label className="label text-xs">الصق نصاً أو جدولاً خاماً (Word / Excel / Outlook / نص مفصول بـ Tab)</label>
              <textarea
                className="input min-h-[180px] font-arabic"
                dir="rtl"
                value={text}
                onChange={(e) => setText(e.target.value)}
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
                  const tsv = /<table\b/i.test(html) ? htmlToPasteText(source) : source;
                  if (tsv) {
                    e.preventDefault();
                    setText(tsv);
                  }
                }}
                placeholder={'مثال:\nالاسم\tرقم القضية\tملاحظات\nفهد العتيبي\t4670855622\tأجور متأخرة\nفهد العتيبي\t4670855623\tفصل تعسفي'}
              />
              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-200">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-outline text-sm px-4 py-2" onClick={reset}>
                  مسح
                </button>
                <button
                  type="button"
                  className="btn-primary text-sm px-4 py-2"
                  onClick={run}
                  disabled={!text.trim()}
                  data-adapt-run
                >
                  تكييف ومعاينة
                </button>
              </div>
            </>
          ) : (
            <>
              {preview.mergedCount > 0 && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
                  ✨ تم دمج <strong>{preview.mergedCount}</strong> صف/صفوف مكرّرة.
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-gray-600 dark:text-white/60">الجدول الأصلي</div>
                  <div
                    className="overflow-x-auto rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-black/20 p-2 text-sm"
                    dangerouslySetInnerHTML={{ __html: preview.originalHtml }}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-moj-green">بعد التكييف والدمج (هوية المنصة)</div>
                  <div
                    className="overflow-x-auto rounded-lg border-2 border-moj-gold bg-white dark:bg-black/20 p-2 text-sm"
                    dangerouslySetInnerHTML={{ __html: preview.adaptedHtml }}
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-1">
                <button type="button" className="btn-outline text-sm px-4 py-2" onClick={reset}>
                  إعادة
                </button>
                <button
                  type="button"
                  className="btn-primary text-sm px-4 py-2"
                  onClick={() => onAdopt(preview.editorHtml)}
                  data-adopt-adapted-table
                >
                  اعتماد في المحرر
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
