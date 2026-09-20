/**
 * PDF Base64 @font-face engine.
 * Embeds ALL catalog TTFs as data:font/ttf;base64 so Chromium PDF never
 * depends on system fonts or external Google Fonts URL fetches at render time.
 */
import fs from 'fs';
import path from 'path';
import {
  ARABIC_FONT_LIBRARY,
  concreteFontStack,
  resolvePdfEmbeddedFamily,
  type ArabicFontDef,
} from '@/lib/arabic-font-library';

const fontsDir = () => path.join(process.cwd(), 'public', 'fonts');

const b64Cache = new Map<string, string>();

export function readFontFileBase64(fileName: string): string {
  const hit = b64Cache.get(fileName);
  if (hit) return hit;
  const fontPath = path.join(fontsDir(), fileName);
  if (!fs.existsSync(fontPath)) {
    throw new Error(`Arabic font missing: public/fonts/${fileName}`);
  }
  const b64 = fs.readFileSync(fontPath).toString('base64');
  b64Cache.set(fileName, b64);
  return b64;
}

export function tryReadFontFileBase64(fileName: string): string | null {
  try {
    return readFontFileBase64(fileName);
  } catch {
    return null;
  }
}

function fontFaceBlock(family: string, b64: string, weight = '400'): string {
  return `@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weight};
  src: url(data:font/ttf;base64,${b64}) format('truetype');
  font-display: block;
}`;
}

function resolveTtf(def: ArabicFontDef): { file: string; b64: string } | null {
  const file = def.file || def.aliasFile;
  if (!file) return null;
  const b64 = tryReadFontFileBase64(file);
  if (!b64) return null;
  return { file, b64 };
}

/**
 * Build @font-face rules for every library font that has a TTF on disk.
 * Traditional Arabic aliases Amiri bytes; Sakkal Majalla aliases Scheherazade.
 */
export function buildAllPdfFontFacesCss(): string {
  const faces: string[] = [];
  const emitted = new Set<string>();

  for (const def of ARABIC_FONT_LIBRARY) {
    const resolved = resolveTtf(def);
    if (!resolved) continue;

    const families = [def.cssFamily, ...(def.aliases || [])];
    for (const family of families) {
      if (emitted.has(family)) continue;
      faces.push(fontFaceBlock(family, resolved.b64));
      emitted.add(family);
    }

    // Traditional Arabic uses Amiri bytes under its own family name;
    // also ensure Amiri itself is registered when we only hit Traditional.
    if (def.id === 'Traditional Arabic' && def.aliasFile) {
      if (!emitted.has('Amiri')) {
        faces.push(fontFaceBlock('Amiri', resolved.b64));
        emitted.add('Amiri');
      }
    }
  }

  return faces.join('\n');
}

/**
 * Full PDF print CSS: all Base64 @font-face + default document stack.
 * Does NOT include Google Fonts @import (offline / no network at render).
 *
 * Important: do not force font-family on every descendant with !important —
 * TipTap inline `style="font-family: 'Amiri', serif;"` must win for selections.
 */
export function buildPdfEmbeddedFontCss(fontFamilyId?: string | null): string {
  const faces = buildAllPdfFontFacesCss();
  const stack = concreteFontStack(fontFamilyId);
  const preferred = resolvePdfEmbeddedFamily(fontFamilyId);

  return `${faces}
/* Document default — TipTap per-node inline font-family overrides this */
html, body {
  font-family: '${preferred}', ${stack};
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
}
.paper {
  font-family: '${preferred}', ${stack};
  font-weight: 400;
  /* default only — inline color:#HEX from TipTap spans must win (no !important) */
  color: #111;
}
.bismillah, .bismillah * { color: #fff !important; }
`;
}

/** Noto Naskh base64 for jsPDF fallback path. */
export function loadNotoNaskhBase64(): string {
  return readFontFileBase64('NotoNaskhArabic-Regular.ttf');
}
