/**
 * Import employees from an Excel/CSV file.
 * Usage: npx tsx scripts/import-employees.ts ./employees.xlsx
 */
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error('Usage: npx tsx scripts/import-employees.ts <file.xlsx|csv>');
    process.exit(1);
  }
  const wb = XLSX.readFile(file);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
  let n = 0;
  for (const row of rows) {
    const name = row['الاسم'] || row['name'] || row['Name'];
    if (!name) continue;
    const email = row['البريد'] || row['email'] || null;
    const phone = row['الجوال'] || row['phone'] || null;
    await prisma.employee.create({
      data: {
        name: String(name),
        email: email ? String(email) : null,
        phone: phone ? String(phone) : null,
      },
    });
    n++;
  }
  console.log(`Imported ${n} employees`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
