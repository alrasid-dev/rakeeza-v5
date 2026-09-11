'use client';

import { useMemo, useState } from 'react';
import { addressEmployee, addressEmployees } from '@/lib/honorific';

type Emp = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  orgUnitId: string | null;
  orgUnitName: string | null;
  positionTitle: string | null;
  honorific: string | null;
};

export default function DirectoryClient({
  initial,
}: {
  initial: { orgUnits: { id: string; name: string }[]; employees: Emp[] };
}) {
  const [orgUnitId, setOrgUnitId] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState('');

  const inDept = useMemo(
    () =>
      orgUnitId
        ? initial.employees.filter((e) => e.orgUnitId === orgUnitId)
        : initial.employees,
    [initial.employees, orgUnitId],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllDept() {
    setSelected(new Set(inDept.map((e) => e.id)));
  }

  function clearSel() {
    setSelected(new Set());
  }

  function selectAllDeptsEmployees() {
    setSelected(new Set(initial.employees.map((e) => e.id)));
  }

  const selectedEmps = initial.employees.filter((e) => selected.has(e.id));
  const addressBlock = addressEmployees(
    selectedEmps.map((e) => ({
      name: e.name,
      position: { title: e.positionTitle, honorific: e.honorific || '' },
    })),
  );

  async function copyAddresses() {
    try {
      await navigator.clipboard.writeText(addressBlock);
      setCopied('تم نسخ عناوين المخاطبة');
    } catch {
      setCopied('فشل النسخ');
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 space-y-3">
        <div className="bg-white dark:bg-[var(--surface)] rounded-xl border p-3">
          <div className="text-sm font-semibold text-moj-green mb-2">الأقسام</div>
          <button
            type="button"
            onClick={() => setOrgUnitId('')}
            className={`w-full text-right px-3 py-2 rounded-lg text-sm mb-1 ${!orgUnitId ? 'bg-moj-green text-white' : 'hover:bg-moj-light'}`}
          >
            الكل ({initial.employees.length})
          </button>
          {initial.orgUnits.map((u) => {
            const count = initial.employees.filter((e) => e.orgUnitId === u.id).length;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setOrgUnitId(u.id)}
                className={`w-full text-right px-3 py-2 rounded-lg text-sm mb-1 ${orgUnitId === u.id ? 'bg-moj-green text-white' : 'hover:bg-moj-light'}`}
              >
                {u.name} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" className="btn-outline text-sm" onClick={selectAllDept}>
            تحديد الكل
          </button>
          <button type="button" className="btn-outline text-sm" onClick={clearSel}>
            إلغاء تحديد الكل
          </button>
          {!orgUnitId && (
            <button type="button" className="btn-outline text-sm" onClick={selectAllDeptsEmployees}>
              تحديد الكل (كل الأقسام)
            </button>
          )}
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={!selected.size}
            onClick={copyAddresses}
          >
            نسخ المخاطبة ({selected.size})
          </button>
          {copied && <span className="text-xs text-moj-green">{copied}</span>}
        </div>

        {selected.size > 0 && (
          <div className="rounded-xl border border-moj-gold/40 bg-moj-gold/10 p-3 text-sm whitespace-pre-wrap font-arabic">
            <div className="text-xs text-moj-green font-bold mb-1">معاينة المخاطبة (زميلنا الأستاذ / زميلتنا الأستاذة)</div>
            {addressBlock}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {inDept.map((e) => {
            const checked = selected.has(e.id);
            const line = addressEmployee({
              name: e.name,
              position: { title: e.positionTitle, honorific: e.honorific || '' },
            });
            return (
              <label
                key={e.id}
                className={`card-surface rounded-2xl p-4 border cursor-pointer transition min-h-[6.5rem] ${
                  checked ? 'border-moj-green ring-2 ring-moj-green/30' : 'border-moj-green/15'
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    onChange={() => toggle(e.id)}
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-moj-green text-sm leading-snug">{line}</div>
                    <div className="text-xs text-gray-600 mt-1">{e.positionTitle || '—'}</div>
                    <div className="text-xs">{e.orgUnitName || '—'}</div>
                    {e.email && (
                      <div className="text-[11px] text-gray-500 mt-1" dir="ltr">
                        {e.email}
                      </div>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
          {inDept.length === 0 && (
            <div className="text-gray-500 col-span-full">لا يوجد موظفون في هذا القسم.</div>
          )}
        </div>
      </div>
    </div>
  );
}
