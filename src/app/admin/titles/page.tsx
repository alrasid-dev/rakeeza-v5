'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';

export default function AdminTitlesPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [positions, setPositions] = useState<{ id: string; title: string; honorific: string; rank: number }[]>([]);
  const [title, setTitle] = useState('');
  const [honorific, setHonorific] = useState('');

  async function load() {
    setUser((await fetch('/api/auth/me').then((r) => r.json())).user);
    const data = await fetch('/api/titles').then((r) => r.json());
    setPositions(data.positions || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/titles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, honorific }),
    });
    setTitle('');
    setHonorific('');
    load();
  }

  return (
    <AppShell user={user}>
      <PageHeader title="المناصب والألقاب" subtitle="مثال: رئيس محكمة → فضيلة رئيس المحكمة" />
      <form onSubmit={add} className="grid md:grid-cols-3 gap-2 mb-4">
        <input className="input" placeholder="المنصب" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="input" placeholder="اللقب التشريفي" value={honorific} onChange={(e) => setHonorific(e.target.value)} required />
        <button className="btn-primary" type="submit">إضافة</button>
      </form>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>المنصب</th>
              <th>اللقب</th>
              <th>الرتبة</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.honorific}</td>
                <td>{p.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
