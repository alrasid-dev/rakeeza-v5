/**
 * Mark all users as needing first-time PIN setup (mustChangePassword=true).
 * Does not change password hashes — users program their own PIN via «أول دخول».
 *
 * Usage:
 *   DATABASE_URL="file:../data/rakeeza.db" npx tsx scripts/reset-pins-for-setup.ts
 *   DATABASE_URL="file:../data/seed-rakeeza.db" npx tsx scripts/reset-pins-for-setup.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    data: { mustChangePassword: true },
  });

  // Keep snaswig as Admin (رئيس المحكمة)
  await prisma.user.updateMany({
    where: { email: 'snaswig@moj.gov.sa' },
    data: { role: 'Admin' },
  });

  const snaswig = await prisma.user.findUnique({
    where: { email: 'snaswig@moj.gov.sa' },
    select: { email: true, role: true, mustChangePassword: true, name: true },
  });

  console.log(
    JSON.stringify(
      {
        updated: result.count,
        snaswig,
        db: process.env.DATABASE_URL || '(default from .env)',
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
