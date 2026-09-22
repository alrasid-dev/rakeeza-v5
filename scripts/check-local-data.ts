import { createClient } from '@libsql/client';
const local = createClient({ url: 'file:data/rakeeza.db' });

async function main() {
  const tables = ['Court', 'Position', 'OrgUnit', 'Employee', 'User', 'NumberingRule', 'Letterhead', 'Template', 'Setting', 'RegistrationRequest', 'Document', 'AuditLog'];
  for (const t of tables) {
    try {
      const r = await local.execute(`SELECT COUNT(*) AS c FROM "${t}"`);
      console.log(`${t}: ${r.rows[0].c} rows`);
    } catch (e) {
      console.log(`${t}: ERR ${String(e)}`);
    }
  }
  const org = await local.execute('SELECT COUNT(*) AS c FROM OrgUnit WHERE parentId IS NOT NULL');
  console.log('OrgUnit with parentId:', org.rows[0].c);
  const docs = await local.execute('SELECT COUNT(*) AS c FROM Document WHERE createdById IS NOT NULL');
  console.log('Document with createdById:', docs.rows[0].c);
  const audits = await local.execute('SELECT COUNT(*) AS c FROM AuditLog WHERE userId IS NOT NULL');
  console.log('AuditLog with userId:', audits.rows[0].c);
  const users = await local.execute('SELECT COUNT(*) AS c FROM User WHERE employeeId IS NOT NULL');
  console.log('User with employeeId:', users.rows[0].c);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => local.close());
