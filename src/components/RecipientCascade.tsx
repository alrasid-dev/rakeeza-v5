'use client';

import { useEffect, useMemo, useState } from 'react';
import { addressEmployee, addressEmployees } from '@/lib/honorific';

type OrgUnit = { id: string; name: string };
type Employee = {
  id: string;
  name: string;
  gender?: string | null;
  notes?: string | null;
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
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [empSearch, setEmpSearch] = useState('');
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
    let list = employees;
    if (multiDept && selectedDeptIds.length > 0) {
      const set = new Set(selectedDeptIds);
      list = list.filter((e) => set.has(e.orgUnitId || '') || set.has(e.orgUnit?.id || ''));
    } else if (orgUnitId) {
      list = list.filter((e) => e.orgUnitId === orgUnitId || e.orgUnit?.id === orgUnitId);
    }
    const q = empSearch.trim();
    if (q) {
      list = list.filter(
        (e) =>
          e.name.includes(q) ||
          (e.position?.title || '').includes(q) ||
          (e.orgUnit?.name || '').includes(q),
      );
    }
    return list;
  }, [employees, orgUnitId, multiDept, selectedDeptIds, empSearch]);

  function emitSelection(nextEmpIds: string[], nextDeptIds?: string[]) {
    const idSet = new Set(nextEmpIds);
    const emps = employees.filter((e) => idSet.has(e.id));
    const line = addressEmployees(
      emps.map((e) => ({
        name: e.name,
        gender: e.gender,
        notes: e.notes,
        position: e.position,
      })),
    );
    const deptIds =
      nextDeptIds ??
      Array.from(
        new Set(
          emps
            .map((e) => e.orgUnitId || e.orgUnit?.id || '')
            .filter(Boolean) as string[],
        ),
      );
    onChange(line, { employeeIds: nextEmpIds, orgUnitIds: deptIds });
  }

  function onEmpMultiChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const ids = Array.from(e.target.selectedOptions).map((o) => o.value);
    setSelectedEmpIds(ids);
    emitSelection(ids);
  }

  function selectAllVisible() {
    const ids = filtered.map((x) => x.id);
    setSelectedEmpIds(ids);
    emitSelection(ids);
  }

  function clearEmployees() {
    setSelectedEmpIds([]);
    emitSelection([]);
  }

  function onDeptMultiChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const ids = Array.from(e.target.selectedOptions).map((o) => o.value);
    setSelectedDeptIds(ids);
    setSelectedEmpIds([]);
    onChange('');
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
        {!manual && (
          <>
            <span className="text-moj-gold">|</span>
            <button
              type="button"
              className={multiDept ? 'text-moj-green font-semibold underline' : 'text-gray-500'}
              onClick={() => {
                setMultiDept((v) => !v);
                setSelectedEmpIds([]);
                setSelectedDeptIds([]);
                setOrgUnitId('');
                onChange('');
              }}
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
              <label className="label">الوحدة / القسم (منسدلة)</label>
              <select
                className="input"
                value={orgUnitId}
                onChange={(e) => {
                  setOrgUnitId(e.target.value);
                  setSelectedEmpIds([]);
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
            <div>
              <label className="label">الأقسام (منسدلة متعددة — Ctrl/⌘ للاختيار)</label>
              <select
                className="input min-h-[7rem]"
                multiple
                value={selectedDeptIds}
                onChange={onDeptMultiChange}
                size={Math.min(8, Math.max(4, orgUnits.length))}
              >
                {orgUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-gray-500 mt-1">{selectedDeptIds.length} قسم محدد</div>
            </div>
          )}

          <div className="space-y-2">
            <label className="label">الموظفون (منسدلة متعددة / بحث)</label>
            <input
              className="input"
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              placeholder="ابحث بالاسم أو المسمى…"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-outline text-[11px] px-2 py-1"
                onClick={selectAllVisible}
                disabled={!filtered.length}
              >
                تحديد الظاهر ({filtered.length})
              </button>
              <button type="button" className="btn-outline text-[11px] px-2 py-1" onClick={clearEmployees}>
                إلغاء التحديد
              </button>
              <span className="text-[11px] text-gray-500 self-center">{selectedEmpIds.length} محدد</span>
            </div>
            <select
              className="input min-h-[10rem] font-arabic"
              multiple
              value={selectedEmpIds}
              onChange={onEmpMultiChange}
              size={Math.min(12, Math.max(6, filtered.length || 6))}
            >
              {filtered.map((e) => {
                const line = addressEmployee({
                  name: e.name,
                  gender: e.gender,
                  notes: e.notes,
                  position: e.position,
                });
                const title = e.position?.title ? ` — ${e.position.title}` : '';
                return (
                  <option key={e.id} value={e.id}>
                    {line}
                    {title}
                  </option>
                );
              })}
            </select>
            {filtered.length === 0 && (
              <div className="text-xs text-gray-500">لا يوجد موظفون في التصفية الحالية.</div>
            )}
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
