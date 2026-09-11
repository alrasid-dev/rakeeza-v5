'use client';

import { useEffect, useMemo, useState } from 'react';
import { addressEmployee } from '@/lib/honorific';

type OrgUnit = { id: string; name: string };
type Employee = {
  id: string;
  name: string;
  orgUnitId?: string | null;
  orgUnit?: { id: string; name: string } | null;
  position?: { title?: string | null; honorific?: string | null } | null;
};

export default function RecipientCascade({
  value,
  onChange,
}: {
  value: string;
  onChange: (addressLine: string, meta?: { employeeId?: string; orgUnitId?: string }) => void;
}) {
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orgUnitId, setOrgUnitId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/org').then((r) => r.json()),
      fetch('/api/employees').then((r) => r.json()),
    ])
      .then(([org, emp]) => {
        setOrgUnits(org.orgUnits || []);
        setEmployees(emp.employees || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      orgUnitId
        ? employees.filter((e) => e.orgUnitId === orgUnitId || e.orgUnit?.id === orgUnitId)
        : employees,
    [employees, orgUnitId],
  );

  function pickEmployee(id: string) {
    setEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    const line = addressEmployee(emp);
    onChange(line, { employeeId: emp.id, orgUnitId: emp.orgUnitId || orgUnitId || undefined });
  }

  if (loading) {
    return <div className="text-xs text-gray-500">جاري تحميل الدليل…</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          className={!manual ? 'text-moj-green font-semibold underline' : 'text-gray-500'}
          onClick={() => setManual(false)}
        >
          اختيار من الدليل
        </button>
        <span className="text-moj-gold">|</span>
        <button
          type="button"
          className={manual ? 'text-moj-green font-semibold underline' : 'text-gray-500'}
          onClick={() => setManual(true)}
        >
          إدخال يدوي
        </button>
      </div>

      {!manual ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="label">الوحدة / القسم</label>
            <select
              className="input"
              value={orgUnitId}
              onChange={(e) => {
                setOrgUnitId(e.target.value);
                setEmployeeId('');
              }}
            >
              <option value="">— اختر القسم —</option>
              {orgUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">الموظف</label>
            <select
              className="input"
              value={employeeId}
              disabled={false}
              onChange={(e) => pickEmployee(e.target.value)}
            >
              <option value="">— اختر الموظف —</option>
              {filtered.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.position?.title ? ` — ${e.position.title}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <input
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="مثال: زميلنا الأستاذ / …"
        />
      )}

      {value && !manual && (
        <div className="rounded-lg bg-moj-light/60 border border-moj-green/20 px-3 py-2 text-sm">
          <span className="text-moj-green font-semibold">إلى: </span>
          {value}
        </div>
      )}
    </div>
  );
}
