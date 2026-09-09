'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { parsePaste } from '@/lib/parse-paste';

type Template = { id: string; name: string; category: string };
type User = { name: string; role: string };

export default function NewDocumentPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [paste, setPaste] = useState('');
  const [form, setForm] = useState({
    subject: '',
    recipients: '',
    parties: '',
    facts: '',
    reasons: '',
    studyFields: '',
    body: '',
    dateGregorian: new Date().toISOString().slice(0, 10),
    docType: 'مكاتبة',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
    fetch('/api/templates').then((r) => r.json()).then((d) => setTemplates(d.templates || []));
  }, []);

  function applyPaste() {
    const parsed = parsePaste(paste);
    setForm((f) => ({
      ...f,
      subject: parsed.subject || f.subject,
      recipients: parsed.recipients || f.recipients,
      parties: parsed.parties || f.parties,
      facts: parsed.facts || f.facts,
      reasons: parsed.reasons || f.reasons,
      studyFields: parsed.studyFields || f.studyFields,
      body: parsed.body || f.body,
      dateGregorian: parsed.date || f.dateGregorian,
    }));
    setStep(3);
  }

  async function save(issue: boolean) {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, templateId: templateId || null, issue, assignNumber: issue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل الحفظ');
        return;
      }
      router.push(`/documents/${data.document.id}`);
    } catch {
      setError('خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell user={user}>
      <PageHeader title="مكاتبة جديدة" subtitle="معالج من 3 خطوات مع صندوق لصق ذكي" />
      <div className="flex gap-2 mb-4 text-sm">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => setStep(n)}
            className={`px-3 py-1 rounded-full ${step === n ? 'bg-moj-green text-white' : 'bg-white border'}`}
          >
            {n === 1 ? 'القالب' : n === 2 ? 'اللصق الذكي' : 'الحقول'}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <label className="label">اختر قالباً (اختياري)</label>
          <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">— بدون قالب / حر —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.category === 'freeform' ? 'حر' : 'وثيقة'})
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={() => setStep(2)}>التالي</button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <label className="label">الصق نص المكاتبة بالكامل — سيتم توزيع الحقول تلقائياً</label>
          <textarea
            className="input min-h-[220px] font-arabic"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={`مثال:\nالرقم: ...\nالتاريخ: ...\nالموضوع: بشأن ...\nإلى: ...\nالوقائع:\n...\nالأسباب:\n...`}
          />
          <div className="flex gap-2">
            <button className="btn-primary" onClick={applyPaste}>توزيع الحقول</button>
            <button className="btn-outline" onClick={() => setStep(3)}>تخطي</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">الموضوع</label>
              <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label className="label">التاريخ</label>
              <input className="input" type="date" value={form.dateGregorian} onChange={(e) => setForm({ ...form, dateGregorian: e.target.value })} />
            </div>
            <div>
              <label className="label">إلى / المستلمون</label>
              <input className="input" value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} />
            </div>
            <div>
              <label className="label">الأطراف</label>
              <input className="input" value={form.parties} onChange={(e) => setForm({ ...form, parties: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">الوقائع</label>
            <textarea className="input min-h-[80px]" value={form.facts} onChange={(e) => setForm({ ...form, facts: e.target.value })} />
          </div>
          <div>
            <label className="label">الأسباب / الحيثيات</label>
            <textarea className="input min-h-[80px]" value={form.reasons} onChange={(e) => setForm({ ...form, reasons: e.target.value })} />
          </div>
          <div>
            <label className="label">حقول الدراسة</label>
            <textarea className="input min-h-[60px]" value={form.studyFields} onChange={(e) => setForm({ ...form, studyFields: e.target.value })} />
          </div>
          <div>
            <label className="label">نص المكاتبة</label>
            <textarea className="input min-h-[140px]" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-2 flex-wrap">
            <button className="btn-outline" disabled={saving} onClick={() => save(false)}>حفظ مسودة</button>
            <button className="btn-primary" disabled={saving} onClick={() => save(true)}>إصدار برقم صادر</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
