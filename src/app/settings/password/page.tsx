'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';

export default function SettingsPasswordPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setMsg(res.ok ? 'تم التغيير' : data.error || 'فشل');
  }

  return (
    <AppShell user={user}>
      <PageHeader title="تغيير كلمة المرور" />
      <form onSubmit={save} className="bg-white border rounded-xl p-4 max-w-md space-y-3">
        <input className="input" type="password" dir="ltr" placeholder="كلمة مرور جديدة" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <button className="btn-primary" type="submit">حفظ</button>
        {msg && <div className="text-sm">{msg}</div>}
      </form>
    </AppShell>
  );
}
