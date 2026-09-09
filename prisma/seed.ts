import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ORG_UNITS = [
  'رئاسة المحكمة',
  'الدائرة العمالية الأولى',
  'الدائرة العمالية الثانية',
  'الدائرة العمالية الثالثة',
  'إدارة القضايا',
  'إدارة الجلسات',
  'إدارة التنفيذ',
  'الشؤون الإدارية',
  'الموارد البشرية',
  'تقنية المعلومات',
  'الأرشيف',
  'الاستقبال',
];

const POSITIONS: { title: string; honorific: string; rank: number }[] = [
  { title: 'رئيس محكمة', honorific: 'فضيلة رئيس المحكمة', rank: 100 },
  { title: 'قاضي', honorific: 'فضيلة الشيخ', rank: 90 },
  { title: 'رئيس دائرة', honorific: 'فضيلة رئيس الدائرة', rank: 85 },
  { title: 'كاتب ضبط', honorific: 'الأستاذ', rank: 50 },
  { title: 'محضر', honorific: 'الأستاذ', rank: 45 },
  { title: 'مدير إدارة', honorific: 'سعادة المدير', rank: 70 },
  { title: 'موظف إداري', honorific: 'الأستاذ', rank: 40 },
  { title: 'سكرتير', honorific: 'الأستاذ', rank: 35 },
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

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.template.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.position.deleteMany();
  await prisma.orgUnit.deleteMany();
  await prisma.court.deleteMany();
  await prisma.numberingRule.deleteMany();
  await prisma.letterhead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  const court = await prisma.court.create({
    data: { name: 'المحكمة العمالية بالرياض', city: 'الرياض' },
  });

  for (const name of ORG_UNITS) {
    await prisma.orgUnit.create({ data: { name, courtId: court.id } });
  }

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
        category: 'document',
        description: 'قالب فارغ جاهز للتعبئة',
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
        category: 'freeform',
        description: 'تصميم حر',
        fieldsJson: '[]',
        bodyHtml: '',
        isEmpty: true,
        sortOrder: order++,
      },
    });
  }

  const hash = await bcrypt.hash('ChangeMe123!', 10);
  await prisma.user.create({
    data: {
      email: 'admin@moj.gov.sa',
      passwordHash: hash,
      name: 'مدير النظام',
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

  console.log('Seed complete: court, org units, positions, 22 templates, admin@moj.gov.sa');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
