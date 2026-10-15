import { discoverTests, checkTestBudget } from './verification-inventory.mjs';

export const testFiles = directory => discoverTests(directory);
const reporter = file => ['--test-reporter=spec', '--test-reporter-destination=stdout', '--test-reporter=./scripts/core-results.mjs', `--test-reporter-destination=${file}`];
const gate = (...args) => ({ args });
const nodeTests = (files, result, runner = 'tsx') => ({ args: ['exec', runner, '--test', '--no-test-only', '--test-concurrency=1', ...reporter(result), ...files], files, result });
const playwright = (config, files) => ({ files, args: ['exec', 'playwright', 'test', ...(config ? ['--config', config] : []), '--workers=1', '--forbid-only', '--reporter=list,./scripts/browser-results.mjs'], result: 'verification/browser-results.jsonl', browser: true });

export function verificationPlan() {
  const inventory = checkTestBudget();
  const fold = testFiles('newtests/t096');
  const lineage = fold.filter(file => file.includes('/archive-lineage-'));
  const archive = fold.filter(file => file.includes('/archive-') && !lineage.includes(file));
  const core = [...testFiles('tests/core'), ...testFiles('tests/delegation')];
  const plan = {
    source: [
      gate('run', 'source:check'),
      gate('exec', 'node', 'node_modules/@runeditrun/rer/bin/rer.mjs', 'check', '--profile', 'first-party'),
      gate('run', 'check:boundaries'),
      gate('run', 'check:manifest'),
      gate('exec', 'rer', 'build'),
      gate('exec', 'node', 'scripts/publish-deployment-spec.mjs', '--check'),
      gate('run', 'typecheck'),
    ],
    ...Object.fromEntries([0, 1, 2].map(index => [`core-${index}`, [
      gate('exec', 'tsx', 'tests/support/prepare-state.ts'),
      nodeTests(core.filter((_, offset) => offset % 3 === index), `verification/core-${index}-results.jsonl`),
    ]])),
    runtime: [
      gate('exec', 'tsx', 'tests/support/prepare-state.ts'),
      gate('run', 'build:app'),
      nodeTests(testFiles('tests/launch-runtime'), 'verification/launch-results.jsonl'),
      ...testFiles('tests/delegation-browser').map((file, index) => nodeTests([file], `verification/delegation-browser-${index}-results.jsonl`)),
      nodeTests(testFiles('tests/rer'), 'verification/journey-results.jsonl', 'node'),
      playwright(undefined, testFiles('tests/e2e')),
      playwright('tests/archive/playwright.config.mjs', testFiles('tests/archive')),
      gate('run', 'test:worker'),
    ],
    'fold-archive': [gate('run', 'build:app'), nodeTests(archive, 'verification/fold-archive-results.jsonl')],
    'fold-domain': [gate('run', 'build:app'), nodeTests(fold.filter(file => !archive.includes(file) && !lineage.includes(file)), 'verification/fold-domain-results.jsonl')],
    'fold-accepted-main': [gate('run', 'build:app'), nodeTests(lineage, 'verification/fold-accepted-main-results.jsonl')],
  };
  const planned = Object.values(plan).flatMap(gates => gates.flatMap(stage => stage.files ?? []));
  const expected = inventory.files.map(row => row.file);
  if (Object.values(plan).some(gates => gates.some(stage => stage.files?.length === 0)) || planned.length !== new Set(planned).size || JSON.stringify([...expected].sort()) !== JSON.stringify([...planned].sort())) throw Error('Verification must schedule every discovered test file exactly once.');
  return plan;
}

export const capacityExecution = status => ({ runner: 'emitted-worker', name: 'RECORD-006 DATA-001 DATA-002 BASE-DATA-001 complete declared-capacity search, archive roundtrip and erasure', file: 'tests/performance/records-capacity.ts', status });
