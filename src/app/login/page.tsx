'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { IconFingerprint } from '@/components/Icons';
import { BRAND } from '@/lib/brand';

type Mode = 'pin' | 'setup' | 'fingerprint';

const NETWORK_HINT =
  'تعذّر الاتصال بالخادم. قد تكون شبكة الوزارة تحجب نطاق vercel.app. جرّب Ctrl+F5، أو متصفحاً آخر، أو نقطة اتصال الجوال (hotspot).';

function networkErrorMsg(err?: unknown): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'لا يوجد اتصال بالإنترنت. تحقّق من الشبكة ثم أعد المحاولة. إن كنت على شبكة الوزارة فقد يكون نطاق vercel.app محجوباً — جرّب نقطة اتصال الجوال.';
  }
  const msg = err instanceof Error ? err.message : String(err || '');
  if (
    err instanceof TypeError ||
    /failed to fetch|networkerror|load failed|fetch/i.test(msg)
  ) {
    return NETWORK_HINT;
  }
  return NETWORK_HINT;
}


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
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReg, setShowReg] = useState(false);
  const [mode, setMode] = useState<Mode>('pin');
  const [setupReady, setSetupReady] = useState(false);
  const [setupName, setSetupName] = useState('');
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef<Mode>('pin');
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  const [regMsg, setRegMsg] = useState('');
  const [reg, setReg] = useState({
    name: '',
    email: '',
    phone: '',
    nationalId: '',
    orgUnitName: '',
    pin: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/ping', { cache: 'no-store' });
        if (!res.ok && !cancelled) {
          setError((e) => e || NETWORK_HINT);
        }
      } catch (err) {
        if (!cancelled) setError(networkErrorMsg(err));
      }
    })();
    return () => {
      cancelled = true;
      if (statusTimer.current) clearTimeout(statusTimer.current);
    };
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setInfo('');
    setPin('');
    setPinConfirm('');
    setSetupReady(false);
    setSetupName('');
  };

  const checkPinStatus = useCallback(async (rawEmail: string) => {
    const e = rawEmail.trim().toLowerCase();
    if (!e || !e.endsWith('@moj.gov.sa')) {
      setSetupReady(false);
      setSetupName('');
      setInfo('');
      return;
    }
    try {
      const res = await fetch('/api/auth/pin-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSetupReady(false);
        setInfo('');
        setError(data.error || 'تعذّر التحقق من حالة الرمز');
        return;
      }
      setError('');
      if (!data.exists) {
        setSetupReady(false);
        setSetupName('');
        setInfo('الحساب غير موجود. قدّم طلب تسجيل موظف جديد (لمن ليس له حساب) أو راجع الإدارة.');
        return;
      }
      if (data.exists && !data.needsSetup) {
        if (modeRef.current !== 'pin') {
          switchMode('pin');
        } else {
          setSetupReady(false);
          setError('');
        }
        setSetupName(data.name || '');
        setInfo('الرمز مضبوط مسبقاً. استخدم تبويب «رمز الدخول» وأدخل الرمز المكوّن من ٦ أرقام.');
        return;
      }
      if (data.needsSetup) {
        if (modeRef.current !== 'setup') {
          switchMode('setup');
        } else {
          setError('');
        }
        setSetupReady(true);
        setSetupName(data.name || '');
        setInfo(data.name ? `مرحباً ${data.name} — برمّج رمز الدخول (٦ أرقام).` : 'برمّج رمز الدخول (٦ أرقام).');
      }
    } catch (err) {
      setSetupReady(false);
      setError(networkErrorMsg(err));
    }
  }, []);

  const schedulePinStatus = (value: string) => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => checkPinStatus(value), 400);
  };

  async function openRegister() {
    setRegMsg('');
    const e = (email || reg.email).trim().toLowerCase();
    if (e.endsWith('@moj.gov.sa')) {
      try {
        const res = await fetch('/api/auth/pin-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: e }),
        });
        const data = await res.json();
        if (res.ok && data.exists) {
          setShowReg(false);
          setEmail(e);
          switchMode(data.needsSetup ? 'setup' : 'pin');
          if (data.needsSetup) {
            setSetupReady(true);
            setSetupName(data.name || '');
            setInfo(
              data.name
                ? `حسابك موجود (${data.name}). برمّج رمز الدخول هنا — لا حاجة لطلب تسجيل.`
                : 'حسابك موجود. برمّج رمز الدخول هنا — لا حاجة لطلب تسجيل.',
            );
          } else {
            setInfo('حسابك موجود والرمز مضبوط. استخدم «رمز الدخول».');
          }
          return;
        }
      } catch {
        /* fall through */
      }
    }
    setShowReg(true);
    if (e) setReg((r) => ({ ...r, email: e }));
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
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
        const msg = data.error || 'فشل تسجيل الدخول';
        if (String(msg).includes('أول دخول') || String(msg).includes('لم يُبرمج')) {
          switchMode('setup');
          setEmail(email);
          setInfo('لم يُبرمج الرمز بعد — أكمل برمجة الرمز أدناه.');
          await checkPinStatus(email);
          setError('');
          return;
        }
        setError(msg);
        return;
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(networkErrorMsg(err));
    } finally {
      setLoading(false);
    }
  }

  async function onSetupPin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!setupReady) {
      setError(
        'لا يمكن برمجة الرمز الآن. إن كان الرمز مضبوطاً مسبقاً فانتقل إلى تبويب «رمز الدخول». وإلا فأدخل بريداً يحتاج أول برمجة ثم انتظر رسالة التأكيد.',
      );
      return;
    }
    if (!/^\d{6}$/.test(pin) || !/^\d{6}$/.test(pinConfirm)) {
      setError('الرمز يجب أن يكون ٦ أرقام');
      return;
    }
    if (pin !== pinConfirm) {
      setError('الرمزان غير متطابقين');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/setup-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin, pinConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || 'فشل حفظ الرمز';
        if (res.status === 409 || String(msg).includes('مسبقاً')) {
          switchMode('pin');
          setEmail(email);
          setError(
            'تم ضبط الرمز مسبقاً — استخدم تبويب «رمز الدخول» وسجّل الدخول بالرمز المكوّن من ٦ أرقام (لا تعِد البرمجة).',
          );
          return;
        }
        setError(msg);
        return;
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(networkErrorMsg(err));
    } finally {
      setLoading(false);
    }
  }

  async function onFingerprint() {
    setError('');
    setInfo('');
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
    } catch (err) {
      setRegMsg(networkErrorMsg(err));
    } finally {
      setLoading(false);
    }
  }

  const modeHint =
    mode === 'fingerprint'
      ? 'استخدم بصمة الجهاز للدخول مباشرة'
      : mode === 'setup'
        ? 'أول دخول: برمّج رمزك السري ثم احفظه'
        : 'أدخل البريد ورمز المرور المكوّن من ٦ أرقام';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-moj-light dark:bg-transparent"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-[1.75rem] border border-moj-green/10 dark:border-[#3d8f6a]/35 bg-white dark:bg-[#1a2b25] shadow-2xl p-6 sm:p-8 relative">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-gray-400 dark:text-white/45">ركيزة v5</span>
          <ThemeToggle />
        </div>

        <div className="text-center mb-6">
          <div className="mx-auto mb-4 w-24 h-24 rounded-2xl shadow-[0_0_24px_rgba(61,143,106,0.45)] ring-1 ring-[#3d8f6a]/50 overflow-hidden bg-white flex items-center justify-center p-2">
            <img src="/brand/moj-logo-gold.png" alt="شعار وزارة العدل" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-moj-green dark:text-white">{BRAND.platform}</h1>
          <p className="text-sm text-moj-gold mt-1">مكتبة المخاطبات والتعاميم</p>
          <p className="text-sm text-gray-500 dark:text-white/50 mt-2">{modeHint}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-5 text-xs">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-full border transition ${
              mode === 'pin'
                ? 'border-moj-green bg-moj-green text-white dark:border-moj-gold dark:bg-moj-gold dark:text-[#1a2b25]'
                : 'border-gray-200 dark:border-white/15 text-gray-500 dark:text-white/45 hover:text-moj-gold'
            }`}
            onClick={() => {
              setShowReg(false);
              switchMode('pin');
            }}
          >
            رمز الدخول
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-full border transition ${
              mode === 'setup'
                ? 'border-moj-green bg-moj-green/10 text-moj-green dark:border-moj-gold dark:bg-moj-gold/15 dark:text-moj-gold'
                : 'border-gray-200 dark:border-white/15 text-gray-500 dark:text-white/45 hover:text-moj-gold'
            }`}
            onClick={() => {
              setShowReg(false);
              switchMode('setup');
            }}
          >
            أول دخول — برمجة الرمز
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-full border transition ${
              mode === 'fingerprint'
                ? 'border-moj-green bg-moj-green/10 text-moj-green dark:border-moj-gold dark:bg-moj-gold/15 dark:text-moj-gold'
                : 'border-gray-200 dark:border-white/15 text-gray-500 dark:text-white/45 hover:text-moj-gold'
            }`}
            onClick={() => {
              setShowReg(false);
              switchMode('fingerprint');
            }}
          >
            البصمة
          </button>
        </div>

        {mode === 'fingerprint' ? (
          <div className="space-y-4">
            <div>
              <label className="label">البريد الإلكتروني (اختياري)</label>
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
            <p className="text-center text-xs text-gray-400 dark:text-white/40">
              البصمة خيار ثانوي — يُفضَّل الدخول بالرمز بعد برمجته.
            </p>
          </div>
        ) : mode === 'setup' ? (
          <form onSubmit={onSetupPin} className="space-y-4">
            <div>
              <label className="label">البريد الإلكتروني</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => {
                  const v = e.target.value;
                  setEmail(v);
                  setSetupReady(false);
                  setInfo('');
                  setError('');
                  schedulePinStatus(v);
                }}
                onBlur={() => checkPinStatus(email)}
                placeholder="name@moj.gov.sa"
                required
                dir="ltr"
              />
              <p className="text-xs text-gray-400 dark:text-white/35 mt-1">يجب أن ينتهي بـ @moj.gov.sa</p>
            </div>
            {info && (
              <div className="text-sm text-moj-green dark:text-moj-gold bg-moj-light dark:bg-white/5 rounded-xl p-2">
                {info}
              </div>
            )}
            {setupReady && (
              <>
                <div>
                  <label className="label">رمز الدخول الجديد (٦ أرقام)</label>
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
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="label">تأكيد الرمز</label>
                  <input
                    className="input tracking-[0.4em] text-center text-lg"
                    type="password"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    dir="ltr"
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 rounded-xl p-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn-primary w-full py-3.5 rounded-2xl"
              disabled={loading || !setupReady}
              title={setupName || undefined}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ الرمز والدخول'}
            </button>
          </form>
        ) : (
          <form onSubmit={onLogin} className="space-y-4">
            <div>
              <label className="label">البريد الإلكتروني</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => {
                  const v = e.target.value;
                  setEmail(v);
                  setError('');
                  schedulePinStatus(v);
                }}
                onBlur={() => checkPinStatus(email)}
                placeholder="name@moj.gov.sa"
                required
                dir="ltr"
                autoComplete="username"
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
            {info && (
              <div className="text-sm text-moj-green dark:text-moj-gold bg-moj-light dark:bg-white/5 rounded-xl p-2">
                {info}
              </div>
            )}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 rounded-xl p-2">
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary w-full py-3.5 rounded-2xl" disabled={loading}>
              {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </button>
            <p className="text-center text-xs text-gray-400 dark:text-white/40">
              أول مرة ولم يُبرمج الرمز؟ اختر «أول دخول — برمجة الرمز» أعلاه (ليس طلب تسجيل).
            </p>
          </form>
        )}
      </div>

      <p className="text-center text-[11px] text-gray-400 dark:text-white/35 mt-4 relative z-10">
        ليس لديك حساب في الدليل؟{' '}
        <button type="button" className="underline hover:text-moj-gold" onClick={() => openRegister()}>
          اطلب تسجيلاً جديداً من الرئيس
        </button>
      </p>

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
