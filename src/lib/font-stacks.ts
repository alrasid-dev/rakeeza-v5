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
