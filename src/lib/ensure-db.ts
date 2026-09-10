import 'server-only';
import fs from 'fs';
import path from 'path';

let ready = false;

/** On Vercel, SQLite lives in /tmp (ephemeral per instance). Bootstrap from bundled seed. */
export function ensureDb() {
  if (ready) return;
  const url = process.env.DATABASE_URL || 'file:/tmp/rakeeza.db';
  if (!url.startsWith('file:')) {
    ready = true;
    return;
  }
  const target = url.replace(/^file:/, '');
  try {
    if (!fs.existsSync(target)) {
      const candidates = [
        path.join(process.cwd(), 'data', 'seed-rakeeza.db'),
        path.join(process.cwd(), 'data', 'rakeeza.db'),
      ];
      const seed = candidates.find((p) => fs.existsSync(p));
      if (seed) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(seed, target);
      }
    }
  } catch (e) {
    console.error('ensureDb', e);
  }
  ready = true;
}
