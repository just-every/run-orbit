import { discoverTests, checkTestBudget } from './verification-inventory.mjs';

export const testFiles = directory => discoverTests(directory);
const reporter = file => ['--test-reporter=spec', '--test-reporter-destination=stdout', '--test-reporter=./scripts/core-results.mjs', `--test-reporter-destination=${file}`];
const gate = (...args) => ({ args });
const nodeTests = (files, result, runner = 'tsx') => ({ args: ['exec', runner, '--test', '--no-test-only', '--test-concurrency=1', ...reporter(result), ...files], files, result });
const playwright = (config, files) => ({ files, args: ['exec', 'playwright', 'test', ...(config ? ['--config', config] : []), '--workers=1', '--forbid-only', '--reporter=list,./scripts/browser-results.mjs'], result: 'verification/browser-results.jsonl', browser: true });

// Measured CI minutes per file (Verify on b68c8c3), used only to balance shards so each push
// Verify job stays near ten minutes. A file missing here counts as half a minute.
const minutes = {
  'tests/core/capture-data.test.ts': 8.5, 'tests/core/capture-providers.test.ts': 5.3, 'tests/core/crm-import.test.ts': 4.9,
  'tests/core/launch-inherited-stop.test.ts': 2.6, 'tests/core/onboarding-archive.test.ts': 2.3, 'tests/core/archive-transfer.test.ts': 1.7,
  'tests/core/capture-intake.test.ts': 1.7, 'tests/core/crm-import-erasure.test.ts': 1.5, 'tests/core/launch-suppression.test.ts': 1.5,
  'tests/core/launch-suppression-archive.test.ts': 1.3, 'tests/delegation/archive-regression.test.ts': 0.8, 'tests/core/contact-erasure.test.ts': 0.8,
  'tests/core/capture-connector.test.ts': 0.8, 'tests/core/launch-provider-conflicts.test.ts': 0.8, 'tests/core/source-onboarding.test.ts': 4.5,
  'newtests/t096/archive-native.test.ts': 8.3, 'newtests/t096/archive-terminal-recovery.test.ts': 7.6, 'newtests/t096/archive-view-rollback.test.ts': 3.7,
  'newtests/t096/archive-import-recovery.test.ts': 3.4, 'newtests/t096/archive-cli-native.test.ts': 2.4, 'newtests/t096/archive-upgrade-preflight.test.ts': 1.4,
};
const weight = file => minutes[file] ?? 0.5;
/** Longest first into the lightest bin: a deterministic, balanced split of files into `count` shards. */
function balance(files, count) {
  const bins = Array.from({ length: count }, () => ({ total: 0, files: [] }));
  for (const file of [...files].sort((a, b) => weight(b) - weight(a) || a.localeCompare(b))) {
    const bin = bins.reduce((lightest, candidate) => candidate.total < lightest.total ? candidate : lightest);
    bin.total += weight(file); bin.files.push(file);
  }
  return bins.map(bin => bin.files.sort());
}

/** Installer and README clone journeys: release tags, the nightly run and local `rer verify`; not every push. */
export const journeyFiles = ['tests/rer/journey.test.mjs'];
/** What a shard's runner needs beyond Node: a Chromium for browser journeys, and free disk for local servers or archive lineage. */
export function shardNeeds(name) {
  return { browsers: /^(runtime|rer-|fold-domain|journeys)/.test(name), disk: !name.startsWith('core-') && name !== 'source' };
}

export function verificationPlan({ journeys = false } = {}) {
  const inventory = checkTestBudget();
  const fold = testFiles('newtests/t096');
  const lineage = fold.filter(file => file.includes('/archive-lineage-'));
  const archive = fold.filter(file => file.includes('/archive-') && !lineage.includes(file));
  const core = [...testFiles('tests/core'), ...testFiles('tests/delegation')];
  const rer = testFiles('tests/rer').filter(file => !journeyFiles.includes(file));
  const operatorShards = Object.fromEntries(['desktop', 'phone', 'small-phone', 'actions'].map(name => [`rer-operator-${name}`, `tests/rer/operator-${name}.test.mjs`]));
  const operatorFiles = Object.values(operatorShards);
  const prepared = (...gates) => [gate('exec', 'tsx', 'tests/support/prepare-state.ts'), ...gates];
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
    ...Object.fromEntries(balance(core, 10).map((files, index) => [`core-${index}`, prepared(nodeTests(files, `verification/core-${index}-results.jsonl`))])),
    'runtime-launch': prepared(
      gate('run', 'build:app'),
      nodeTests(testFiles('tests/launch-runtime'), 'verification/launch-results.jsonl'),
      gate('run', 'test:worker'),
    ),
    'runtime-delegation': prepared(
      gate('run', 'build:app'),
      ...testFiles('tests/delegation-browser').map((file, index) => nodeTests([file], `verification/delegation-browser-${index}-results.jsonl`)),
    ),
    'runtime-browser': prepared(
      gate('run', 'build:app'),
      playwright(undefined, testFiles('tests/e2e')),
      playwright('tests/archive/playwright.config.mjs', testFiles('tests/archive')),
    ),
    ...Object.fromEntries(Object.entries(operatorShards).map(([name, file]) => [name, prepared(gate('run', 'build:app'), nodeTests([file], `verification/${name}-results.jsonl`, 'node'))])),
    'rer-checkouts': prepared(gate('run', 'build:app'), nodeTests(rer.filter(file => !operatorFiles.includes(file)), 'verification/rer-checkouts-results.jsonl', 'node')),
    ...Object.fromEntries(balance(archive, 4).map((files, index) => [`fold-archive-${index}`, [gate('run', 'build:app'), nodeTests(files, `verification/fold-archive-${index}-results.jsonl`)]])),
    'fold-domain': [gate('run', 'build:app'), nodeTests(fold.filter(file => !archive.includes(file) && !lineage.includes(file)), 'verification/fold-domain-results.jsonl')],
    'fold-accepted-main': [gate('run', 'build:app'), nodeTests(lineage, 'verification/fold-accepted-main-results.jsonl')],
    journeys: prepared(gate('run', 'build:app'), nodeTests(journeyFiles, 'verification/journeys-results.jsonl', 'node')),
  };
  const planned = Object.values(plan).flatMap(gates => gates.flatMap(stage => stage.files ?? []));
  const expected = inventory.files.map(row => row.file);
  if (Object.values(plan).some(gates => gates.some(stage => stage.files?.length === 0)) || planned.length !== new Set(planned).size || JSON.stringify([...expected].sort()) !== JSON.stringify([...planned].sort())) throw Error('Verification must schedule every discovered test file exactly once.');
  if (!journeys) delete plan.journeys;
  return plan;
}

export const capacityExecution = status => ({ runner: 'emitted-worker', name: 'RECORD-006 DATA-001 DATA-002 BASE-DATA-001 complete declared-capacity search, archive roundtrip and erasure', file: 'tests/performance/records-capacity.ts', status });
