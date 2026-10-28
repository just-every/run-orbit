import {discoverTests} from './verification-files.mjs';

export const testFiles = discoverTests;
const gate = (...args) => ({args});
const reporter = file => ['--test-reporter=spec', '--test-reporter-destination=stdout', '--test-reporter=./scripts/core-results.mjs', `--test-reporter-destination=${file}`];
const nodeTests = (files, result) => ({args: ['exec', 'tsx', '--test', '--no-test-only', '--test-concurrency=1', ...reporter(result), ...files], files, result});
const playwright = (config, files) => ({files, args: ['exec', 'playwright', 'test', ...(config ? ['--config', config] : []), '--workers=1', '--forbid-only', '--reporter=list,./scripts/browser-results.mjs'], result: 'verification/browser-results.jsonl', browser: true});

// Installer/README checkouts and historical full-schema lineage are release
// qualification. Current records, portability and upgrade remain on every push.
export const journeyFiles = [
  ...['tests', 'newtests'].flatMap(testFiles).filter(file => file.startsWith('tests/rer/') || file.includes('.release.test.')),
  'newtests/t096/archive-lineage-accepted-main.test.ts',
  'tests/core/prior-auth-upgrade.test.ts',
  'tests/core/capture-upgrade.test.ts',
  'tests/core/migration-recovery.test.ts',
];

// Estimates are replaced with per-file timings from the consolidated local run.
// Longest first into the lightest runner keeps setup and browser costs shared.
const minutes = {};
const weight = file => minutes[file] ?? 1;
const isBrowser = file => /tests\/(?:e2e|archive|delegation-browser|launch-runtime|rer)\//.test(file) || /(?:browser-journeys|report-disclosure)\.test\.ts$/.test(file);
function balanced(files) {
  const bins = Array.from({length: Math.min(8, files.length)}, () => ({minutes: 0, files: []}));
  for (const file of [...files].sort((a, b) => weight(b) - weight(a) || a.localeCompare(b))) {
    const bin = bins.reduce((smallest, candidate) => candidate.minutes < smallest.minutes ? candidate : smallest);
    bin.minutes += weight(file);
    bin.files.push(file);
  }
  return bins;
}

export function verificationPlan({journeys = false} = {}) {
  const inventory = ['tests', 'newtests'].flatMap(testFiles);
  const selected = inventory.filter(file => journeys || !journeyFiles.includes(file));
  const plan = {source: [
    gate('run', 'source:check'),
    gate('exec', 'rer', 'check', '--profile', 'first-party'),
    gate('exec', 'node', 'scripts/contract-docs.mjs', 'check'),
    gate('exec', 'node', 'scripts/verification-inventory.mjs'),
    gate('run', 'check:boundaries'),
    gate('run', 'check:manifest'),
    gate('exec', 'rer', 'build'),
    gate('exec', 'node', 'scripts/publish-deployment-spec.mjs', '--check'),
    gate('run', 'typecheck'),
  ]};
  for (const [index, bin] of balanced(selected).entries()) {
    const name = `sanity-${index}`, node = bin.files.filter(file => !file.endsWith('.spec.mjs'));
    const browser = bin.files.filter(file => file.startsWith('tests/e2e/'));
    const archive = bin.files.filter(file => file.startsWith('tests/archive/'));
    const stages = [];
    // Retained native tests use isolated D1 fixtures. Only the Playwright and
    // launch-runtime journeys share the seeded emitted-worker sample state.
    if (bin.files.some(file => /tests\/(?:e2e|archive|launch-runtime)\//.test(file))) stages.push(gate('exec', 'tsx', 'tests/support/prepare-state.ts'));
    if (node.length) stages.push(nodeTests(node, `verification/${name}-results.jsonl`));
    if (browser.length) stages.push(playwright(undefined, browser));
    if (archive.length) stages.push(playwright('tests/archive/playwright.config.mjs', archive));
    plan[name] = stages;
  }
  const scheduled = Object.values(plan).flatMap(gates => gates.flatMap(stage => stage.files ?? []));
  if (scheduled.length !== new Set(scheduled).size || JSON.stringify(scheduled.toSorted()) !== JSON.stringify(selected.toSorted())) throw Error('Schedule every selected journey exactly once.');
  return plan;
}

export function shardNeeds(name, {journeys = false} = {}) {
  const files = verificationPlan({journeys})[name].flatMap(stage => stage.files ?? []);
  return {browsers: files.some(isBrowser), disk: files.some(file => isBrowser(file) || /(?:portability|upgrade|archive)/.test(file))};
}
export function verificationBatches({journeys = false} = {}) {
  return Object.keys(verificationPlan({journeys})).filter(name => name !== 'source').map(name => ({batch: name, shards: [name], ...shardNeeds(name, {journeys})}));
}
export const capacityExecution = status => ({runner: 'emitted-worker', name: 'RECORD-006 DATA-001 DATA-002 BASE-DATA-001 complete declared-capacity search, archive roundtrip and erasure', file: 'tests/performance/records-capacity.ts', status});
