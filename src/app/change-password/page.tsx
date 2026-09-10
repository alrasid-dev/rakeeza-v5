'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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
    if (!res.ok) {
      setError(data.error || 'فشل التغيير');
      return;
    }
    setOk(true);
    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 600);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-moj-light p-4" dir="rtl">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-4">
        <h1 className="text-xl font-bold text-moj-green">تغيير رمز المرور</h1>
        <p className="text-sm text-gray-600">الرمز مكوّن من ٦ أرقام فقط. لا كلمات سر طويلة.</p>
        <div>
          <label className="label">الرمز الجديد</label>
          <input className="input tracking-[0.4em] text-center" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} dir="ltr" required />
        </div>
        <div>
          <label className="label">تأكيد الرمز</label>
          <input className="input tracking-[0.4em] text-center" inputMode="numeric" maxLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))} dir="ltr" required />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {ok && <div className="text-sm text-moj-green">تم الحفظ...</div>}
        <button className="btn-primary w-full" type="submit">حفظ</button>
      </form>
    </div>
  );
}
