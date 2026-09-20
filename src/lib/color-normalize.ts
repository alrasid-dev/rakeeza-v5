/**
 * Color normalisation for Outlook / PDF export.
 * Converts rgb()/rgba(), #RGB and #RRGGBBAA to a direct #RRGGBB hex so the
 * Word/Outlook engine and Chromium PDF renderer never fall back to black.
 */

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function byteToHex(n: number): string {
  return clampByte(n).toString(16).padStart(2, '0');
}

/** Normalise a single CSS color value to #RRGGBB (or return as-is). */
export function normalizeCssColor(value: string): string {
  const v = String(value || '').trim();
  if (!v) return v;

  // rgba(1,2,3,0.5) / rgb(1,2,3)
  const rgb = v.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+)?\s*\)$/i,
  );
  if (rgb) {
    return `#${byteToHex(Number(rgb[1]))}${byteToHex(Number(rgb[2]))}${byteToHex(Number(rgb[3]))}`.toUpperCase();
  }

  // #RGB → #RRGGBB
  const short = v.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
  if (short) {
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toUpperCase();
  }

  // #RRGGBB → uppercase
  const six = v.match(/^#([0-9a-fA-F]{6})$/);
  if (six) return `#${six[1].toUpperCase()}`;

  // #RRGGBBAA → drop alpha
  const eight = v.match(/^#([0-9a-fA-F]{8})$/);
  if (eight) return `#${eight[1].slice(0, 6).toUpperCase()}`;

  return v;
}

/**
 * Rewrite inline `color:` / `background-color:` / `background:` values in an
 * HTML fragment to explicit #RRGGBB hex (when the value is a normalisable
 * color). Leaves gradients / complex shorthands untouched.
 */
export function normalizeHtmlColors(html: string): string {
  return String(html || '').replace(
    /(color|background-color|background)\s*:\s*([^;"']+)/gi,
    (_match, prop: string, value: string) => {
      const norm = normalizeCssColor(value.trim());
      return `${prop}:${norm}`;
    },
  );
}
