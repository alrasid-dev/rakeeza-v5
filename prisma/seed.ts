import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/** الهيكل التنظيمي والتشغيلي: المحاكم العمالية (من مخطط المستخدم) */
type OrgNode = { name: string; children?: OrgNode[] };
const ORG_TREE: OrgNode[] = [
  {
    name: 'رئيس المحكمة',
    children: [
      { name: 'مكتب رئيس المحكمة' },
      {
        name: 'مساعد رئيس المحكمة',
        children: [
          { name: 'مكتب مساعد رئيس المحكمة' },
          { name: 'الدوائر القضائية' },
        ],
      },
      { name: 'مكتب المصالحة' },
      {
        name: 'القسم النسائي',
        children: [
          { name: 'وحدة الأمن والسلامة' },
          { name: 'وحدة خدمات المستفيدين' },
        ],
      },
      { name: 'قسم مراقبة الأداء والعمليات' },
      { name: 'قسم شؤون القضاة' },
      { name: 'المكتب الفني' },
      {
        name: 'أمانة المحكمة',
        children: [
          { name: 'المكتب التنسيقي' },
          {
            name: 'إدارة الخدمات المشتركة',
            children: [
              { name: 'قسم الموارد البشرية' },
              { name: 'قسم الخدمات والصيانة' },
              { name: 'قسم الاتصالات الإدارية' },
            ],
          },
          {
            name: 'إدارة الإسناد القضائي',
            children: [
              { name: 'قسم محضري الخصوم' },
              { name: 'قسم أمانة السر' },
              { name: 'قسم الباحثين' },
              { name: 'قسم الخبراء' },
              { name: 'قسم الجلسات' },
            ],
          },
          {
            name: 'إدارة الدعاوى والأحكام',
            children: [
              { name: 'قسم الوثائق والمحفوظات' },
              { name: 'قسم الدعاوى' },
              { name: 'قسم خدمات المستفيدين' },
              { name: 'قسم تسليم الأحكام' },
            ],
          },
        ],
      },
    ],
  },
];

const POSITIONS: { title: string; honorific: string; rank: number }[] = [
  { title: 'رئيس محكمة', honorific: 'فضيلة رئيس المحكمة', rank: 100 },
  { title: 'رئيس محكمة مكلف', honorific: 'فضيلة رئيس المحكمة المكلف', rank: 98 },
  { title: 'رئيس تشكيل', honorific: 'فضيلة رئيس التشكيل', rank: 96 },
  { title: 'الرئيس المساعد', honorific: 'فضيلة الرئيس المساعد', rank: 94 },
  { title: 'أمين المحكمة', honorific: 'سعادة', rank: 92 },
  { title: 'قاضي', honorific: 'فضيلة القاضي', rank: 90 },
  { title: 'باحث شرعي', honorific: 'سعادة', rank: 70 },
  { title: 'باحث قانوني', honorific: 'سعادة', rank: 70 },
  { title: 'موظف إداري', honorific: 'سعادة', rank: 40 },
];

const DOC_TEMPLATES = [
  'خطاب صادر',
  'مذكرة داخلية',
  'تعميم (فارغ)',
  'محضر جلسة',
  'تقرير دراسة',
  'طلب إحالة',
  'إفادة',
  'إشعار موعد',
  'رد على استفسار',
  'مذكرة قانونية',
  'نموذج حفظ',
  'نموذج أرشفة',
  'خطاب شكر',
  'خطاب تنبيه إداري',
  'طلب بيانات',
  'نموذج متابعة',
  'نموذج إحاطة',
  'نموذج عام',
];

const FREEFORM = [
  'تصميم حر — خطاب',
  'تصميم حر — تقرير',
  'تصميم حر — محضر',
  'تصميم حر — تعميم',
];

const STUDY_FIELDS = [
  'caseNumber',
  'deedNumber',
  'circuitNumber',
  'plaintiff',
  'defendant',
  'subjectMatterJurisdiction',
  'acceptance',
  'claim',
  'representationCheck',
  'priorProcedures',
  'caseSummary',
  'plaintiffClaim',
  'defendantAnswer',
  'complaintAnalysis',
  'requests',
  'legalOpinion',
  'recommendation',
  'preparedAt',
  'approvedAt',
];

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.registrationRequest.deleteMany();
  await prisma.template.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.position.deleteMany();
  await prisma.orgUnit.deleteMany();
  await prisma.court.deleteMany();
  await prisma.numberingRule.deleteMany();
  await prisma.letterhead.deleteMany();
  await prisma.setting.deleteMany();

  const court = await prisma.court.create({
    data: { name: 'المحكمة العمالية بالرياض', city: 'الرياض' },
  });

  async function seedOrg(nodes: OrgNode[], parentId: string | null = null) {
    for (const node of nodes) {
      const unit = await prisma.orgUnit.create({
        data: { name: node.name, courtId: court.id, parentId: parentId ?? undefined },
      });
      if (node.children?.length) await seedOrg(node.children, unit.id);
    }
  }
  await seedOrg(ORG_TREE);

  for (const p of POSITIONS) {
    await prisma.position.create({ data: p });
  }

  const year = new Date().getFullYear();
  await prisma.numberingRule.create({
    data: {
      name: 'default',
      pattern: 'صادر-{year}-{seq}',
      year,
      nextSeq: 1,
      prefix: 'صادر',
    },
  });

  await prisma.letterhead.create({
    data: {
      name: 'default',
      header: 'المملكة العربية السعودية\nوزارة العدل\nالمحكمة العمالية بالرياض',
      footer: 'للاستخدام الداخلي فقط',
      logoUrl: '/logo.svg',
    },
  });

  let order = 0;
  for (const name of DOC_TEMPLATES) {
    await prisma.template.create({
      data: {
        name,
        category: 'letter-official',
        description: 'قالب خطاب رسمي فارغ جاهز للتعبئة',
        fieldsJson: JSON.stringify([
          'number',
          'date',
          'subject',
          'recipients',
          'parties',
          'facts',
          'reasons',
          'studyFields',
          'body',
        ]),
        bodyHtml: '',
        isEmpty: true,
        sortOrder: order++,
      },
    });
  }
  for (const name of FREEFORM) {
    await prisma.template.create({
      data: {
        name,
        category: 'letter-identity',
        description: 'تصميم حر بهوية المحكمة',
        fieldsJson: '[]',
        bodyHtml: '',
        isEmpty: true,
        sortOrder: order++,
      },
    });
  }

  // Empty branded study template — field labels only, no party names
  let studyHtml = '';
  try {
    studyHtml = fs.readFileSync(
      path.join(process.cwd(), 'reference-models', 'study-complaint-empty.html'),
      'utf8',
    );
  } catch {
    studyHtml = '';
  }
  await prisma.template.create({
    data: {
      name: 'نموذج تحليل حكم (شكوى)',
      category: 'pdf-identity',
      description: 'نموذج فارغ بهوية الوزارة — حقول الدراسة فقط دون بيانات جاهزة',
      fieldsJson: JSON.stringify(STUDY_FIELDS),
      bodyHtml: studyHtml,
      isEmpty: true,
      sortOrder: order++,
    },
  });

  function readRef(name: string) {
    try {
      return fs.readFileSync(path.join(process.cwd(), 'reference-models', name), 'utf8');
    } catch {
      return '';
    }
  }

  await prisma.template.create({
    data: {
      name: 'التوقيع الرقمي للبريد الإلكتروني',
      category: 'pdf-identity',
      description: 'قالب فارغ: الاسم · المسمى · الإدارة · البريد · الهاتف · المدينة',
      fieldsJson: JSON.stringify(['fullName', 'jobTitle', 'department', 'email', 'phone', 'city']),
      bodyHtml: readRef('email-signature-empty.html'),
      isEmpty: true,
      sortOrder: order++,
    },
  });

  await prisma.template.create({
    data: {
      name: 'غلاف تقرير / عرض تقديمي',
      category: 'pdf-identity',
      description: 'غلاف فارغ: عنوان التقرير · وزارة العدل · عنوان الفصل · شكراً لكم',
      fieldsJson: JSON.stringify(['reportTitle', 'subtitle', 'chapterTitle', 'thanks']),
      bodyHtml: readRef('report-cover-empty.html'),
      isEmpty: true,
      sortOrder: order++,
    },
  });

  await prisma.template.create({
    data: {
      name: 'نموذج خطاب PDF رسمي',
      category: 'pdf-official',
      description: 'قالب PDF رسمي للطباعة بهوية الوزارة',
      fieldsJson: JSON.stringify(['number', 'date', 'subject', 'recipients', 'body']),
      bodyHtml: '',
      isEmpty: true,
      sortOrder: order++,
    },
  });

  await prisma.template.create({
    data: {
      name: 'كشف أسماء / Excel',
      category: 'excel',
      description: 'قالب لكشوف الأسماء وأرقام الهوية (لصق جدول أو استيراد)',
      fieldsJson: JSON.stringify(['tableRows', 'parties', 'body']),
      bodyHtml: '',
      isEmpty: true,
      sortOrder: order++,
    },
  });

  const hash = await bcrypt.hash('ChangeMe123!', 10);
  await prisma.user.create({
    data: {
      email: 'admin@moj.gov.sa',
      passwordHash: hash,
      name: 'مدير النظام',
      role: 'Admin',
      mustChangePassword: true,
      active: true,
      // Seed owner: no employeeId required
    },
  });

  await prisma.user.create({
    data: {
      email: 'snaswig@moj.gov.sa',
      passwordHash: hash, // يُستبدل عند أول دخول (برمجة الرمز)
      name: 'سعد ناصر عبد العزيز الصويغ',
      role: 'Admin',
      mustChangePassword: true,
      active: true,
    },
  });

  await prisma.setting.create({
    data: { key: 'app_version', value: '5.0.0' },
  });
  await prisma.setting.create({
    data: { key: 'court_name', value: 'المحكمة العمالية بالرياض' },
  });

  console.log('Seed complete: templates + admin@moj.gov.sa + snaswig@moj.gov.sa (mustChangePassword)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
