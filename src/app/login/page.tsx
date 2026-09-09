'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@moj.gov.sa');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل تسجيل الدخول');
        return;
      }
      if (data.mustChangePassword) router.push('/change-password');
      else router.push('/');
      router.refresh();
    } catch {
      setError('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-moj-light p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-moj-green/10 p-8">
        <div className="text-center mb-6">
          <img src="/logo.svg" alt="شعار" className="w-20 h-20 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-moj-green">ركيزة للمكاتبات والنماذج القضائية</h1>
          <p className="text-sm text-gray-500 mt-1">المحكمة العمالية بالرياض — الإصدار 5.0.0</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">البريد الإلكتروني</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@moj.gov.sa"
              required
              dir="ltr"
            />
            <p className="text-xs text-gray-400 mt-1">يجب أن ينتهي بـ @moj.gov.sa</p>
          </div>
          <div>
            <label className="label">كلمة المرور</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              dir="ltr"
            />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
          <button
            type="button"
            disabled
            title="قريباً"
            className="btn w-full bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            بصمة الإصبع — قريباً
          </button>
        </form>
      </div>
    </div>
  );
}
