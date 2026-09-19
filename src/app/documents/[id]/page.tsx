'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import OfficialPaperPreview, { normalizeBodyText } from '@/components/OfficialPaperPreview';
import ExportToolbar from '@/components/ExportToolbar';
import type { StudySections } from '@/lib/parse-study';
import type { DocStyle } from '@/components/StyleToolbar';
import { normalizePaperLayout, type PaperLayoutId } from '@/lib/paper-layouts';

type Doc = {
  id: string;
  number: string | null;
  subject: string;
  status: string;
  dateGregorian: string | null;
  dateHijri: string | null;
  recipients: string;
  parties: string;
  facts: string;
  reasons: string;
  studyFields: string;
  body: string;
  fieldsJson: string;
  qrPayload: string | null;
  docType: string;
};

export default function DocumentDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [msg, setMsg] = useState('');

  async function load() {
    const [u, d] = await Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch(`/api/documents/${id}`).then((r) => r.json()),
    ]);
    setUser(u.user);
    setDoc(d.document);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function issue() {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue: true }),
    });
    const data = await res.json();
    if (res.ok) {
      setDoc(data.document);
      setMsg('تم الإصدار');
    }
  }

  async function archive() {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true, status: 'archived' }),
    });
    if (res.ok) {
      setMsg('تم الأرشفة');
      load();
    }
  }

  if (!doc) {
    return (
      <AppShell user={user}>
        <div>جاري التحميل...</div>
      </AppShell>
    );
  }

  const fields = JSON.parse(doc.fieldsJson || '{}') as {
    qrDataUrl?: string;
    tableRows?: { name: string; id?: string; extra?: string }[];
    judgmentCard?: { label: string; value: string }[];
    judgmentBriefing?: boolean;
    briefingTitle?: string;
    judgmentPriority?: string;
    observationText?: string;
    mechanismText?: string;
    studySections?: StudySections;
    style?: DocStyle;
    paperLayout?: PaperLayoutId | string;
    copyTo?: string;
  };
  const paperLayout = normalizePaperLayout(fields.paperLayout);
  const bodyOnce = normalizeBodyText(doc.body);

  return (
    <AppShell user={user}>
      <PageHeader
        title={doc.subject || 'مكاتبة'}
        subtitle={doc.number || 'بدون رقم'}
        actions={
          <>
            {!doc.number && (
              <button className="btn-primary" onClick={issue}>
                إصدار برقم رسمي
              </button>
            )}
            <button className="btn-outline" onClick={archive}>
              أرشفة
            </button>
            {doc.number && (
              <a className="btn-outline" href={`/verify/${encodeURIComponent(doc.number)}`} target="_blank">
                التحقق العام
              </a>
            )}
          </>
        }
      />

      <div className="mb-4">
        <ExportToolbar
          doc={{
            id: doc.id,
            number: doc.number,
            subject: doc.subject,
            dateGregorian: doc.dateGregorian,
            dateHijri: doc.dateHijri,
            recipients: doc.recipients,
            copyTo: fields.copyTo,
            parties: doc.parties,
            reasons: doc.reasons,
            studyFields: doc.studyFields,
            body: bodyOnce,
            paperLayout,
            studySections: fields.studySections,
            fontFamily: fields.style?.fontFamily,
            fontSizePt: fields.style?.fontSizePt,
            qrDataUrl: fields.qrDataUrl,
            judgmentCard: fields.judgmentBriefing ? fields.judgmentCard : null,
            judgmentBriefing: Boolean(fields.judgmentBriefing),
            briefingTitle: fields.briefingTitle,
            observationText: fields.observationText,
            mechanismText: fields.mechanismText,
            judgmentPriority: fields.judgmentPriority,
            align: fields.style?.align,
          }}
          onRequestIssue={issue}
        />
      </div>

      {msg && <div className="mb-3 text-sm text-moj-green bg-white border rounded p-2">{msg}</div>}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          <div className="text-sm font-medium text-gray-500 dark:text-white/50">معاينة الخطاب</div>
          <OfficialPaperPreview
            style={fields.style}
            paperLayout={paperLayout}
            doc={{
              number: doc.number,
              subject: doc.subject,
              dateGregorian: doc.dateGregorian,
              dateHijri: doc.dateHijri,
              recipients: doc.recipients,
              copyTo: fields.copyTo,
              parties: fields.judgmentBriefing ? '' : doc.parties,
              reasons: fields.judgmentBriefing ? '' : doc.reasons,
              studyFields: fields.judgmentBriefing ? '' : doc.studyFields,
              body: bodyOnce,
              docType: doc.docType,
              qrDataUrl: fields.qrDataUrl,
              tableRows: fields.judgmentBriefing ? [] : fields.tableRows,
              judgmentCard: fields.judgmentBriefing ? fields.judgmentCard : null,
              judgmentBriefing: Boolean(fields.judgmentBriefing),
              briefingTitle: fields.briefingTitle,
              judgmentPriority: fields.judgmentPriority,
              observationText: fields.observationText || (fields.judgmentBriefing ? bodyOnce : undefined),
              mechanismText: fields.mechanismText,
              studySections: fields.judgmentBriefing ? null : fields.studySections,
              paperLayout,
            }}
          />
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="text-sm font-semibold mb-2">رمز QR</div>
            {fields.qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fields.qrDataUrl} alt="QR" className="w-40 h-40 mx-auto" />
            ) : (
              <p className="text-sm text-gray-500">يظهر بعد الإصدار برقم صادر</p>
            )}
            {doc.qrPayload && (
              <a className="text-xs text-moj-green break-all" href={doc.qrPayload} target="_blank" rel="noreferrer">
                {doc.qrPayload}
              </a>
            )}
          </div>
          <div className="bg-white rounded-xl border p-4 text-sm space-y-1">
            <div>الحالة: {doc.status}</div>
            <div>النوع: {doc.docType}</div>
            <div>التخطيط: {paperLayout}</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
