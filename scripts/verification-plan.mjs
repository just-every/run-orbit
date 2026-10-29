import { discoverTests, checkTestBudget } from './verification-inventory.mjs';

export const testFiles = directory => discoverTests(directory);
const reporter = file => ['--test-reporter=spec', '--test-reporter-destination=stdout', '--test-reporter=./scripts/core-results.mjs', `--test-reporter-destination=${file}`];
const gate = (...args) => ({ args: process.env.ORBIT_VERIFY_PREBUILT === '1' && args.join(' ') === 'run build:app'
  ? ['exec', 'node', 'scripts/verification-build.mjs', 'check'] : args });
const nodeTests = (files, result, runner = 'tsx') => ({ args: ['exec', runner, '--test', '--no-test-only', '--test-concurrency=1', ...reporter(result), ...files], files, result });
const playwright = (config, files) => ({ files, args: ['exec', 'playwright', 'test', ...(config ? ['--config', config] : []), '--workers=1', '--forbid-only', '--reporter=list,./scripts/browser-results.mjs'], result: 'verification/browser-results.jsonl', browser: true });

// Measured CI minutes per file (Verify on b68c8c3), used only to balance shards so each push
// Verify job stays near ten minutes. INTEGRATE-005 uses its conservative 8.5-minute local proof.
// Fold-domain files are from Verify 39500768813; REPORT-001 uses its 4-minute local proof.
// Verify 39577822567 put capture-data alone at 14 minutes. Its unchanged cases now run
// in three files; their weights and onboarding-archive use that run's actual case times.
// CAPTURE-010 moves its existing extended case into one file (no new registration):
// local provider/custody proof is about eleven minutes. FORM-001 and forward upgrades
// use their measured 6.8/5.4-minute local times; reviewed record mail and the expanded
// browser flow are weighted too, so those larger paths balance honestly.
// Folded archive callers carry their local transfer/rollback costs instead of old V2 weights.
// Fold-domain weights below are the actual per-file case minutes from Verify 40424898123.
// A file missing here counts as half a minute.
const minutes = {
  'tests/core/records-complete.test.ts': 2.2, 'tests/core/today-brief.test.ts': 1.2,
  'tests/core/capture-data.test.ts': 7.3, 'tests/core/capture-erasure.test.ts': 2.9, 'tests/core/capture-replay-archive.test.ts': 3.9,
  'tests/core/capture-mail-rules.test.ts': 11, 'tests/core/signals-outreach.test.ts': 7.5, 'tests/core/records-search.test.ts': 1.3, 'tests/core/capture-providers.test.ts': 7.8, 'tests/core/crm-import.test.ts': 8.5,
  'tests/core/launch-inherited-stop.test.ts': 8.5, 'tests/core/onboarding-archive.test.ts': 7.7, 'tests/core/archive-transfer.test.ts': 6.2,
  'tests/core/capture-intake.test.ts': 1.7, 'tests/core/crm-import-erasure.test.ts': 1.5, 'tests/core/launch-suppression.test.ts': 1.5,
  'tests/core/launch-suppression-archive.test.ts': 5.5, 'tests/delegation/archive-regression.test.ts': 2.5, 'tests/core/contact-erasure.test.ts': 0.8,
  'tests/core/capture-connector.test.ts': 0.8, 'tests/core/launch-provider-conflicts.test.ts': 0.8, 'tests/core/source-onboarding.test.ts': 8.5,
  'newtests/t096/archive-native.test.ts': 8.3, 'newtests/t096/archive-terminal-recovery.test.ts': 7.6, 'newtests/t096/archive-view-rollback.test.ts': 3.7,
  'newtests/t096/archive-import-recovery.test.ts': 3.4, 'newtests/t096/archive-cli-native.test.ts': 2.4, 'newtests/t096/archive-upgrade-preflight.test.ts': 1.4,
  'newtests/t096/browser-journeys.test.ts': 9.57, 'newtests/t096/report-disclosure.test.ts': 10.28, 'newtests/t096/forms-native.test.ts': 8.87,
  'newtests/t096/delegation-collaborator.test.ts': 1.99, 'newtests/t096/collaborator-lifecycle.test.ts': 2.14, 'newtests/t096/forward-upgrade.test.ts': 7.49,
  'newtests/t096/collaborator-links.test.ts': 0.39, 'newtests/t096/emitted-restart.test.ts': 0.40,
  'newtests/t096/empty-native.test.ts': 0.40, 'newtests/t096/report-time-boundaries.test.ts': 1.64, 'newtests/t096/report-population-race.test.ts': 0.37,
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
      gate('exec', 'node', 'src/base/contract-docs.mjs', 'check'),
      gate('run', 'source:check'),
      gate('exec', 'node', 'node_modules/@runeditrun/rer/bin/rer.mjs', 'check', '--profile', 'first-party'),
      gate('run', 'check:boundaries'),
      gate('run', 'check:manifest'),
      gate('exec', 'rer', 'build'),
      gate('exec', 'node', 'scripts/publish-deployment-spec.mjs', '--check'),
      gate('run', 'typecheck'),
      gate('run', 'agent:check'),
    ],
    // This single 100-table lineage case took 12.7 minutes in Verify 39577822567;
    // put it near the front of the matrix so runner allocation does not leave it last.
    'fold-accepted-main': [gate('run', 'build:app'), nodeTests(lineage, 'verification/fold-accepted-main-results.jsonl')],
    ...Object.fromEntries(balance(core, 10).map((files, index) => [`core-${index}`, prepared(nodeTests(files, `verification/core-${index}-results.jsonl`))])),
    'runtime-launch': prepared(
      gate('run', 'build:app'),
      nodeTests(testFiles('tests/launch-runtime'), 'verification/launch-results.jsonl'),
      gate('run', 'test:worker'),
      gate('run', 'verify:agent'),
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
    ...Object.fromEntries(balance(fold.filter(file => !archive.includes(file) && !lineage.includes(file)), 4).map((files, index) => [`fold-domain-${index}`, [gate('run', 'build:app'), nodeTests(files, `verification/fold-domain-${index}-results.jsonl`)]])),
    journeys: prepared(gate('run', 'build:app'), nodeTests(journeyFiles, 'verification/journeys-results.jsonl', 'node')),
  };
  const planned = Object.values(plan).flatMap(gates => gates.flatMap(stage => stage.files ?? []));
  const expected = inventory.files.map(row => row.file);
  if (Object.values(plan).some(gates => gates.some(stage => stage.files?.length === 0)) || planned.length !== new Set(planned).size || JSON.stringify([...expected].sort()) !== JSON.stringify([...planned].sort())) throw Error('Verification must schedule every discovered test file exactly once.');
  if (!journeys) delete plan.journeys;
  return plan;
}

export const capacityExecution = status => ({ runner: 'emitted-worker', name: 'RECORD-006 DATA-001 DATA-002 BASE-DATA-001 complete declared-capacity search, archive roundtrip and erasure', file: 'tests/performance/records-capacity.ts', status });

// Actual test-step minutes from Verify 40424898123, excluding each runner's
// measured ~0.5-minute setup. Fold-domain weights sum that run's per-file times
// after splitting its 18.32-minute shard across four unchanged file groups.
// Seven runners serialized ~223 minutes of tests into a 38.62-minute Verify.
// Twenty test runners plus one source/build runner budget ~12.3 minutes at 1.1
// imbalance, then setup and the serial plan/build/aggregate (~2 minutes). This
// targets the 18.47-minute baseline; single unchanged files still exceed 10 minutes.
const shardMinutes = {
  'core-0': 7.19, 'core-1': 11.87, 'core-2': 8.67, 'core-3': 9.76, 'core-4': 12.43,
  'core-5': 14.49, 'core-6': 10.62, 'core-7': 13.78, 'core-8': 8.50, 'core-9': 10.32,
  'fold-accepted-main': 11.01, 'fold-archive-0': 8.39, 'fold-archive-1': 6.92,
  'fold-archive-2': 6.05, 'fold-archive-3': 4.49,
  'runtime-launch': 2.35, 'runtime-delegation': 4.51, 'runtime-browser': 9.35,
  'rer-checkouts': 8.74, 'rer-operator-desktop': 2.25, 'rer-operator-phone': 2.57,
  'rer-operator-small-phone': 2.68, 'rer-operator-actions': 1.89, journeys: 10,
};
export function verificationBatches({ journeys = false } = {}) {
  const plan = verificationPlan({ journeys });
  const names = Object.keys(plan).filter(name => name !== 'source');
  const duration = name => name.startsWith('fold-domain-')
    ? plan[name].flatMap(stage => stage.files ?? []).reduce((sum, file) => sum + weight(file), 0)
    : shardMinutes[name] ?? 1;
  const bins = Array.from({ length: 20 }, () => ({ minutes: 0, shards: [] }));
  for (const name of names.sort((a, b) => duration(b) - duration(a) || a.localeCompare(b))) {
    const bin = bins.reduce((smallest, candidate) => candidate.minutes < smallest.minutes ? candidate : smallest);
    bin.minutes += duration(name);
    bin.shards.push(name);
  }
  return bins.map(({ shards }, index) => ({ batch: `batch-${index}`, shards,
    browsers: shards.some(name => shardNeeds(name).browsers), disk: shards.some(name => shardNeeds(name).disk) }));
}
