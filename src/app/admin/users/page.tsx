'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';

type U = { id: string; email: string; name: string; role: string; active: boolean; mustChangePassword: boolean };

export default function AdminUsersPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [users, setUsers] = useState<U[]>([]);
  const [form, setForm] = useState({ email: '', name: '', role: 'Employee', password: 'ChangeMe123!' });
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
    setForm({ email: '', name: '', role: 'Employee', password: 'ChangeMe123!' });
    load();
  }

  return (
    <AppShell user={user}>
      <PageHeader title="المستخدمون" subtitle="Admin فقط — البريد @moj.gov.sa" />
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      <form onSubmit={create} className="bg-white border rounded-xl p-4 grid md:grid-cols-5 gap-2 mb-4">
        <input className="input" placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" placeholder="email@moj.gov.sa" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option>Admin</option>
          <option>CourtManager</option>
          <option>Judge</option>
          <option>Employee</option>
        </select>
        <input className="input" type="password" dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn-primary" type="submit">إضافة</button>
      </form>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد</th>
              <th>الدور</th>
              <th>تغيير كلمة المرور</th>
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
