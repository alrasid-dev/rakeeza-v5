import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { currentUser } from '@/lib/server-user';
import { prisma } from '@/lib/db';
import { ensureTemplates } from '@/lib/ensure-templates';
import TemplatesClient from './TemplatesClient';

export const dynamic = 'force-dynamic';

const NAME_TO_FORM: Record<string, string> = {
  'خطاب صادر': 'khitab-sadir',
  'مذكرة داخلية': 'muthakkira-dakhiliya',
  'تعميم (فارغ)': 'taameem-farigh',
  'محضر جلسة': 'mahdar-jalsa',
  'تقرير دراسة': 'taqrir-dirasa',
  'طلب إحالة': 'talab-ihala',
  إفادة: 'ifada',
  'إشعار موعد': 'ishar-mawid',
  'إشعار موعد جلسة': 'ishar-mawid-jalsa',
  'إحالة داخلية عاجلة': 'ihala-dakhiliya-ajila',
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
  'مدخلات الأحكام بطاقة عرض': 'madkhalat-ahkam',
  'مدخلات الأحكام بطاقة عرض — عصري هندسي': 'madkhalat-ahkam-hex',
};

const NAME_TO_LAYOUT: Record<string, string> = {
  'مدخلات الأحكام بطاقة عرض': 'taameem-circular',
  'مدخلات الأحكام بطاقة عرض — عصري هندسي': 'modern-hex',
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

function resolveGroup(category: string, name: string): GroupKey {
  if (category === 'pdf-official') return 'pdf-official';
  if (category === 'pdf-identity' || ['study', 'signature', 'cover'].includes(category)) {
    return 'pdf-identity';
  }
  if (category === 'letter-identity' || category === 'freeform') return 'letter-identity';
  if (category === 'excel' || /excel|كشف|xlsx/i.test(name)) return 'excel';
  if (category === 'letter-official' || category === 'document') return 'letter-official';
  if (/دراسة|توقيع|غلاف/.test(name)) return 'pdf-identity';
  if (/حر/.test(name)) return 'letter-identity';
  return 'letter-official';
}

function templateHref(t: { id: string; name: string }) {
  const slug = NAME_TO_FORM[t.name];
  const layout = NAME_TO_LAYOUT[t.name];
  const layoutQ = layout ? `&layout=${encodeURIComponent(layout)}` : '';
  if (slug) {
    return `/documents/new?form=${encodeURIComponent(slug)}&name=${encodeURIComponent(t.name)}${layoutQ}`;
  }
  return `/documents/new?templateId=${encodeURIComponent(t.id)}&name=${encodeURIComponent(t.name)}${layoutQ}`;
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

  const groups = GROUP_META.map((g) => ({
    ...g,
    items: grouped[g.key].map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      href: templateHref(t),
      group: g.key,
    })),
  }));

  return (
    <AppShell user={user}>
      <PageHeader
        title="القوالب"
        subtitle="اختر قالباً لمعاينة الورق الرسمي بجانب القائمة قبل فتح المحرر"
      />
      <TemplatesClient groups={groups} />
    </AppShell>
  );
}
