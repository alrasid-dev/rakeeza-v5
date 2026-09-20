/** Distribute a pasted official letter / circular / table into structured fields */

import { isStudyPaste, parseStudyPaste, studyToFormFields } from '@/lib/parse-study';
import { suggestFont } from '@/lib/font-suggest';
import { extractJudgmentCardFromPaste } from '@/lib/judgment-card';
import { gridToEditorTableHtml, gridToTableRows, htmlToPasteText, parseAnyTable } from '@/lib/universal-table-parser';

export type TableRow = { name: string; id?: string; extra?: string };

export type ParsedPaste = {
  number: string;
  date: string;
  subject: string;
  recipients: string;
  parties: string;
  /** @deprecated deed-centric — prefer reasons/body */
  facts: string;
  reasons: string;
  studyFields: string;
  body: string;
  tableRows: TableRow[];
  /** Partial/full judgment-card values detected from paste (مصدر الحكم فضيلة الشيخ, …) */
  judgmentCardFields?: Partial<Record<string, string>>;
  studySections?: import('@/lib/parse-study').StudySections;
  detectedKind?: 'study' | 'letter' | 'table' | 'unknown';
  fontHint?: { family: string; sizePt: number };
};

const RECIPIENT_LINE =
  /^(?:إلى[:\s：]*|سعاد[ةه]\s|فضيل[ةه]\s|سمو\s|معالي\s|سعادة\s|الأستاذة?\s|الاستاذة?\s|زميل(?:نا|تنا)?\s|زميلة\s)/;
const SUBJECT_LINE = /^(?:الموضوع|بشأن)\s*[:：]\s*(.+)$/;
const NUMBER_LINE = /^(?:الرقم|رقم(?:\s*الخطاب)?|رقم(?:\s*الصادر)?)\s*[:：]\s*(.+)$/i;
const DATE_LINE = /^(?:التاريخ|بتاريخ)\s*[:：]\s*(.+)$/i;
const SALUTATION = /السلام عليكم|وبعد\s*[:-]|وبعد،/;

function normalize(raw: string) {
  return raw.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').trim();
}

function dedupeGreetingBody(body: string, subject?: string) {
  let b = String(body || '').replace(/\r\n/g, '\n').trim();
  if (!b) return '';

  // Strip repeated basmala
  b = b.replace(/^(?:بسم الله الرحمن الرحيم\s*)+/gm, (m, offset) => (offset === 0 || m.indexOf('\n') >= 0 ? 'بسم الله الرحمن الرحيم\n' : ''));
  b = b.replace(/(بسم الله الرحمن الرحيم\s*){2,}/g, 'بسم الله الرحمن الرحيم\n');

  // Keep a single salutation
  const salaRe = /السلام عليكم(?: ورحمة الله وبركاته)?(?:\s+وبعد)?\s*[:-]*/g;
  let salaCount = 0;
  b = b.replace(salaRe, (m) => {
    salaCount += 1;
    return salaCount === 1 ? 'السلام عليكم ورحمة الله وبركاته وبعد:-' : '';
  });
  b = b.replace(/^\s*[-:]\s*$/gm, '');

  // Remove subject echoed into body
  const sub = String(subject || '').trim();
  if (sub.length >= 8) {
    b = b
      .split('\n')
      .filter((line) => {
        const t = line.trim();
        if (!t) return true;
        if (t === sub) return false;
        if (t === `الموضوع: ${sub}` || t === `الموضوع : ${sub}`) return false;
        if (new RegExp(`^الموضوع\s*[:：]\s*`).test(t) && t.includes(sub.slice(0, Math.min(20, sub.length)))) return false;
        return true;
      })
      .join('\n');
  }

  // Collapse identical consecutive paragraphs
  const paras = b.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of paras) {
    if (out.length && out[out.length - 1] === p) continue;
    out.push(p);
  }
  return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
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
  opts: {
    recipients?: string;
    subject?: string;
    number?: string;
    date?: string;
    parties?: string;
    reasons?: string;
    facts?: string;
    study?: string;
  },
) {
  const skipExact = new Set(
    [opts.recipients, opts.subject, opts.number, opts.date]
      .filter(Boolean)
      .map((s) => String(s).trim()),
  );

  const sectionBlocks = [opts.parties, opts.reasons, opts.facts, opts.study]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter((s) => s.length >= 8);

  let filtered = lines.filter((l) => {
    const t = l.trim();
    if (!t) return false;
    if (skipExact.has(t)) return false;
    if (NUMBER_LINE.test(t) || DATE_LINE.test(t)) return false;
    if (SUBJECT_LINE.test(t)) return false;
    if (/^إلى\s*[:：]/.test(t)) return false;
    if (/^(الأطراف|الوقائع|الأسباب|الحيثيات|الدراسة|الرأي)\s*[:：]?$/.test(t)) return false;
    if (opts.recipients && t === opts.recipients.trim()) return false;
    if (
      opts.recipients &&
      RECIPIENT_LINE.test(t) &&
      opts.recipients.includes(t.replace(/^إلى\s*[:：]\s*/, '').trim())
    ) {
      return false;
    }
    if (/^(بسم الله|المملكة العربية|وزارة العدل|المحكمة العمالية|للاستخدام الداخلي)/.test(t)) {
      return false;
    }
    return true;
  });

  let body = filtered.join('\n').trim();
  for (const block of sectionBlocks) {
    if (body.includes(block)) {
      body = body.split(block).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
  }
  return body;
}

export function parsePaste(raw: string): ParsedPaste {
  const text = normalize(raw);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Auto-detect study Excel layout — no need to choose type first
  if (isStudyPaste(text)) {
    const study = parseStudyPaste(text);
    const mapped = studyToFormFields(study);
    const font = suggestFont('نموذج تحليل حكم (شكوى)', mapped.body);
    return {
      number: study.caseNumber || '',
      date: '',
      subject: mapped.subject,
      recipients: '',
      parties: mapped.parties,
      facts: '',
      reasons: mapped.reasons,
      studyFields: mapped.studyFields,
      body: dedupeGreetingBody(mapped.body, mapped.subject),
      tableRows: [],
      judgmentCardFields: extractJudgmentCardFromPaste(text),
      studySections: study,
      detectedKind: 'study',
      fontHint: { family: font.suggestion.family, sizePt: font.suggestion.sizePt },
    };
  }


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

  // Prefer Hijri as-is for official docs; normalize Gregorian to ISO when clearly Gregorian (year >= 1900)
  const rawDate = date.trim();
  if (/هـ|هجر/.test(rawDate)) {
    date = rawDate; // keep Hijri string (subject lines / paste)
  } else {
    const g = rawDate.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (g) {
      const yNum = Number(g[3].length === 2 ? `20${g[3]}` : g[3]);
      if (yNum >= 1300 && yNum <= 1600) {
        // Hijri without هـ marker — keep slash form
        date = `${yNum}/${g[2].padStart(2, '0')}/${g[1].padStart(2, '0')}هـ`;
      } else if (yNum >= 1900) {
        date = `${yNum}-${g[2].padStart(2, '0')}-${g[1].padStart(2, '0')}`;
      } else {
        date = rawDate;
      }
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      date = rawDate;
    } else {
      date = rawDate;
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


  // LETTER_HEAD_FALLBACK: plain letter often starts with honorific without "إلى:"
  if (!recipients) {
    const salIdx = lines.findIndex((l) => SALUTATION.test(l));
    const head = (salIdx >= 0 ? lines.slice(0, salIdx) : lines.slice(0, 8)).map((l) => l.trim()).filter(Boolean);
    const hit = head.find((l) => /^(فضيل[ةه]|سعاد[ةه]|معالي|سمو)\b/.test(l) && l.length < 120);
    if (hit) recipients = hit.replace(/^إلى\s*[:：]\s*/, '').trim();
  }

  // If subject still empty, use decision/circular title line if short
  if (!subject) {
    const decision = lines.find((l) => /قرار رقم|تعميم رقم|خطاب رقم/.test(l));
    if (decision && decision.length < 120) subject = decision;
  }
  if (!subject) {
    const bshan = text.match(/بشأن\s*[:：]?\s*([^\n]{8,120})/);
    if (bshan) subject = ('بشأن ' + bshan[1].trim()).trim();
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
    parties: partiesOut,
    reasons,
    facts,
    study,
  });

  // Merge legacy «الوقائع» into reasons/body — field removed from UX
  const reasonsOut = [reasons, facts].filter(Boolean).join('\n\n').trim();
  const kind: ParsedPaste['detectedKind'] =
    tableRows.length >= 2 ? 'table' : subject || recipients ? 'letter' : 'unknown';
  const font = suggestFont(kind === 'table' ? 'كشف أسماء' : 'خطاب صادر', body || text);

  const bodyClean = dedupeGreetingBody(body, subject);

  const judgmentCardFields = extractJudgmentCardFromPaste(text);

  return {
    number,
    date,
    subject,
    recipients,
    parties: partiesOut,
    facts: '',
    reasons: reasonsOut,
    studyFields: study,
    body: bodyClean,
    tableRows,
    judgmentCardFields,
    detectedKind: kind,
    fontHint: { family: font.suggestion.family, sizePt: font.suggestion.sizePt },
  };
}

/**
 * Rich-paste aware parser. When the input carries HTML (Word/Excel/Outlook
 * clipboard), the Universal Table & Model Adaptor first recovers the table
 * structure (and smart-aggregates duplicated rows), then hands a normalised
 * TSV to the standard plain-text parser. Plain text passes through unchanged.
 */
export function parseRichPaste(raw: string): ParsedPaste {
  const input = String(raw || '');
  const table = parseAnyTable(input);
  const hasTableShape = table.grid.length >= 2 && table.grid[0].length >= 2;
  const isTable = hasTableShape && (table.source === 'html' || /[\t,،|]/.test(input));

  if (isTable) {
    const rows = gridToTableRows(table.grid);
    if (rows.length || table.grid.length) {
      const tsv = htmlToPasteText(input) || table.grid.map((r) => r.join('\t')).join('\n');
      const base = parsePaste(tsv);
      const tableRows = rows.length ? rows : base.tableRows;
      // Render the recovered grid as a styled, bordered HTML table so the
      // preview/export shows real columns instead of continuous text.
      const bodyHtml = gridToEditorTableHtml(table.grid, {
        bordered: true,
        headers: table.hasHeader,
      });
      return {
        ...base,
        body: bodyHtml,
        tableRows,
        detectedKind: tableRows.length >= 2 ? 'table' : base.detectedKind,
      };
    }
  }
  return parsePaste(input);
}

export function buildTitle(honorific: string, position: string, name?: string) {
  const base = honorific || position || '';
  return name ? `${base} / ${name}` : base;
}
