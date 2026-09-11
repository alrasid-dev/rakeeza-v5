'use client';

import {
  PAPER_LAYOUTS,
  normalizePaperLayout,
  type PaperLayoutId,
} from '@/lib/paper-layouts';

export default function PaperLayoutPicker({
  value,
  onChange,
  compact,
}: {
  value: PaperLayoutId | string | null | undefined;
  onChange: (id: PaperLayoutId) => void;
  compact?: boolean;
}) {
  const current = normalizePaperLayout(value);
  return (
    <div className="space-y-2">
      <label className="label mb-0">تخطيط الورق الرسمي</label>
      <div
        className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}
      >
        {PAPER_LAYOUTS.map((l) => {
          const active = current === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onChange(l.id)}
              className={`text-right rounded-xl border px-3 py-2.5 transition min-h-[4.5rem] ${
                active
                  ? 'border-moj-green ring-2 ring-moj-green/30 bg-moj-light/50'
                  : 'border-moj-green/20 bg-white dark:bg-[var(--surface)] hover:border-moj-gold/50'
              }`}
            >
              <div className="text-sm font-semibold text-moj-green dark:text-moj-gold">{l.nameAr}</div>
              <div className="text-[11px] text-gray-500 dark:text-white/45 mt-0.5 leading-snug">
                {l.description}
              </div>
              <div className="mt-2 flex items-center gap-1" aria-hidden>
                <span
                  className="h-2 flex-1 rounded-sm"
                  style={{
                    background:
                      l.id === 'formal-gold'
                        ? '#C5A059'
                        : l.id === 'taameem-circular'
                          ? '#004d26'
                          : l.id === 'identity-service-a'
                            ? '#F7F1E3'
                            : l.id === 'identity-service-b'
                              ? '#147A5F'
                              : '#006C35',
                    border:
                      l.id === 'identity-service-a' ? '1px solid #C5A059' : undefined,
                  }}
                />
                <span
                  className="h-2 w-6 rounded-sm"
                  style={{
                    background:
                      l.id === 'identity-service-a'
                        ? '#006C35'
                        : l.id === 'identity-service-b'
                          ? '#0B6E4F'
                          : '#C5A059',
                  }}
                />
                <span
                  className="h-2 w-4 rounded-sm border border-dashed"
                  style={{
                    borderColor: l.id.startsWith('identity-') ? '#C5A059' : undefined,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
