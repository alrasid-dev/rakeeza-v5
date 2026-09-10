'use client';

import { useState } from 'react';

function bufToB64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

export default function FingerprintEnable({ email }: { email: string }) {
  const [msg, setMsg] = useState('');
  async function enable() {
    setMsg('');
    try {
      if (!window.PublicKeyCredential) {
        setMsg('الجهاز لا يدعم البصمة');
        return;
      }
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const userId = new TextEncoder().encode(email);
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'ركيزة', id: window.location.hostname },
          user: { id: userId, name: email, displayName: email },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;
      if (!cred) return;
      const credentialId = bufToB64(cred.rawId);
      const res = await fetch('/api/auth/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', credentialId }),
      });
      const data = await res.json();
      setMsg(res.ok ? 'تم تفعيل البصمة على هذا الجهاز' : data.error || 'فشل التفعيل');
    } catch {
      setMsg('تعذّر تفعيل البصمة');
    }
  }
  return (
    <div className="rounded-xl border border-moj-gold/40 bg-white p-3 flex items-center justify-between gap-3">
      <div>
        <div className="font-bold text-moj-green text-sm">البصمة</div>
        <div className="text-xs text-gray-500">بعد الدخول بالرمز يمكنك تفعيل البصمة لهذا الجهاز</div>
        {msg && <div className="text-xs mt-1 text-moj-green">{msg}</div>}
      </div>
      <button type="button" className="btn-outline text-sm whitespace-nowrap" onClick={enable}>
        تفعيل البصمة
      </button>
    </div>
  );
}
