/** Web-safe stacks so font picker changes are visible (next/font CSS variables). */

export const FONT_OPTIONS: { id: string; label: string; stack: string }[] = [
  {
    id: 'Traditional Arabic',
    label: 'Traditional Arabic (أميري)',
    stack: 'var(--font-amiri), "Amiri", "Traditional Arabic", "Noto Naskh Arabic", serif',
  },
  {
    id: 'Sakkal Majalla',
    label: 'Sakkal Majalla (شهرزاد)',
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

export function fontStackFor(id?: string | null): string {
  const hit = FONT_OPTIONS.find((f) => f.id === id);
  return hit?.stack || FONT_OPTIONS[0].stack;
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
