#!/usr/bin/env node
// Orbit's retained contract uses bold published clauses and level-four target
// headings. Generate its companion documents without converting the source.
import {readFileSync, writeFileSync} from 'node:fs';

const marker = '<!-- Generated from CONTRACT.md. Edit the contract, then run node scripts/contract-docs.mjs write. -->';
const source = readFileSync('CONTRACT.md', 'utf8');
const lines = source.split('\n');
const rows = lines.filter(line => /^\| `[-A-Z]+-\d{3}` \|/.test(line)).map(line => {
  const [id, title, kind, status, evidence, gap] = line.split(/(?<!\\)\|/).slice(1, -1).map(cell => cell.trim());
  return {id: id.replaceAll('`', ''), title, kind, status, evidence, gap};
});
if (!rows.length || new Set(rows.map(row => row.id)).size !== rows.length) throw Error('Missing or duplicate contract status rows.');

function requirement(id) {
  const published = lines.find(line => line.startsWith(`- **${id} — `));
  if (published) return published.replace(/^- \*\*[^*]+\*\*\s*/, '');
  const start = lines.findIndex(line => new RegExp(`^#{3,4} ${id} — `).test(line));
  if (start < 0) throw Error(`Missing contract clause: ${id}`);
  const next = lines.findIndex((line, index) => index > start && /^#{1,4} /.test(line));
  return lines.slice(start + 1, next < 0 ? lines.length : next).join('\n').trim();
}

const targetStart = lines.findIndex(line => line.startsWith('## Product target'));
const targetEnd = lines.findIndex((line, index) => index > targetStart && /^## /.test(line));
const target = lines.slice(targetStart + 1, targetEnd).join('\n').trim();
const counts = status => rows.filter(row => row.status === status).length;
const summary = `${rows.length} clauses: ${counts('done')} done, ${counts('partial')} partial, ${counts('missing')} missing.`;
const acceptance = [marker, '# Orbit complete-product acceptance', target,
  'CONTRACT.md is the acceptance and status source. Evidence describes the implemented scope; a green test does not complete a partial or missing clause.', summary];
for (const row of rows) acceptance.push(`## ${row.id} — ${row.title}`, `Status: **${row.status}** (${row.kind}).`,
  requirement(row.id), `**Evidence:** ${row.evidence || 'None.'}\n\n**Gap:** ${row.gap || 'None.'}`);
const claims = [marker, '# Orbit claims',
  'This inventory follows the contract status and its recorded scope. Provider and hosted proof retain the limits in each evidence and gap cell.', summary,
  ['| Clause | Capability | Status | Evidence | Gap |', '| --- | --- | --- | --- | --- |',
    ...rows.map(row => `| \`${row.id}\` | ${row.title} | ${row.status} | ${row.evidence} | ${row.gap} |`)].join('\n')];
const files = {'ACCEPTANCE.md': acceptance.join('\n\n') + '\n', 'docs/CLAIMS.md': claims.join('\n\n') + '\n'};
const command = process.argv[2];
if (process.argv.length !== 3 || !['write', 'check'].includes(command)) throw Error('Usage: node scripts/contract-docs.mjs write|check');
for (const [file, content] of Object.entries(files)) {
  if (command === 'write') writeFileSync(file, content);
  else if (readFileSync(file, 'utf8') !== content) throw Error(`${file} is stale; run node scripts/contract-docs.mjs write`);
}
console.log(command === 'write' ? 'Generated acceptance and claims from CONTRACT.md.' : 'Contract documents are current.');
