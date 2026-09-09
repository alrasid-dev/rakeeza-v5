'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';

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

  return (
    <AppShell user={user}>
      <PageHeader title="الاستيراد الذكي" subtitle="استخراج نص من DOCX/XLSX/TXT + تصنيف محلي" />
      <div className="bg-white rounded-xl border p-6 max-w-3xl space-y-4">
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
            {result.text && (
              <pre className="bg-gray-50 border rounded p-3 text-sm whitespace-pre-wrap max-h-96 overflow-auto">
                {result.text.slice(0, 5000)}
              </pre>
            )}
            {result.error && <div className="text-red-600">{result.error}</div>}
          </div>
        )}
      </div>
    </AppShell>
  );
}
