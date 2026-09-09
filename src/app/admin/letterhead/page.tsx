'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';

export default function AdminLetterheadPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [lh, setLh] = useState<{ header: string; footer: string; logoUrl: string } | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
    fetch('/api/letterhead').then((r) => r.json()).then((d) => setLh(d.letterhead));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!lh) return;
    const res = await fetch('/api/letterhead', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lh),
    });
    const data = await res.json();
    if (res.ok) {
      setLh(data.letterhead);
      setMsg('تم الحفظ');
    } else setMsg(data.error || 'فشل');
  }

  return (
    <AppShell user={user}>
      <PageHeader title="الترويسة والتذييل" />
      {lh && (
        <form onSubmit={save} className="bg-white border rounded-xl p-4 max-w-xl space-y-3">
          <div>
            <label className="label">الترويسة</label>
            <textarea className="input min-h-[100px]" value={lh.header} onChange={(e) => setLh({ ...lh, header: e.target.value })} />
          </div>
          <div>
            <label className="label">التذييل</label>
            <input className="input" value={lh.footer} onChange={(e) => setLh({ ...lh, footer: e.target.value })} />
          </div>
          <div>
            <label className="label">شعار</label>
            <input className="input" dir="ltr" value={lh.logoUrl} onChange={(e) => setLh({ ...lh, logoUrl: e.target.value })} />
          </div>
          <button className="btn-primary" type="submit">حفظ</button>
          {msg && <div className="text-sm text-moj-green">{msg}</div>}
        </form>
      )}
    </AppShell>
  );
}
