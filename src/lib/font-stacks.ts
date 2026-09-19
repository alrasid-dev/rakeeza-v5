/**
 * Web-safe stacks so font picker changes are visible (next/font CSS variables).
 * PDF embedding lives in arabic-font-library + pdf-font-css (Base64 @font-face).
 */

import {
  ARABIC_FONT_LIBRARY,
  EXTENDED_FONT_OPTIONS,
  concreteFontStack,
  resolvePdfEmbeddedFamily,
  tiptapFontFamilyCss,
} from '@/lib/arabic-font-library';

export { concreteFontStack, tiptapFontFamilyCss, resolvePdfEmbeddedFamily };

/** Preview / Next.js — may include CSS variables from next/font. */
const PREVIEW_STACK: Record<string, string> = {
  'Traditional Arabic':
    'var(--font-amiri), "Amiri", "Traditional Arabic", "Noto Naskh Arabic", serif',
  Amiri: 'var(--font-amiri), "Amiri", serif',
  Cairo: 'var(--font-cairo), "Cairo", Tahoma, sans-serif',
  Tajawal: 'var(--font-tajawal), "Tajawal", Tahoma, sans-serif',
  Almarai: 'var(--font-almarai), "Almarai", Tahoma, sans-serif',
  'IBM Plex Sans Arabic':
    'var(--font-ibm-plex-ar), "IBM Plex Sans Arabic", Tahoma, sans-serif',
  'Scheherazade New':
    'var(--font-scheherazade), "Scheherazade New", "Sakkal Majalla", serif',
  'Aref Ruqaa': 'var(--font-aref-ruqaa), "Aref Ruqaa", "Amiri", serif',
  'Reem Kufi': 'var(--font-reem-kufi), "Reem Kufi", Tahoma, sans-serif',
  'Noto Naskh Arabic': 'var(--font-noto-naskh), "Noto Naskh Arabic", "Amiri", serif',
  'Sakkal Majalla':
    'var(--font-scheherazade), "Scheherazade New", "Sakkal Majalla", "Noto Naskh Arabic", serif',
  Lateef: 'var(--font-lateef), "Lateef", "Noto Naskh Arabic", serif',
  'Noto Kufi Arabic': 'var(--font-noto-kufi), "Noto Kufi Arabic", Tahoma, sans-serif',
  Changa: 'var(--font-changa), "Changa", Tahoma, sans-serif',
  'El Messiri': 'var(--font-el-messiri), "El Messiri", "Noto Naskh Arabic", serif',
  'Markazi Text': 'var(--font-markazi), "Markazi Text", "Noto Naskh Arabic", serif',
  Harmattan: 'var(--font-harmattan), "Harmattan", "Noto Naskh Arabic", serif',
  'Readex Pro': 'var(--font-readex), "Readex Pro", Tahoma, sans-serif',
  Rubik: 'var(--font-rubik), "Rubik", Tahoma, sans-serif',
  Mada: 'var(--font-mada), "Mada", Tahoma, sans-serif',
  Tahoma: 'Tahoma, var(--font-noto-naskh), Arial, sans-serif',
  Arial: 'Arial, var(--font-noto-naskh), sans-serif',
};

/** Core nine (Step 3) first, then extended. */
export const FONT_OPTIONS: { id: string; label: string; stack: string }[] = [
  ...ARABIC_FONT_LIBRARY.filter((f) =>
    [
      'Traditional Arabic',
      'Amiri',
      'Cairo',
      'Tajawal',
      'Almarai',
      'IBM Plex Sans Arabic',
      'Scheherazade New',
      'Aref Ruqaa',
      'Reem Kufi',
    ].includes(f.id),
  ).map((f) => ({
    id: f.id,
    label: f.label,
    stack: PREVIEW_STACK[f.id] || concreteFontStack(f.id),
  })),
  ...EXTENDED_FONT_OPTIONS.map((f) => ({
    id: f.id,
    label: f.label,
    stack: PREVIEW_STACK[f.id] || concreteFontStack(f.id),
  })),
  {
    id: 'Noto Naskh Arabic',
    label: 'Noto Naskh Arabic',
    stack: PREVIEW_STACK['Noto Naskh Arabic'],
  },
];

export function fontStackFor(id?: string | null): string {
  const hit = FONT_OPTIONS.find((f) => f.id === id);
  return hit?.stack || FONT_OPTIONS[0].stack;
}

/**
 * Outlook / PDF / email — concrete family names only (no var(--font-*)).
 * CSS variables are unavailable outside the Next.js preview tree.
 * Base64 @font-face is PDF-only; Outlook keeps these concrete stacks (+ optional GF).
 */
export function exportFontStack(id?: string | null): string {
  return concreteFontStack(id);
}

const GOOGLE_FAMILY_PARAM: Record<string, string> = {
  'Traditional Arabic': 'Amiri:wght@400;700',
  Amiri: 'Amiri:wght@400;700',
  'Sakkal Majalla': 'Scheherazade+New:wght@400;700',
  'Scheherazade New': 'Scheherazade+New:wght@400;700',
  'Noto Naskh Arabic': 'Noto+Naskh+Arabic:wght@400;700',
  Lateef: 'Lateef:wght@400;700',
  'Noto Kufi Arabic': 'Noto+Kufi+Arabic:wght@400;700',
  'Reem Kufi': 'Reem+Kufi:wght@400;700',
  Changa: 'Changa:wght@400;700',
  Almarai: 'Almarai:wght@400;700',
  'IBM Plex Sans Arabic': 'IBM+Plex+Sans+Arabic:wght@400;700',
  Cairo: 'Cairo:wght@400;700',
  Tajawal: 'Tajawal:wght@400;700',
  'Aref Ruqaa': 'Aref+Ruqaa:wght@400;700',
  'El Messiri': 'El+Messiri:wght@400;700',
  'Markazi Text': 'Markazi+Text:wght@400;700',
  Harmattan: 'Harmattan:wght@400;700',
  'Readex Pro': 'Readex+Pro:wght@400;700',
  Rubik: 'Rubik:wght@400;700',
  Mada: 'Mada:wght@400;700',
};

/** Always-include Google families for Outlook HTML (when online). PDF uses Base64 instead. */
const ALWAYS_GOOGLE = [
  'Amiri:wght@400;700',
  'Scheherazade+New:wght@400;700',
  'Noto+Naskh+Arabic:wght@400;700',
  'Cairo:wght@400;700',
  'Tajawal:wght@400;700',
  'Almarai:wght@400;700',
  'IBM+Plex+Sans+Arabic:wght@400;700',
  'Aref+Ruqaa:wght@400;700',
  'Reem+Kufi:wght@400;700',
];

/**
 * @import url for Google Fonts CSS2 covering selected + core Arabic families.
 * For Outlook / preview fallback only — NOT used by PDF Chromium path.
 */
export function googleFontsImportCss(fontIds: string[]): string {
  const families = new Set<string>(ALWAYS_GOOGLE);
  for (const id of fontIds) {
    const param = GOOGLE_FAMILY_PARAM[String(id || '')];
    if (param) families.add(param);
  }
  const q = Array.from(families).join('&family=');
  return `@import url('https://fonts.googleapis.com/css2?family=${q}&display=swap');`;
}

/**
 * Which embedded @font-face family name to prefer for PDF for a picker id.
 * @deprecated Prefer resolvePdfEmbeddedFamily from arabic-font-library.
 */
export function pdfEmbeddedFamily(
  id?: string | null,
): 'Amiri' | 'Scheherazade New' | 'Noto Naskh Arabic' | string {
  return resolvePdfEmbeddedFamily(id);
}

/** Word-safe family name for DOCX TextRun.font */
export function docxFontName(id?: string | null): string {
  const map: Record<string, string> = {
    'Traditional Arabic': 'Traditional Arabic',
    Amiri: 'Amiri',
    'Sakkal Majalla': 'Sakkal Majalla',
    'Scheherazade New': 'Scheherazade New',
    'Noto Naskh Arabic': 'Noto Naskh Arabic',
    Lateef: 'Lateef',
    'Noto Kufi Arabic': 'Noto Kufi Arabic',
    'Reem Kufi': 'Reem Kufi',
    Changa: 'Changa',
    Almarai: 'Almarai',
    'IBM Plex Sans Arabic': 'IBM Plex Sans Arabic',
    Cairo: 'Cairo',
    Tajawal: 'Tajawal',
    'Aref Ruqaa': 'Aref Ruqaa',
    'El Messiri': 'El Messiri',
    'Markazi Text': 'Markazi Text',
    Harmattan: 'Harmattan',
    'Readex Pro': 'Readex Pro',
    Rubik: 'Rubik',
    Mada: 'Mada',
    Tahoma: 'Tahoma',
    Arial: 'Arial',
  };
  return map[String(id || '')] || 'Traditional Arabic';
}
