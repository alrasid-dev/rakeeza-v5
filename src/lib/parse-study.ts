/** Parse Excel-like study-complaint paste into structured sections — label→value once, no mash */

export type StudyRequestRow = {
  request?: string;
  proof?: string;
  details?: string;
  plea?: string;
  opinion?: string;
};

export type StudySections = {
  caseNumber?: string;
  deedNumber?: string;
  formation?: string;
  plaintiff?: string;
  defendant?: string;
  jurisdiction?: string;
  acceptance?: string;
  claimType?: string;
  claimAmount?: string;
  representation?: string;
  researcher?: string;
  priorSettlement?: string;
  priorGosi?: string;
  priorDomestic?: string;
  summaryPlaintiff?: string;
  summaryDefendant?: string;
  plaintiffRequests: StudyRequestRow[];
  defendantRequests: StudyRequestRow[];
  problem?: string;
  legalOpinion?: string;
  recommendation?: string;
  preparer?: string;
  supervisor?: string;
  prepDate?: string;
};

type FieldKey =
  | keyof StudySections
  | 'repVerify'
  | 'repType'
  | 'repStatus'
  | 'repReason'
  | 'priorResult'
  | 'priorExempt';

/** Canonical labels longest-first */
const LABEL_DEFS: { key: FieldKey; labels: string[] }[] = [
  { key: 'caseNumber', labels: ['رقم القضية'] },
  { key: 'deedNumber', labels: ['رقم الصك'] },
  { key: 'formation', labels: ['رقم التشكيل'] },
  { key: 'plaintiff', labels: ['المدعي/ة', 'المدعي'] },
  { key: 'defendant', labels: ['المدعى عليه/ا', 'المدعى عليه'] },
  { key: 'jurisdiction', labels: ['الاختصاص النوعي'] },
  { key: 'acceptance', labels: ['القبول'] },
  { key: 'claimType', labels: ['المطالبة'] },
  { key: 'claimAmount', labels: ['مقدارها'] },
  { key: 'repVerify', labels: ['التحقق من التمثيل'] },
  { key: 'repType', labels: ['نوع التمثيل'] },
  { key: 'repStatus', labels: ['حالة التمثيل'] },
  { key: 'repReason', labels: ['السبب'] },
  { key: 'representation', labels: ['التمثيل'] },
  { key: 'researcher', labels: ['دارس القضية', 'الباحث', 'الباحثة', 'باحث', 'باحثة', 'معد الدراسة (باحث)'] },
  {
    key: 'priorSettlement',
    labels: ['سبق رفع الدعوى إلى التسوية الودية', 'التسوية الودية'],
  },
  {
    key: 'priorGosi',
    labels: [
      'سبق رفع الاعتراض على الجهاز المختص للتأمينات الاجتماعية',
      'سبق رفع الاعتراض على الجهاز المختص',
      'التأمينات الاجتماعية',
      'اعتراض التأمينات',
    ],
  },
  {
    key: 'priorDomestic',
    labels: [
      'سبق رفع الدعوى إلى لجنة تسوية خلافات عمال الخدمة المنزلية ومن في حكمهم',
      'سبق رفع الدعوى إلى لجنة تسوية خلافات عمال الخدمة المنزلية',
      'عمال الخدمة المنزلية',
      'لجنة الخدمة المنزلية',
    ],
  },
  { key: 'priorResult', labels: ['النتيجة'] },
  { key: 'priorExempt', labels: ['سبب الإعفاء', 'سبب عدم القبول'] },
  { key: 'summaryPlaintiff', labels: ['دعوى المدعي', 'ملخص دعوى المدعي'] },
  { key: 'summaryDefendant', labels: ['إجابة المدعى عليه', 'رد المدعى عليه'] },
  { key: 'problem', labels: ['المشكلة'] },
  { key: 'legalOpinion', labels: ['الرأي القانوني'] },
  { key: 'recommendation', labels: ['التوصية'] },
  { key: 'preparer', labels: ['اسم معد الدراسة', 'معد الدراسة', 'اسم الباحث', 'اسم الباحثة'] },
  { key: 'supervisor', labels: ['تصديق المشرف', 'المشرف'] },
  { key: 'prepDate', labels: ['تاريخ اعداد الدراسة', 'تاريخ إعداد الدراسة', 'تاريخ الإعداد', 'تاريخ التصديق'] },
];

const SECTION_HEADERS = [
  'نموذج تحليل حكم (شكوى)',
  'نموذج تحليل حكم',
  'بيانات القضية',
  'إجراءات سابقة للدعوى',
  'ملخص الدعوى',
  'تحليل الشكوى',
  'طلبات المدعي',
  'طلبات المدعى عليه',
  'إعادة النظر في الحكم وإلغاء التقادم',
  'الطلب',
  'وسيلة الإثبات',
  'التفاصيل',
  'الدفع',
  'رأي الباحثة',
  'رأي الباحث',
];

const HEADER_LABELS = Array.from(
  new Set([...LABEL_DEFS.flatMap((d) => d.labels), ...SECTION_HEADERS]),
).sort((a, b) => b.length - a.length);

function normalize(raw: string) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    // Keep consecutive tabs — empty Excel columns must survive
    .trim();
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Collapse duplicated phrases */
export function dedupePhrases(value: string): string {
  let v = String(value || '').replace(/\s+/g, ' ').trim();
  if (!v) return '';

  const parts = v
    .split(/\s*[—–\|]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    const uniq: string[] = [];
    for (const p of parts) {
      if (uniq.some((u) => u === p || u.includes(p))) continue;
      for (let i = uniq.length - 1; i >= 0; i--) {
        if (p.includes(uniq[i]) && p !== uniq[i]) uniq.splice(i, 1);
      }
      uniq.push(p);
    }
    v = uniq.join(' — ');
  }

  for (let n = 2; n <= 4; n++) {
    if (v.length >= 12 && v.length % n === 0) {
      const chunk = v.length / n;
      const piece = v.slice(0, chunk).trim();
      if (
        piece &&
        Array.from({ length: n }, (_, i) => v.slice(i * chunk, (i + 1) * chunk).trim()).every(
          (x) => x === piece,
        )
      ) {
        v = piece;
        break;
      }
    }
  }
  v = v.replace(/(.{8,}?)\s+\1(\s+\1)*/g, '$1');
  return v.trim();
}

function matchExactLabel(cell: string): string | null {
  const t = cell.replace(/[:：\s]+$/g, '').trim();
  for (const l of HEADER_LABELS) {
    if (t === l) return l;
  }
  return null;
}

function labelToKeys(label: string): FieldKey[] {
  const keys: FieldKey[] = [];
  for (const d of LABEL_DEFS) {
    if (d.labels.includes(label)) keys.push(d.key);
  }
  return keys;
}

function isSectionHeader(cell: string): boolean {
  const t = cell.replace(/[:：\s]+$/g, '').trim();
  return SECTION_HEADERS.some((h) => t === h || t.startsWith(h));
}

function isPureLabel(cell: string): boolean {
  return matchExactLabel(cell) != null || isSectionHeader(cell);
}

function splitCells(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((p) => p.trim());
  if (line.includes('|')) return line.split('|').map((p) => p.trim());
  if (/\s{2,}/.test(line)) return line.split(/\s{2,}/).map((p) => p.trim());
  return [line.trim()];
}

function cleanValue(value: string): string {
  let v = String(value || '').replace(/\s+/g, ' ').trim();
  if (!v) return '';
  if (isPureLabel(v)) return '';
  // Strip leading "label:"
  for (const l of HEADER_LABELS) {
    const lead = new RegExp(`^${escapeRe(l)}\\s*[:：]\\s+`);
    if (lead.test(v)) {
      const rest = v.replace(lead, '').trim();
      if (rest && !isPureLabel(rest)) v = rest;
    }
  }
  return dedupePhrases(v);
}

function setOnce(map: Map<string, string>, key: string, value: string) {
  const v = cleanValue(value);
  if (!v) return;
  if (map.has(key)) return;
  map.set(key, v);
}

/**
 * Build field map from Excel clipboard lines.
 * Supports:
 *  A) label \\t value \\t label \\t value (pairs on same row)
 *  B) label-only row followed by value row (column-aligned) — critical for الاختصاص/المطالبة/مقدارها
 *  C) prior-procedure rows: label \\t نعم/لا \\t النتيجة? \\t result \\t سبب الإعفاء? \\t reason
 */
function extractFieldMap(lines: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const rows = lines.map(splitCells);

  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r].map((c) => c.trim());
    if (!cells.some(Boolean)) continue;

    // Skip pure section title rows
    const nonEmpty = cells.filter(Boolean);
    if (nonEmpty.length === 1 && isSectionHeader(nonEmpty[0])) continue;

    const labelFlags = cells.map((c) => (c ? isPureLabel(c) : false));
    const valueFlags = cells.map((c, i) => Boolean(c) && !labelFlags[i]);
    const labelCount = labelFlags.filter(Boolean).length;
    const valueCount = valueFlags.filter(Boolean).length;

    // Pattern B: mostly labels on this row, next row has values in same columns
    if (labelCount >= 2 && valueCount === 0 && r + 1 < rows.length) {
      const next = rows[r + 1].map((c) => c.trim());
      const nextHasValues = next.some((c, i) => c && !isPureLabel(c));
      if (nextHasValues) {
        const n = Math.max(cells.length, next.length);
        for (let i = 0; i < n; i++) {
          const lab = cells[i] || '';
          const val = next[i] || '';
          if (!lab || !matchExactLabel(lab)) continue;
          if (!val || isPureLabel(val)) continue;
          for (const key of labelToKeys(matchExactLabel(lab)!)) {
            if (key === 'priorExempt' || key === 'priorResult') continue;
            setOnce(map, key, val);
          }
        }
        // Also pair any leftover: if label at i and value only at i+1 on NEXT when columns shifted
        // (merged cells often collapse) — walk label indices vs value indices
        const labs = cells
          .map((c, i) => ({ c, i, lab: matchExactLabel(c) }))
          .filter((x) => x.lab);
        const vals = next
          .map((c, i) => ({ c, i }))
          .filter((x) => x.c && !isPureLabel(x.c));
        if (labs.length && vals.length && labs.length === vals.length) {
          for (let k = 0; k < labs.length; k++) {
            for (const key of labelToKeys(labs[k].lab!)) {
              setOnce(map, key, vals[k].c);
            }
          }
        }
        continue;
      }
    }

    // Pattern C / A: walk cells left→right
    for (let i = 0; i < cells.length; i++) {
      const lab = matchExactLabel(cells[i] || '');
      if (!lab) continue;
      const keys = labelToKeys(lab);
      if (!keys.length) continue;

      // Special: prior procedure row — label then yes/no then optional headers/values
      if (
        keys[0] === 'priorSettlement' ||
        keys[0] === 'priorGosi' ||
        keys[0] === 'priorDomestic'
      ) {
        const rest = cells.slice(i + 1).filter(Boolean);
        const yn = rest.find((c) => /^(نعم|لا)$/.test(c));
        const resultParts: string[] = [];
        if (yn) resultParts.push(yn);
        // Collect non-label values after the yes/no (skip النتيجة / سبب الإعفاء headers)
        let seenYn = false;
        for (const c of rest) {
          if (/^(نعم|لا)$/.test(c)) {
            seenYn = true;
            continue;
          }
          if (isPureLabel(c)) continue;
          if (seenYn || !yn) resultParts.push(c);
        }
        // Prefer: yes/no only as primary; append result if present and not duplicate
        const primary = yn || cleanValue(rest.filter((c) => !isPureLabel(c))[0] || '');
        const extra = resultParts
          .filter((c) => c !== yn && !isPureLabel(c))
          .map(cleanValue)
          .filter(Boolean);
        const combined = dedupePhrases([primary, ...extra].filter(Boolean).join(' — '));
        // Store structured: keep yes/no (+ result) but NEVER mash header words
        setOnce(map, keys[0], combined || primary);
        continue;
      }

      // Skip assigning "النتيجة" / "سبب الإعفاء" as top-level fields from column headers
      if (keys[0] === 'priorResult' || keys[0] === 'priorExempt') continue;

      // Adjacent value: next non-empty non-label cell
      let val = '';
      for (let j = i + 1; j < cells.length; j++) {
        const c = cells[j];
        if (!c) continue;
        if (matchExactLabel(c)) break;
        val = c;
        break;
      }
      // Same-cell "label: value"
      if (!val) {
        const inline = cells[i].match(new RegExp(`^${escapeRe(lab)}\\s*[:：]\\s*(.+)$`));
        if (inline?.[1]) val = inline[1];
      }
      if (!val) continue;
      for (const key of keys) {
        if (key === 'priorResult' || key === 'priorExempt') continue;
        setOnce(map, key, val);
      }
    }
  }

  return map;
}

function pick(map: Map<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = map.get(k);
    if (v) return dedupePhrases(v);
  }
  return '';
}

function sectionBetween(lines: string[], startRe: RegExp, endRes: RegExp[]) {
  const start = lines.findIndex((l) => startRe.test(l));
  if (start < 0) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (endRes.some((re) => re.test(lines[i]))) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end);
}

export function isStudyPaste(raw: string) {
  const t = normalize(raw);
  const hits = [
    /رقم القضية/,
    /المدعي/,
    /المدعى عليه/,
    /ملخص الدعوى/,
    /تحليل الشكوى|طلبات المدعي|التوصية/,
    /معد الدراسة|دارس القضية/,
    /الاختصاص النوعي/,
  ].filter((re) => re.test(t)).length;
  return hits >= 3;
}

function digitsOnlyId(v: string): string {
  const m = String(v || '').match(/[0-9٠-٩]{5,}/);
  return m ? m[0] : dedupePhrases(v);
}

export function parseStudyPaste(raw: string): StudySections {
  const text = normalize(raw);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const map = extractFieldMap(lines);

  const caseNumber = digitsOnlyId(pick(map, ['caseNumber']));
  const deedNumber = digitsOnlyId(pick(map, ['deedNumber']));
  const formation = pick(map, ['formation']);
  const plaintiff = pick(map, ['plaintiff']);
  const defendant = pick(map, ['defendant']);
  const jurisdiction = pick(map, ['jurisdiction']);
  const acceptance = pick(map, ['acceptance']);
  const claimType = pick(map, ['claimType']);
  const claimAmount = pick(map, ['claimAmount']);

  const repParts = [
    pick(map, ['repVerify']),
    pick(map, ['repType']),
    pick(map, ['repStatus']),
    pick(map, ['repReason']),
  ].filter(Boolean);
  const representation = dedupePhrases(repParts.join(' — ')) || pick(map, ['representation']);

  const researcher = pick(map, ['researcher']);
  const priorSettlement = pick(map, ['priorSettlement']);
  const priorGosi = pick(map, ['priorGosi']);
  const priorDomestic = pick(map, ['priorDomestic']);

  // Summaries — prefer map, then section scan
  let summaryPlaintiff = pick(map, ['summaryPlaintiff']);
  let summaryDefendant = pick(map, ['summaryDefendant']);
  const summaryBlock = sectionBetween(
    lines,
    /ملخص الدعوى/,
    [/تحليل الشكوى/, /طلبات المدعي/, /المشكلة/, /التوصية/, /إعادة النظر/],
  );
  if (!summaryPlaintiff || !summaryDefendant) {
    const sm = extractFieldMap(summaryBlock);
    summaryPlaintiff = summaryPlaintiff || pick(sm, ['summaryPlaintiff']);
    summaryDefendant = summaryDefendant || pick(sm, ['summaryDefendant']);
  }

  const plaintiffReqBlock = sectionBetween(
    lines,
    /طلبات المدعي/,
    [/طلبات المدعى عليه/, /المشكلة/, /التوصية/, /الرأي القانوني/, /إعادة النظر/],
  );
  const defendantReqBlock = sectionBetween(
    lines,
    /طلبات المدعى عليه/,
    [/المشكلة/, /التوصية/, /الرأي القانوني/, /اسم معد/, /إعادة النظر/],
  );

  function parseReqRows(block: string[]): StudyRequestRow[] {
    const rows: StudyRequestRow[] = [];
    for (const line of block) {
      if (/^(الطلب|وسيلة|التفاصيل|الدفع|رأي)/.test(line) && !line.includes('\t')) continue;
      if (isPureLabel(line) && !line.includes('\t')) continue;
      const p = splitCells(line).map((x) => cleanValue(x));
      // Header row of request table
      if (p[0] === 'الطلب' || matchExactLabel(p[0] || '') === 'الطلب') continue;
      if (p.some(Boolean) && p.join('').length > 4) {
        rows.push({
          request: p[0] || '',
          proof: p[1] || '',
          details: p[2] || '',
          plea: p[3] || '',
          opinion: p[4] || '',
        });
      }
    }
    return rows.filter((r) => r.request || r.details || r.opinion || r.proof);
  }

  const problem = pick(map, ['problem']);
  const legalOpinion = pick(map, ['legalOpinion']);
  const recommendation = pick(map, ['recommendation']);
  const preparer = pick(map, ['preparer']) || researcher;
  const supervisor = pick(map, ['supervisor']);
  const prepDate = pick(map, ['prepDate']);

  return {
    caseNumber,
    deedNumber,
    formation,
    plaintiff,
    defendant,
    jurisdiction,
    acceptance,
    claimType,
    claimAmount,
    representation,
    researcher,
    priorSettlement,
    priorGosi,
    priorDomestic,
    summaryPlaintiff,
    summaryDefendant,
    plaintiffRequests: parseReqRows(plaintiffReqBlock),
    defendantRequests: parseReqRows(defendantReqBlock),
    problem,
    legalOpinion,
    recommendation,
    preparer,
    supervisor,
    prepDate,
  };
}

export function studyToFormFields(s: StudySections) {
  const parties = [
    s.plaintiff ? `المدعي: ${s.plaintiff}` : '',
    s.defendant ? `المدعى عليه: ${s.defendant}` : '',
    s.caseNumber ? `رقم القضية: ${s.caseNumber}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const reasons = [
    s.jurisdiction ? `الاختصاص: ${s.jurisdiction}` : '',
    s.summaryPlaintiff ? `دعوى المدعي: ${s.summaryPlaintiff}` : '',
    s.summaryDefendant ? `إجابة المدعى عليه: ${s.summaryDefendant}` : '',
    s.problem ? `المشكلة: ${s.problem}` : '',
    s.legalOpinion ? `الرأي القانوني: ${s.legalOpinion}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const studyFields = [
    s.recommendation ? `التوصية: ${s.recommendation}` : '',
    (s.preparer || s.researcher) ? `معد الدراسة: ${s.preparer || s.researcher}` : '',
    s.researcher && s.preparer && s.researcher !== s.preparer ? `الباحث: ${s.researcher}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const bodyParts = [
    s.claimAmount && `مقدار المطالبة: ${s.claimAmount}`,
    s.representation && `التمثيل: ${s.representation}`,
  ].filter(Boolean);

  const subject = s.caseNumber ? `دراسة شكوى — ${s.caseNumber}` : 'دراسة شكوى';

  return {
    subject,
    parties,
    reasons,
    studyFields,
    body: bodyParts.join('\n'),
    studySections: s,
  };
}
