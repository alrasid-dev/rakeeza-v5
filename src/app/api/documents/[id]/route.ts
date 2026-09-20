import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, audit } from '@/lib/auth';
import { nextDocumentNumber } from '@/lib/numbering';
import QRCode from 'qrcode';
import { formatHijri, looksLikeHijri, normalizeHijriDisplay } from '@/lib/hijri';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  return NextResponse.json({ document });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const body = await req.json();
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  let number = existing.number;
  let qrPayload = existing.qrPayload;
  const fields = JSON.parse(existing.fieldsJson || '{}');

  if (body.issue && !number) {
    number = await nextDocumentNumber();
    qrPayload = `${req.nextUrl.origin}/verify/${encodeURIComponent(number)}`;
    try {
      fields.qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 160 });
    } catch {
      /* ignore */
    }
  }

  const document = await prisma.document.update({
    where: { id },
    data: {
      number,
      qrPayload,
      docType: body.docType ?? existing.docType,
      status: body.issue ? 'issued' : body.status ?? existing.status,
      subject: body.subject ?? existing.subject,
      dateHijri: (() => {
        if (body.dateHijri != null) return body.dateHijri;
        if (body.dateGregorian) {
          const g = String(body.dateGregorian);
          if (looksLikeHijri(g)) return normalizeHijriDisplay(g);
          return formatHijri(g);
        }
        return existing.dateHijri;
      })(),
      dateGregorian: body.dateGregorian ?? existing.dateGregorian,
      recipients: body.recipients ?? existing.recipients,
      parties: body.parties ?? existing.parties,
      facts: body.facts ?? existing.facts,
      reasons: body.reasons ?? existing.reasons,
      studyFields: body.studyFields ?? existing.studyFields,
      body: body.body ?? existing.body,
      fieldsJson: JSON.stringify({ ...fields, ...(body.fields || {}) }),
      archived: body.archived ?? existing.archived,
    },
  });
  await audit('update_document', 'Document', document.id, document.number || undefined, s.id);
  return NextResponse.json({ document });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (s.role !== 'Admin') return NextResponse.json({ error: 'ممنوع' }, { status: 403 });
  await prisma.document.delete({ where: { id } });
  await audit('delete_document', 'Document', id, undefined, s.id);
  return NextResponse.json({ ok: true });
}
