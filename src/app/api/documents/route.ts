import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, audit } from '@/lib/auth';
import { nextDocumentNumber } from '@/lib/numbering';
import QRCode from 'qrcode';

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const archived = req.nextUrl.searchParams.get('archived') === '1';
  const docs = await prisma.document.findMany({
    where: { archived },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const body = await req.json();
  const issue = Boolean(body.issue);
  let number = body.number || null;
  if (issue || body.assignNumber) {
    number = await nextDocumentNumber();
  }
  const origin = req.nextUrl.origin;
  const qrPayload = number ? `${origin}/verify/${encodeURIComponent(number)}` : null;
  let qrDataUrl: string | null = null;
  if (qrPayload) {
    try {
      qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 160 });
    } catch {
      qrDataUrl = null;
    }
  }
  const doc = await prisma.document.create({
    data: {
      number,
      docType: body.docType || 'مكاتبة',
      status: issue ? 'issued' : 'draft',
      subject: body.subject || '',
      dateHijri: body.dateHijri || null,
      dateGregorian: body.dateGregorian || new Date().toISOString().slice(0, 10),
      recipients: body.recipients || '',
      parties: body.parties || '',
      facts: body.facts || '',
      reasons: body.reasons || '',
      studyFields: body.studyFields || '',
      body: body.body || '',
      fieldsJson: JSON.stringify({ ...(body.fields || {}), qrDataUrl }),
      templateId: body.templateId || null,
      createdById: s.id,
      qrPayload,
      archived: false,
    },
  });
  await audit('create_document', 'Document', doc.id, doc.number || undefined, s.id);
  return NextResponse.json({ document: doc });
}
