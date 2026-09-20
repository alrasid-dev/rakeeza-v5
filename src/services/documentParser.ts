/**
 * Universal Document & Table Classifier (المعالج الدلالي الموحد للملفات والجداول).
 *
 * DeepSeek serves as the semantic normalization layer: any raw Word/Excel
 * content (text or a flat grid) is classified as either a single-case FORM or
 * a multi-row flat TABLE, and re-emitted into a canonical JSON shape — with no
 * hard-coded column templates.
 *
 * A deterministic local fallback (reusing the platform's existing parsers)
 * keeps the pipeline working even when DEEPSEEK_API_KEY is absent.
 */

import { parseAnyTable, sanitizeClipboardHtml } from '@/lib/universal-table-parser';
import { parseRichPaste } from '@/lib/parse-paste';
import { isStudyPaste, parseStudyPaste, type StudySections } from '@/lib/parse-study';

export type UniversalParseResult = {
  detected_type: 'FORM' | 'TABLE';
  summary: {
    total_records: number;
    source_format: string;
  };
  case_data?: Record<string, unknown>;
  records?: Array<Record<string, unknown>>;
};

// OpenRouter as the gateway — the provided DEEPSEEK_API_KEY is an OpenRouter key.
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-r1:free';
const OPENROUTER_REFERER = 'https://rakiza.platform';
const OPENROUTER_TITLE = 'Rakiza Platform';

export const DEEPSEEK_MASTER_SYSTEM_PROMPT = `أنت محرك تحليل وتصنيف البيانات القضائية والإدارية لمنصة "ركيزة".
وظيفتك هي استقبال أي نصوص أو جداول مفرغة من ملفات (Word أو Excel)، واكتشاف هيكليتها تلقائياً، وتوحيد مخرجاتها بدون فقدان أي معلومة.

[قواعد التصنيف والمعالجة]:
1. قم بتمحيص المدخلات وتحديد النوع الأول (detected_type):
   - "FORM": إذا كانت المدخلات عبارة عن استمارة قضية واحدة بها حقول ومربعات (مثل: نموذج تحليل حكم / دراسة شكوى).
   - "TABLE": إذا كانت المدخلات عبارة عن جدول مسطح يحتوي على صفوف أفقية متعددة وأعمدة ممتدة.

2. توحيد المسميات برمجياً:
   - "رقم القضية" أو "رقم الدعوى" ➔ case_number
   - "رقم الصك" أو "رقم الحكم" ➔ deed_number
   - "التشكيل" أو "الدائرة القضائية" ➔ circuit
   - "الناظر" أو "دارس القضية" ➔ judge_researcher
   - "المدعي/ة" ➔ plaintiff
   - "المدعى عليه/ا" ➔ defendant
   - "دعوى المدعي" أو "ملخص الدعوى" ➔ claim_summary
   - "إجابة المدعى عليه" ➔ defendant_reply
   - "مبلغ المطالبة" ➔ claim_amount
   - "تاريخ الحكم" ➔ verdict_date
   - "مصدر الحكم" ➔ verdict_source
   - "المشكلة" ➔ problem
   - "الرأي القانوني" ➔ legal_opinion
   - "التوصية" ➔ recommendation
   - "معد الدراسة" ➔ study_prepared_by

3. تنسيق مخرجات JSON الصارم:
{
  "detected_type": "FORM" | "TABLE",
  "summary": {
    "total_records": 1,
    "source_format": "وصف مختصر للهيكل المكتشف"
  },
  "case_data": {
    "case_number": "",
    "deed_number": "",
    "circuit": "",
    "specialization": "",
    "judge_researcher": "",
    "plaintiff": "",
    "defendant": "",
    "claim_summary": "",
    "defendant_reply": "",
    "problem": "",
    "legal_opinion": "",
    "recommendation": "",
    "study_prepared_by": "",
    "extra_fields": {}
  },
  "records": [
    {
      "circuit": "",
      "verdict_source": "",
      "deed_number": "",
      "verdict_date": "",
      "case_number": "",
      "claim_amount": "",
      "verdict_inputs": "",
      "notes": "",
      "extra_fields": {}
    }
  ]
}

أعد النتيجة بصيغة JSON فقط، دون أي نص توضيحي خارج الكائن.`;

function normalizeText(s: string): string {
  return String(s || '')
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Canonical record keys (TABLE) → Arabic column labels. */
const TABLE_COLUMN_RULES: Array<{ key: string; re: RegExp }> = [
  { key: 'case_number', re: /رقم\s*(القضيه|القضية|الدعوى)/ },
  { key: 'deed_number', re: /رقم\s*(الصك|الحكم)/ },
  { key: 'circuit', re: /التشكيل|الدائرة|دائرة/ },
  { key: 'verdict_source', re: /مصدر\s*(الحكم|القرار)/ },
  { key: 'verdict_date', re: /تاريخ\s*(الحكم|القرار|النطق)/ },
  { key: 'claim_amount', re: /مبلغ\s*المطالبة|المطالبة|مقدارها/ },
  { key: 'verdict_inputs', re: /نص\s*الحكم|منطوق|أوجه\s*الحكم/ },
  { key: 'notes', re: /ملاحظات|ملاحظه/ },
];

function headerToKey(header: string): string | null {
  const t = normalizeText(header);
  if (!t) return null;
  for (const rule of TABLE_COLUMN_RULES) {
    if (rule.re.test(t)) return rule.key;
  }
  return null;
}

const RECORD_KEYS = [
  'circuit',
  'verdict_source',
  'deed_number',
  'verdict_date',
  'case_number',
  'claim_amount',
  'verdict_inputs',
  'notes',
] as const;

function mapRowToRecord(header: string[], row: string[]): Record<string, unknown> {
  const record: Record<string, unknown> = {
    circuit: '',
    verdict_source: '',
    deed_number: '',
    verdict_date: '',
    case_number: '',
    claim_amount: '',
    verdict_inputs: '',
    notes: '',
    extra_fields: {},
  };
  const extras: Record<string, unknown> = {};
  header.forEach((h, i) => {
    const value = String(row[i] ?? '').trim();
    if (!value) return;
    const key = headerToKey(h);
    if (key && RECORD_KEYS.includes(key as (typeof RECORD_KEYS)[number])) {
      if (!record[key]) record[key] = value;
    } else if (h.trim()) {
      extras[h.trim()] = value;
    }
  });
  record.extra_fields = extras;
  return record;
}

function mapStudyToCaseData(s: StudySections): Record<string, unknown> {
  return {
    case_number: s.caseNumber || '',
    deed_number: s.deedNumber || '',
    circuit: s.formation || '',
    specialization: '',
    judge_researcher: s.researcher || '',
    plaintiff: s.plaintiff || '',
    defendant: s.defendant || '',
    claim_summary: s.summaryPlaintiff || '',
    defendant_reply: s.summaryDefendant || '',
    claim_amount: s.claimAmount || '',
    verdict_date: '',
    verdict_source: '',
    problem: s.problem || '',
    legal_opinion: s.legalOpinion || '',
    recommendation: s.recommendation || '',
    study_prepared_by: s.preparer || '',
    extra_fields: {
      jurisdiction: s.jurisdiction || '',
      acceptance: s.acceptance || '',
      claim_type: s.claimType || '',
      representation: s.representation || '',
      supervisor: s.supervisor || '',
      prep_date: s.prepDate || '',
    },
  };
}

/** Defensive coercion of an (LLM or local) object into UniversalParseResult. */
export function normalizeUniversalResult(input: unknown): UniversalParseResult {
  const obj = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const detected_type: UniversalParseResult['detected_type'] =
    obj.detected_type === 'TABLE' ? 'TABLE' : 'FORM';
  const summary = (obj.summary && typeof obj.summary === 'object' ? obj.summary : {}) as Record<string, unknown>;
  const total_records =
    typeof summary.total_records === 'number'
      ? summary.total_records
      : detected_type === 'TABLE'
        ? Array.isArray(obj.records)
          ? obj.records.length
          : 0
        : 1;

  return {
    detected_type,
    summary: {
      total_records,
      source_format: String(summary.source_format || (detected_type === 'TABLE' ? 'جدول مسطح' : 'استمارة')),
    },
    case_data: obj.case_data && typeof obj.case_data === 'object' ? (obj.case_data as Record<string, unknown>) : {},
    records: Array.isArray(obj.records) ? (obj.records as Array<Record<string, unknown>>) : [],
  };
}

/**
 * DeepSeek semantic normalization — the primary engine.
 * Throws when the key is missing or the API call fails, so callers can fall back.
 */
export async function processUniversalDocument(rawContent: string | object): Promise<UniversalParseResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not defined in environment variables.');
  }

  const contentString = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': OPENROUTER_REFERER,
      'X-Title': OPENROUTER_TITLE,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: DEEPSEEK_MASTER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `قم بتحليل واستخراج البيانات التالية وتكييفها مع بنية JSON المحددة:\n\n${contentString}`,
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.statusText}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message?.content;
  if (!message) throw new Error('DeepSeek API returned an empty response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(message));
  } catch {
    // Some providers return the object directly.
    parsed = message;
  }
  return normalizeUniversalResult(parsed);
}

/** Deterministic local fallback reusing the platform's existing parsers. */
export function localUniversalParse(rawContent: string | object): UniversalParseResult {
  const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
  const raw = sanitizeClipboardHtml(String(content || '')).trim();
  if (!raw) {
    return {
      detected_type: 'FORM',
      summary: { total_records: 1, source_format: 'فارغ' },
      case_data: {},
      records: [],
    };
  }

  // 1) Flat multi-row / multi-column table.
  const table = parseAnyTable(raw);
  const looksTabular = table.grid.length >= 2 && table.grid[0].length >= 2;
  if (looksTabular && (table.source === 'html' || /[\t]/.test(raw))) {
    const grid = table.grid.map((r) => r.map((c) => String(c ?? '').trim()));
    const headerRowIndex = table.headerRowIndex;
    const header = headerRowIndex >= 0 ? grid[headerRowIndex] : grid[0].map((_, i) => `column_${i + 1}`);
    const body = headerRowIndex >= 0 ? grid.filter((_, i) => i !== headerRowIndex) : grid;
    const records = body
      .filter((r) => r.some((c) => c.trim()))
      .map((row) => mapRowToRecord(header, row));
    return {
      detected_type: 'TABLE',
      summary: {
        total_records: records.length,
        source_format: table.source === 'html' ? 'جدول HTML/Excel' : 'جدول نصي مسطح',
      },
      case_data: {},
      records,
    };
  }

  // 2) Key-value study form.
  if (isStudyPaste(raw)) {
    const s = parseStudyPaste(raw);
    return {
      detected_type: 'FORM',
      summary: { total_records: 1, source_format: 'استمارة دراسة شكوى (حقول)' },
      case_data: mapStudyToCaseData(s),
      records: [],
    };
  }

  // 3) Generic single-case document text.
  const rp = parseRichPaste(raw);
  return {
    detected_type: 'FORM',
    summary: { total_records: 1, source_format: 'نص مكاتبة / مستند' },
    case_data: {
      case_number: rp.number || '',
      deed_number: '',
      circuit: '',
      specialization: '',
      judge_researcher: '',
      plaintiff: rp.parties || '',
      defendant: '',
      claim_summary: rp.reasons || '',
      defendant_reply: '',
      claim_amount: '',
      verdict_date: rp.date || '',
      verdict_source: '',
      problem: '',
      legal_opinion: '',
      recommendation: '',
      study_prepared_by: '',
      extra_fields: {
        subject: rp.subject || '',
        recipients: rp.recipients || '',
        body: rp.body || '',
      },
    },
    records: [],
  };
}
