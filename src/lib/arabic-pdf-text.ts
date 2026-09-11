/** Shape + bidi-reorder Arabic for jsPDF (LTR glyph painter) */
import { ArabicShaper } from 'arabic-persian-reshaper';
import bidiFactory from 'bidi-js';

const bidi = bidiFactory();

/**
 * Prepare Arabic for jsPDF canvas painting (LTR).
 * Returns visual-order presentation forms. Do NOT use this for Chromium/HTML PDF.
 */
export function prepareArabicForPdf(text: string): string {
  const raw = String(text ?? '');
  if (!raw) return '';
  if (!/[\u0600-\u06FF]/.test(raw)) return raw;
  try {
    const shaped = ArabicShaper.convertArabic(raw);
    const levels = bidi.getEmbeddingLevels(shaped, 'rtl');
    const visual = bidi.getReorderedString(shaped, levels);
    // Guard: if reshape somehow no-op'd, fall back to simple reverse of logical
    if (visual === raw || !visual) {
      return raw.split('').reverse().join('');
    }
    return visual;
  } catch {
    // Crude fallback so letters aren't drawn logical-LTR (looks fully reversed)
    return raw.split('').reverse().join('');
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
