import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const files = {};
function collect(path) {
  const stat = lstatSync(path);
  if (stat.isDirectory()) {
    for (const name of readdirSync(path).sort()) collect(`${path}/${name}`);
  } else if (stat.isFile()) {
    files[path] = createHash('sha256').update(readFileSync(path)).digest('hex');
  } else throw Error(`Unsupported shared build entry: ${path}`);
}
// Only disposable emitted output travels; never installation state or settings.
for (const path of ['dist', '.wrangler/deploy']) collect(path);
if (!files['dist/server/wrangler.json'] || !files['.wrangler/deploy/config.json']) throw Error('Incomplete shared app build.');
const receipt = { commit: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'), root: process.cwd(), files };
const file = 'verification/shared-build.json';
if (process.argv.length === 3 && process.argv[2] === 'seal') {
  mkdirSync('verification', { recursive: true });
  writeFileSync(file, JSON.stringify(receipt) + '\n');
} else if (process.argv.length === 3 && process.argv[2] === 'check') {
  if (JSON.stringify(JSON.parse(readFileSync(file, 'utf8'))) !== JSON.stringify(receipt)) throw Error('Shared build does not match this commit, tree, checkout or emitted bytes.');
} else throw Error('Usage: node scripts/verification-build.mjs seal|check');
