'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';

type Emp = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  orgUnit?: { name: string } | null;
  position?: { title: string; honorific: string } | null;
};

export default function EmployeesPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const [u, e] = await Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/employees').then((r) => r.json()),
    ]);
    setUser(u.user);
    setEmployees(e.employees || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    if (res.ok) {
      setName('');
      setEmail('');
      load();
    }
  }

  async function onImport(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/employees/import', { method: 'POST', body: fd });
    const data = await res.json();
    setMsg(res.ok ? `تم استيراد ${data.imported}` : data.error || 'فشل');
    load();
  }

  return (
    <AppShell user={user}>
      <PageHeader title="الموظفون" subtitle="إدارة واستيراد Excel" />
      <form onSubmit={add} className="bg-white rounded-xl border p-4 mb-4 grid md:grid-cols-3 gap-3">
        <input className="input" placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" placeholder="البريد" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
        <button className="btn-primary" type="submit">إضافة</button>
      </form>
      <div className="mb-4 flex items-center gap-3">
        <label className="btn-outline cursor-pointer">
          استيراد Excel
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
        </label>
        {msg && <span className="text-sm text-moj-green">{msg}</span>}
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>المنصب</th>
              <th>اللقب</th>
              <th>الوحدة</th>
              <th>البريد</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.name}</td>
                <td>{emp.position?.title || '—'}</td>
                <td>{emp.position?.honorific || '—'}</td>
                <td>{emp.orgUnit?.name || '—'}</td>
                <td dir="ltr">{emp.email || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
