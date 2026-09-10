/** Local heuristic classifier for Smart Import — no paid APIs */
import { parsePaste } from '@/lib/parse-paste';

export function classifyText(text: string) {
  const t = text || '';
  let category = 'مكاتبة عامة';
  if (/تعميم|دوري/.test(t)) category = 'تعميم';
  else if (/حكم|قضية|دعوى/.test(t)) category = 'قضائي';
  else if (/تقرير|دراسة/.test(t)) category = 'تقرير / دراسة';
  else if (/خطاب|مذكرة/.test(t)) category = 'خطاب';
  else if (/محضر/.test(t)) category = 'محضر';

  const parsed = parsePaste(t);
  const numberMatch = t.match(/صادر[-\s]*(\d{4})[-\s]*(\d+)/i) || t.match(/رقم[:\s]*([^\s\n]+)/);
  const dateMatch = t.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);

  return {
    category,
    number: parsed.number || (numberMatch
      ? numberMatch[0].includes('صادر')
        ? `صادر-${numberMatch[1]}-${numberMatch[2]}`
        : numberMatch[1]
      : null),
    date: parsed.date || dateMatch?.[1] || null,
    subject: parsed.subject || null,
    recipients: parsed.recipients || null,
    tableRows: parsed.tableRows,
    confidence: parsed.subject || parsed.recipients || numberMatch ? 0.75 : 0.4,
    preview: t.slice(0, 500),
  };
}
