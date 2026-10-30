import { appendFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { planVerification } from './verify-plan.mjs';
import { ciBatches, lifecyclePlan, orbitLightReaders } from './verification-ci-plan.mjs';

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const mode = process.argv[2];
if (mode === '--plan' && process.argv.length === 3) {
  const decision = await planVerification({ plan: lifecyclePlan(), readers: orbitLightReaders });
  const matrix = { include: decision.coverage === 'full' ? ciBatches(decision.tier) : [] };
  const output = Object.entries({ ...decision, matrix: JSON.stringify(matrix), readers: JSON.stringify(decision.readers),
    journeys: decision.tier === 'push' ? '0' : '1' }).map(([key, value]) => `${key}=${value}\n`).join('');
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, output);
  process.stdout.write(output);
} else if (mode === '--light' && process.argv.length === 3) {
  const readers = JSON.parse(process.env.LIGHT_READERS);
  if (!Array.isArray(readers) || readers.some(command => command !== 'node src/base/contract-docs.mjs check')) throw Error('Unknown light reader');
  run('node', ['node_modules/@runeditrun/rer/edition-authoring/cli.mjs', 'check']);
  run('pnpm', ['run', 'check']);
  for (const reader of readers) run('node', reader.slice('node '.length).split(' '));
  run('pnpm', ['run', 'build', '--site']);
} else throw Error('Usage: verification-ci.mjs --plan|--light');
