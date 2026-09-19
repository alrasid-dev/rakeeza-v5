/** Web-safe stacks so font picker changes are visible (next/font CSS variables). */

export const FONT_OPTIONS: { id: string; label: string; stack: string }[] = [
  {
    id: 'Traditional Arabic',
    label: 'Traditional Arabic (أميري/رسمي)',
    stack: 'var(--font-amiri), "Amiri", "Traditional Arabic", "Noto Naskh Arabic", serif',
  },
  {
    id: 'Sakkal Majalla',
    label: 'Sakkal Majalla (شهرزاد/رسمي)',
    stack: 'var(--font-scheherazade), "Scheherazade New", "Sakkal Majalla", "Noto Naskh Arabic", serif',
  },
  {
    id: 'Noto Naskh Arabic',
    label: 'Noto Naskh Arabic',
    stack: 'var(--font-noto-naskh), "Noto Naskh Arabic", "Amiri", serif',
  },
  {
    id: 'Lateef',
    label: 'Lateef',
    stack: 'var(--font-lateef), "Lateef", "Noto Naskh Arabic", serif',
  },
  {
    id: 'Noto Kufi Arabic',
    label: 'Noto Kufi Arabic',
    stack: 'var(--font-noto-kufi), "Noto Kufi Arabic", Tahoma, sans-serif',
  },
  {
    id: 'Reem Kufi',
    label: 'Reem Kufi',
    stack: 'var(--font-reem-kufi), "Reem Kufi", Tahoma, sans-serif',
  },
  {
    id: 'Changa',
    label: 'Changa',
    stack: 'var(--font-changa), "Changa", Tahoma, sans-serif',
  },
  {
    id: 'Almarai',
    label: 'Almarai',
    stack: 'var(--font-almarai), "Almarai", Tahoma, sans-serif',
  },
  {
    id: 'IBM Plex Sans Arabic',
    label: 'IBM Plex Sans Arabic',
    stack: 'var(--font-ibm-plex-ar), "IBM Plex Sans Arabic", Tahoma, sans-serif',
  },
  {
    id: 'Cairo',
    label: 'Cairo',
    stack: 'var(--font-cairo), "Cairo", Tahoma, sans-serif',
  },
  {
    id: 'Tajawal',
    label: 'Tajawal',
    stack: 'var(--font-tajawal), "Tajawal", Tahoma, sans-serif',
  },
  {
    id: 'El Messiri',
    label: 'El Messiri',
    stack: 'var(--font-el-messiri), "El Messiri", "Noto Naskh Arabic", serif',
  },
  {
    id: 'Markazi Text',
    label: 'Markazi Text',
    stack: 'var(--font-markazi), "Markazi Text", "Noto Naskh Arabic", serif',
  },
  {
    id: 'Harmattan',
    label: 'Harmattan',
    stack: 'var(--font-harmattan), "Harmattan", "Noto Naskh Arabic", serif',
  },
  {
    id: 'Readex Pro',
    label: 'Readex Pro',
    stack: 'var(--font-readex), "Readex Pro", Tahoma, sans-serif',
  },
  {
    id: 'Rubik',
    label: 'Rubik',
    stack: 'var(--font-rubik), "Rubik", Tahoma, sans-serif',
  },
  {
    id: 'Mada',
    label: 'Mada',
    stack: 'var(--font-mada), "Mada", Tahoma, sans-serif',
  },
  {
    id: 'Tahoma',
    label: 'Tahoma',
    stack: 'Tahoma, var(--font-noto-naskh), Arial, sans-serif',
  },
  {
    id: 'Arial',
    label: 'Arial',
    stack: 'Arial, var(--font-noto-naskh), sans-serif',
  },
];

/** Preview / Next.js — may include CSS variables from next/font. */
export function fontStackFor(id?: string | null): string {
  const hit = FONT_OPTIONS.find((f) => f.id === id);
  return hit?.stack || FONT_OPTIONS[0].stack;
}

/**
 * Outlook / PDF / email — concrete family names only (no var(--font-*)).
 * CSS variables are unavailable outside the Next.js preview tree.
 */
export function exportFontStack(id?: string | null): string {
  const map: Record<string, string> = {
    'Traditional Arabic': "'Amiri', 'Traditional Arabic', 'Noto Naskh Arabic', 'Times New Roman', serif",
    'Sakkal Majalla': "'Scheherazade New', 'Sakkal Majalla', 'Noto Naskh Arabic', serif",
    'Noto Naskh Arabic': "'Noto Naskh Arabic', 'Amiri', serif",
    Lateef: "'Lateef', 'Noto Naskh Arabic', serif",
    'Noto Kufi Arabic': "'Noto Kufi Arabic', Tahoma, sans-serif",
    'Reem Kufi': "'Reem Kufi', Tahoma, sans-serif",
    Changa: "'Changa', Tahoma, sans-serif",
    Almarai: "'Almarai', Tahoma, sans-serif",
    'IBM Plex Sans Arabic': "'IBM Plex Sans Arabic', Tahoma, sans-serif",
    Cairo: "'Cairo', Tahoma, sans-serif",
    Tajawal: "'Tajawal', Tahoma, sans-serif",
    'El Messiri': "'El Messiri', 'Amiri', 'Noto Naskh Arabic', serif",
    'Markazi Text': "'Markazi Text', 'Amiri', 'Noto Naskh Arabic', serif",
    Harmattan: "'Harmattan', 'Amiri', 'Noto Naskh Arabic', serif",
    'Readex Pro': "'Readex Pro', Tahoma, sans-serif",
    Rubik: "'Rubik', Tahoma, sans-serif",
    Mada: "'Mada', Tahoma, sans-serif",
    Tahoma: "Tahoma, 'Noto Naskh Arabic', Arial, sans-serif",
    Arial: "Arial, 'Noto Naskh Arabic', sans-serif",
  };
  return map[String(id || '')] || map['Traditional Arabic'];
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
  'El Messiri': 'El+Messiri:wght@400;700',
  'Markazi Text': 'Markazi+Text:wght@400;700',
  Harmattan: 'Harmattan:wght@400;700',
  'Readex Pro': 'Readex+Pro:wght@400;700',
  Rubik: 'Rubik:wght@400;700',
  Mada: 'Mada:wght@400;700',
};

/** Always-include Google families for export HTML (Outlook + PDF Chromium). */
const ALWAYS_GOOGLE = [
  'Amiri:wght@400;700',
  'Scheherazade+New:wght@400;700',
  'Noto+Naskh+Arabic:wght@400;700',
  'Cairo:wght@400;700',
  'Tajawal:wght@400;700',
  'Lateef:wght@400;700',
  'IBM+Plex+Sans+Arabic:wght@400;700',
];

/**
 * @import url for Google Fonts CSS2 covering selected + core Arabic families.
 * Safe for Outlook (when online) and Chromium PDF when embedded TTFs missing.
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
 * Prefer Amiri for Traditional Arabic / El Messiri / Markazi / Harmattan;
 * Scheherazade for Sakkal Majalla; Noto Naskh otherwise.
 */
export function pdfEmbeddedFamily(id?: string | null): 'Amiri' | 'Scheherazade New' | 'Noto Naskh Arabic' {
  const key = String(id || '');
  if (
    key === 'Traditional Arabic' ||
    key === 'El Messiri' ||
    key === 'Markazi Text' ||
    key === 'Harmattan' ||
    key === 'Amiri'
  ) {
    return 'Amiri';
  }
  if (key === 'Sakkal Majalla' || key === 'Scheherazade New') {
    return 'Scheherazade New';
  }
  return 'Noto Naskh Arabic';
}

/** Word-safe family name for DOCX TextRun.font */
export function docxFontName(id?: string | null): string {
  const map: Record<string, string> = {
    'Traditional Arabic': 'Traditional Arabic',
    'Sakkal Majalla': 'Sakkal Majalla',
    'Noto Naskh Arabic': 'Noto Naskh Arabic',
    Lateef: 'Lateef',
    'Noto Kufi Arabic': 'Noto Kufi Arabic',
    'Reem Kufi': 'Reem Kufi',
    Changa: 'Changa',
    Almarai: 'Almarai',
    'IBM Plex Sans Arabic': 'IBM Plex Sans Arabic',
    Cairo: 'Cairo',
    Tajawal: 'Tajawal',
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
