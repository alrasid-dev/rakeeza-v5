'use client';

import { FONT_OPTIONS } from '@/lib/font-stacks';
import { TEXT_COLORS } from '@/lib/body-inline';

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
  onColorSelection,
  onEnlargeSelection,
  onBoldSelection,
  onClearInline,
}: {
  value: DocStyle;
  onChange: (next: DocStyle) => void;
  /** When set, يمين/وسط/يسار apply to the selected body paragraph(s). */
  onAlignSelection?: (align: DocStyle['align']) => void;
  /** لون الجزء المحدد في نص المكاتبة */
  onColorSelection?: (hex: string) => void;
  /** تكبير / تصغير الجزء المحدد (1 = أكبر، 2 = أكبر أكثر، -1 = إزالة التكبير من التحديد) */
  onEnlargeSelection?: (level: 1 | 2) => void;
  onBoldSelection?: () => void;
  onClearInline?: () => void;
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
        <span className="label text-xs mb-0">محاذاة الفقرة</span>
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
              title="حدّد نصاً في المكاتبة ثم اضغط"
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

      {(onColorSelection || onEnlargeSelection || onBoldSelection) && (
        <div className="flex flex-col gap-0.5 pb-0.5 border-r border-moj-green/15 pr-2 mr-0.5">
          <span className="label text-xs mb-0">تنسيق التحديد (مثل وورد)</span>
          <div className="flex flex-wrap items-center gap-1">
            {onColorSelection &&
              TEXT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={`لون: ${c.label} — حدّد كلمة ثم اضغط`}
                  className="w-7 h-7 rounded-md border border-gray-300 dark:border-white/20 shadow-sm"
                  style={{ background: c.hex }}
                  onClick={() => onColorSelection(c.hex)}
                />
              ))}
            {onColorSelection && (
              <label
                className="w-7 h-7 rounded-md border border-dashed border-moj-gold overflow-hidden cursor-pointer relative"
                title="لون مخصص"
              >
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  defaultValue="#006C35"
                  onChange={(e) => onColorSelection(e.target.value)}
                />
                <span className="flex items-center justify-center w-full h-full text-[10px] text-moj-green font-bold bg-white">
                  +
                </span>
              </label>
            )}
            {onEnlargeSelection && (
              <>
                <button
                  type="button"
                  title="تكبير الجزء المحدد قليلاً"
                  className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 text-xs font-bold"
                  onClick={() => onEnlargeSelection(1)}
                >
                  أ<sup className="text-[9px]">+</sup>
                </button>
                <button
                  type="button"
                  title="تكبير أكبر للجزء المحدد"
                  className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 text-xs font-extrabold"
                  onClick={() => onEnlargeSelection(2)}
                >
                  أ<sup className="text-[9px]">++</sup>
                </button>
              </>
            )}
            {onBoldSelection && (
              <button
                type="button"
                title="عريض للجزء المحدد"
                className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 text-xs font-black"
                onClick={() => onBoldSelection()}
              >
                ع
              </button>
            )}
            {onClearInline && (
              <button
                type="button"
                title="إزالة لون/تكبير/عريض من التحديد"
                className="px-2 py-1.5 rounded-lg border border-red-300 text-red-700 text-xs"
                onClick={() => onClearInline()}
              >
                مسح
              </button>
            )}
          </div>
          <span className="text-[10px] text-gray-500 dark:text-white/40 max-w-[18rem] leading-snug">
            حدّد كلمة أو جملة في خانة المكاتبة ثم اضغط اللون أو أ⁺ أو ع
          </span>
        </div>
      )}
    </div>
  );
}
