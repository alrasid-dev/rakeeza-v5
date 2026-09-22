import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const total = await prisma.template.count();
  const active = await prisma.template.count({ where: { isActive: true } });
  const inactive = await prisma.template.count({ where: { isActive: false } });
  console.log(`العدد الكلي للقوالب: ${total}`);
  console.log(`العدد المفعّل (isActive = true): ${active}`);
  console.log(`العدد المعطّل (isActive = false): ${inactive}`);
  console.log('\nالقوالب المفعّلة:');
  const activeList = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { name: true, isActive: true },
  });
  for (const t of activeList) console.log(`  ✅ ${t.name} (isActive=${t.isActive})`);
  console.log('\nالقوالب المعطّلة:');
  const inactiveList = await prisma.template.findMany({
    where: { isActive: false },
    orderBy: { sortOrder: 'asc' },
    select: { name: true, isActive: true },
  });
  for (const t of inactiveList) console.log(`  ⬜ ${t.name} (isActive=${t.isActive})`);
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
