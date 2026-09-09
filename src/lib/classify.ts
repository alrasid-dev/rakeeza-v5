/** Local heuristic classifier for Smart Import — no paid APIs */
export function classifyText(text: string) {
  const t = text || '';
  let category = 'مكاتبة عامة';
  if (/تعميم|دوري/.test(t)) category = 'تعميم';
  else if (/حكم|قضية|دعوى/.test(t)) category = 'قضائي';
  else if (/تقرير|دراسة/.test(t)) category = 'تقرير / دراسة';
  else if (/خطاب|مذكرة/.test(t)) category = 'خطاب';
  else if (/محضر/.test(t)) category = 'محضر';

  const numberMatch = t.match(/صادر[-\s]*(\d{4})[-\s]*(\d+)/i) || t.match(/رقم[:\s]*([^\s\n]+)/);
  const dateMatch = t.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  const subjectMatch = t.match(/الموضوع[:\s]*(.+)/) || t.match(/بشأن[:\s]*(.+)/);

  return {
    category,
    number: numberMatch ? (numberMatch[0].includes('صادر') ? `صادر-${numberMatch[1]}-${numberMatch[2]}` : numberMatch[1]) : null,
    date: dateMatch?.[1] || null,
    subject: subjectMatch?.[1]?.trim().slice(0, 200) || null,
    confidence: numberMatch || subjectMatch ? 0.7 : 0.4,
    preview: t.slice(0, 500),
  };
}
