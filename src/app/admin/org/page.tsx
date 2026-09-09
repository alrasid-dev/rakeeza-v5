'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';

export default function AdminOrgPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [orgUnits, setOrgUnits] = useState<{ id: string; name: string; court?: { name: string } | null }[]>([]);
  const [courts, setCourts] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState('');

  async function load() {
    setUser((await fetch('/api/auth/me').then((r) => r.json())).user);
    const data = await fetch('/api/org').then((r) => r.json());
    setOrgUnits(data.orgUnits || []);
    setCourts(data.courts || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, courtId: courts[0]?.id }),
    });
    setName('');
    load();
  }

  return (
    <AppShell user={user}>
      <PageHeader title="الوحدات التنظيمية" subtitle={courts[0]?.name || ''} />
      <form onSubmit={add} className="flex gap-2 mb-4">
        <input className="input max-w-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الوحدة" required />
        <button className="btn-primary" type="submit">إضافة</button>
      </form>
      <ul className="bg-white border rounded-xl divide-y">
        {orgUnits.map((o) => (
          <li key={o.id} className="px-4 py-2">{o.name}</li>
        ))}
      </ul>
    </AppShell>
  );
}
