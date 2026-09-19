'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; text: string; actions?: { label: string; href: string }[] };

const CHIPS = [
  { label: 'مستند جديد', href: '/documents/new' },
  { label: 'القوالب', href: '/templates' },
  { label: 'أرشيفي', href: '/archive' },
  { label: 'دليلي', href: '/directory' },
  { label: 'المساعد الكامل', href: '/assistant' },
];

export default function RakeezaAiFab() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'assistant',
      text: 'مرحباً، أنا ركيزة Ai. اسأل عن أي شاشة أو خطوة في المنصة، أو اختر اختصاراً سريعاً.',
      actions: CHIPS.map((c) => ({ label: c.label, href: c.href })),
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  async function send(text?: string) {
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: prompt }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context: 'platform-help', pathname: path }),
      });
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        {
          role: 'assistant',
          text: data.text || data.error || 'تعذر الرد الآن',
          actions: data.actions,
        },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', text: 'خطأ في الاتصال. حاول مرة أخرى.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed z-[100] print:hidden font-arabic bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] sm:bottom-6 sm:left-6 pointer-events-auto"
      dir="rtl"
      data-rakeeza-ai-fab="1"
      aria-hidden={false}
    >
      {open && (
        <div className="mb-3 w-[min(100vw-2rem,22rem)] max-h-[min(70vh,calc(100dvh-8rem))] flex flex-col rounded-3xl border border-moj-gold/40 bg-white dark:bg-[var(--surface)] dark:border-white/15 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-l from-moj-green to-[#0a8f4a] text-white px-4 py-3 flex items-center gap-3">
            <img src="/rakeeza-ai-icon.svg" alt="" className="w-10 h-10 drop-shadow" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm leading-tight">ركيزة Ai</div>
              <div className="text-[11px] text-moj-gold/95">مساعد المنصة — اسأل عن أي شيء هنا</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full w-8 h-8 bg-white/15 hover:bg-white/25 text-lg leading-none"
              aria-label="إغلاق"
            >
              ×
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b bg-moj-light/60 dark:bg-white/5 dark:border-white/10">
            {CHIPS.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                onClick={() => setOpen(false)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-white/10 border border-moj-green/20 dark:border-white/15 text-moj-green dark:text-moj-gold hover:bg-moj-green hover:text-white transition"
              >
                {c.label}
              </Link>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-[12rem]">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`text-sm whitespace-pre-wrap rounded-2xl px-3 py-2 max-w-[95%] ${
                  m.role === 'user'
                    ? 'mr-auto bg-moj-green text-white rounded-bl-md'
                    : 'ml-auto bg-moj-light dark:bg-white/10 text-gray-800 dark:text-white/90 border border-moj-green/10 dark:border-white/10 rounded-br-md'
                }`}
              >
                {m.text}
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.actions.map((a) => (
                      <Link
                        key={a.href + a.label}
                        href={a.href}
                        onClick={() => setOpen(false)}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-white/10 text-moj-green dark:text-moj-gold border border-moj-gold/50 hover:bg-moj-gold hover:text-white"
                      >
                        {a.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="text-xs text-moj-gold animate-pulse">ركيزة Ai يفكّر…</div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="p-3 border-t dark:border-white/10 flex gap-2 bg-white dark:bg-[var(--surface)]"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              className="input flex-1 rounded-full text-sm"
              placeholder="مثال: كيف أنشئ خطاباً صادراً؟"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn-primary rounded-full px-4 shrink-0" disabled={loading || !input.trim()}>
              إرسال
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-xl border-2 border-moj-gold/70 bg-gradient-to-br from-moj-green to-[#0a8f4a] hover:scale-105 active:scale-95 transition"
        aria-label="فتح ركيزة Ai"
      >
        <span className="absolute inset-0 rounded-full animate-ping bg-moj-gold/30 pointer-events-none" />
        <img src="/rakeeza-ai-icon.svg" alt="ركيزة Ai" className="relative w-10 h-10 sm:w-12 sm:h-12 mx-auto drop-shadow-lg" />
        <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-moj-gold text-white rounded-full px-1.5 py-0.5 shadow print:hidden pointer-events-none">
          Ai
        </span>
      </button>
    </div>
  );
}
