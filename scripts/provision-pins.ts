import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();

function pin6() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function main() {
  const employees = await prisma.employee.findMany({
    where: { active: true, NOT: { email: null } },
  });
  const rows: string[][] = [['الاسم', 'البريد', 'رمز المرور (6 أرقام)', 'الدور']];
  const used = new Set<string>();

  // Fixed memorable? No — random for all; president included
  for (const emp of employees) {
    const email = String(emp.email || '').trim().toLowerCase();
    if (!email.endsWith('@moj.gov.sa')) continue;
    let pin = pin6();
    while (used.has(pin + email)) pin = pin6();
    used.add(pin + email);
    const hash = await bcrypt.hash(pin, 10);

    let role = 'Employee';
    if (email === 'snaswig@moj.gov.sa') role = 'Admin';
    else if ((emp.notes || '').includes('أمين')) role = 'CourtManager';
    else {
      const pos = emp.positionId
        ? await prisma.position.findUnique({ where: { id: emp.positionId } })
        : null;
      const t = pos?.title || '';
      if (/قاضي|رئيس محكمة|رئيس تشكيل|الرئيس المساعد|ملازم/.test(t)) role = 'Judge';
      if (/أمين المحكمة/.test(t)) role = 'CourtManager';
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          name: emp.name,
          passwordHash: hash,
          mustChangePassword: false,
          employeeId: emp.id,
          role: email === 'snaswig@moj.gov.sa' ? 'Admin' : existing.role === 'Admin' && email !== 'admin@moj.gov.sa' ? existing.role : role,
          active: true,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          email,
          name: emp.name,
          passwordHash: hash,
          mustChangePassword: false,
          employeeId: emp.id,
          role,
          active: true,
        },
      });
    }
    rows.push([emp.name, email, pin, email === 'snaswig@moj.gov.sa' ? 'الرئيس' : role]);
  }

  // tech admin also gets a pin
  const techPin = pin6();
  const techHash = await bcrypt.hash(techPin, 10);
  await prisma.user.updateMany({
    where: { email: 'admin@moj.gov.sa' },
    data: { passwordHash: techHash, mustChangePassword: false, role: 'Admin' },
  });
  rows.push(['مدير النظام التقني', 'admin@moj.gov.sa', techPin, 'Admin']);

  const outDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const out = path.join(outDir, 'pins-moj.csv');
  fs.writeFileSync(out, '\uFEFF' + csv, 'utf8');
  console.log(JSON.stringify({ users: rows.length - 1, file: out }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
