/**
 * Stamp `style="font-family: 'FontName'"` onto export HTML so Chromium PDF
 * and Outlook actually use the selected face (CSS inheritance is not enough).
 */

const TEXT_TAGS = 'p|h1|h2|h3|h4|h5|h6|div|td|th|li|span|pre|blockquote';
const OPEN_TAG_RE = new RegExp(`<(${TEXT_TAGS})(\\s[^>]*)?>`, 'gi');

/** Normalize to a CSS font-family value, e.g. `'Amiri'` or `'Amiri', serif`. */
export function fontFamilyCssValue(fontFamily: string): string {
  const raw = String(fontFamily || '').trim();
  if (!raw) return `'Traditional Arabic'`;
  if (/^font-family\s*:/i.test(raw)) return raw.replace(/^font-family\s*:\s*/i, '').trim();
  if (raw.includes(',') || raw.startsWith("'") || raw.startsWith('"')) return raw;
  return `'${raw.replace(/'/g, '')}'`;
}

/**
 * Inject `font-family` into every paragraph/text tag that does not already
 * declare one. Existing TipTap per-span font-family is preserved.
 */
export function stampInlineFontFamily(html: string, fontFamily: string): string {
  const value = fontFamilyCssValue(fontFamily);
  const decl = `font-family: ${value}`;
  return String(html || '').replace(OPEN_TAG_RE, (full) => {
    if (/font-family\s*:/i.test(full)) return full;
    if (/style\s*=\s*"/i.test(full)) {
      return full.replace(/style\s*=\s*"/i, `style="${decl}; `);
    }
    if (/style\s*=\s*'/i.test(full)) {
      return full.replace(/style\s*=\s*'/i, `style='${decl}; `);
    }
    return full.replace(/>$/, ` style="${decl}">`);
  });
}

/** True when a paragraph carries an explicit font-family inline style. */
export function htmlHasInlineParagraphFont(html: string, fontName?: string): boolean {
  const p = String(html || '').match(/<p\b[^>]*>/i);
  if (!p) return false;
  if (!/font-family\s*:/i.test(p[0])) return false;
  if (!fontName) return true;
  const escaped = fontName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`font-family\\s*:\\s*['"]?${escaped}`, 'i').test(p[0]);
}
