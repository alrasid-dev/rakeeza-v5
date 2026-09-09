'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('كلمة المرور يجب ألا تقل عن 8 أحرف');
      return;
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
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
    }, 800);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-moj-light p-4" dir="rtl">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-4">
        <h1 className="text-xl font-bold text-moj-green">تغيير كلمة المرور (أول دخول)</h1>
        <p className="text-sm text-gray-600">يجب تغيير كلمة المرور الافتراضية قبل المتابعة.</p>
        <div>
          <label className="label">كلمة المرور الجديدة</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" required />
        </div>
        <div>
          <label className="label">تأكيد كلمة المرور</label>
          <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} dir="ltr" required />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {ok && <div className="text-sm text-moj-green">تم التغيير بنجاح...</div>}
        <button className="btn-primary w-full" type="submit">حفظ والمتابعة</button>
      </form>
    </div>
  );
}
