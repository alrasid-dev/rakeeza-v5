#!/usr/bin/env node
/**
 * Verify Outlook/PDF export HTML: no CSS vars, table chrome for Outlook,
 * concrete font stacks, and paperLayout theme colors.
 * Runs generation + assertions twice (exit 1 on failure).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tmpDir = path.join(root, 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });

function runGen() {
  const r = spawnSync('npx', ['tsx', path.join('scripts', 'gen-verify-html.ts')], {
    cwd: root,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    console.error(r.stdout);
    console.error(r.stderr);
    throw new Error('tsx generation failed: ' + r.status);
  }
  console.log(r.stdout.trim());
}

function assertFile(file, checks) {
  const html = fs.readFileSync(file, 'utf8');
  const failures = [];
  for (const c of checks) {
    if (c.type === 'not') {
      if (html.includes(c.value)) failures.push(`MUST NOT contain ${JSON.stringify(c.value)}`);
    } else if (c.type === 'has') {
      if (!html.includes(c.value)) failures.push(`MUST contain ${JSON.stringify(c.value)}`);
    } else if (c.type === 're') {
      if (!c.re.test(html)) failures.push(`MUST match ${c.re}`);
    }
  }
  return failures;
}

function verifyOnce(passLabel) {
  runGen();
  const outlook = path.join(tmpDir, 'verify-outlook.html');
  const pdf = path.join(tmpDir, 'verify-pdf.html');

  const shared = [
    { type: 'not', value: 'var(--font-' },
    { type: 're', re: /Amiri|Traditional Arabic|Scheherazade/ },
  ];

  const outlookFails = assertFile(outlook, [
    ...shared,
    { type: 'has', value: '<table' },
    { type: 'has', value: '#F9F7F1' },
    { type: 'has', value: '#006C35' },
    { type: 'has', value: 'width="700"' },
    { type: 're', re: /fonts\.googleapis\.com/ },
    { type: 'has', value: 'class="meta"' },
  ]);

  const outlookHtml = fs.readFileSync(outlook, 'utf8');
  if (/\.meta\s*\{[^}]*display:\s*grid/.test(outlookHtml)) {
    outlookFails.push('Outlook HTML still uses CSS grid for .meta');
  }

  const pdfFails = assertFile(pdf, [
    ...shared,
    { type: 'has', value: '#F9F7F1' },
    { type: 'has', value: '#006C35' },
    { type: 're', re: /fonts\.googleapis\.com|@font-face/ },
  ]);

  const all = [
    ...outlookFails.map((f) => `outlook: ${f}`),
    ...pdfFails.map((f) => `pdf: ${f}`),
  ];
  if (all.length) {
    console.error(`FAIL (${passLabel}):`);
    for (const f of all) console.error(' -', f);
    process.exit(1);
  }
  console.log(`PASS (${passLabel}): outlook+pdf checks OK`);
}

verifyOnce('pass-1');
verifyOnce('pass-2');
console.log('All verification passes OK');
