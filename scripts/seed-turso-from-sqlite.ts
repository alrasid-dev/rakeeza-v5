/**
 * One-off: copy all rows from local seed SQLite into Turso via Prisma + LibSQL adapter.
 * Usage:
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/seed-turso-from-sqlite.ts
 */
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const seedPath = path.resolve(__dirname, '../data/seed-rakeeza.db');
const seedUrl = `file:${seedPath}`;

const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || '';
const tursoToken = process.env.TURSO_AUTH_TOKEN || '';
if (!tursoUrl || !tursoToken) {
  console.error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN required');
  process.exit(1);
}

const local = new PrismaClient({
  datasources: { db: { url: seedUrl } },
});

const libsql = createClient({ url: tursoUrl, authToken: tursoToken });
const remote = new PrismaClient({
  adapter: new PrismaLibSQL(libsql),
});

async function upsertMany<T extends { id: string }>(
  label: string,
  rows: T[],
  upsert: (row: T) => Promise<unknown>,
) {
  let ok = 0;
  for (const row of rows) {
    await upsert(row);
    ok++;
    if (ok % 50 === 0) console.log(`  ${label}: ${ok}/${rows.length}`);
  }
  console.log(`✓ ${label}: ${ok}`);
}

async function main() {
  console.log('Reading local seed:', seedPath);
  console.log('Target Turso:', tursoUrl);

  // Order respects FKs: Court → OrgUnit → Position → Employee → User → rest
  const courts = await local.court.findMany();
  const positions = await local.position.findMany();
  const orgUnits = await local.orgUnit.findMany();
  const employees = await local.employee.findMany();
  const users = await local.user.findMany();
  const templates = await local.template.findMany();
  const numberingRules = await local.numberingRule.findMany();
  const letterheads = await local.letterhead.findMany();
  const settings = await local.setting.findMany();
  const documents = await local.document.findMany();
  const auditLogs = await local.auditLog.findMany();
  const registrationRequests = await local.registrationRequest.findMany();

  console.log('Counts local:', {
    courts: courts.length,
    positions: positions.length,
    orgUnits: orgUnits.length,
    employees: employees.length,
    users: users.length,
    templates: templates.length,
    numberingRules: numberingRules.length,
    letterheads: letterheads.length,
    settings: settings.length,
    documents: documents.length,
    auditLogs: auditLogs.length,
    registrationRequests: registrationRequests.length,
  });

  await upsertMany('Court', courts, (r) =>
    remote.court.upsert({
      where: { id: r.id },
      create: r,
      update: { name: r.name, city: r.city, createdAt: r.createdAt },
    }),
  );

  // OrgUnits may self-reference parentId — insert parents first (null parent), then children
  const roots = orgUnits.filter((o) => !o.parentId);
  const children = orgUnits.filter((o) => o.parentId);
  await upsertMany('OrgUnit(roots)', roots, (r) =>
    remote.orgUnit.upsert({
      where: { id: r.id },
      create: r,
      update: { name: r.name, code: r.code, courtId: r.courtId, parentId: r.parentId },
    }),
  );
  // Multi-pass for deeper trees
  let remaining = [...children];
  let pass = 0;
  while (remaining.length && pass < 20) {
    pass++;
    const batch = remaining.filter(
      (o) => !remaining.some((x) => x.id === o.parentId),
    );
    const ids = new Set(batch.map((b) => b.id));
    if (!batch.length) {
      // cycle or missing parent — force insert
      await upsertMany(`OrgUnit(force-${pass})`, remaining, (r) =>
        remote.orgUnit.upsert({
          where: { id: r.id },
          create: { ...r, parentId: null },
          update: { name: r.name, code: r.code, courtId: r.courtId },
        }),
      );
      // then set parentIds
      for (const r of remaining) {
        await remote.orgUnit.update({
          where: { id: r.id },
          data: { parentId: r.parentId },
        });
      }
      remaining = [];
      break;
    }
    await upsertMany(`OrgUnit(pass${pass})`, batch, (r) =>
      remote.orgUnit.upsert({
        where: { id: r.id },
        create: r,
        update: { name: r.name, code: r.code, courtId: r.courtId, parentId: r.parentId },
      }),
    );
    remaining = remaining.filter((o) => !ids.has(o.id));
  }

  await upsertMany('Position', positions, (r) =>
    remote.position.upsert({
      where: { id: r.id },
      create: r,
      update: { title: r.title, honorific: r.honorific, rank: r.rank },
    }),
  );

  await upsertMany('Employee', employees, (r) =>
    remote.employee.upsert({
      where: { id: r.id },
      create: r,
      update: {
        name: r.name,
        email: r.email,
        phone: r.phone,
        nationalId: r.nationalId,
        orgUnitId: r.orgUnitId,
        positionId: r.positionId,
        active: r.active,
        notes: r.notes,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      },
    }),
  );

  await upsertMany('User', users, (r) =>
    remote.user.upsert({
      where: { id: r.id },
      create: r,
      update: {
        email: r.email,
        passwordHash: r.passwordHash,
        name: r.name,
        role: r.role,
        mustChangePassword: r.mustChangePassword,
        active: r.active,
        employeeId: r.employeeId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      },
    }),
  );

  await upsertMany('Template', templates, (r) =>
    remote.template.upsert({
      where: { id: r.id },
      create: r,
      update: {
        name: r.name,
        category: r.category,
        description: r.description,
        fieldsJson: r.fieldsJson,
        bodyHtml: r.bodyHtml,
        isEmpty: r.isEmpty,
        sortOrder: r.sortOrder,
        createdAt: r.createdAt,
      },
    }),
  );

  await upsertMany('NumberingRule', numberingRules, (r) =>
    remote.numberingRule.upsert({
      where: { id: r.id },
      create: r,
      update: {
        name: r.name,
        pattern: r.pattern,
        year: r.year,
        nextSeq: r.nextSeq,
        prefix: r.prefix,
      },
    }),
  );

  await upsertMany('Letterhead', letterheads, (r) =>
    remote.letterhead.upsert({
      where: { id: r.id },
      create: r,
      update: {
        name: r.name,
        header: r.header,
        footer: r.footer,
        logoUrl: r.logoUrl,
      },
    }),
  );

  await upsertMany('Setting', settings, (r) =>
    remote.setting.upsert({
      where: { id: r.id },
      create: r,
      update: { key: r.key, value: r.value },
    }),
  );

  await upsertMany('Document', documents, (r) =>
    remote.document.upsert({
      where: { id: r.id },
      create: r,
      update: {
        number: r.number,
        docType: r.docType,
        status: r.status,
        subject: r.subject,
        dateHijri: r.dateHijri,
        dateGregorian: r.dateGregorian,
        recipients: r.recipients,
        parties: r.parties,
        facts: r.facts,
        reasons: r.reasons,
        studyFields: r.studyFields,
        body: r.body,
        fieldsJson: r.fieldsJson,
        templateId: r.templateId,
        createdById: r.createdById,
        qrPayload: r.qrPayload,
        archived: r.archived,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      },
    }),
  );

  await upsertMany('AuditLog', auditLogs, (r) =>
    remote.auditLog.upsert({
      where: { id: r.id },
      create: r,
      update: {
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        details: r.details,
        userId: r.userId,
        createdAt: r.createdAt,
      },
    }),
  );

  await upsertMany('RegistrationRequest', registrationRequests, (r) =>
    remote.registrationRequest.upsert({
      where: { id: r.id },
      create: r,
      update: {
        name: r.name,
        email: r.email,
        phone: r.phone,
        nationalId: r.nationalId,
        orgUnitName: r.orgUnitName,
        passwordHash: r.passwordHash,
        status: r.status,
        note: r.note,
        reviewedById: r.reviewedById,
        reviewedAt: r.reviewedAt,
        createdAt: r.createdAt,
      },
    }),
  );

  const remoteCounts = {
    users: await remote.user.count(),
    employees: await remote.employee.count(),
    positions: await remote.position.count(),
    orgUnits: await remote.orgUnit.count(),
    courts: await remote.court.count(),
    templates: await remote.template.count(),
  };
  console.log('Remote counts after seed:', remoteCounts);

  const sample = await remote.user.findUnique({
    where: { email: 'amhumaidi@moj.gov.sa' },
  });
  console.log(
    'amhumaidi@moj.gov.sa:',
    sample
      ? { id: sample.id, mustChangePassword: sample.mustChangePassword, active: sample.active }
      : 'NOT FOUND',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await local.$disconnect();
    await remote.$disconnect();
  });
