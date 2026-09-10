import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { currentUser } from '@/lib/server-user';
import { prisma } from '@/lib/db';
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
};

function templateHref(t: { id: string; name: string }) {
  const slug = NAME_TO_FORM[t.name];
  if (slug) {
    return `/documents/new?form=${encodeURIComponent(slug)}&name=${encodeURIComponent(t.name)}`;
  }
  return `/documents/new?templateId=${encodeURIComponent(t.id)}&name=${encodeURIComponent(t.name)}`;
}

function TemplateCard({ t }: { t: { id: string; name: string } }) {
  return (
    <div className="card-surface rounded-2xl p-6 min-h-[7.5rem] flex flex-col justify-between shadow-sm hover:shadow-md transition border border-moj-green/15 dark:border-white/10 bg-white dark:bg-[var(--surface)]">
      <div className="text-lg font-semibold text-moj-green dark:text-moj-gold leading-snug">{t.name}</div>
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
  items,
}: {
  title: string;
  items: { id: string; name: string }[];
}) {
  if (!items.length) return null;
  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 mb-3 tracking-wide">{title}</h2>
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
  const templates = await prisma.template.findMany({ orderBy: { sortOrder: 'asc' } });
  const letters = templates.filter((t) => t.category === 'document');
  const free = templates.filter((t) => t.category === 'freeform');
  const identity = templates.filter((t) =>
    ['study', 'signature', 'cover'].includes(t.category),
  );

  return (
    <AppShell user={user}>
      <PageHeader title="القوالب" subtitle="اختر قالباً وابدأ — بطاقة واحدة وزر استخدام" />
      <Section title="خطابات" items={letters} />
      <Section title="حرة" items={free} />
      <Section title="هوية" items={identity} />
    </AppShell>
  );
}
