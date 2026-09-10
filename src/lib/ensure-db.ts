import 'server-only';
import fs from 'fs';
import path from 'path';

const SEED_VERSION = '2026-09-10-pin-setup-v3';
let ready = false;

/** On Vercel, SQLite lives in /tmp. Bootstrap/refresh from bundled seed when version changes. */
export function ensureDb() {
  if (ready) return;
  const url = process.env.DATABASE_URL || 'file:/tmp/rakeeza.db';
  if (!url.startsWith('file:')) {
    ready = true;
    return;
  }
  const target = url.replace(/^file:/, '');
  const versionFile = target + '.seed-version';
  try {
    const seed = [
      path.join(process.cwd(), 'data', 'seed-rakeeza.db'),
      path.join(process.cwd(), 'data', 'rakeeza.db'),
    ].find((p) => fs.existsSync(p));
    const current = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8') : '';
    if (seed && (!fs.existsSync(target) || current !== SEED_VERSION)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(seed, target);
      fs.writeFileSync(versionFile, SEED_VERSION);
    }
  } catch (e) {
    console.error('ensureDb', e);
  }
  ready = true;
}
