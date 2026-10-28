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

// Measured m1 journey minutes; incomplete flows use conservative estimates
// until their focused run completes. Browser entries also budget server setup.
// Longest first into the lightest runner keeps setup and browser costs shared.
const minutes = {
  'newtests/t096/archive-import-recovery.test.ts': 7.74,
  'newtests/t096/archive-lineage-accepted-main.test.ts': 40,
  'newtests/t096/browser-journeys.test.ts': 1.73,
  'newtests/t096/empty-native.test.ts': 0.54,
  'newtests/t096/forward-upgrade.test.ts': 0.45,
  'newtests/t096/portability-journey.test.ts': 8,
  'newtests/t096/report-disclosure.test.ts': 2.95,
  'tests/archive/browser.spec.mjs': 4.88,
  'tests/core/capture-upgrade.test.ts': 0.22,
  'tests/core/customer-capture.test.ts': 9.83,
  'tests/core/customer-contact-permission.test.ts': 2,
  'tests/core/customer-google-source.test.ts': 9.41,
  'tests/core/customer-identity.test.ts': 1.53,
  'tests/core/customer-microsoft-source.test.ts': 6.8,
  'tests/core/customer-opt-out.test.ts': 1.22,
  'tests/core/customer-privacy.test.ts': 2.5,
  'tests/core/customer-replies.test.ts': 0.62,
  'tests/core/customer-sending.test.ts': 0.75,
  'tests/core/migration-recovery.test.ts': 0.88,
  'tests/core/prior-auth-upgrade.test.ts': 0.97,
  'tests/core/sales-import.test.ts': 8.2,
  'tests/core/sales-outreach.test.ts': 4.75,
  'tests/core/sales-privacy.test.ts': 2.54,
  'tests/core/sales-records.test.ts': 3.28,
  'tests/core/sales-sources.test.ts': 3.82,
  'tests/core/sales-today.test.ts': 2.17,
  'tests/delegation-browser/native.test.ts': 4,
  'tests/delegation-browser/today-brief.test.ts': 0.72,
  'tests/delegation/authority-journey.test.ts': 2.5,
  'tests/e2e/workspace.spec.mjs': 3,
  'tests/launch-runtime/mail-body-transport.release.test.ts': 0.5,
  'tests/launch-runtime/mail-ingress.test.ts': 0.75,
  'tests/rer/admission.release.test.mjs': 3.43,
  'tests/rer/identity.release.test.mjs': 2.42,
  'tests/rer/journey.release.test.mjs': 5.66,
  'tests/rer/onboarding.release.test.mjs': 2.99,
  'tests/rer/operator.release.test.mjs': 3.19,
};
const weight = file => minutes[file] ?? 1;
const isBrowser = file => /tests\/(?:e2e|archive|delegation-browser|launch-runtime|rer)\//.test(file) || /(?:browser-journeys|report-disclosure|empty-native)\.test\.ts$/.test(file);
function balanced(files, count) {
  const bins = Array.from({length: Math.min(count, files.length)}, () => ({minutes: 0, files: []}));
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
  // Historical qualifications are deliberately slow. Fewer release runners
  // balance their single long lineage flow without adding push work.
  for (const [index, bin] of balanced(selected, journeys ? 4 : 8).entries()) {
    const name = `sanity-${index}`, node = bin.files.filter(file => !file.endsWith('.spec.mjs'));
    const browser = bin.files.filter(file => file.startsWith('tests/e2e/'));
    const archive = bin.files.filter(file => file.startsWith('tests/archive/'));
    const stages = [];
    // Native journeys own their D1 fixtures. Playwright servers prepare their
    // own sample or empty state when they start against the shared app build.
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
