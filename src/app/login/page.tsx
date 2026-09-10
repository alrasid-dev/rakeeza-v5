'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { IconFingerprint } from '@/components/Icons';

function bufToB64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReg, setShowReg] = useState(false);
  const [mode, setMode] = useState<'pin' | 'fingerprint'>('fingerprint');
  const [regMsg, setRegMsg] = useState('');
  const [reg, setReg] = useState({
    name: '',
    email: '',
    phone: '',
    nationalId: '',
    orgUnitName: '',
    pin: '',
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(pin)) {
      setError('رمز المرور ٦ أرقام فقط');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل تسجيل الدخول');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }

  async function onFingerprint() {
    setError('');
    setLoading(true);
    try {
      if (!window.PublicKeyCredential) {
        setError('هذا الجهاز لا يدعم البصمة');
        return;
      }
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const cred = (await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        },
      })) as PublicKeyCredential | null;
      if (!cred) {
        setError('أُلغي التحقق بالبصمة');
        return;
      }
      const credentialId = bufToB64(cred.rawId);
      const res = await fetch('/api/auth/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', credentialId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'البصمة غير مسجّلة. ادخل بالرمز مرة ثم فعّل البصمة من الرئيسية.');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('تعذّر الدخول بالبصمة. استخدم الرمز المكوّن من ٦ أرقام.');
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegMsg('');
    setError('');
    if (!/^\d{6}$/.test(reg.pin)) {
      setRegMsg('رمز المرور المقترح ٦ أرقام فقط');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reg, password: reg.pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegMsg(data.error || 'فشل إرسال الطلب');
        return;
      }
      setRegMsg(data.message || 'تم إرسال الطلب وبانتظار موافقة الرئيس');
      setReg({ name: '', email: '', phone: '', nationalId: '', orgUnitName: '', pin: '' });
    } catch {
      setRegMsg('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-moj-light dark:bg-transparent"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-[1.75rem] border border-moj-green/10 dark:border-[#3d8f6a]/35 bg-white dark:bg-[#1a2b25] shadow-2xl p-6 sm:p-8 relative">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            className="text-xs text-gray-400 dark:text-white/45 hover:text-moj-green dark:hover:text-moj-gold"
            onClick={() => {
              setMode('pin');
              setError('');
            }}
          >
            استعادة
          </button>
          <ThemeToggle />
        </div>

        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-[4.5rem] h-[4.5rem] rounded-2xl shadow-[0_0_24px_rgba(61,143,106,0.45)] ring-1 ring-[#3d8f6a]/50 overflow-hidden">
            <img src="/logo.svg" alt="شعار ركيزة" className="w-full h-full" />
          </div>
          <h1 className="text-2xl font-bold text-moj-green dark:text-white">الدخول إلى ركيزة</h1>
          <p className="text-sm text-gray-500 dark:text-white/50 mt-2">
            {mode === 'fingerprint'
              ? 'استخدم بصمة الجهاز للدخول مباشرة'
              : 'أدخل البريد ورمز المرور المكوّن من ٦ أرقام'}
          </p>
        </div>

        {mode === 'fingerprint' ? (
          <div className="space-y-4">
            <div>
              <label className="label">البريد الإلكتروني</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@moj.gov.sa"
                dir="ltr"
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 rounded-xl p-2">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={onFingerprint}
              disabled={loading}
              className="btn-primary w-full py-3.5 rounded-2xl text-base gap-2"
            >
              <IconFingerprint size={20} />
              {loading ? 'جاري التحقق...' : 'الدخول بالبصمة'}
            </button>
            <div className="flex flex-wrap justify-center gap-4 pt-2 text-xs text-gray-400 dark:text-white/40">
              <button type="button" className="hover:text-moj-gold" onClick={() => setMode('pin')}>
                رمز الدخول
              </button>
              <button
                type="button"
                className="hover:text-moj-gold"
                onClick={() => {
                  setShowReg(true);
                  setRegMsg('');
                }}
              >
                أول دخول
              </button>
            </div>
          </div>
        ) : (
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
              <p className="text-xs text-gray-400 dark:text-white/35 mt-1">يجب أن ينتهي بـ @moj.gov.sa</p>
            </div>
            <div>
              <label className="label">رمز المرور (٦ أرقام)</label>
              <input
                className="input tracking-[0.4em] text-center text-lg"
                type="password"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                dir="ltr"
                autoComplete="one-time-code"
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 rounded-xl p-2">
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary w-full py-3.5 rounded-2xl" disabled={loading}>
              {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </button>
            <div className="flex flex-wrap justify-center gap-4 pt-1 text-xs text-gray-400 dark:text-white/40">
              <button type="button" className="hover:text-moj-gold" onClick={() => setMode('fingerprint')}>
                الدخول بالبصمة
              </button>
              <button
                type="button"
                className="hover:text-moj-gold"
                onClick={() => {
                  setShowReg(true);
                  setRegMsg('');
                }}
              >
                تسجيل موظف جديد
              </button>
            </div>
          </form>
        )}
      </div>

      {showReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-lg rounded-3xl shadow-xl border border-moj-gold/30 bg-white dark:bg-[#1a2b25] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-moj-green dark:text-white">طلب تسجيل موظف جديد</h2>
              <button type="button" className="text-gray-500 dark:text-white/50" onClick={() => setShowReg(false)}>
                إغلاق
              </button>
            </div>
            <form onSubmit={onRegister} className="space-y-3">
              <div>
                <label className="label">الاسم الكامل</label>
                <input className="input" required value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} />
              </div>
              <div>
                <label className="label">البريد (@moj.gov.sa)</label>
                <input
                  className="input"
                  type="email"
                  required
                  dir="ltr"
                  value={reg.email}
                  onChange={(e) => setReg({ ...reg, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">الجوال</label>
                  <input className="input" dir="ltr" value={reg.phone} onChange={(e) => setReg({ ...reg, phone: e.target.value })} />
                </div>
                <div>
                  <label className="label">رقم الهوية</label>
                  <input
                    className="input"
                    dir="ltr"
                    value={reg.nationalId}
                    onChange={(e) => setReg({ ...reg, nationalId: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">الوحدة التنظيمية</label>
                <input
                  className="input"
                  value={reg.orgUnitName}
                  onChange={(e) => setReg({ ...reg, orgUnitName: e.target.value })}
                />
              </div>
              <div>
                <label className="label">رمز مرور مقترح (٦ أرقام)</label>
                <input
                  className="input tracking-[0.4em] text-center"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  dir="ltr"
                  value={reg.pin}
                  onChange={(e) => setReg({ ...reg, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                />
              </div>
              {regMsg && <div className="text-sm text-moj-green dark:text-moj-gold bg-moj-light dark:bg-white/5 rounded-xl p-2">{regMsg}</div>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                إرسال للرئيس
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
