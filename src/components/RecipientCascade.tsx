'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [deptSearch, setDeptSearch] = useState('');
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(true);
  const [multiDept, setMultiDept] = useState(false);
  const [empOpen, setEmpOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const empWrapRef = useRef<HTMLDivElement>(null);
  const deptWrapRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (empWrapRef.current && !empWrapRef.current.contains(t)) setEmpOpen(false);
      if (deptWrapRef.current && !deptWrapRef.current.contains(t)) setDeptOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filteredDepts = useMemo(() => {
    const q = deptSearch.trim();
    if (!q) return orgUnits;
    return orgUnits.filter((u) => u.name.includes(q));
  }, [orgUnits, deptSearch]);

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

  function lineFromDepts(deptIds: string[]) {
    return deptIds
      .map((id) => orgUnits.find((u) => u.id === id)?.name || '')
      .filter(Boolean)
      .join('\n');
  }

  /** Employees win; otherwise department names fill «إلى» so the letter shows the pick. */
  function emitSelection(nextEmpIds: string[], nextDeptIds?: string[]) {
    const idSet = new Set(nextEmpIds);
    const emps = employees.filter((e) => idSet.has(e.id));
    const deptIds =
      nextDeptIds ??
      (emps.length
        ? Array.from(
            new Set(
              emps
                .map((e) => e.orgUnitId || e.orgUnit?.id || '')
                .filter(Boolean) as string[],
            ),
          )
        : selectedDeptIds);

    let line = '';
    if (emps.length) {
      line = addressEmployees(
        emps.map((e) => ({
          name: e.name,
          gender: e.gender,
          notes: e.notes,
          position: e.position,
        })),
      );
    } else if (deptIds.length) {
      line = lineFromDepts(deptIds);
    }
    onChange(line, { employeeIds: nextEmpIds, orgUnitIds: deptIds });
  }

  function toggleEmp(id: string) {
    const next = selectedEmpIds.includes(id)
      ? selectedEmpIds.filter((x) => x !== id)
      : [...selectedEmpIds, id];
    setSelectedEmpIds(next);
    emitSelection(next);
  }

  function selectAllVisible() {
    const ids = filtered.map((x) => x.id);
    const merged = Array.from(new Set([...selectedEmpIds, ...ids]));
    setSelectedEmpIds(merged);
    emitSelection(merged);
  }

  function clearEmployees() {
    setSelectedEmpIds([]);
    emitSelection([], selectedDeptIds);
  }

  function toggleDept(id: string) {
    const next = selectedDeptIds.includes(id)
      ? selectedDeptIds.filter((x) => x !== id)
      : [...selectedDeptIds, id];
    setSelectedDeptIds(next);
    setSelectedEmpIds([]);
    emitSelection([], next);
  }

  /** Quick chips: set «إلى» text directly (and pick matching employee when found). */
  function applyQuickRecipient(label: string) {
    setManual(false);
    const q = label.replace(/^فضيلة\s+/, '').replace(/^الأستاذة?\s+/, '');
    const match = employees.find((e) => {
      const t = `${e.position?.title || ''} ${e.position?.honorific || ''}`;
      if (/مكلف/.test(label) && !/مكلف/.test(t)) return false;
      if (/رئيس\s*المحكمة/.test(label) && /رئيس\s*(محكمة|المحكمة)/.test(t)) return true;
      if (/موارد\s*بشرية/.test(label) && /موارد\s*بشرية/.test(t)) return true;
      return t.includes(q) || (e.name && label.includes(e.name));
    });
    if (match) {
      setSelectedEmpIds([match.id]);
      const unit = match.orgUnitId || match.orgUnit?.id || '';
      if (unit) setSelectedDeptIds([unit]);
      emitSelection([match.id], unit ? [unit] : []);
      return;
    }
    setSelectedEmpIds([]);
    onChange(label);
  }

  const QUICK_RECIPIENTS = useMemo(() => {
    const base: { label: string; icon: string }[] = [
      { label: 'فضيلة رئيس المحكمة المكلف', icon: '⚖️' },
      { label: 'فضيلة رئيس المحكمة', icon: '🏛️' },
      { label: 'الأستاذ مدير الموارد البشرية المكلف', icon: '👤' },
    ];
    const seen = new Set(base.map((b) => b.label));
    for (const e of employees) {
      const title = e.position?.title || '';
      const hon = e.position?.honorific || '';
      if (!/مكلف/.test(title) && !/مكلف/.test(hon)) continue;
      const line = addressEmployee({
        name: e.name,
        gender: e.gender,
        notes: e.notes,
        position: e.position,
      });
      // Chip shows role without repeating the full name twice when long
      const roleOnly = line.split('/')[0]?.trim() || line;
      if (!roleOnly || seen.has(roleOnly)) continue;
      seen.add(roleOnly);
      base.push({ label: roleOnly, icon: '📌' });
      if (base.length >= 8) break;
    }
    return base;
  }, [employees]);

  const empSummary =
    selectedEmpIds.length === 0
      ? 'اختر موظفين'
      : selectedEmpIds.length === 1
        ? (() => {
            const e = employees.find((x) => x.id === selectedEmpIds[0]);
            return e ? addressEmployee({ name: e.name, gender: e.gender, notes: e.notes, position: e.position }) : '1 محدد';
          })()
        : `${selectedEmpIds.length} محددون`;

  const deptSummary =
    selectedDeptIds.length === 0
      ? 'اختر أقساماً'
      : selectedDeptIds.length === 1
        ? orgUnits.find((u) => u.id === selectedDeptIds[0])?.name || '1 قسم'
        : `${selectedDeptIds.length} أقسام محددة`;

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
                setEmpOpen(false);
                setDeptOpen(false);
                onChange('');
              }}
            >
              {multiDept ? 'قسم واحد' : 'أقسام متعددة'}
            </button>
          </>
        )}
      </div>

      {!manual && (
        <div className="flex flex-wrap gap-2">
          {QUICK_RECIPIENTS.map((q) => {
            const on = value.trim() === q.label || value.includes(q.label);
            return (
              <button
                key={q.label}
                type="button"
                title={q.label}
                onClick={() => applyQuickRecipient(q.label)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                  on
                    ? 'border-moj-green bg-moj-green text-white'
                    : 'border-moj-green/30 bg-moj-light/50 text-moj-green hover:bg-moj-light'
                }`}
              >
                <span aria-hidden>{q.icon}</span>
                <span className="font-semibold">{q.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {!manual ? (
        <div className="space-y-3">
          {!multiDept ? (
            <div>
              <label className="label">الوحدة / القسم (منسدلة)</label>
              <select
                className="input"
                value={orgUnitId}
                onChange={(e) => {
                  const id = e.target.value;
                  setOrgUnitId(id);
                  setSelectedEmpIds([]);
                  if (id) {
                    setSelectedDeptIds([id]);
                    emitSelection([], [id]);
                  } else {
                    setSelectedDeptIds([]);
                    onChange('');
                  }
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
            <div ref={deptWrapRef} className="relative">
              <label className="label">الأقسام (منسدلة مدمجة)</label>
              <button
                type="button"
                className="input w-full text-right flex items-center justify-between gap-2"
                aria-expanded={deptOpen}
                onClick={() => setDeptOpen((o) => !o)}
              >
                <span className={selectedDeptIds.length ? 'text-gray-900' : 'text-gray-400'}>
                  {deptSummary}
                </span>
                <span className="text-moj-green text-xs shrink-0">{deptOpen ? '▲' : '▼'}</span>
              </button>
              {deptOpen && (
                <div className="absolute z-30 mt-1 w-full rounded-xl border border-moj-green/30 bg-white shadow-lg dark:bg-[var(--surface)] overflow-hidden">
                  <div className="p-2 border-b border-moj-green/10">
                    <input
                      className="input text-sm"
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      placeholder="ابحث عن قسم…"
                      autoFocus
                    />
                  </div>
                  <ul
                    className="max-h-52 overflow-y-auto py-1"
                    role="listbox"
                    aria-multiselectable="true"
                  >
                    {filteredDepts.map((u) => {
                      const on = selectedDeptIds.includes(u.id);
                      return (
                        <li key={u.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={on}
                            className={`w-full text-right px-3 py-2 text-sm hover:bg-moj-light/60 flex items-center gap-2 ${
                              on ? 'bg-moj-light/40 font-semibold text-moj-green' : ''
                            }`}
                            onClick={() => toggleDept(u.id)}
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                                on ? 'bg-moj-green border-moj-green text-white' : 'border-gray-300'
                              }`}
                            >
                              {on ? '✓' : ''}
                            </span>
                            <span className="flex-1">{u.name}</span>
                          </button>
                        </li>
                      );
                    })}
                    {filteredDepts.length === 0 && (
                      <li className="px-3 py-2 text-xs text-gray-500">لا نتائج</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div ref={empWrapRef} className="relative space-y-2">
            <label className="label">الموظفون (منسدلة مدمجة / بحث)</label>
            <button
              type="button"
              className="input w-full text-right flex items-center justify-between gap-2 font-arabic"
              aria-expanded={empOpen}
              onClick={() => setEmpOpen((o) => !o)}
            >
              <span className={`truncate ${selectedEmpIds.length ? 'text-gray-900' : 'text-gray-400'}`}>
                {empSummary}
              </span>
              <span className="text-moj-green text-xs shrink-0">
                {selectedEmpIds.length > 0 ? `(${selectedEmpIds.length}) ` : ''}
                {empOpen ? '▲' : '▼'}
              </span>
            </button>

            {empOpen && (
              <div className="absolute z-30 mt-1 w-full rounded-xl border border-moj-green/30 bg-white shadow-lg dark:bg-[var(--surface)] overflow-hidden">
                <div className="p-2 border-b border-moj-green/10 space-y-2">
                  <input
                    className="input text-sm"
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    placeholder="ابحث بالاسم أو المسمى…"
                    autoFocus
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
                    <button
                      type="button"
                      className="btn-outline text-[11px] px-2 py-1"
                      onClick={clearEmployees}
                    >
                      إلغاء التحديد
                    </button>
                    <span className="text-[11px] text-gray-500 self-center">
                      {selectedEmpIds.length} محدد
                    </span>
                  </div>
                </div>
                <ul
                  className="max-h-60 overflow-y-auto py-1"
                  role="listbox"
                  aria-multiselectable="true"
                >
                  {filtered.map((e) => {
                    const on = selectedEmpIds.includes(e.id);
                    const line = addressEmployee({
                      name: e.name,
                      gender: e.gender,
                      notes: e.notes,
                      position: e.position,
                    });
                    const title = e.position?.title ? ` — ${e.position.title}` : '';
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={on}
                          className={`w-full text-right px-3 py-2 text-sm hover:bg-moj-light/60 flex items-start gap-2 ${
                            on ? 'bg-moj-light/40 font-semibold text-moj-green' : ''
                          }`}
                          onClick={() => toggleEmp(e.id)}
                        >
                          <span
                            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                              on ? 'bg-moj-green border-moj-green text-white' : 'border-gray-300'
                            }`}
                          >
                            {on ? '✓' : ''}
                          </span>
                          <span className="flex-1 leading-snug">
                            {line}
                            {title}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {filtered.length === 0 && (
                    <li className="px-3 py-2 text-xs text-gray-500">
                      لا يوجد موظفون في التصفية الحالية.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <input
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="مثال: الأستاذ / …"
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
