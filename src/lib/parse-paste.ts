/** Distribute a pasted official letter / circular / table into structured fields */

export type TableRow = { name: string; id?: string; extra?: string };

export type ParsedPaste = {
  number: string;
  date: string;
  subject: string;
  recipients: string;
  parties: string;
  facts: string;
  reasons: string;
  studyFields: string;
  body: string;
  tableRows: TableRow[];
};

const RECIPIENT_LINE =
  /^(?:إلى[:\s：]*|سعاد[ةه]\s|فضيل[ةه]\s|سمو\s|معالي\s|سعادة\s)/;
const SUBJECT_LINE = /^(?:الموضوع|بشأن)\s*[:：]\s*(.+)$/;
const NUMBER_LINE = /^(?:الرقم|رقم(?:\s*الخطاب)?|رقم(?:\s*الصادر)?)\s*[:：]\s*(.+)$/i;
const DATE_LINE = /^(?:التاريخ|بتاريخ)\s*[:：]\s*(.+)$/i;
const SALUTATION = /السلام عليكم|وبعد\s*[:-]|وبعد،/;

function normalize(raw: string) {
  return raw.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').trim();
}

function pick(text: string, re: RegExp) {
  const m = text.match(re);
  return m?.[1]?.trim() || '';
}

/** Detect tab-separated or numbered name+ID table lines */
export function detectTableRows(lines: string[]): TableRow[] {
  const rows: TableRow[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // "1- Name\tID" or "1. Name\tID" or "1) Name  ID"
    const numberedTab = t.match(
      /^\d+[\-\.\)\-]\s*(.+?)[\t]+([0-9]{9,15})\s*(.*)$/,
    );
    if (numberedTab) {
      rows.push({
        name: numberedTab[1].trim(),
        id: numberedTab[2],
        extra: numberedTab[3]?.trim() || undefined,
      });
      continue;
    }

    // Tab-separated: Name \t ID [\t extra]
    if (t.includes('\t')) {
      const parts = t.split('\t').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const idPart = parts.find((p) => /^[0-9]{9,15}$/.test(p));
        const namePart = parts.find((p) => p !== idPart && !/^\d+$/.test(p));
        if (namePart) {
          rows.push({
            name: namePart.replace(/^\d+[\-\.\)]\s*/, ''),
            id: idPart,
            extra: parts.filter((p) => p !== namePart && p !== idPart).join(' ') || undefined,
          });
          continue;
        }
      }
    }

    // "Name 1234567890" (10-digit Saudi ID common)
    const nameId = t.match(
      /^(?:\d+[\-\.\)]\s*)?(.+?)\s+([12]\d{9}|[0-9]{10})\s*$/,
    );
    if (nameId && nameId[1].length >= 3 && /[\u0600-\u06FFA-Za-z]/.test(nameId[1])) {
      rows.push({ name: nameId[1].trim(), id: nameId[2] });
      continue;
    }

    // CSV-ish: Name,ID
    const csv = t.match(/^(.+?)\s*[,،;]\s*([12]\d{9}|[0-9]{10})\s*$/);
    if (csv && csv[1].length >= 3) {
      rows.push({ name: csv[1].replace(/^\d+[\-\.\)]\s*/, '').trim(), id: csv[2] });
    }
  }
  return rows;
}

function stripExtractedFromBody(
  lines: string[],
  opts: { recipients?: string; subject?: string; number?: string; date?: string },
) {
  const skipExact = new Set(
    [opts.recipients, opts.subject, opts.number, opts.date]
      .filter(Boolean)
      .map((s) => String(s).trim()),
  );

  return lines
    .filter((l) => {
      const t = l.trim();
      if (!t) return false;
      if (skipExact.has(t)) return false;
      if (NUMBER_LINE.test(t) || DATE_LINE.test(t)) return false;
      if (SUBJECT_LINE.test(t)) return false;
      if (/^إلى\s*[:：]/.test(t)) return false;
      // Drop standalone recipient honorific lines that were extracted
      if (opts.recipients && t === opts.recipients.trim()) return false;
      if (
        opts.recipients &&
        RECIPIENT_LINE.test(t) &&
        opts.recipients.includes(t.replace(/^إلى\s*[:：]\s*/, '').trim())
      ) {
        return false;
      }
      // Drop letterhead noise
      if (/^(بسم الله|المملكة العربية|وزارة العدل|المحكمة العمالية|للاستخدام الداخلي)/.test(t)) {
        return false;
      }
      return true;
    })
    .join('\n')
    .trim();
}

export function parsePaste(raw: string): ParsedPaste {
  const text = normalize(raw);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let number =
    pick(text, /(?:الرقم|رقم(?:\s*الخطاب)?|رقم(?:\s*الصادر)?)\s*[:：]\s*([^\n]+)/i) ||
    pick(text, /(صادر[-\s]?\d{4}[-\s]?\d+)/i) ||
    '';
  // Prefer outbound pattern normalization
  const issued = number.match(/صادر[-\s]?(\d{4})[-\s]?(\d+)/i);
  if (issued) number = `صادر-${issued[1]}-${issued[2]}`;

  let date =
    pick(text, /التاريخ\s*[:：]\s*([^\n]+)/i) ||
    pick(text, /بتاريخ\s*[:：]\s*([^\n]+)/i) ||
    '';

  // Normalize gregorian date if dd-mm-yyyy or dd/mm/yyyy
  const g = date.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (g) {
    const y = g[3].length === 2 ? `20${g[3]}` : g[3];
    date = `${y}-${g[2].padStart(2, '0')}-${g[1].padStart(2, '0')}`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    date = date.trim();
  } else {
    // keep hijri/other as-is for display; wizard date field prefers ISO — leave empty if not gregorian
    if (/هـ|هجر/.test(date) || !g) {
      // try find a gregorian elsewhere
      const g2 = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})/);
      if (g2) {
        date = `${g2[3]}-${g2[2].padStart(2, '0')}-${g2[1].padStart(2, '0')}`;
      } else {
        date = '';
      }
    }
  }

  let subject =
    pick(text, /الموضوع\s*[:：]\s*([^\n]+)/i) ||
    pick(text, /بشأن\s*[:：]?\s*([^\n]+)/i) ||
    '';

  // Recipient: explicit إلى: … or honorific line (فضيلة / سعادة / …)
  let recipients =
    pick(text, /إلى\s*[:：]\s*([^\n]+)/i) ||
    pick(text, /الموجه إلي[هها]?\s*[:：]\s*([^\n]+)/i) ||
    '';

  if (!recipients) {
    const honorificIdx = lines.findIndex(
      (l) =>
        RECIPIENT_LINE.test(l) &&
        !SUBJECT_LINE.test(l) &&
        !/نظرا|إشارة|بشأن غياب|قرار التكليف/.test(l),
    );
    if (honorificIdx >= 0) {
      // Prefer lines before salutation / body paragraph
      const salIdx = lines.findIndex((l) => SALUTATION.test(l));
      if (salIdx < 0 || honorificIdx < salIdx) {
        recipients = lines[honorificIdx].replace(/^إلى\s*[:：]\s*/, '').trim();
      }
    }
  }

  // If subject still empty, use decision/circular title line if short
  if (!subject) {
    const decision = lines.find((l) => /قرار رقم|تعميم رقم|خطاب رقم/.test(l));
    if (decision && decision.length < 120) subject = decision;
  }

  const parties =
    pick(text, /الأطراف\s*[:：]\s*([^\n]+)/i) ||
    pick(text, /بين\s*[:：]\s*([^\n]+)/i) ||
    '';

  let facts = '';
  let reasons = '';
  let study = '';

  const factsIdx = lines.findIndex((l) => /^(الوقائع|أولاً|أولا)[:\s]*/.test(l));
  const reasonsIdx = lines.findIndex((l) => /^(الأسباب|الحيثيات|ثانياً|ثانيا)[:\s]*/.test(l));
  const studyIdx = lines.findIndex((l) => /^(الدراسة|الرأي|ثالثاً|ثالثا)[:\s]*/.test(l));

  if (factsIdx >= 0) {
    const end =
      [reasonsIdx, studyIdx].filter((i) => i > factsIdx).sort((a, b) => a - b)[0] ??
      lines.length;
    facts = lines.slice(factsIdx + 1, end).join('\n');
  }
  if (reasonsIdx >= 0) {
    const end =
      [studyIdx].filter((i) => i > reasonsIdx).sort((a, b) => a - b)[0] ?? lines.length;
    reasons = lines.slice(reasonsIdx + 1, end).join('\n');
  }
  if (studyIdx >= 0) {
    study = lines.slice(studyIdx + 1).join('\n');
  }

  const tableRows = detectTableRows(lines);

  // Parties from table if not set
  let partiesOut = parties;
  if (!partiesOut && tableRows.length) {
    partiesOut = tableRows
      .map((r) => (r.id ? `${r.name}\t${r.id}` : r.name))
      .join('\n');
  }

  const body = stripExtractedFromBody(lines, {
    recipients,
    subject,
    number,
    date,
  });

  return {
    number,
    date,
    subject,
    recipients,
    parties: partiesOut,
    facts,
    reasons,
    studyFields: study,
    body: body || text,
    tableRows,
  };
}

export function buildTitle(honorific: string, position: string, name?: string) {
  const base = honorific || position || '';
  return name ? `${base} / ${name}` : base;
}
