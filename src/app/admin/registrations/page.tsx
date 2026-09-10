'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';

type R = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  nationalId?: string | null;
  orgUnitName?: string | null;
  status: string;
  note?: string | null;
  createdAt: string;
};

export default function RegistrationsInboxPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [rows, setRows] = useState<R[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');

  async function load() {
    const me = await fetch('/api/auth/me').then((r) => r.json());
    setUser(me.user);
    const q = filter ? `?status=${filter}` : '';
    const res = await fetch(`/api/auth/registration-requests${q}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'ممنوع');
      return;
    }
    setError('');
    setRows(data.requests || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function act(id: string, action: 'approve' | 'reject') {
    const res = await fetch('/api/auth/registration-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, role: 'Employee' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'فشل');
      return;
    }
    load();
  }

  return (
    <AppShell user={user}>
      <PageHeader title="طلبات التسجيل" subtitle="صندوق وارد الرئيس — موافقة أو رفض طلبات الموظفين الجدد" />
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      <div className="flex gap-2 mb-4">
        {['pending', 'approved', 'rejected', ''].map((f) => (
          <button
            key={f || 'all'}
            type="button"
            onClick={() => setFilter(f)}
            className={filter === f ? 'btn-primary' : 'btn-outline'}
          >
            {f === 'pending' ? 'معلقة' : f === 'approved' ? 'موافق عليها' : f === 'rejected' ? 'مرفوضة' : 'الكل'}
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد</th>
              <th>الجوال</th>
              <th>الوحدة</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-6">
                  لا توجد طلبات
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td dir="ltr">{r.email}</td>
                <td dir="ltr">{r.phone || '—'}</td>
                <td>{r.orgUnitName || '—'}</td>
                <td>
                  {r.status === 'pending' ? 'معلق' : r.status === 'approved' ? 'موافق' : 'مرفوض'}
                </td>
                <td className="space-x-reverse space-x-2">
                  {r.status === 'pending' && (
                    <>
                      <button type="button" className="btn-primary text-xs py-1" onClick={() => act(r.id, 'approve')}>
                        موافقة
                      </button>
                      <button type="button" className="btn-outline text-xs py-1" onClick={() => act(r.id, 'reject')}>
                        رفض
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
