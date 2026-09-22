/**
 * Phase 2A — Turso schema audit + template activation.
 * Loads .env.local, checks the Template schema, adds `isActive` if missing,
 * then activates only the official templates and prints the result.
 */
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

function loadEnvFile(file: string): void {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] !== undefined) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnvFile('.env');
loadEnvFile('.env.local');

const URL = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || '';
const TOKEN = process.env.TURSO_AUTH_TOKEN || '';
if (!URL || !TOKEN) {
  console.error('ERROR: TURSO_DATABASE_URL / TURSO_AUTH_TOKEN not found in .env.local');
  process.exit(1);
}

const mask = (s: string) => (s.length > 24 ? s.slice(0, 10) + '…' + s.slice(-6) : '***');
const client = createClient({ url: URL, authToken: TOKEN });

const OFFICIAL_NAMES = [
  'تعميم (فارغ)',
  'تصميم حر — خطاب',
  'تصميم حر — تقرير',
  'نموذج تحليل حكم (شكوى)',
  'مدخلات الأحكام بطاقة عرض',
  'بطاقة عرض تصحيح حكم',
  'خطاب رسمي — كلاسيكي أخضر',
  'تعميم رسمي — دائري',
  'مذكرة رسمية — مدمجة',
  'خطاب رسمي — تصميم فخم',
  'تقرير — تصميم 3D',
  'مذكرة — تصميم مبسط',
];

async function main() {
  console.log('Target Turso:', URL);
  console.log('Token:', mask(TOKEN), '\n');

  // Step 1.5 — list existing tables
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  console.log('=== Existing tables in Turso ===');
  console.log('count:', tables.rows.length);
  console.log(tables.rows.map((r) => r.name).join(', ') || '(none)', '\n');

  // Step 2 — schema
  const info = await client.execute('PRAGMA table_info(Template)');
  console.log('=== Step 2: PRAGMA table_info(Template) ===');
  console.log(
    JSON.stringify(
      info.rows.map((r) => ({ name: r.name, type: r.type, notnull: r.notnull, dflt: r.dflt_value })),
      null,
      2,
    ),
  );
  const hasIsActive = info.rows.some((r) => String(r.name) === 'isActive');
  console.log('has isActive column:', hasIsActive, '\n');

  // Step 3 — add isActive if missing
  if (!hasIsActive) {
    console.log('=== Step 3: adding isActive column ===');
    await client.execute('ALTER TABLE Template ADD COLUMN isActive BOOLEAN NOT NULL DEFAULT 0;');
    console.log('ALTER TABLE OK\n');
  } else {
    console.log('=== Step 3: skipped (isActive already exists) ===\n');
  }

  // Step 4 — deactivate all, then activate the official templates
  console.log('=== Step 4: activate official templates ===');
  await client.execute('UPDATE Template SET isActive = 0;');
  let activated = 0;
  for (const name of OFFICIAL_NAMES) {
    const r = await client.execute({ sql: 'UPDATE Template SET isActive = 1 WHERE name = ?', args: [name] });
    activated += Number(r.rowsAffected || 0);
  }
  console.log('rows set active:', activated, '\n');

  // Step 5 — verify
  const total = await client.execute('SELECT COUNT(*) AS c FROM Template');
  const act = await client.execute('SELECT name FROM Template WHERE isActive = 1 ORDER BY sortOrder');
  const inact = await client.execute('SELECT COUNT(*) AS c FROM Template WHERE isActive = 0');
  console.log('=== Step 5: verify ===');
  console.log('total templates:', total.rows[0].c);
  console.log('active:', act.rows.length, '| inactive:', inact.rows[0].c);
  console.log('\nActive templates:');
  for (const r of act.rows) console.log('  ✅', r.name);
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exit(1);
  })
  .finally(() => client.close());
