import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, audit } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'ملف مطلوب' }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
  let imported = 0;
  for (const row of rows) {
    const name = row['الاسم'] || row['name'] || row['Name'];
    if (!name) continue;
    await prisma.employee.create({
      data: {
        name: String(name),
        email: row['البريد'] || row['email'] || null,
        phone: row['الجوال'] || row['phone'] || null,
        nationalId: row['الهوية'] || row['nationalId'] || null,
      },
    });
    imported++;
  }
  await audit('import_employees', 'Employee', undefined, `count=${imported}`, s.id);
  return NextResponse.json({ imported });
}
