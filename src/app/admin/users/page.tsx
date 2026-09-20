'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';

type U = { id: string; email: string; name: string; role: string; active: boolean; mustChangePassword: boolean };

export default function AdminUsersPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [users, setUsers] = useState<U[]>([]);
  const [form, setForm] = useState({ email: '', name: '', role: 'Employee', pin: '' });
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

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'فشل');
      return;
    }
    setForm({ email: '', name: '', role: 'Employee', pin: '' });
    load();
  }

  return (
    <AppShell user={user}>
      <PageHeader title="المستخدمون" subtitle="الرئيس فقط — البريد @moj.gov.sa · يُربط بسجل موظف تلقائياً" />
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      <form onSubmit={create} className="bg-white border rounded-xl p-4 grid md:grid-cols-5 gap-2 mb-4">
        <input className="input" placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" placeholder="email@moj.gov.sa" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="Admin">الرئيس (Admin)</option>
          <option value="CourtManager">الأمين (CourtManager)</option>
          <option value="Secretary">الأمين (Secretary)</option>
          <option value="Judge">قاضي (Judge)</option>
          <option value="Employee">موظف (Employee)</option>
        </select>
        <input
          className="input"
          dir="ltr"
          inputMode="numeric"
          maxLength={6}
          placeholder="رمز أولي (٦ أرقام) — اختياري"
          title="اتركه فارغاً ليبرمج الموظف رمزه بنفسه عند أول دخول"
          value={form.pin}
          onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
        />
        <button className="btn-primary" type="submit">إضافة</button>
      </form>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد</th>
              <th>الدور</th>
              <th>يتطلب برمجة الرمز</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td dir="ltr">{u.email}</td>
                <td>{u.role}</td>
                <td>{u.mustChangePassword ? 'نعم' : 'لا'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
