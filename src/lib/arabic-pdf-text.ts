/**
 * Arabic helpers for PDF export.
 *
 * Chromium/HTML PDF: pass logical Unicode Arabic with dir=rtl — never reshape/bidi.
 * jsPDF + Noto Naskh: also pass logical Arabic as-is. Modern PDF viewers (and
 * poppler) apply OpenType shaping. Feeding presentation-forms from
 * arabic-reshaper+bidi causes DOUBLE bidi → letter-spaced reversed glyphs
 * (بسم الله → م ي ح ر ل ا …) which is the production bug.
 */

/** Identity for logical Arabic — do NOT reshape/bidi for Noto Naskh / Chromium */
export function prepareArabicForPdf(text: string): string {
  return String(text ?? '');
}

export function wrapArabicLines(text: string, maxChars = 70): string[] {
  const lines: string[] = [];
  for (const para of String(text || '').split(/\n/)) {
    if (!para.trim()) {
      lines.push(' ');
      continue;
    }
    let rest = para;
    while (rest.length > maxChars) {
      let cut = rest.lastIndexOf(' ', maxChars);
      if (cut < maxChars * 0.4) cut = maxChars;
      lines.push(rest.slice(0, cut).trimEnd());
      rest = rest.slice(cut).trimStart();
    }
    if (rest) lines.push(rest);
  }
  return lines;
}
