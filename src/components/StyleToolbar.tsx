'use client';

import { FONT_OPTIONS } from '@/lib/font-stacks';

export type DocStyle = {
  fontFamily: string;
  fontSizePt: number;
  align: 'right' | 'center' | 'left';
};

const SIZES = [11, 12, 13, 14, 16, 18, 20, 22];

export default function StyleToolbar({
  value,
  onChange,
  onAlignSelection,
}: {
  value: DocStyle;
  onChange: (next: DocStyle) => void;
  /** When set, يمين/وسط/يسار apply to the selected body paragraph(s). */
  onAlignSelection?: (align: DocStyle['align']) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-moj-green/20 bg-white dark:bg-[var(--surface)] p-2 text-sm">
      <div>
        <label className="label text-xs mb-0.5">الخط</label>
        <select
          className="input py-1.5 min-w-[12rem]"
          value={value.fontFamily}
          onChange={(e) => onChange({ ...value, fontFamily: e.target.value })}
          style={{ fontFamily: FONT_OPTIONS.find((f) => f.id === value.fontFamily)?.stack }}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.stack }}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label text-xs mb-0.5">الحجم</label>
        <select
          className="input py-1.5 w-20"
          value={value.fontSizePt}
          onChange={(e) => onChange({ ...value, fontSizePt: Number(e.target.value) })}
        >
          {SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-0.5 pb-0.5">
        <span className="label text-xs mb-0">محاذاة الفقرة المحددة</span>
        <div className="flex gap-1">
          {(
            [
              ['right', 'يمين'],
              ['center', 'وسط'],
              ['left', 'يسار'],
            ] as const
          ).map(([a, label]) => (
            <button
              key={a}
              type="button"
              title="حدّد نصاً في المكاتبة ثم اضغط — أو ضع المؤشر داخل الفقرة"
              className={`px-2.5 py-1.5 rounded-lg border text-xs ${
                value.align === a
                  ? 'bg-moj-green text-white border-moj-green'
                  : 'border-gray-300 dark:border-white/20'
              }`}
              onClick={() => {
                onChange({ ...value, align: a });
                onAlignSelection?.(a);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
