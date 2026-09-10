import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { currentUser } from '@/lib/server-user';
import { prisma } from '@/lib/db';
import { ensureTemplates } from '@/lib/ensure-templates';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/** Match template display name → form slug used by /documents/new */
const NAME_TO_FORM: Record<string, string> = {
  'خطاب صادر': 'khitab-sadir',
  'مذكرة داخلية': 'muthakkira-dakhiliya',
  'تعميم (فارغ)': 'taameem-farigh',
  'محضر جلسة': 'mahdar-jalsa',
  'تقرير دراسة': 'taqrir-dirasa',
  'طلب إحالة': 'talab-ihala',
  إفادة: 'ifada',
  'إشعار موعد': 'ishar-mawid',
  'رد على استفسار': 'radd-istifsar',
  'مذكرة قانونية': 'muthakkira-qanuniya',
  'نموذج حفظ': 'namudhaj-hifz',
  'نموذج أرشفة': 'namudhaj-arshafa',
  'خطاب شكر': 'khitab-shukr',
  'خطاب تنبيه إداري': 'khitab-tanbih',
  'طلب بيانات': 'talab-bayanat',
  'نموذج متابعة': 'namudhaj-mutabaa',
  'نموذج إحاطة': 'namudhaj-ihata',
  'نموذج عام': 'namudhaj-aam',
  'تصميم حر — خطاب': 'freeform-khitab',
  'تصميم حر — تقرير': 'freeform-taqrir',
  'تصميم حر — محضر': 'freeform-mahdar',
  'تصميم حر — تعميم': 'freeform-taameem',
  'نموذج تحليل حكم (شكوى)': 'study-complaint',
  'التوقيع الرقمي للبريد الإلكتروني': 'email-signature',
  'غلاف تقرير / عرض تقديمي': 'report-cover',
  'كشف أسماء / Excel': 'excel-names',
};

type GroupKey =
  | 'pdf-official'
  | 'pdf-identity'
  | 'letter-official'
  | 'letter-identity'
  | 'excel';

const GROUP_META: { key: GroupKey; title: string; subtitle: string }[] = [
  { key: 'pdf-official', title: 'نماذج / قوالب PDF — رسمي', subtitle: 'نماذج للطباعة والتصدير الرسمي' },
  { key: 'pdf-identity', title: 'نماذج / قوالب PDF — من الهوية', subtitle: 'دراسة · توقيع · غلاف بهوية الوزارة' },
  { key: 'letter-official', title: 'نماذج / قوالب خطاب — رسمي', subtitle: 'خطابات ومذكرات وتعاميم جاهزة للتعبئة' },
  { key: 'letter-identity', title: 'نماذج / قوالب خطاب — من الهوية', subtitle: 'تصاميم حرة بهوية المحكمة' },
  { key: 'excel', title: 'نماذج Excel', subtitle: 'كشوف وأسماء وهويات' },
];

/** Map DB category (legacy + new) → UI group */
function resolveGroup(category: string, name: string): GroupKey {
  if (category === 'pdf-official') return 'pdf-official';
  if (category === 'pdf-identity' || ['study', 'signature', 'cover'].includes(category)) {
    return 'pdf-identity';
  }
  if (category === 'letter-identity' || category === 'freeform') return 'letter-identity';
  if (category === 'excel' || /excel|كشف|xlsx/i.test(name)) return 'excel';
  if (category === 'letter-official' || category === 'document') return 'letter-official';
  // Fallback heuristics
  if (/دراسة|توقيع|غلاف/.test(name)) return 'pdf-identity';
  if (/حر/.test(name)) return 'letter-identity';
  return 'letter-official';
}

function templateHref(t: { id: string; name: string }) {
  const slug = NAME_TO_FORM[t.name];
  if (slug) {
    return `/documents/new?form=${encodeURIComponent(slug)}&name=${encodeURIComponent(t.name)}`;
  }
  return `/documents/new?templateId=${encodeURIComponent(t.id)}&name=${encodeURIComponent(t.name)}`;
}

function TemplateCard({ t }: { t: { id: string; name: string; description?: string | null } }) {
  return (
    <div className="card-surface rounded-2xl p-6 min-h-[7.5rem] flex flex-col justify-between shadow-sm hover:shadow-md transition border border-moj-green/15 dark:border-white/10 bg-white dark:bg-[var(--surface)]">
      <div>
        <div className="text-lg font-semibold text-moj-green dark:text-moj-gold leading-snug">{t.name}</div>
        {t.description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-white/45 line-clamp-2">{t.description}</p>
        )}
      </div>
      <Link
        href={templateHref(t)}
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-moj-green text-white dark:bg-[#2d4a3e] px-4 py-2.5 text-sm font-medium hover:opacity-90 transition"
      >
        استخدام
      </Link>
    </div>
  );
}

function Section({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: { id: string; name: string; description?: string | null }[];
}) {
  if (!items.length) return null;
  return (
    <section className="mb-10">
      <div className="mb-3 border-r-4 border-moj-gold pr-3">
        <h2 className="text-base font-bold text-moj-green dark:text-moj-gold">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-white/45 mt-0.5">{subtitle}</p>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((t) => (
          <TemplateCard key={t.id} t={t} />
        ))}
      </div>
    </section>
  );
}

export default async function TemplatesPage() {
  const user = await currentUser();
  await ensureTemplates();
  const templates = await prisma.template.findMany({ orderBy: { sortOrder: 'asc' } });

  const grouped: Record<GroupKey, typeof templates> = {
    'pdf-official': [],
    'pdf-identity': [],
    'letter-official': [],
    'letter-identity': [],
    excel: [],
  };

  for (const t of templates) {
    grouped[resolveGroup(t.category, t.name)].push(t);
  }

  return (
    <AppShell user={user}>
      <PageHeader
        title="القوالب"
        subtitle="مجموعات واضحة: PDF وخطاب (رسمي / من الهوية) وExcel"
      />
      {GROUP_META.map((g) => (
        <Section key={g.key} title={g.title} subtitle={g.subtitle} items={grouped[g.key]} />
      ))}
    </AppShell>
  );
}
