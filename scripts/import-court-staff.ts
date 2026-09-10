import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

function norm(s: any) {
  return String(s ?? '')
    .replace(/\r/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function emailOf(s: string) {
  const e = norm(s).toLowerCase();
  return e.includes('@moj.gov.sa') ? e : '';
}

async function findOrCreatePosition(title: string, honorific = 'سعادة') {
  const t = norm(title) || 'موظف إداري';
  let p = await prisma.position.findFirst({ where: { title: t } });
  if (!p) p = await prisma.position.create({ data: { title: t, honorific, rank: 40 } });
  return p;
}

async function matchOrg(dept: string) {
  const d = norm(dept);
  if (!d || d === 'غير مسكن') return null;
  const units = await prisma.orgUnit.findMany();
  // exact / contains
  let hit = units.find((u) => u.name === d || d.includes(u.name) || u.name.includes(d));
  if (hit) return hit.id;
  // loose tokens
  const tokens = d.split(/[\/\-\s]+/).filter((x) => x.length > 2);
  hit = units.find((u) => tokens.some((t) => u.name.includes(t)));
  return hit?.id ?? null;
}

async function upsertEmployee(data: {
  name: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  jobTitle?: string;
  dept?: string;
  notes?: string;
  honorific?: string;
}) {
  const name = norm(data.name);
  if (!name) return null;
  const email = data.email ? emailOf(data.email) : '';
  let emp =
    (email && (await prisma.employee.findFirst({ where: { email } }))) ||
    (await prisma.employee.findFirst({ where: { name } }));
  const pos = await findOrCreatePosition(data.jobTitle || 'موظف إداري', data.honorific || 'سعادة');
  const orgUnitId = await matchOrg(data.dept || '');
  const payload = {
    name,
    email: email || null,
    phone: norm(data.phone) || null,
    nationalId: norm(data.nationalId) || null,
    positionId: pos.id,
    orgUnitId: orgUnitId || null,
    notes: norm(data.notes) || null,
    active: true,
  };
  if (emp) {
    emp = await prisma.employee.update({ where: { id: emp.id }, data: payload });
  } else {
    emp = await prisma.employee.create({ data: payload });
  }
  return emp;
}

async function main() {
  const root = path.join(process.cwd(), 'reference-models/employees');

  // Main roster
  const wb3 = XLSX.readFile(path.join(root, 'emp3.xlsx'));
  const roster = XLSX.utils.sheet_to_json(wb3.Sheets['الكل'], { defval: '' }) as any[];
  let n = 0;
  for (const r of roster) {
    const emp = await upsertEmployee({
      name: r['الاسم'],
      nationalId: r['السجل المدني'],
      email: r['البريد الرسمي'],
      jobTitle: r['المسمى الوظيفي بالنظام'],
      dept: r['القسم/الإدارة'],
      phone: r['رقم التواصل'],
      notes: [r['حالة الموظف'], r['في حالة معار-منقول-مكلف'], r['ملاحظات']].filter(Boolean).join(' | '),
      honorific: 'سعادة',
    });
    if (emp) n++;
  }

  // Judges
  const wb2 = XLSX.readFile(path.join(root, 'emp2.xlsx'));
  const judges = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { defval: '' }) as any[];
  let j = 0;
  for (const r of judges) {
    const name = norm(r['القاضي']);
    if (!name) continue;
    const title = name.startsWith('مكلف') ? 'رئيس محكمة مكلف' : 'قاضي';
    const honorific = title.includes('مكلف') ? 'فضيلة رئيس المحكمة المكلف' : 'فضيلة القاضي';
    await upsertEmployee({
      name: name.replace(/^مكلف\s+/, ''),
      email: r['البريد الالكتروني'],
      jobTitle: title,
      dept: 'الدوائر القضائية',
      notes: `التشكيل: ${norm(r['التشكيل ']) || norm(r['التشكيل'])}`,
      honorific,
    });
    j++;
  }

  // Trainees (ملازمون) + their trainers
  const wb1 = XLSX.readFile(path.join(root, 'emp1.xlsx'));
  const rows1 = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]], { defval: '' }) as any[];
  let t = 0;
  for (const r of rows1) {
    const trainee = norm(r['اسم الملازم']);
    if (trainee) {
      await upsertEmployee({
        name: trainee,
        email: r['البريد الالكتروني'],
        phone: r['رقم جوال الملازم'],
        jobTitle: 'ملازم قضائي',
        dept: 'الدوائر القضائية',
        notes: `تشكيل ${norm(r['التشكيل'])} · قاضي مدرب: ${norm(r['القاضي المدرب'])}`,
        honorific: 'فضيلة',
      });
      t++;
    }
    const trainer = norm(r['القاضي المدرب']);
    if (trainer) {
      await upsertEmployee({
        name: trainer.replace(/^مكلف\s+/, ''),
        jobTitle: trainer.startsWith('مكلف') ? 'رئيس محكمة مكلف' : 'قاضي',
        dept: 'الدوائر القضائية',
        honorific: trainer.startsWith('مكلف') ? 'فضيلة رئيس المحكمة المكلف' : 'فضيلة القاضي',
      });
    }
  }

  // Court president account
  const presidentPos = await findOrCreatePosition('رئيس محكمة', 'فضيلة رئيس المحكمة');
  const headUnit = await prisma.orgUnit.findFirst({ where: { name: 'رئيس المحكمة' } });
  let president = await prisma.employee.findFirst({
    where: { OR: [{ email: 'snaswig@moj.gov.sa' }, { name: 'سعد ناصر عبد العزيز الصويغ' }] },
  });
  if (!president) {
    president = await prisma.employee.create({
      data: {
        name: 'سعد ناصر عبد العزيز الصويغ',
        email: 'snaswig@moj.gov.sa',
        positionId: presidentPos.id,
        orgUnitId: headUnit?.id,
        notes: 'رئيس المحكمة — المالك',
        active: true,
      },
    });
  } else {
    president = await prisma.employee.update({
      where: { id: president.id },
      data: {
        name: 'سعد ناصر عبد العزيز الصويغ',
        email: 'snaswig@moj.gov.sa',
        positionId: presidentPos.id,
        orgUnitId: headUnit?.id,
        notes: 'رئيس المحكمة — المالك',
        active: true,
      },
    });
  }

  const hash = await bcrypt.hash('ChangeMe123!', 10);
  const existingUser = await prisma.user.findUnique({ where: { email: 'snaswig@moj.gov.sa' } });
  if (existingUser) {
    await prisma.user.update({
      where: { email: 'snaswig@moj.gov.sa' },
      data: {
        name: 'سعد ناصر عبد العزيز الصويغ',
        role: 'Admin',
        employeeId: president.id,
        mustChangePassword: true,
        active: true,
        passwordHash: hash,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        email: 'snaswig@moj.gov.sa',
        name: 'سعد ناصر عبد العزيز الصويغ',
        role: 'Admin',
        employeeId: president.id,
        mustChangePassword: true,
        active: true,
        passwordHash: hash,
      },
    });
  }

  // Keep technical seed admin as Admin too but label differently
  await prisma.user.updateMany({
    where: { email: 'admin@moj.gov.sa' },
    data: { role: 'Admin', name: 'مدير النظام التقني' },
  });

  const empCount = await prisma.employee.count();
  const userCount = await prisma.user.count();
  console.log(JSON.stringify({ roster: n, judges: j, trainees: t, employees: empCount, users: userCount, president: president.email }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
