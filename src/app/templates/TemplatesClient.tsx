'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import OfficialPaperPreview from '@/components/OfficialPaperPreview';
import PaperLayoutPicker from '@/components/PaperLayoutPicker';
import { DEFAULT_PAPER_LAYOUT, type PaperLayoutId } from '@/lib/paper-layouts';
import {
  JUDGMENT_CARD_RECIPIENTS,
  JUDGMENT_CARD_SEED,
  JUDGMENT_CARD_SUBJECT,
} from '@/lib/judgment-card';

type Tpl = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  href: string;
  group: string;
};

type SampleDoc = {
  subject: string;
  recipients: string;
  body: string;
  study?: boolean;
  judgmentCard?: { label: string; value: string }[];
  layout?: PaperLayoutId;
};

const SAMPLE: Record<string, SampleDoc> = {
  'خطاب صادر': {
    subject: 'بشأن تنسيق الإجراءات',
    recipients: 'الأستاذ / …',
    body: 'السلام عليكم ورحمة الله وبركاته وبعد:-\nنأمل التكرم بالاطلاع واتخاذ ما يلزم.',
  },
  'مذكرة داخلية': {
    subject: 'مذكرة داخلية',
    recipients: 'الأستاذ / رئيس القسم',
    body: 'إشارةً إلى الموضوع أعلاه، نرفع إليكم هذه المذكرة للاطلاع.',
  },
  'نموذج تحليل حكم (شكوى)': {
    subject: 'دراسة شكوى — نموذج',
    recipients: 'فضيلة رئيس المحكمة',
    body: '',
    study: true,
  },
  'تعميم (فارغ)': {
    subject: 'تعميم',
    recipients: 'لمن يهمه الأمر',
    body: 'يعتمد التعميم على جميع الأقسام للعمل بموجبه.',
  },
  'مدخلات الأحكام بطاقة عرض': {
    subject: JUDGMENT_CARD_SUBJECT,
    recipients: JUDGMENT_CARD_RECIPIENTS,
    body: '',
    judgmentCard: JUDGMENT_CARD_SEED,
    layout: 'taameem-circular',
  },
  'مدخلات الأحكام بطاقة عرض — عصري هندسي': {
    subject: JUDGMENT_CARD_SUBJECT,
    recipients: JUDGMENT_CARD_RECIPIENTS,
    body: '',
    judgmentCard: JUDGMENT_CARD_SEED,
    layout: 'modern-hex',
  },
};

const DEFAULT_SAMPLE: SampleDoc = {
  subject: 'معاينة القالب',
  recipients: 'الأستاذ / …',
  body: 'هذه معاينة توضيحية لهوية الورق الرسمي قبل فتح المحرر.',
};

function openHref(base: string, layout: PaperLayoutId) {
  try {
    const u = new URL(base, 'https://rakeeza.local');
    u.searchParams.set('layout', layout);
    return `${u.pathname}?${u.searchParams.toString()}`;
  } catch {
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}layout=${encodeURIComponent(layout)}`;
  }
}

export default function TemplatesClient({
  groups,
}: {
  groups: { key: string; title: string; subtitle: string; items: Tpl[] }[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paperLayout, setPaperLayout] = useState<PaperLayoutId>(DEFAULT_PAPER_LAYOUT);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const selected = flat.find((t) => t.id === selectedId) || flat[0] || null;

  const sample: SampleDoc = selected
    ? SAMPLE[selected.name] || { ...DEFAULT_SAMPLE, subject: selected.name }
    : DEFAULT_SAMPLE;

  const effectiveLayout: PaperLayoutId = sample.layout || paperLayout;

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 space-y-8">
        {groups.map((g) =>
          g.items.length ? (
            <section key={g.key}>
              <div className="mb-3 border-r-4 border-moj-gold pr-3">
                <h2 className="text-base font-bold text-moj-green dark:text-moj-gold">{g.title}</h2>
                {g.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-white/45 mt-0.5">{g.subtitle}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {g.items.map((t) => {
                  const active = (selectedId || flat[0]?.id) === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(t.id);
                        const s = SAMPLE[t.name];
                        if (s?.layout) setPaperLayout(s.layout);
                      }}
                      className={`text-right card-surface rounded-2xl p-4 sm:p-5 min-h-[7.5rem] flex flex-col justify-between shadow-sm hover:shadow-md transition border min-w-0 ${
                        active
                          ? 'border-moj-green ring-2 ring-moj-green/25 bg-moj-light/40'
                          : 'border-moj-green/15 dark:border-white/10 bg-white dark:bg-[var(--surface)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-base sm:text-lg font-semibold text-moj-green dark:text-moj-gold leading-snug break-words">
                          {t.name}
                        </div>
                        {t.description && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-white/45 line-clamp-2">
                            {t.description}
                          </p>
                        )}
                      </div>
                      <Link
                        href={openHref(t.href, SAMPLE[t.name]?.layout || paperLayout)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-4 w-full inline-flex items-center justify-center rounded-xl bg-moj-green text-white dark:bg-[#2d4a3e] px-4 py-2.5 text-sm font-medium hover:opacity-90 transition"
                      >
                        استخدام
                      </Link>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null,
        )}
      </div>

      <aside className="lg:col-span-2 lg:sticky lg:top-4 self-start space-y-3">
        <div className="text-sm font-medium text-gray-500 mb-2">معاينة القالب الرسمية</div>
        <PaperLayoutPicker value={paperLayout} onChange={setPaperLayout} compact />
        {selected ? (
          <>
            <div className="text-xs text-moj-green mb-2 font-semibold">{selected.name}</div>
            <OfficialPaperPreview
              paperLayout={effectiveLayout}
              doc={{
                subject: sample.subject,
                recipients: sample.recipients,
                body: sample.judgmentCard?.length ? '' : sample.body || undefined,
                paperLayout: effectiveLayout,
                judgmentCard: sample.judgmentCard,
                judgmentBriefing: Boolean(sample.judgmentCard?.length),
                studySections: sample.study
                  ? {
                      caseNumber: '٠٠٠٠٠٠٠٠٠٠',
                      plaintiff: '………',
                      defendant: '………',
                      jurisdiction: '………',
                      summaryPlaintiff: '………',
                      summaryDefendant: '………',
                      plaintiffRequests: [],
                      defendantRequests: [],
                      recommendation: '………',
                      preparer: '………',
                    }
                  : null,
              }}
            />
            <Link
              href={openHref(selected.href, effectiveLayout)}
              className="btn-primary w-full mt-3 inline-flex justify-center"
            >
              فتح المحرر بهذا القالب
            </Link>
          </>
        ) : (
          <div className="text-gray-500 text-sm">اختر قالباً من القائمة</div>
        )}
      </aside>
    </div>
  );
}
