/**
 * One-shot: copy the local SQLite (data/rakeeza.db) schema + data into Turso.
 *
 * Usage:
 *   1) Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (in .env.local or the shell).
 *   2) npx tsx scripts/setup-turso.mts
 *
 * This creates the tables (schema) and copies every row, so the platform
 * runs against a persistent Turso database instead of an ephemeral SQLite file.
 */

import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

/* ---- Minimal .env / .env.local loader (no external dependency) ---- */
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

const TURSO_URL = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('ERROR: missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.');
  console.error('Set them in .env.local or export them, then re-run.');
  process.exit(1);
}

const LOCAL_CANDIDATES = [
  path.join(process.cwd(), 'data', 'rakeeza.db'),
  path.join(process.cwd(), 'data', 'seed-rakeeza.db'),
];
const LOCAL_FILE = LOCAL_CANDIDATES.find((p) => fs.existsSync(p));
if (!LOCAL_FILE) {
  console.error('ERROR: local SQLite DB not found (data/rakeeza.db).');
  process.exit(1);
}

const local = createClient({ url: `file:${LOCAL_FILE}` });
const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function main(): Promise<void> {
  const tablesRes = await local.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_migrations' ORDER BY name",
  );
  const tableNames = tablesRes.rows.map((r) => String(r.name));

  console.log(`\nTarget Turso: ${TURSO_URL}`);
  console.log(`Source SQLite: ${LOCAL_FILE}`);
  console.log(`Tables found: ${tableNames.length}\n`);

  // FK-safe order: parents before children (Court → Position → OrgUnit → Employee → User → … → Document → AuditLog)
  const FK_ORDER = [
    'Court', 'Position', 'OrgUnit', 'Employee', 'User',
    'NumberingRule', 'Letterhead', 'Template', 'Setting', 'RegistrationRequest',
    'Document', 'AuditLog',
  ];
  const ordered = FK_ORDER.filter((t) => tableNames.includes(t));
  for (const t of tableNames) if (!ordered.includes(t)) ordered.push(t);

  for (const table of ordered) {
    const createRes = await local.execute(
      'SELECT sql FROM sqlite_master WHERE type = \'table\' AND name = ?',
      [table],
    );
    const createSql = String(createRes.rows[0]?.sql || '');
    if (!createSql) continue;

    await turso.execute(`DROP TABLE IF EXISTS "${table}"`);
    await turso.execute(createSql);

    const data = await local.execute(`SELECT * FROM "${table}"`);
    const rows = data.rows;
    if (!rows.length) {
      console.log(`✔ ${table}: table created (0 rows)`);
      continue;
    }

    const cols = data.columns;
    const colList = cols.map((c) => `"${c}"`).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    const insertSql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`;

    const CHUNK = 100;
    const insertChunk = async (chunk: typeof rows) => {
      for (let i = 0; i < chunk.length; i += CHUNK) {
        const batch = chunk.slice(i, i + CHUNK).map((row) => ({
          sql: insertSql,
          args: cols.map((c) => row[c]),
        }));
        await turso.batch(batch);
      }
    };

    if (table === 'OrgUnit') {
      // Self-reference: insert roots first, then children in dependency passes.
      const roots = rows.filter((r) => r.parentId == null);
      const children = rows.filter((r) => r.parentId != null);
      const inserted = new Set<string>();
      for (const r of roots) inserted.add(String(r.id));
      await insertChunk(roots);
      let remaining = children;
      let pass = 0;
      while (remaining.length && pass < 20) {
        pass++;
        const next = remaining.filter((r) => r.parentId == null || inserted.has(String(r.parentId)));
        const rest = remaining.filter((r) => !(r.parentId == null || inserted.has(String(r.parentId))));
        if (!next.length) break;
        for (const r of next) inserted.add(String(r.id));
        await insertChunk(next);
        remaining = rest;
      }
      console.log(`✔ ${table}: ${rows.length} rows copied (${pass} passes)`);
    } else {
      await insertChunk(rows);
      console.log(`✔ ${table}: ${rows.length} rows copied`);
    }
  }

  console.log('\nDone. Turso is ready — add TURSO_DATABASE_URL + TURSO_AUTH_TOKEN to Vercel and redeploy.');
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exit(1);
  })
  .finally(() => {
    local.close();
    turso.close();
  });
