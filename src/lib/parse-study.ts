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

/** Canonical labels longest-first so «رقم التشكيل» wins over «التشكيل» */
const LABEL_DEFS: { key: keyof StudySections | 'repVerify' | 'repType' | 'repStatus'; labels: string[] }[] = [
  { key: 'caseNumber', labels: ['رقم القضية'] },
  { key: 'deedNumber', labels: ['رقم الصك'] },
  { key: 'formation', labels: ['رقم التشكيل', 'التشكيل'] },
  { key: 'plaintiff', labels: ['المدعي/ة', 'المدعي'] },
  { key: 'defendant', labels: ['المدعى عليه/ا', 'المدعى عليه'] },
  { key: 'jurisdiction', labels: ['الاختصاص النوعي', 'الاختصاص'] },
  { key: 'acceptance', labels: ['سبب عدم القبول', 'القبول'] },
  { key: 'claimType', labels: ['المطالبة'] },
  { key: 'claimAmount', labels: ['مقدارها', 'المقدار'] },
  { key: 'repVerify', labels: ['التحقق من التمثيل'] },
  { key: 'repType', labels: ['نوع التمثيل'] },
  { key: 'repStatus', labels: ['حالة التمثيل'] },
  { key: 'representation', labels: ['التمثيل'] },
  { key: 'researcher', labels: ['دارس القضية'] },
  {
    key: 'priorSettlement',
    labels: ['سبق رفع الدعوى إلى التسوية الودية', 'التسوية الودية'],
  },
  {
    key: 'priorGosi',
    labels: ['سبق رفع الاعتراض على الجهاز المختص', 'التأمينات الاجتماعية', 'اعتراض التأمينات'],
  },
  {
    key: 'priorDomestic',
    labels: [
      'سبق رفع الدعوى إلى لجنة تسوية خلافات عمال الخدمة المنزلية',
      'عمال الخدمة المنزلية',
      'لجنة الخدمة المنزلية',
    ],
  },
  { key: 'summaryPlaintiff', labels: ['دعوى المدعي', 'ملخص دعوى المدعي'] },
  { key: 'summaryDefendant', labels: ['إجابة المدعى عليه', 'رد المدعى عليه'] },
  { key: 'problem', labels: ['المشكلة'] },
  { key: 'legalOpinion', labels: ['الرأي القانوني'] },
  { key: 'recommendation', labels: ['التوصية'] },
  { key: 'preparer', labels: ['اسم معد الدراسة', 'معد الدراسة'] },
  { key: 'supervisor', labels: ['تصديق المشرف', 'المشرف'] },
  { key: 'prepDate', labels: ['تاريخ الإعداد', 'تاريخ التصديق'] },
  // orphan result/reason labels that leak into adjacent values
];

/** Field headers that terminate a value run (exclude value-like phrases e.g. تم التحقق) */
const HEADER_LABELS = Array.from(
  new Set(
    LABEL_DEFS.flatMap((d) => d.labels)
      .filter((l) => l !== 'تم التحقق')
      .concat([
        'النتيجة',
        'سبب الإعفاء',
        'قبول السبب',
        'بيانات القضية',
        'إجراءات سابقة للدعوى',
        'ملخص الدعوى',
        'تحليل الشكوى',
        'طلبات المدعي',
        'طلبات المدعى عليه',
      ]),
  ),
).sort((a, b) => b.length - a.length);

const ALL_LABELS = HEADER_LABELS;

function normalize(raw: string) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\t+/g, '\t')
    .trim();
}

/** Collapse duplicated phrases: "A — A — A" → "A", and repeated half-strings */
export function dedupePhrases(value: string): string {
  let v = String(value || '').replace(/\s+/g, ' ').trim();
  if (!v) return '';

  // Split on common separators and unique-preserve
  const parts = v
    .split(/\s*[—–\|\u060C,،]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    const seen = new Set<string>();
    const uniq: string[] = [];
    for (const p of parts) {
      const key = p.replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      // skip if this part is fully contained in an already-kept longer part
      if (uniq.some((u) => u.includes(key) && u !== key)) continue;
      // drop shorter kept items that this one contains
      for (let i = uniq.length - 1; i >= 0; i--) {
        if (key.includes(uniq[i]) && key !== uniq[i]) uniq.splice(i, 1);
      }
      seen.add(key);
      uniq.push(key);
    }
    v = uniq.join(' — ');
  }

  // Exact consecutive duplication of the whole string
  for (let n = 2; n <= 4; n++) {
    if (v.length >= 12 && v.length % n === 0) {
      const chunk = v.length / n;
      const piece = v.slice(0, chunk).trim();
      if (piece && Array.from({ length: n }, (_, i) => v.slice(i * chunk, (i + 1) * chunk).trim()).every((x) => x === piece)) {
        v = piece;
        break;
      }
    }
  }

  // "foo foo" word-run collapse for long Arabic tokens
  v = v.replace(/(.{8,}?)\s+\1(\s+\1)*/g, '$1');
  return v.trim();
}

function isLabelOnly(cell: string): boolean {
  const t = cell.replace(/[:：\s]+$/g, '').trim();
  return ALL_LABELS.some((l) => t === l);
}

function matchLabel(cell: string): string | null {
  const t = cell.replace(/[:：\s]+$/g, '').trim();
  for (const l of ALL_LABELS) {
    if (t === l) return l;
  }
  return null;
}

/** Split a paste line into cells (tabs / pipes / 2+ spaces) */
function splitCells(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map((p) => p.trim()).filter((p) => p.length > 0);
  }
  if (line.includes('|')) {
    return line.split('|').map((p) => p.trim()).filter((p) => p.length > 0);
  }
  // Excel sometimes pastes with multiple spaces between columns
  if (/\s{2,}/.test(line)) {
    return line.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
  }
  return [line.trim()].filter(Boolean);
}

function stripTrailingLabels(value: string): string {
  let v = value.trim();
  if (!v) return '';

  // Pure label mash with no real value → empty
  const tokens = v.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const labelHits = tokens.filter((tok) => ALL_LABELS.some((l) => l === tok)).length;
    if (labelHits >= Math.ceil(tokens.length * 0.7) && labelHits === tokens.length) return '';
  }
  if (isLabelOnly(v)) return '';

  // Strip orphan trailing header labels only when preceding chunk is a short answer/id
  const orphans = ['النتيجة', 'سبب الإعفاء', 'قبول السبب', 'سبب عدم القبول', 'مقدارها'];
  for (const l of orphans) {
    const trail = new RegExp(`\\s+${escapeRe(l)}\\s*[:：]?\\s*$`);
    if (trail.test(v)) {
      const before = v.replace(trail, '').trim();
      if (!before || /^(نعم|لا|مقبول|مرفوض|[0-9٠-٩]+)$/.test(before)) {
        v = before;
      }
    }
  }

  // Leading exact label + colon
  for (const l of ALL_LABELS) {
    const lead = new RegExp(`^${escapeRe(l)}\\s*[:：]\\s+`);
    if (lead.test(v)) {
      const rest = v.replace(lead, '').trim();
      if (rest && !isLabelOnly(rest)) v = rest;
    }
  }
  return dedupePhrases(v);
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Walk every cell in order. When a known field-label is seen, take the following
 * non-label cell(s) until the next known label — assign once (first wins).
 */
function extractLabelMap(lines: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const cells: string[] = [];
  for (const line of lines) {
    const parts = splitCells(line);
    if (parts.length === 1) {
      // Try inline "label: value" or "label value"
      const inline = parts[0];
      let matched = false;
      for (const l of ALL_LABELS) {
        const re = new RegExp(`^${escapeRe(l)}\\s*[:：]\\s*(.+)$`);
        const m = inline.match(re);
        if (m?.[1]) {
          cells.push(l, m[1].trim());
          matched = true;
          break;
        }
      }
      if (!matched) cells.push(inline);
    } else {
      cells.push(...parts);
    }
  }

  for (let i = 0; i < cells.length; i++) {
    const lab = matchLabel(cells[i]);
    if (!lab) continue;
    if (map.has(lab)) continue; // first wins — no overwrite mash
    const chunks: string[] = [];
    for (let j = i + 1; j < cells.length; j++) {
      if (matchLabel(cells[j])) break;
      const c = cells[j].trim();
      if (!c) continue;
      if (isLabelOnly(c)) break;
      chunks.push(c);
      // Prefer single cell value for short fields; stop after first solid value
      if (chunks.join(' ').length >= 1) {
        // allow multi-cell only if next isn't starting a new "sentence" of labels
        if (j + 1 < cells.length && matchLabel(cells[j + 1])) break;
        // For numeric IDs, one cell is enough
        if (/^[0-9٠-٩]{4,}$/.test(c)) break;
        // For نعم/لا short answers
        if (/^(نعم|لا|موافق|مرفوض)$/.test(c)) break;
        // Otherwise take at most 2 non-label cells
        if (chunks.length >= 2) break;
      }
    }
    const rawVal = chunks.join(' ').trim();
    const cleaned = stripTrailingLabels(rawVal);
    if (cleaned && !isLabelOnly(cleaned)) {
      map.set(lab, cleaned);
    }
  }
  return map;
}

function pickFromMap(map: Map<string, string>, labels: string[]): string {
  for (const l of labels) {
    const v = map.get(l);
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

/** Detect if paste looks like study-complaint Excel form */
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
  const map = extractLabelMap(lines);

  const caseNumber = digitsOnlyId(pickFromMap(map, ['رقم القضية']));
  const deedNumber = digitsOnlyId(pickFromMap(map, ['رقم الصك']));
  const formation = pickFromMap(map, ['رقم التشكيل', 'التشكيل']);
  const plaintiff = pickFromMap(map, ['المدعي/ة', 'المدعي']);
  const defendant = pickFromMap(map, ['المدعى عليه/ا', 'المدعى عليه']);
  const jurisdiction = pickFromMap(map, ['الاختصاص النوعي', 'الاختصاص']);
  // Prefer سبب عدم القبول only if قبول itself isn't a short status
  const acceptance =
    pickFromMap(map, ['القبول']) || pickFromMap(map, ['سبب عدم القبول']);
  const claimType = pickFromMap(map, ['المطالبة']);
  const claimAmount = pickFromMap(map, ['مقدارها', 'المقدار']);

  const repParts = [
    pickFromMap(map, ['التحقق من التمثيل']),
    pickFromMap(map, ['نوع التمثيل']),
    pickFromMap(map, ['حالة التمثيل']),
  ].filter(Boolean);
  const representation =
    dedupePhrases(repParts.join(' — ')) || pickFromMap(map, ['التمثيل']);

  const researcher = pickFromMap(map, ['دارس القضية']);
  const priorSettlement = pickFromMap(map, [
    'سبق رفع الدعوى إلى التسوية الودية',
    'التسوية الودية',
  ]);
  const priorGosi = pickFromMap(map, [
    'سبق رفع الاعتراض على الجهاز المختص',
    'التأمينات الاجتماعية',
    'اعتراض التأمينات',
  ]);
  const priorDomestic = pickFromMap(map, [
    'سبق رفع الدعوى إلى لجنة تسوية خلافات عمال الخدمة المنزلية',
    'عمال الخدمة المنزلية',
    'لجنة الخدمة المنزلية',
  ]);

  const summaryBlock = sectionBetween(
    lines,
    /ملخص الدعوى/,
    [/تحليل الشكوى/, /طلبات المدعي/, /المشكلة/, /التوصية/],
  );
  const summaryMap = extractLabelMap(summaryBlock.length ? summaryBlock : lines);
  let summaryPlaintiff =
    pickFromMap(summaryMap, ['دعوى المدعي', 'ملخص دعوى المدعي']) ||
    pickFromMap(map, ['دعوى المدعي', 'ملخص دعوى المدعي']);
  let summaryDefendant =
    pickFromMap(summaryMap, ['إجابة المدعى عليه', 'رد المدعى عليه']) ||
    pickFromMap(map, ['إجابة المدعى عليه', 'رد المدعى عليه']);

  if (!summaryPlaintiff && summaryBlock.length) {
    const cleaned = summaryBlock.filter((l) => !isLabelOnly(l) && !/^ملخص/.test(l));
    summaryPlaintiff = dedupePhrases(cleaned[0] || '');
    summaryDefendant = dedupePhrases(cleaned[1] || '');
  }

  const plaintiffReqBlock = sectionBetween(
    lines,
    /طلبات المدعي/,
    [/طلبات المدعى عليه/, /المشكلة/, /التوصية/, /الرأي القانوني/],
  );
  const defendantReqBlock = sectionBetween(
    lines,
    /طلبات المدعى عليه/,
    [/المشكلة/, /التوصية/, /الرأي القانوني/, /اسم معد/],
  );

  function parseReqRows(block: string[]): StudyRequestRow[] {
    const rows: StudyRequestRow[] = [];
    for (const line of block) {
      if (/^(الطلب|وسيلة|التفاصيل|الدفع|رأي)/.test(line)) continue;
      if (isLabelOnly(line)) continue;
      if (line.includes('\t')) {
        const p = line.split('\t').map((x) => x.trim());
        rows.push({
          request: dedupePhrases(p[0] || ''),
          proof: dedupePhrases(p[1] || ''),
          details: dedupePhrases(p[2] || ''),
          plea: dedupePhrases(p[3] || ''),
          opinion: dedupePhrases(p[4] || ''),
        });
      } else if (line.length > 8) {
        rows.push({ details: dedupePhrases(line) });
      }
    }
    return rows;
  }

  const problem = pickFromMap(map, ['المشكلة']);
  const legalOpinion = pickFromMap(map, ['الرأي القانوني']);
  const recommendation = pickFromMap(map, ['التوصية']);
  const preparer = pickFromMap(map, ['اسم معد الدراسة', 'معد الدراسة']) || researcher;
  const supervisor = pickFromMap(map, ['تصديق المشرف', 'المشرف']);
  const prepDate =
    pickFromMap(map, ['تاريخ الإعداد', 'تاريخ التصديق']) ||
    text.match(/(?:الخميس|الأحد|الإثنين|الثلاثاء|الأربعاء|الجمعة|السبت)?\s*[\d٠-٩]+\/[\d٠-٩]+\/[\d٠-٩]+/)?.[0] ||
    '';

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
    prepDate: dedupePhrases(prepDate),
  };
}

/** Flatten study sections into legacy form fields + structured JSON */
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
    s.preparer ? `معد الدراسة: ${s.preparer}` : '',
    s.researcher && s.researcher !== s.preparer ? `دارس القضية: ${s.researcher}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  // Keep body free of fields already shown in studySections UI
  const bodyParts = [
    s.claimAmount && `مقدار المطالبة: ${s.claimAmount}`,
    s.representation && `التمثيل: ${s.representation}`,
  ].filter(Boolean);

  // Subject: title + case number ONLY (never mash deed/formation labels)
  const subject = s.caseNumber
    ? `دراسة شكوى — ${s.caseNumber}`
    : 'دراسة شكوى';

  return {
    subject,
    parties,
    reasons,
    studyFields,
    body: bodyParts.join('\n'),
    studySections: s,
  };
}
