'use client';

export type DocStyle = {
  fontFamily: string;
  fontSizePt: number;
  align: 'right' | 'center' | 'left';
};

const FONTS = [
  'Traditional Arabic',
  'Sakkal Majalla',
  'Noto Naskh Arabic',
  'Arial',
  'Tahoma',
];

const SIZES = [11, 12, 13, 14, 16, 18, 20, 22];

export default function StyleToolbar({
  value,
  onChange,
}: {
  value: DocStyle;
  onChange: (next: DocStyle) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-moj-green/20 bg-white dark:bg-[var(--surface)] p-2 text-sm">
      <div>
        <label className="label text-xs mb-0.5">الخط</label>
        <select
          className="input py-1.5 min-w-[10rem]"
          value={value.fontFamily}
          onChange={(e) => onChange({ ...value, fontFamily: e.target.value })}
        >
          {FONTS.map((f) => (
            <option key={f} value={f}>
              {f}
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
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-1 pb-0.5">
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
            className={`px-2.5 py-1.5 rounded-lg border text-xs ${
              value.align === a
                ? 'bg-moj-green text-white border-moj-green'
                : 'border-gray-300 dark:border-white/20'
            }`}
            onClick={() => onChange({ ...value, align: a })}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
