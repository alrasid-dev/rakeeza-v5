import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, audit } from '@/lib/auth';
import { ensureTemplates } from '@/lib/ensure-templates';

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  await ensureTemplates();
  // المرحلة الثانية: جلب القوالب المفعلة فقط (isActive = true) للمستخدمين
  const templates = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json({ templates });
}

// المرحلة الثانية: تحديث حالة تفعيل/تعطيل قالب (للمشرف Admin فقط)
export async function PATCH(req: NextRequest) {
  const s = await getSession();
  if (!s || s.role !== 'Admin') return NextResponse.json({ error: 'ممنوع' }, { status: 403 });
  const body = await req.json();
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'معرّف القالب مطلوب' }, { status: 400 });
  const isActive = body.isActive === true;
  const template = await prisma.template.update({ where: { id }, data: { isActive } });
  await audit(
    isActive ? 'activate_template' : 'deactivate_template',
    'Template',
    template.id,
    template.name,
    s.id,
  );
  return NextResponse.json({ template });
}
