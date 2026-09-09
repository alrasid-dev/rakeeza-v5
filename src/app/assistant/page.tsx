'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';

export default function AssistantPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  async function run() {
    setLoading(true);
    const res = await fetch('/api/ai/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context }),
    });
    const data = await res.json();
    setResult(data.text || data.error || '');
    setSource(data.source || '');
    setLoading(false);
  }

  return (
    <AppShell user={user}>
      <PageHeader title="المساعد الذكي" subtitle="محلي افتراضياً — OpenAI اختياري عبر OPENAI_API_KEY" />
      <div className="bg-white rounded-xl border p-4 space-y-3 max-w-3xl">
        <div>
          <label className="label">الطلب</label>
          <textarea className="input min-h-[100px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="مثال: اقترح صياغة موضوع بشأن إحالة طلب..." />
        </div>
        <div>
          <label className="label">سياق (اختياري)</label>
          <textarea className="input min-h-[80px]" value={context} onChange={(e) => setContext(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={run} disabled={loading || !prompt}>
          {loading ? '...' : 'مساعدة'}
        </button>
        {result && (
          <div className="bg-moj-light rounded-lg p-3 whitespace-pre-wrap text-sm">
            {source && <div className="text-xs text-moj-gold mb-2">المصدر: {source}</div>}
            {result}
          </div>
        )}
      </div>
    </AppShell>
  );
}
