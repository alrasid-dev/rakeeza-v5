'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';

export default function AdminNumberingPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [rule, setRule] = useState<{ pattern: string; prefix: string; year: number; nextSeq: number } | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
    fetch('/api/numbering').then((r) => r.json()).then((d) => setRule(d.rule));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!rule) return;
    const res = await fetch('/api/numbering', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    const data = await res.json();
    if (res.ok) {
      setRule(data.rule);
      setMsg('تم الحفظ');
    } else setMsg(data.error || 'فشل');
  }

  return (
    <AppShell user={user}>
      <PageHeader title="قاعدة الترقيم" subtitle="صادر-{year}-{seq}" />
      {rule && (
        <form onSubmit={save} className="bg-white border rounded-xl p-4 max-w-lg space-y-3">
          <div>
            <label className="label">النمط</label>
            <input className="input" value={rule.pattern} onChange={(e) => setRule({ ...rule, pattern: e.target.value })} />
          </div>
          <div>
            <label className="label">البادئة</label>
            <input className="input" value={rule.prefix} onChange={(e) => setRule({ ...rule, prefix: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">السنة</label>
              <input className="input" type="number" value={rule.year} onChange={(e) => setRule({ ...rule, year: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">التسلسل التالي</label>
              <input className="input" type="number" value={rule.nextSeq} onChange={(e) => setRule({ ...rule, nextSeq: Number(e.target.value) })} />
            </div>
          </div>
          <button className="btn-primary" type="submit">حفظ</button>
          {msg && <div className="text-sm text-moj-green">{msg}</div>}
        </form>
      )}
    </AppShell>
  );
}
