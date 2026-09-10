import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, audit } from '@/lib/auth';
import { isAdmin } from '@/lib/roles';

/** Admin (الرئيس): list registration requests */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !isAdmin(s.role)) {
    return NextResponse.json({ error: 'ممنوع — للرئيس فقط' }, { status: 403 });
  }
  const status = req.nextUrl.searchParams.get('status') || undefined;
  const rows = await prisma.registrationRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      nationalId: true,
      orgUnitName: true,
      status: true,
      note: true,
      reviewedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ requests: rows });
}

/** Admin: approve or reject — body: { id, action: 'approve'|'reject', note?, role? } */
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s || !isAdmin(s.role)) {
    return NextResponse.json({ error: 'ممنوع — للرئيس فقط' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const id = String(body.id || '');
    const action = String(body.action || '');
    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'id و action (approve|reject) مطلوبان' }, { status: 400 });
    }
    const row = await prisma.registrationRequest.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    if (row.status !== 'pending') {
      return NextResponse.json({ error: 'الطلب تمت معالجته مسبقاً' }, { status: 400 });
    }

    if (action === 'reject') {
      await prisma.registrationRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          note: body.note ? String(body.note) : row.note,
          reviewedById: s.id,
          reviewedAt: new Date(),
        },
      });
      await audit('reject_registration', 'RegistrationRequest', id, row.email, s.id);
      return NextResponse.json({ ok: true, status: 'rejected' });
    }

    // approve: create Employee + User linked
    const role = ['Employee', 'Judge', 'CourtManager', 'Secretary', 'Admin'].includes(body.role)
      ? body.role
      : 'Employee';

    let orgUnitId: string | undefined;
    if (row.orgUnitName) {
      const ou = await prisma.orgUnit.findFirst({ where: { name: row.orgUnitName } });
      if (ou) orgUnitId = ou.id;
    }

    const employee = await prisma.employee.create({
      data: {
        name: row.name,
        email: row.email,
        phone: row.phone,
        nationalId: row.nationalId,
        orgUnitId,
        active: true,
      },
    });

    const user = await prisma.user.create({
      data: {
        email: row.email,
        name: row.name,
        passwordHash: row.passwordHash,
        role,
        mustChangePassword: true,
        active: true,
        employeeId: employee.id,
      },
    });

    await prisma.registrationRequest.update({
      where: { id },
      data: {
        status: 'approved',
        note: body.note ? String(body.note) : row.note,
        reviewedById: s.id,
        reviewedAt: new Date(),
      },
    });

    await audit('approve_registration', 'RegistrationRequest', id, `${row.email} -> User ${user.id}`, s.id);
    return NextResponse.json({
      ok: true,
      status: 'approved',
      user: { id: user.id, email: user.email, role: user.role },
      employee: { id: employee.id, name: employee.name },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'خطأ داخلي' }, { status: 500 });
  }
}
