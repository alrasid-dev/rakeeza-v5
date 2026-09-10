/**
 * Provision User accounts for every Employee with a valid @moj.gov.sa email.
 * All users get a placeholder password hash and mustChangePassword=true so they
 * program their own PIN on first login via POST /api/auth/setup-pin.
 *
 * Optionally reads data/pins-moj.csv for role hints (never commits it).
 *
 * Usage:
 *   DATABASE_URL="file:/workspace/rakeeza-v5/data/rakeeza.db" npx tsx scripts/provision-users-for-setup.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const PLACEHOLDER_PIN = '000000';

function normEmail(s: string) {
  return String(s || '').trim().toLowerCase();
}

/** Parse "name","email","pin","role" rows from pins-moj.csv into email → role. */
function parseCsvRoles(csvPath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(csvPath)) return map;
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  for (let i = 1; i < lines.length; i++) {
    const cols: string[] = [];
    let cur = '';
    let inQ = false;
    for (let j = 0; j < lines[i].length; j++) {
      const ch = lines[i][j];
      if (ch === '"') {
        if (inQ && lines[i][j + 1] === '"') {
          cur += '"';
          j++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === ',' && !inQ) {
        cols.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    const email = normEmail(cols[1] || '');
    const roleRaw = String(cols[3] || '').trim();
    if (!email.endsWith('@moj.gov.sa')) continue;

    let role = 'Employee';
    if (email === 'snaswig@moj.gov.sa' || email === 'admin@moj.gov.sa') {
      role = 'Admin';
    } else if (roleRaw === 'الرئيس') {
      // CSV marks court president; only snaswig should get Admin this way
      role = email === 'snaswig@moj.gov.sa' ? 'Admin' : 'Employee';
    } else if (['Judge', 'CourtManager', 'Secretary', 'Employee', 'Admin'].includes(roleRaw)) {
      role = roleRaw;
    }
    map.set(email, role);
  }
  return map;
}

async function roleFromEmployee(emp: {
  email: string | null;
  notes: string | null;
  positionId: string | null;
}): Promise<string> {
  const email = normEmail(emp.email || '');
  if (email === 'snaswig@moj.gov.sa' || email === 'admin@moj.gov.sa') return 'Admin';
  if ((emp.notes || '').includes('أمين')) return 'CourtManager';
  const pos = emp.positionId
    ? await prisma.position.findUnique({ where: { id: emp.positionId } })
    : null;
  const t = pos?.title || '';
  if (/أمين المحكمة/.test(t)) return 'CourtManager';
  if (/قاضي|رئيس محكمة|رئيس تشكيل|الرئيس المساعد|ملازم/.test(t)) return 'Judge';
  return 'Employee';
}

async function main() {
  const csvPath = path.join(process.cwd(), 'data', 'pins-moj.csv');
  const csvRoles = parseCsvRoles(csvPath);
  const placeholderHash = await bcrypt.hash(PLACEHOLDER_PIN, 10);

  const employees = await prisma.employee.findMany({
    where: { active: true, NOT: { email: null } },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const emp of employees) {
    const email = normEmail(emp.email || '');
    if (!email.endsWith('@moj.gov.sa')) {
      skipped++;
      continue;
    }

    let role =
      csvRoles.get(email) ||
      (await roleFromEmployee({
        email: emp.email,
        notes: emp.notes,
        positionId: emp.positionId,
      }));

    if (email === 'snaswig@moj.gov.sa' || email === 'admin@moj.gov.sa') role = 'Admin';

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          name: emp.name,
          passwordHash: placeholderHash,
          mustChangePassword: true,
          employeeId: emp.id,
          role,
          active: true,
        },
      });
      updated++;
    } else {
      await prisma.user.create({
        data: {
          email,
          name: emp.name,
          passwordHash: placeholderHash,
          mustChangePassword: true,
          employeeId: emp.id,
          role,
          active: true,
        },
      });
      created++;
    }
  }

  // Technical seed admin (may have no employee row)
  const adminEmail = 'admin@moj.gov.sa';
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (admin) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        role: 'Admin',
        mustChangePassword: true,
        active: true,
        passwordHash: placeholderHash,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'مدير النظام التقني',
        role: 'Admin',
        mustChangePassword: true,
        active: true,
        passwordHash: placeholderHash,
      },
    });
    created++;
  }

  await prisma.user.updateMany({ data: { mustChangePassword: true } });

  const totalUsers = await prisma.user.count();
  const totalEmployees = await prisma.employee.count();
  const mustChange = await prisma.user.count({ where: { mustChangePassword: true } });
  const withEmp = await prisma.user.count({ where: { NOT: { employeeId: null } } });
  const amhumaidi = await prisma.user.findUnique({
    where: { email: 'amhumaidi@moj.gov.sa' },
    select: {
      email: true,
      name: true,
      role: true,
      employeeId: true,
      mustChangePassword: true,
      active: true,
    },
  });
  const snaswig = await prisma.user.findUnique({
    where: { email: 'snaswig@moj.gov.sa' },
    select: {
      email: true,
      name: true,
      role: true,
      employeeId: true,
      mustChangePassword: true,
      active: true,
    },
  });
  const adminOut = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: {
      email: true,
      role: true,
      employeeId: true,
      mustChangePassword: true,
      active: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        created,
        updated,
        skipped,
        totalUsers,
        totalEmployees,
        mustChangePassword: mustChange,
        usersWithEmployeeId: withEmp,
        csvRolesLoaded: csvRoles.size,
        amhumaidi,
        snaswig,
        admin: adminOut,
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
