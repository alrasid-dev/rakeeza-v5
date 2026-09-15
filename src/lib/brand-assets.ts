/** Shared brand assets for exports (PDF/DOCX/XLSX/Outlook) */
import fs from 'fs';
import path from 'path';
import { MOJ_EMBLEM_PNG_DATA_URL } from '@/lib/brand-emblem-data';
import { BRAND } from '@/lib/brand';

export { MOJ_EMBLEM_PNG_DATA_URL, BRAND };

/** Prefer official MOJ gold logo; fall back to legacy emblem / embedded data URL */
export function loadEmblemPng(): Buffer {
  const candidates = [
    path.join(process.cwd(), 'public', 'brand', 'moj-logo-gold.png'),
    path.join(process.cwd(), 'public', 'brand', 'moj-emblem.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p);
  }
  const b64 = MOJ_EMBLEM_PNG_DATA_URL.replace(/^data:image\/png;base64,/, '');
  return Buffer.from(b64, 'base64');
}

export function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const m = String(dataUrl || '').match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
  if (!m) return null;
  try {
    return Buffer.from(m[1], 'base64');
  } catch {
    return null;
  }
}
