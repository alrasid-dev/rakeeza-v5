'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import OfficialPaperPreview from '@/components/OfficialPaperPreview';
import { parsePaste } from '@/lib/parse-paste';

export default function ImportPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [result, setResult] = useState<{
    text?: string;
    classification?: Record<string, unknown>;
    fileName?: string;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  async function onFile(file: File) {
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/import/file', { method: 'POST', body: fd });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  const parsed = result?.text ? parsePaste(result.text) : null;

  return (
    <AppShell user={user}>
      <PageHeader title="الاستيراد الذكي" subtitle="استخراج نص من DOCX/XLSX/TXT + تصنيف محلي + معاينة رسمية" />
      <div className="bg-white rounded-xl border p-6 max-w-3xl space-y-4 mb-4">
        <label className="btn-primary cursor-pointer inline-flex">
          {loading ? 'جاري المعالجة...' : 'اختر ملفاً'}
          <input
            type="file"
            className="hidden"
            accept=".docx,.xlsx,.xls,.csv,.txt,.html,.md"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
        {result && (
          <div className="space-y-3">
            <div className="text-sm">الملف: {result.fileName}</div>
            {result.classification && (
              <pre className="bg-moj-light rounded p-3 text-xs overflow-auto" dir="ltr">
                {JSON.stringify(result.classification, null, 2)}
              </pre>
            )}
            {parsed && (
              <div className="text-sm space-y-1 bg-moj-light/50 rounded-lg p-3 border border-moj-green/20">
                <div><span className="font-semibold text-moj-green">إلى:</span> {parsed.recipients || '—'}</div>
                <div><span className="font-semibold text-moj-green">الموضوع:</span> {parsed.subject || '—'}</div>
                <div><span className="font-semibold text-moj-green">صفوف الجدول:</span> {parsed.tableRows.length}</div>
              </div>
            )}
            {result.text && (
              <pre className="bg-gray-50 border rounded p-3 text-sm whitespace-pre-wrap max-h-96 overflow-auto">
                {result.text.slice(0, 5000)}
              </pre>
            )}
            {result.error && <div className="text-red-600">{result.error}</div>}
            {parsed && (
              <a
                className="btn-primary inline-flex"
                href={`/documents/new?form=import-paste&name=${encodeURIComponent('مستورد')}`}
                onClick={() => {
                  try {
                    sessionStorage.setItem(
                      'rakeeza-draft:import-paste',
                      JSON.stringify({
                        formSlug: 'import-paste',
                        step: 3,
                        paste: result.text,
                        form: {
                          subject: parsed.subject,
                          recipients: parsed.recipients,
                          parties: parsed.parties,
                          facts: parsed.facts,
                          reasons: parsed.reasons,
                          studyFields: parsed.studyFields,
                          body: parsed.body,
                          dateGregorian: parsed.date || new Date().toISOString().slice(0, 10),
                          docType: 'مستورد',
                          tableRowsJson: JSON.stringify(parsed.tableRows),
                        },
                        updatedAt: Date.now(),
                      }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
              >
                فتح في معالج المكاتبة
              </a>
            )}
          </div>
        )}
      </div>
      {parsed && (
        <div className="max-w-3xl">
          <div className="text-sm font-medium text-gray-500 mb-2">معاينة رسمية للمستخرج</div>
          <OfficialPaperPreview
            doc={{
              number: parsed.number || null,
              subject: parsed.subject,
              dateGregorian: parsed.date || null,
              recipients: parsed.recipients,
              parties: parsed.parties,
              facts: parsed.facts,
              reasons: parsed.reasons,
              studyFields: parsed.studyFields,
              body: parsed.body,
              tableRows: parsed.tableRows,
            }}
          />
        </div>
      )}
    </AppShell>
  );
}
