/** Distribute a pasted official letter into structured fields */
export function parsePaste(raw: string) {
  const text = raw.replace(/\r\n/g, '\n').trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const pick = (re: RegExp) => {
    const m = text.match(re);
    return m?.[1]?.trim() || '';
  };

  const number =
    pick(/رقم[:\s]*([^\n]+)/i) ||
    pick(/(صادر-\d{4}-\d+)/i) ||
    '';
  const date =
    pick(/التاريخ[:\s]*([^\n]+)/i) ||
    pick(/بتاريخ[:\s]*([^\n]+)/i) ||
    '';
  const subject =
    pick(/الموضوع[:\s]*([^\n]+)/i) ||
    pick(/بشأن[:\s]*([^\n]+)/i) ||
    '';
  const recipients =
    pick(/إلى[:\s]*([^\n]+)/i) ||
    pick(/الموجه إلي[ه]?[:\s]*([^\n]+)/i) ||
    '';
  const parties =
    pick(/الأطراف[:\s]*([^\n]+)/i) ||
    pick(/بين[:\s]*([^\n]+)/i) ||
    '';

  let facts = '';
  let reasons = '';
  let study = '';

  const factsIdx = lines.findIndex((l) => /الوقائع|أولاً|أولا/.test(l));
  const reasonsIdx = lines.findIndex((l) => /الأسباب|الحيثيات|ثانياً|ثانيا/.test(l));
  const studyIdx = lines.findIndex((l) => /الدراسة|الرأي|ثالثاً|ثالثا/.test(l));

  if (factsIdx >= 0) {
    const end = [reasonsIdx, studyIdx].filter((i) => i > factsIdx).sort((a, b) => a - b)[0] ?? lines.length;
    facts = lines.slice(factsIdx + 1, end).join('\n');
  }
  if (reasonsIdx >= 0) {
    const end = [studyIdx].filter((i) => i > reasonsIdx).sort((a, b) => a - b)[0] ?? lines.length;
    reasons = lines.slice(reasonsIdx + 1, end).join('\n');
  }
  if (studyIdx >= 0) {
    study = lines.slice(studyIdx + 1).join('\n');
  }

  return {
    number,
    date,
    subject,
    recipients,
    parties,
    facts,
    reasons,
    studyFields: study,
    body: text,
  };
}

export function buildTitle(honorific: string, position: string, name?: string) {
  const base = honorific || position || '';
  return name ? `${base} / ${name}` : base;
}
