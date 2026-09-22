'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import OfficialPaperPreview from '@/components/OfficialPaperPreview';
import PaperLayoutPicker from '@/components/PaperLayoutPicker';
import { DEFAULT_PAPER_LAYOUT, normalizePaperLayout, type PaperLayoutId } from '@/lib/paper-layouts';
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
  // المرحلة الثانية: حالة تفعيل القالب
  isActive: boolean;
  defaultPaperLayout?: string | null;
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
  // المرحلة الثانية: معاينة قالب تصحيح الحكم
  'بطاقة عرض تصحيح حكم': {
    subject: JUDGMENT_CARD_SUBJECT,
    recipients: JUDGMENT_CARD_RECIPIENTS,
    body: '',
    judgmentCard: JUDGMENT_CARD_SEED,
    layout: 'taameem-circular',
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
  isAdmin = false,
}: {
  groups: { key: string; title: string; subtitle: string; items: Tpl[] }[];
  isAdmin?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paperLayout, setPaperLayout] = useState<PaperLayoutId>(DEFAULT_PAPER_LAYOUT);
  // المرحلة الثانية: خريطة حالة تفعيل/تعطيل كل قالب (تُزامَن مع الخادم)
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const g of groups) for (const t of g.items) m[t.id] = t.isActive;
    return m;
  });
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const selected = flat.find((t) => t.id === selectedId) || flat[0] || null;

  const sample: SampleDoc = selected
    ? SAMPLE[selected.name] || { ...DEFAULT_SAMPLE, subject: selected.name }
    : DEFAULT_SAMPLE;

  const effectiveLayout: PaperLayoutId = selected?.defaultPaperLayout
    ? normalizePaperLayout(selected.defaultPaperLayout)
    : sample.layout || paperLayout;

  // المرحلة الثانية: تبديل حالة التفعيل/التعطيل مع المزامنة مع الخادم
  async function toggleTemplate(t: Tpl) {
    if (togglingId) return;
    const next = !activeMap[t.id];
    setActiveMap((m) => ({ ...m, [t.id]: next }));
    setTogglingId(t.id);
    try {
      const res = await fetch('/api/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, isActive: next }),
      });
      if (!res.ok) throw new Error('update failed');
    } catch {
      setActiveMap((m) => ({ ...m, [t.id]: !next }));
    } finally {
      setTogglingId(null);
    }
  }

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
                        if (t.defaultPaperLayout) {
                          setPaperLayout(normalizePaperLayout(t.defaultPaperLayout));
                        } else {
                          const s = SAMPLE[t.name];
                          if (s?.layout) setPaperLayout(s.layout);
                        }
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
                      {/* المرحلة الثانية: عمود الحالة — مفتاح تفعيل/تعطيل القالب */}
                      {isAdmin ? (
                      <div
                        className="mt-3 flex items-center justify-between gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs text-gray-500 dark:text-white/45">حالة</span>
                        <span className="flex items-center gap-2">
                          <span
                            className={`text-[11px] ${activeMap[t.id] ? 'text-moj-green' : 'text-gray-400'}`}
                          >
                            {activeMap[t.id] ? 'مفعّل' : 'معطّل'}
                          </span>
                          <span
                            role="switch"
                            aria-checked={activeMap[t.id]}
                            title={activeMap[t.id] ? 'تعطيل القالب' : 'تفعيل القالب'}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTemplate(t);
                            }}
                            className={`inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                              activeMap[t.id] ? 'bg-moj-green' : 'bg-gray-300 dark:bg-white/20'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                activeMap[t.id] ? 'translate-x-[18px]' : 'translate-x-[2px]'
                              }`}
                            />
                          </span>
                        </span>
                      </div>
                      ) : null}
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
