import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, audit } from '@/lib/auth';
import { nextDocumentNumber } from '@/lib/numbering';
import QRCode from 'qrcode';
import { formatHijri, looksLikeHijri, normalizeHijriDisplay, todayGregorianISO } from '@/lib/hijri';

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
      dateHijri: (() => {
        if (body.dateHijri) return String(body.dateHijri);
        if (body.dateGregorian && looksLikeHijri(String(body.dateGregorian))) {
          return normalizeHijriDisplay(String(body.dateGregorian));
        }
        if (body.dateGregorian) return formatHijri(String(body.dateGregorian));
        return formatHijri(new Date());
      })(),
      dateGregorian: (() => {
        const g = body.dateGregorian ? String(body.dateGregorian) : '';
        if (g && looksLikeHijri(g)) return todayGregorianISO();
        if (/^\d{4}-\d{2}-\d{2}/.test(g)) return g.slice(0, 10);
        return todayGregorianISO();
      })(),
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
