/**
 * المرحلة الثانية: سكربت تفعيل/تعطيل القوالب.
 * - يفعّل 6 قوالب فقط ويعطّل الباقي.
 * - ينشئ قالب "مدخلات الأحكام بطاقة عرض" و"بطاقة عرض تصحيح حكم" إن لم يكونا موجودين.
 * التشغيل: npx tsx scripts/deactivate-templates.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// الأسماء الفعلية للقوالب الستة المطلوب إبقاؤها مفعلة
const ACTIVE_TEMPLATE_NAMES = [
  'نموذج تحليل حكم (شكوى)', // دراسة شكوى
  'تصميم حر — تقرير', // خطاب عرض
  'تصميم حر — خطاب', // خطاب تذكير
  'تعميم (فارغ)', // تعميم
  'مدخلات الأحكام بطاقة عرض', // بطاقة عرض / مدخلات أحكام
  'بطاقة عرض تصحيح حكم', // بطاقة عرض / مدخلات أحكام (تصحيح)
];

// آليات المعالجة الخاصة بقالب تصحيح الحكم
const CORRECTION_MECHANISMS = ['إصدار صك مستبدل', 'فتح/رفع تذكرة', 'تحديد موعد', 'تنويه', 'تنبيه'];

// حقول جدول مفتاح/قيمة (نفس حقول بطاقة مدخلات الأحكام)
const JUDGMENT_CARD_LABELS = [
  'التشكيل',
  'رقم القضية',
  'مصدر الحكم فضيلة الشيخ',
  'رقم الحكم',
  'الرصد',
  'آلية المعالجة المقترحة',
];

function judgmentFieldsJson(mechanisms?: string[]) {
  return JSON.stringify({
    keys: ['number', 'date', 'subject', 'recipients', 'copyTo', 'body', 'judgmentCard'],
    defaultPaperLayout: 'taameem-circular',
    mode: 'briefing',
    hideBodyAndParties: true,
    ...(mechanisms ? { mechanisms } : {}),
    seed: {
      subject: 'بشأن متابعة سلامة مدخلات الأحكام',
      recipients: 'فضيلة رئيس المحكمة سلمه الله',
      judgmentCard: JUDGMENT_CARD_LABELS.map((label) => ({
        label,
        value: label === 'آلية المعالجة المقترحة' ? 'إصدار صك مستبدل' : '',
      })),
    },
  });
}

async function ensureJudgmentTemplate(name: string, description: string, mechanisms?: string[]) {
  const existing = await prisma.template.findFirst({ where: { name } });
  if (existing) return existing;
  const maxOrder = await prisma.template.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;
  return prisma.template.create({
    data: {
      name,
      category: 'letter-official',
      description,
      fieldsJson: judgmentFieldsJson(mechanisms),
      bodyHtml: '',
      isEmpty: false,
      sortOrder,
      isActive: true,
    },
  });
}

async function main() {
  // 1) أنشئ قالبَي بطاقة مدخلات الأحكام إن لم يكونا موجودين
  await ensureJudgmentTemplate(
    'مدخلات الأحكام بطاقة عرض',
    'بطاقة رصد مدخلات الأحكام مع ديباجة آلية المعالجة (تعميم دائري)',
  );
  await ensureJudgmentTemplate(
    'بطاقة عرض تصحيح حكم',
    'بطاقة عرض تصحيح حكم — آليات معالجة التصحيح',
    CORRECTION_MECHANISMS,
  );

  // 2) فعّل القوالب الستة
  await prisma.template.updateMany({
    where: { name: { in: ACTIVE_TEMPLATE_NAMES } },
    data: { isActive: true },
  });

  // 3) عطّل باقي القوالب
  await prisma.template.updateMany({
    where: { name: { notIn: ACTIVE_TEMPLATE_NAMES } },
    data: { isActive: false },
  });

  // 4) تقرير
  const list = await prisma.template.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { name: true, isActive: true },
  });
  console.log(`\nإجمالي القوالب: ${list.length}`);
  for (const t of list) {
    console.log(`${t.isActive ? '✅ مفعّل   ' : '⬜ معطّل   '} ${t.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
