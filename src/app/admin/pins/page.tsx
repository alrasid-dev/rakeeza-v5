'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { roleLabel } from '@/lib/roles';

type U = { id: string; email: string; name: string; role: string; active: boolean };

export default function AdminPinsPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [users, setUsers] = useState<U[]>([]);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const me = await fetch('/api/auth/me').then((r) => r.json());
    setUser(me.user);
    const res = await fetch('/api/users');
    const data = await res.json();
    if (res.ok) setUsers(data.users || []);
    else setError(data.error || 'ممنوع');
  }

  useEffect(() => {
    load();
  }, []);

  async function savePin(userId: string) {
    setError('');
    setMsg('');
    const pin = (pins[userId] || '').trim();
    if (!/^\d{6}$/.test(pin)) {
      setError('الرمز يجب أن يكون ٦ أرقام فقط');
      return;
    }
    setBusy(userId);
    try {
      const res = await fetch('/api/admin/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل الحفظ');
        return;
      }
      setMsg(`تم تعيين الرمز لـ ${data.email}`);
      setPins((prev) => ({ ...prev, [userId]: '' }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell user={user}>
      <PageHeader title="رموز الدخول" subtitle="تعيين أو إعادة تعيين رمز من ٦ أرقام — للرئيس فقط" />
      <p className="text-sm text-gray-600 dark:text-white/60 mb-4 rounded-xl border border-moj-gold/30 bg-moj-gold/5 dark:bg-moj-gold/10 px-4 py-3">
        الرموز يضيفها/يعدّلها مالك المنصة (رئيس المحكمة: snaswig@moj.gov.sa)؛ لا تُرفع ملفات CSV للإنتاج.
      </p>
      {error && <div className="text-red-600 dark:text-red-400 text-sm mb-3">{error}</div>}
      {msg && <div className="text-moj-green dark:text-moj-gold text-sm mb-3">{msg}</div>}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد</th>
              <th>الدور</th>
              <th>رمز جديد (٦ أرقام)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td dir="ltr">{u.email}</td>
                <td>{roleLabel(u.role)}</td>
                <td>
                  <input
                    className="input max-w-[9rem]"
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={pins[u.id] || ''}
                    onChange={(e) =>
                      setPins((prev) => ({
                        ...prev,
                        [u.id]: e.target.value.replace(/\D/g, '').slice(0, 6),
                      }))
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-primary text-xs py-1.5 px-3"
                    disabled={busy === u.id}
                    onClick={() => savePin(u.id)}
                  >
                    {busy === u.id ? '...' : 'حفظ'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
