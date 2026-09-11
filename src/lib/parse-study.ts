/** Parse Excel-like study-complaint paste into structured sections */

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

function normalize(raw: string) {
  return raw.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').replace(/\t+/g, '\t').trim();
}

function afterLabel(line: string, labels: string[]) {
  for (const lab of labels) {
    const re = new RegExp(`(?:^|[\\t\\|]|\\s)${lab}\\s*[:：\\t]?\\s*(.+)`, 'i');
    const m = line.match(re);
    if (m?.[1]) return m[1].replace(/^[\t:\s]+/, '').trim();
  }
  return '';
}

function findValue(lines: string[], labels: string[]) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Same-line label:value or tab-separated
    const same = afterLabel(line, labels);
    if (same && same.length < 500 && !labels.some((l) => same === l)) return same;
    // Label alone → next non-empty line / next tab cell
    if (labels.some((l) => new RegExp(`^${l}\\s*[:：]?\\s*$`).test(line.trim()))) {
      const next = lines[i + 1]?.trim();
      if (next && !labels.some((l) => next.startsWith(l))) return next;
    }
    // Tab row: label \t value
    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim()).filter(Boolean);
      for (let j = 0; j < parts.length - 1; j++) {
        if (labels.some((l) => parts[j] === l || parts[j].startsWith(l))) {
          return parts[j + 1];
        }
      }
    }
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

export function parseStudyPaste(raw: string): StudySections {
  const text = normalize(raw);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const caseNumber =
    findValue(lines, ['رقم القضية']) ||
    text.match(/رقم القضية\s*[:：\t]?\s*([0-9٠-٩]+)/)?.[1] ||
    '';
  const deedNumber = findValue(lines, ['رقم الصك']);
  const formation = findValue(lines, ['رقم التشكيل', 'التشكيل']);
  const plaintiff = findValue(lines, ['المدعي/ة', 'المدعي']);
  const defendant = findValue(lines, ['المدعى عليه/ا', 'المدعى عليه']);
  const jurisdiction = findValue(lines, ['الاختصاص النوعي', 'الاختصاص']);
  const acceptance = findValue(lines, ['القبول']);
  const claimType = findValue(lines, ['المطالبة']);
  const claimAmount = findValue(lines, ['مقدارها', 'المقدار']);
  const representation =
    [findValue(lines, ['التحقق من التمثيل']), findValue(lines, ['نوع التمثيل']), findValue(lines, ['حالة التمثيل'])]
      .filter(Boolean)
      .join(' — ') || findValue(lines, ['التمثيل']);
  const researcher = findValue(lines, ['دارس القضية', 'اسم معد الدراسة', 'معد الدراسة']);

  const priorSettlement = findValue(lines, ['سبق رفع الدعوى إلى التسوية الودية', 'التسوية الودية']);
  const priorGosi = findValue(lines, [
    'سبق رفع الاعتراض على الجهاز المختص',
    'التأمينات الاجتماعية',
  ]);
  const priorDomestic = findValue(lines, [
    'سبق رفع الدعوى إلى لجنة تسوية خلافات عمال الخدمة المنزلية',
    'عمال الخدمة المنزلية',
  ]);

  const summaryBlock = sectionBetween(
    lines,
    /ملخص الدعوى/,
    [/تحليل الشكوى/, /طلبات المدعي/, /المشكلة/, /التوصية/],
  );
  let summaryPlaintiff =
    findValue(summaryBlock.length ? summaryBlock : lines, ['دعوى المدعي', 'ملخص دعوى المدعي']) ||
    '';
  let summaryDefendant =
    findValue(summaryBlock.length ? summaryBlock : lines, ['إجابة المدعى عليه', 'رد المدعى عليه']) ||
    '';

  // Fallback: two lines after ملخص الدعوى
  if (!summaryPlaintiff && summaryBlock.length) {
    summaryPlaintiff = summaryBlock[0] || '';
    summaryDefendant = summaryBlock[1] || '';
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
      if (line.includes('\t')) {
        const p = line.split('\t').map((x) => x.trim());
        rows.push({
          request: p[0],
          proof: p[1],
          details: p[2],
          plea: p[3],
          opinion: p[4],
        });
      } else if (line.length > 8) {
        rows.push({ details: line });
      }
    }
    return rows;
  }

  const problem = findValue(lines, ['المشكلة']);
  const legalOpinion = findValue(lines, ['الرأي القانوني']);
  const recommendation = findValue(lines, ['التوصية']);
  const preparer =
    findValue(lines, ['اسم معد الدراسة', 'معد الدراسة']) || researcher;
  const supervisor = findValue(lines, ['تصديق المشرف', 'المشرف']);
  const prepDate = findValue(lines, ['تاريخ الإعداد', 'تاريخ التصديق']) ||
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
    prepDate,
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

  const bodyParts = [
    s.caseNumber && `رقم القضية: ${s.caseNumber}`,
    s.deedNumber && `رقم الصك: ${s.deedNumber}`,
    s.formation && `التشكيل: ${s.formation}`,
    s.claimAmount && `مقدار المطالبة: ${s.claimAmount}`,
    s.representation && `التمثيل: ${s.representation}`,
  ].filter(Boolean);

  return {
    subject: s.caseNumber ? `دراسة شكوى — ${s.caseNumber}` : 'دراسة شكوى',
    parties,
    reasons,
    studyFields,
    body: bodyParts.join('\n'),
    studySections: s,
  };
}
