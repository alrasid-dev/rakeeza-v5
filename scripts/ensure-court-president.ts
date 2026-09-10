import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';

async function fix(url: string) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const placeholder = await bcrypt.hash('__unset__' + Date.now(), 10);
  const email = 'snaswig@moj.gov.sa';
  await prisma.user.upsert({
    where: { email },
    update: {
      name: 'سعد ناصر عبد العزيز الصويغ',
      role: 'Admin',
      mustChangePassword: true,
      active: true,
      passwordHash: placeholder,
    },
    create: {
      email,
      name: 'سعد ناصر عبد العزيز الصويغ',
      role: 'Admin',
      mustChangePassword: true,
      active: true,
      passwordHash: placeholder,
    },
  });
  await prisma.user.updateMany({ data: { mustChangePassword: true } });
  console.log(url, 'users', await prisma.user.count());
  await prisma.$disconnect();
}

async function main() {
  await fix('file:./data/rakeeza.db');
  fs.copyFileSync('data/rakeeza.db', 'data/seed-rakeeza.db');
  console.log('seed-rakeeza.db ready', fs.statSync('data/seed-rakeeza.db').size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
