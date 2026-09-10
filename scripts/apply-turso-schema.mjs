/**
 * Apply Prisma schema SQL to Turso.
 * Usage:
 *   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > /tmp/turso-schema.sql
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/apply-turso-schema.mjs [/tmp/turso-schema.sql]
 */
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const sqlPath = path.resolve(process.argv[2] || '/tmp/turso-schema.sql');

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN');
  process.exit(1);
}
if (!fs.existsSync(sqlPath)) {
  console.error('SQL file not found:', sqlPath);
  process.exit(1);
}

const client = createClient({ url, authToken });
const sql = fs.readFileSync(sqlPath, 'utf8');
const statements = sql
  .split(';')
  .map((s) => s.replace(/--[^\n]*/g, '').trim())
  .filter((s) => s.length > 0);

console.log('Applying', statements.length, 'statements from', sqlPath);
try {
  await client.executeMultiple(sql);
  console.log('executeMultiple OK');
} catch (e) {
  console.error('executeMultiple failed:', e.message);
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    try {
      await client.execute(stmt);
      console.log('OK', i + 1);
    } catch (err) {
      const msg = String(err.message || err);
      if (/already exists/i.test(msg)) {
        console.log('SKIP exists', i + 1);
      } else {
        console.error('FAIL', i + 1, msg);
        process.exit(1);
      }
    }
  }
}

const tables = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
);
console.log('Tables:', tables.rows.map((r) => r.name).join(', '));
