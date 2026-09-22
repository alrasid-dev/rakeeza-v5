/**
 * إضافة 3 قوالب جديدة بنفس هوية الوزارة (أخضر/ذهبي) وتفعيلها (isActive=true).
 * التشغيل: npx tsx scripts/add-three-templates.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_TEMPLATES = [
  {
    name: 'خطاب رسمي — كلاسيكي أخضر',
    layout: 'classic-green',
    description: 'خطاب رسمي بترويسة خضراء كلاسيكية وشريط ذهبي',
  },
  {
    name: 'تعميم رسمي — دائري',
    layout: 'taameem-circular',
    description: 'تعميم رسمي بشريط علوي أخضر وشارة دائرية',
  },
  {
    name: 'مذكرة رسمية — مدمجة',
    layout: 'compact-memo',
    description: 'مذكرة داخلية رسمية بتخطيط مدمج أنيق',
  },
];

function fieldsJson(layout: string) {
  return JSON.stringify({
    keys: ['number', 'date', 'subject', 'recipients', 'copyTo', 'body'],
    defaultPaperLayout: layout,
  });
}

async function main() {
  const maxOrder = await prisma.template.aggregate({ _max: { sortOrder: true } });
  let order = (maxOrder._max.sortOrder ?? 0) + 1;

  for (const t of NEW_TEMPLATES) {
    const existing = await prisma.template.findFirst({ where: { name: t.name } });
    if (existing) {
      await prisma.template.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          category: 'letter-official',
          description: t.description,
          fieldsJson: fieldsJson(t.layout),
        },
      });
      console.log('موجود (تم التفعيل):', t.name);
    } else {
      await prisma.template.create({
        data: {
          name: t.name,
          category: 'letter-official',
          description: t.description,
          fieldsJson: fieldsJson(t.layout),
          bodyHtml: '',
          isEmpty: true,
          sortOrder: order++,
          isActive: true,
        },
      });
      console.log('أُنشئ وفُعّل:', t.name);
    }
  }

  const active = await prisma.template.count({ where: { isActive: true } });
  console.log(`\nعدد القوالب المفعّلة الآن: ${active}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
