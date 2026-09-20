'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';

export default function SettingsPasswordPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!/^\d{6}$/.test(pin)) {
      setError('رمز المرور ٦ أرقام فقط');
      return;
    }
    if (pin !== confirm) {
      setError('الرمزان غير متطابقين');
      return;
    }
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (res.ok) {
      setPin('');
      setConfirm('');
      setMsg('تم تغيير رمز المرور');
    } else {
      setError(data.error || 'فشل');
    }
  }

  return (
    <AppShell user={user}>
      <PageHeader title="تغيير رمز المرور" subtitle="الرمز مكوّن من ٦ أرقام فقط — لا كلمات سر طويلة" />
      <form onSubmit={save} className="bg-white border rounded-xl p-4 max-w-md space-y-3">
        <div>
          <label className="label">الرمز الجديد</label>
          <input
            className="input tracking-[0.4em] text-center"
            inputMode="numeric"
            maxLength={6}
            dir="ltr"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </div>
        <div>
          <label className="label">تأكيد الرمز</label>
          <input
            className="input tracking-[0.4em] text-center"
            inputMode="numeric"
            maxLength={6}
            dir="ltr"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {msg && <div className="text-sm text-moj-green">{msg}</div>}
        <button className="btn-primary" type="submit">حفظ</button>
      </form>
    </AppShell>
  );
}
