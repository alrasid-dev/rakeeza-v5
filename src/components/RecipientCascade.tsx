'use client';

import { useEffect, useMemo, useState } from 'react';
import { addressEmployee, addressEmployees } from '@/lib/honorific';

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
  onChange: (addressLine: string, meta?: { employeeIds?: string[]; orgUnitIds?: string[] }) => void;
}) {
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orgUnitId, setOrgUnitId] = useState('');
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<string>>(new Set());
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(true);
  const [multiDept, setMultiDept] = useState(false);

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

  const filtered = useMemo(() => {
    if (multiDept && selectedDeptIds.size > 0) {
      return employees.filter(
        (e) => selectedDeptIds.has(e.orgUnitId || '') || selectedDeptIds.has(e.orgUnit?.id || ''),
      );
    }
    if (orgUnitId) {
      return employees.filter((e) => e.orgUnitId === orgUnitId || e.orgUnit?.id === orgUnitId);
    }
    return employees;
  }, [employees, orgUnitId, multiDept, selectedDeptIds]);

  function emitSelection(nextEmpIds: Set<string>, nextDeptIds?: Set<string>) {
    const emps = employees.filter((e) => nextEmpIds.has(e.id));
    const line = addressEmployees(
      emps.map((e) => ({
        name: e.name,
        position: e.position,
      })),
    );
    const deptIds = nextDeptIds
      ? Array.from(nextDeptIds)
      : Array.from(
          new Set(
            emps
              .map((e) => e.orgUnitId || e.orgUnit?.id || '')
              .filter(Boolean) as string[],
          ),
        );
    onChange(line, { employeeIds: Array.from(nextEmpIds), orgUnitIds: deptIds });
  }

  function toggleEmp(id: string) {
    setSelectedEmpIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      emitSelection(next);
      return next;
    });
  }

  function selectAllEmployees() {
    const next = new Set(filtered.map((e) => e.id));
    setSelectedEmpIds(next);
    emitSelection(next);
  }

  function deselectAllEmployees() {
    const next = new Set<string>();
    setSelectedEmpIds(next);
    emitSelection(next);
  }

  function toggleDept(id: string) {
    setSelectedDeptIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllDepartments() {
    setSelectedDeptIds(new Set(orgUnits.map((u) => u.id)));
  }

  function deselectAllDepartments() {
    setSelectedDeptIds(new Set());
  }

  if (loading) {
    return <div className="text-xs text-gray-500">جاري تحميل الدليل…</div>;
  }

  const allEmpSelected = filtered.length > 0 && filtered.every((e) => selectedEmpIds.has(e.id));
  const allDeptSelected = orgUnits.length > 0 && orgUnits.every((u) => selectedDeptIds.has(u.id));

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
        {!manual && (
          <>
            <span className="text-moj-gold">|</span>
            <button
              type="button"
              className={multiDept ? 'text-moj-green font-semibold underline' : 'text-gray-500'}
              onClick={() => setMultiDept((v) => !v)}
            >
              {multiDept ? 'قسم واحد' : 'أقسام متعددة'}
            </button>
          </>
        )}
      </div>

      {!manual ? (
        <div className="space-y-3">
          {!multiDept ? (
            <div>
              <label className="label">الوحدة / القسم</label>
              <select
                className="input"
                value={orgUnitId}
                onChange={(e) => {
                  setOrgUnitId(e.target.value);
                  setSelectedEmpIds(new Set());
                  onChange('');
                }}
              >
                <option value="">— كل الأقسام —</option>
                {orgUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-xl border border-moj-green/20 p-2 space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-moj-green">الأقسام</span>
                <button type="button" className="btn-outline text-[11px] px-2 py-1" onClick={selectAllDepartments}>
                  {allDeptSelected ? '✓ ' : ''}تحديد الكل
                </button>
                <button type="button" className="btn-outline text-[11px] px-2 py-1" onClick={deselectAllDepartments}>
                  إلغاء تحديد الكل
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-36 overflow-auto">
                {orgUnits.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-moj-light/50">
                    <input
                      type="checkbox"
                      checked={selectedDeptIds.has(u.id)}
                      onChange={() => toggleDept(u.id)}
                    />
                    <span>{u.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-moj-green/20 p-2 space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-moj-green">
                الموظفون {orgUnitId || selectedDeptIds.size ? '(القسم)' : ''}
              </span>
              <button
                type="button"
                className="btn-outline text-[11px] px-2 py-1"
                onClick={selectAllEmployees}
                disabled={!filtered.length}
              >
                {allEmpSelected ? '✓ ' : ''}تحديد الكل
              </button>
              <button
                type="button"
                className="btn-outline text-[11px] px-2 py-1"
                onClick={deselectAllEmployees}
              >
                إلغاء تحديد الكل
              </button>
              <span className="text-[11px] text-gray-500">{selectedEmpIds.size} محدد</span>
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-auto">
              {filtered.map((e) => {
                const checked = selectedEmpIds.has(e.id);
                const line = addressEmployee(e);
                return (
                  <label
                    key={e.id}
                    className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded cursor-pointer ${
                      checked ? 'bg-moj-light/70 ring-1 ring-moj-green/30' : 'hover:bg-moj-light/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={() => toggleEmp(e.id)}
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-moj-green">{line}</span>
                      {e.position?.title && (
                        <span className="block text-[10px] text-gray-500">{e.position.title}</span>
                      )}
                    </span>
                  </label>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-xs text-gray-500 px-2 py-2">لا يوجد موظفون في التصفية الحالية.</div>
              )}
            </div>
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
        <div className="rounded-lg bg-moj-light/60 border border-moj-green/20 px-3 py-2 text-sm whitespace-pre-wrap">
          <span className="text-moj-green font-semibold">إلى: </span>
          {value}
        </div>
      )}
    </div>
  );
}
