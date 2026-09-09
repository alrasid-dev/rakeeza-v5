'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { buildLetterHtml, copyOutlookHtml } from '@/lib/outlook-clipboard';

type Doc = {
  id: string;
  number: string | null;
  subject: string;
  status: string;
  dateGregorian: string | null;
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

  async function copyOutlook() {
    if (!doc) return;
    const html = buildLetterHtml(doc);
    const ok = await copyOutlookHtml(html);
    setMsg(ok ? 'تم النسخ لـ Outlook' : 'فشل النسخ');
  }

  if (!doc) {
    return (
      <AppShell user={user}>
        <div>جاري التحميل...</div>
      </AppShell>
    );
  }

  const fields = JSON.parse(doc.fieldsJson || '{}');

  return (
    <AppShell user={user}>
      <PageHeader
        title={doc.subject || 'مكاتبة'}
        subtitle={doc.number || 'بدون رقم'}
        actions={
          <>
            {!doc.number && (
              <button className="btn-primary" onClick={issue}>إصدار برقم</button>
            )}
            <button className="btn-outline" onClick={archive}>أرشفة</button>
            <a className="btn-outline" href={`/api/export/docx?id=${doc.id}`}>DOCX</a>
            <a className="btn-outline" href={`/api/export/pdf?id=${doc.id}`}>PDF</a>
            <button className="btn-gold" onClick={copyOutlook}>نسخ Outlook HTML</button>
            {doc.number && (
              <a className="btn-outline" href={`/verify/${encodeURIComponent(doc.number)}`} target="_blank">
                التحقق العام
              </a>
            )}
          </>
        }
      />
      {msg && <div className="mb-3 text-sm text-moj-green bg-white border rounded p-2">{msg}</div>}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border p-6 space-y-3 font-arabic">
          <div className="text-center text-moj-green font-bold">المحكمة العمالية بالرياض</div>
          <div>الرقم: <span dir="ltr">{doc.number || '—'}</span></div>
          <div>التاريخ: {doc.dateGregorian || '—'}</div>
          <div>الموضوع: {doc.subject}</div>
          <div>إلى: {doc.recipients}</div>
          {doc.parties && <div>الأطراف: {doc.parties}</div>}
          {doc.facts && (
            <div>
              <div className="font-semibold text-moj-green">الوقائع</div>
              <pre className="whitespace-pre-wrap text-sm">{doc.facts}</pre>
            </div>
          )}
          {doc.reasons && (
            <div>
              <div className="font-semibold text-moj-green">الأسباب</div>
              <pre className="whitespace-pre-wrap text-sm">{doc.reasons}</pre>
            </div>
          )}
          {doc.studyFields && (
            <div>
              <div className="font-semibold text-moj-green">الدراسة</div>
              <pre className="whitespace-pre-wrap text-sm">{doc.studyFields}</pre>
            </div>
          )}
          <div>
            <div className="font-semibold text-moj-green">النص</div>
            <pre className="whitespace-pre-wrap text-sm">{doc.body}</pre>
          </div>
          <div className="text-center text-xs text-gray-500 border-t pt-2">للاستخدام الداخلي فقط</div>
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
          </div>
        </div>
      </div>
    </AppShell>
  );
}
