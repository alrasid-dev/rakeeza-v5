/** Shape + bidi-reorder Arabic for jsPDF (LTR glyph painter) */
import { ArabicShaper } from 'arabic-persian-reshaper';
import bidiFactory from 'bidi-js';

const bidi = bidiFactory();

export function prepareArabicForPdf(text: string): string {
  const raw = String(text ?? '');
  if (!raw) return '';
  // Skip pure ASCII/digits/punctuation lines
  if (!/[\u0600-\u06FF]/.test(raw)) return raw;
  try {
    const shaped = ArabicShaper.convertArabic(raw);
    const levels = bidi.getEmbeddingLevels(shaped, 'rtl');
    return bidi.getReorderedString(shaped, levels);
  } catch {
    return raw;
  }
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
