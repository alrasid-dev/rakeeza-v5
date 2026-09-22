/**
 * إضافة 3 قوالب نهائية (isActive=true) عبر Prisma مباشرة.
 * لا يلمس ensure-templates.ts ولا api/templates.
 * التشغيل: npx tsx scripts/add-templates-final.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

// تحميل .env / .env.local (نفس نمط setup-turso.mts)
function loadEnvFile(file: string): void {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] !== undefined) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnvFile('.env');
loadEnvFile('.env.local');

const prisma = new PrismaClient();

const NEW_TEMPLATES = [
  {
    name: 'خطاب رسمي — تصميم فخم',
    category: 'letter-official',
    description: 'خطاب رسمي بترويسة مضخمة وإطار مزخرف ذهبي',
    layout: 'formal-gold',
    sortOrder: 100,
    bodyHtml: [
      '<p style="text-align: right"><strong>بسم الله الرحمن الرحيم</strong></p>',
      '<p style="text-align: right">&nbsp;</p>',
      '<p style="text-align: right">السلام عليكم ورحمة الله وبركاته، وبعد:</p>',
      '<p style="text-align: right">&nbsp;</p>',
      '<p style="text-align: right">[اكتب نص الخطاب هنا]</p>',
      '<p style="text-align: right">&nbsp;</p>',
      '<p style="text-align: right">وتفضلوا بقبول فائق الاحترام والتقدير.</p>',
    ].join('\n'),
  },
  {
    name: 'تقرير — تصميم 3D',
    category: 'pdf-official',
    description: 'تقرير بتصميم ثلاثي الأبعاد مع ظلال خفيفة ورؤوس أقسام',
    layout: 'study-report',
    sortOrder: 101,
    bodyHtml: [
      '<h3 style="text-align: right; color: #2e9e5c">ملخص الموضوع</h3>',
      '<p style="text-align: right">[اكتب ملخص الموضوع هنا]</p>',
      '<h3 style="text-align: right; color: #2e9e5c">التفاصيل</h3>',
      '<p style="text-align: right">[اكتب التفاصيل هنا]</p>',
      '<h3 style="text-align: right; color: #2e9e5c">التوصية</h3>',
      '<p style="text-align: right">[اكتب التوصية هنا]</p>',
    ].join('\n'),
  },
  {
    name: 'مذكرة — تصميم مبسط',
    category: 'letter-identity',
    description: 'مذكرة بخطوط نظيفة بدون زخارف',
    layout: 'compact-memo',
    sortOrder: 102,
    bodyHtml: [
      '<p style="text-align: right">المكرم / [الجهة]:</p>',
      '<p style="text-align: right">السلام عليكم ورحمة الله وبركاته، وبعد:</p>',
      '<p style="text-align: right">&nbsp;</p>',
      '<p style="text-align: right">[اكتب نص المذكرة هنا]</p>',
    ].join('\n'),
  },
];

function fieldsJson(layout: string): string {
  return JSON.stringify({
    keys: ['number', 'date', 'subject', 'recipients', 'copyTo', 'body'],
    defaultPaperLayout: layout,
  });
}

async function main() {
  for (const t of NEW_TEMPLATES) {
    const existing = await prisma.template.findFirst({ where: { name: t.name } });
    if (existing) {
      await prisma.template.update({
        where: { id: existing.id },
        data: {
          category: t.category,
          description: t.description,
          fieldsJson: fieldsJson(t.layout),
          bodyHtml: t.bodyHtml,
          isEmpty: false,
          sortOrder: t.sortOrder,
          isActive: true,
        },
      });
      console.log('موجود (تم التحديث/التفعيل):', t.name);
    } else {
      await prisma.template.create({
        data: {
          name: t.name,
          category: t.category,
          description: t.description,
          fieldsJson: fieldsJson(t.layout),
          bodyHtml: t.bodyHtml,
          isEmpty: false,
          sortOrder: t.sortOrder,
          isActive: true,
        },
      });
      console.log('أُنشئ وفُعّل:', t.name);
    }
  }

  const active = await prisma.template.count({ where: { isActive: true } });
  console.log(`\nعدد القوالب المفعّلة الآن: ${active}`);

  const list = await prisma.template.findMany({
    where: { name: { in: NEW_TEMPLATES.map((t) => t.name) } },
    select: { name: true, category: true, isActive: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  });
  console.log('\nالقوالب الجديدة في قاعدة البيانات:');
  for (const t of list) {
    console.log(`- ${t.name} | ${t.category} | isActive=${t.isActive} | sortOrder=${t.sortOrder}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
