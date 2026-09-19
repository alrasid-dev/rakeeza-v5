/**
 * Comprehensive Arabic font catalog for editor + PDF Base64 embedding.
 *
 * FREE / OFL Google Fonts TTFs live under public/fonts/.
 * Traditional Arabic is proprietary (Microsoft) — we alias it to Amiri (Naskh-like)
 * for preview/PDF and document that fallback in public/fonts/README.md.
 */

export type ArabicFontCategory = 'serif-naskh' | 'serif-display' | 'sans' | 'kufi' | 'system';

export type ArabicFontDef = {
  /** Picker / TipTap id (matches FONT_OPTIONS id). */
  id: string;
  /** CSS font-family primary name used in @font-face and inline styles. */
  cssFamily: string;
  label: string;
  category: ArabicFontCategory;
  /** Generic fallback for TipTap inline CSS. */
  generic: 'serif' | 'sans-serif';
  /**
   * TTF filename under public/fonts/ (Regular face).
   * null = system / proprietary — use aliasFile instead.
   */
  file: string | null;
  /** When file is null, embed this TTF under cssFamily (and optional aliases). */
  aliasFile?: string;
  /** Extra @font-face family names that share the same TTF bytes. */
  aliases?: string[];
  /** Include in the required PDF Base64 set (verify script). */
  requiredForPdf: boolean;
};

/**
 * Required toolbar families (Step 3) plus Noto Naskh (jsPDF / always-on embed).
 * Order matches the preferred toolbar order for the core nine.
 */
export const ARABIC_FONT_LIBRARY: ArabicFontDef[] = [
  {
    id: 'Traditional Arabic',
    cssFamily: 'Traditional Arabic',
    label: 'Traditional Arabic (أميري/رسمي)',
    category: 'serif-naskh',
    generic: 'serif',
    // Proprietary — embed Amiri bytes under this family name for PDF
    file: null,
    aliasFile: 'Amiri-Regular.ttf',
    aliases: [],
    requiredForPdf: true,
  },
  {
    id: 'Amiri',
    cssFamily: 'Amiri',
    label: 'Amiri',
    category: 'serif-naskh',
    generic: 'serif',
    file: 'Amiri-Regular.ttf',
    requiredForPdf: true,
  },
  {
    id: 'Cairo',
    cssFamily: 'Cairo',
    label: 'Cairo',
    category: 'sans',
    generic: 'sans-serif',
    file: 'Cairo-Regular.ttf',
    requiredForPdf: true,
  },
  {
    id: 'Tajawal',
    cssFamily: 'Tajawal',
    label: 'Tajawal',
    category: 'sans',
    generic: 'sans-serif',
    file: 'Tajawal-Regular.ttf',
    requiredForPdf: true,
  },
  {
    id: 'Almarai',
    cssFamily: 'Almarai',
    label: 'Almarai',
    category: 'sans',
    generic: 'sans-serif',
    file: 'Almarai-Regular.ttf',
    requiredForPdf: true,
  },
  {
    id: 'IBM Plex Sans Arabic',
    cssFamily: 'IBM Plex Sans Arabic',
    label: 'IBM Plex Sans Arabic',
    category: 'sans',
    generic: 'sans-serif',
    file: 'IBMPlexSansArabic-Regular.ttf',
    requiredForPdf: true,
  },
  {
    id: 'Scheherazade New',
    cssFamily: 'Scheherazade New',
    label: 'Scheherazade New',
    category: 'serif-naskh',
    generic: 'serif',
    file: 'ScheherazadeNew-Regular.ttf',
    aliases: ['Sakkal Majalla'],
    requiredForPdf: true,
  },
  {
    id: 'Aref Ruqaa',
    cssFamily: 'Aref Ruqaa',
    label: 'Aref Ruqaa',
    category: 'serif-display',
    generic: 'serif',
    file: 'ArefRuqaa-Regular.ttf',
    requiredForPdf: true,
  },
  {
    id: 'Reem Kufi',
    cssFamily: 'Reem Kufi',
    label: 'Reem Kufi',
    category: 'kufi',
    generic: 'sans-serif',
    file: 'ReemKufi-Regular.ttf',
    requiredForPdf: true,
  },
  // Always-on Naskh for jsPDF fallback + PDF safety net
  {
    id: 'Noto Naskh Arabic',
    cssFamily: 'Noto Naskh Arabic',
    label: 'Noto Naskh Arabic',
    category: 'serif-naskh',
    generic: 'serif',
    file: 'NotoNaskhArabic-Regular.ttf',
    requiredForPdf: true,
  },
];

/** Extra picker entries (concrete stacks for Outlook; optional PDF if TTF present). */
export const EXTENDED_FONT_OPTIONS: {
  id: string;
  label: string;
  cssFamily: string;
  generic: 'serif' | 'sans-serif';
  /** Prefer this embedded family when the TTF is missing. */
  pdfFallback: string;
}[] = [
  { id: 'Sakkal Majalla', label: 'Sakkal Majalla (شهرزاد/رسمي)', cssFamily: 'Sakkal Majalla', generic: 'serif', pdfFallback: 'Scheherazade New' },
  { id: 'Lateef', label: 'Lateef', cssFamily: 'Lateef', generic: 'serif', pdfFallback: 'Noto Naskh Arabic' },
  { id: 'Noto Kufi Arabic', label: 'Noto Kufi Arabic', cssFamily: 'Noto Kufi Arabic', generic: 'sans-serif', pdfFallback: 'Reem Kufi' },
  { id: 'Changa', label: 'Changa', cssFamily: 'Changa', generic: 'sans-serif', pdfFallback: 'Cairo' },
  { id: 'El Messiri', label: 'El Messiri', cssFamily: 'El Messiri', generic: 'serif', pdfFallback: 'Amiri' },
  { id: 'Markazi Text', label: 'Markazi Text', cssFamily: 'Markazi Text', generic: 'serif', pdfFallback: 'Amiri' },
  { id: 'Harmattan', label: 'Harmattan', cssFamily: 'Harmattan', generic: 'serif', pdfFallback: 'Amiri' },
  { id: 'Readex Pro', label: 'Readex Pro', cssFamily: 'Readex Pro', generic: 'sans-serif', pdfFallback: 'Cairo' },
  { id: 'Rubik', label: 'Rubik', cssFamily: 'Rubik', generic: 'sans-serif', pdfFallback: 'Cairo' },
  { id: 'Mada', label: 'Mada', cssFamily: 'Mada', generic: 'sans-serif', pdfFallback: 'Cairo' },
  { id: 'Tahoma', label: 'Tahoma', cssFamily: 'Tahoma', generic: 'sans-serif', pdfFallback: 'Noto Naskh Arabic' },
  { id: 'Arial', label: 'Arial', cssFamily: 'Arial', generic: 'sans-serif', pdfFallback: 'Noto Naskh Arabic' },
];

export const REQUIRED_PDF_FONT_FAMILIES: string[] = ARABIC_FONT_LIBRARY.filter(
  (f) => f.requiredForPdf,
).map((f) => f.cssFamily);

export function findFontDef(id?: string | null): ArabicFontDef | undefined {
  const key = String(id || '');
  return (
    ARABIC_FONT_LIBRARY.find((f) => f.id === key || f.cssFamily === key) ||
    ARABIC_FONT_LIBRARY.find((f) => (f.aliases || []).includes(key))
  );
}

/** TipTap TextStyle / FontFamily inline value, e.g. `'Amiri', serif`. */
export function tiptapFontFamilyCss(id?: string | null): string {
  const def = findFontDef(id);
  if (def) {
    if (def.id === 'Traditional Arabic') {
      return `'Amiri', 'Traditional Arabic', 'Noto Naskh Arabic', serif`;
    }
    return `'${def.cssFamily}', ${def.generic}`;
  }
  const ext = EXTENDED_FONT_OPTIONS.find((f) => f.id === String(id || ''));
  if (ext) {
    if (ext.id === 'Tahoma' || ext.id === 'Arial') {
      return `${ext.cssFamily}, 'Noto Naskh Arabic', ${ext.generic}`;
    }
    return `'${ext.cssFamily}', ${ext.generic}`;
  }
  return `'Amiri', 'Traditional Arabic', serif`;
}

/** Concrete CSS stack for Outlook / email (no var(--font-*), no data: URLs). */
export function concreteFontStack(id?: string | null): string {
  const def = findFontDef(id);
  if (def) {
    if (def.id === 'Traditional Arabic') {
      return `'Amiri', 'Traditional Arabic', 'Noto Naskh Arabic', 'Times New Roman', serif`;
    }
    if (def.generic === 'serif') {
      return `'${def.cssFamily}', 'Noto Naskh Arabic', 'Amiri', serif`;
    }
    return `'${def.cssFamily}', Tahoma, sans-serif`;
  }
  const ext = EXTENDED_FONT_OPTIONS.find((f) => f.id === String(id || ''));
  if (ext) {
    if (ext.id === 'Sakkal Majalla') {
      return `'Scheherazade New', 'Sakkal Majalla', 'Noto Naskh Arabic', serif`;
    }
    if (ext.id === 'Tahoma') return `Tahoma, 'Noto Naskh Arabic', Arial, sans-serif`;
    if (ext.id === 'Arial') return `Arial, 'Noto Naskh Arabic', sans-serif`;
    if (ext.generic === 'serif') {
      return `'${ext.cssFamily}', 'Amiri', 'Noto Naskh Arabic', serif`;
    }
    return `'${ext.cssFamily}', Tahoma, sans-serif`;
  }
  return concreteFontStack('Traditional Arabic');
}

/** Which embedded @font-face primary name to prefer as document default in PDF. */
export function resolvePdfEmbeddedFamily(id?: string | null): string {
  const key = String(id || '');
  const def = findFontDef(key);
  if (def) {
    if (def.id === 'Traditional Arabic') return 'Amiri';
    return def.cssFamily;
  }
  const ext = EXTENDED_FONT_OPTIONS.find((f) => f.id === key);
  if (ext) return ext.pdfFallback;
  return 'Amiri';
}
