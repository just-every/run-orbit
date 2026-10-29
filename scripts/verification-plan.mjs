import { discoverTests, verificationInventory } from './verification-inventory.mjs';

export const testFiles = directory => discoverTests(directory);
export const verificationOptions = () => ({ journeys: process.env.ORBIT_VERIFY_JOURNEYS === '1', nightly: process.env.ORBIT_VERIFY_NIGHTLY === '1' || process.env.ORBIT_VERIFY_TIER === 'nightly' });
const gate = (...args) => ({ args });
const reporter = file => ['--test-reporter=spec', '--test-reporter-destination=stdout', '--test-reporter=./scripts/core-results.mjs', `--test-reporter-destination=${file}`];
const nodeTests = (files, result) => ({ args: ['exec', 'tsx', '--test', '--no-test-only', '--test-concurrency=2', ...reporter(result), ...files], files, result });
const playwright = (files, result, config) => ({ files, args: ['exec', 'playwright', 'test', ...(config ? ['--config', config] : []), ...files, '--workers=1', '--forbid-only', '--reporter=list,./scripts/browser-results.mjs'], result, browser: true });

// Installer/README clone and complete historical archive qualification are deliberately
// separate from push sanity. The ordinary restore and migration journeys remain on push.
export const journeyFiles = ['tests/rer/journey.test.mjs', 'newtests/t096/forward-upgrade.test.ts', 'newtests/t096/archive-native.test.ts', 'tests/core/onboarding-archive.test.ts'];

// Relative costs calibrated from the m1-runner command and focused journey runs.
// Largest journeys go first into the lightest runner;
// each file is executed once, regardless of how many contract clauses it exercises.
// Two Node workers use independent fixture databases and ports; browser spec gates
// stay sequential. This overlaps the native D1 proxy waits on each two-core CI host.
const minutes = {
  'newtests/t096/report-disclosure.test.ts': 12,
  'newtests/t096/browser-journeys.test.ts': 13,
  'newtests/t096/forms-native.test.ts': 10,
  'newtests/t096/team-native.test.ts': 3,
  'newtests/t096/archive-recovery.test.ts': 11,
  'tests/delegation-browser/records-layout.test.ts': 5,
  'tests/delegation-browser/today-brief.test.ts': 2,
  'tests/core/capture-providers.test.ts': 4,
  'tests/core/capture-associations.test.ts': 10,
  'tests/core/capture-microsoft.test.ts': 4,
  'tests/core/capture-calendar.test.ts': 3,
  'tests/core/capture-erasure.test.ts': 9,
  'tests/core/customer-portability.test.ts': 12,
  'tests/core/source-onboarding.test.ts': 6,
  'tests/core/onboarding-archive.test.ts': 15,
  'tests/core/crm-import.test.ts': 7,
  'tests/core/crm-vendor.test.ts': 4,
  'tests/core/launch-suppression.test.ts': 6,
  'tests/core/mailchimp.test.ts': 6,
  'tests/core/records-search.test.ts': 3,
  'tests/core/signals-outreach.test.ts': 2,
  'tests/core/record-mail-compose.test.ts': 10,
  'tests/core/record-mail-follow-up.test.ts': 10,
  'tests/e2e/operator.spec.mjs': 1,
  'tests/e2e/baseline.spec.mjs': 1,
  'tests/archive/browser.spec.mjs': 2,
  'tests/launch-runtime/mail-ingress.test.ts': 3,
  'tests/rer/journey.test.mjs': 9,
  'newtests/t096/forward-upgrade.test.ts': 30,
  'newtests/t096/archive-native.test.ts': 7,
};
const browserFile = file => /\/e2e\/|\/archive\/|\/delegation-browser\/|\/launch-runtime\/|\/rer\/|newtests\/t096\/(?:browser-journeys|report-disclosure|team-native|archive-native)/.test(file);
const specFile = file => file.includes('/e2e/') || file.includes('/archive/');
const weight = file => minutes[file] ?? 1;
function duration(files) {
  const node = files.filter(file => !specFile(file)).map(weight);
  // Two independent Node files overlap; Playwright spec gates follow them.
  return Math.max(0, ...node, node.reduce((sum, value) => sum + value, 0) / 2)
    + files.filter(specFile).reduce((sum, file) => sum + weight(file), 0);
}
function balance(files) {
  const bins = Array.from({ length: Math.min(7, files.length) }, () => ({ files: [] }));
  for (const file of [...files].sort((a, b) => weight(b) - weight(a) || a.localeCompare(b))) {
    const bin = bins.reduce((smallest, candidate) => duration([...candidate.files, file]) < duration([...smallest.files, file]) ? candidate : smallest);
    bin.files.push(file);
  }
  return bins;
}

export function verificationPlan(options = verificationOptions()) {
  const { journeys = false, nightly = false } = options;
  const inventory = verificationInventory();
  const files = inventory.files.map(row => row.file).filter(file => nightly ? journeyFiles.includes(file) : journeys || !journeyFiles.includes(file));
  const plan = {
    source: [
      gate('exec', 'node', 'src/base/contract-docs.mjs', 'check'),
      gate('run', 'source:check'),
      gate('exec', 'node', 'node_modules/@runeditrun/rer/bin/rer.mjs', 'check', '--profile', 'first-party'),
      gate('run', 'check:boundaries'),
      gate('run', 'check:manifest'),
      gate('run', 'agent:surface'),
      gate('exec', 'rer', 'build'),
      gate('exec', 'node', 'node_modules/@runeditrun/rer/cli/agent-door.mjs', '.', 'deploy.json'),
      gate('exec', 'node', 'scripts/publish-deployment-spec.mjs', '--check'),
      gate('run', 'typecheck'),
    ],
  };
  for (const [index, bin] of balance(files).entries()) {
    const name = `sanity-${index}`;
    const browser = bin.files.filter(file => file.includes('/e2e/'));
    const archive = bin.files.filter(file => file.includes('/archive/'));
    const node = bin.files.filter(file => !browser.includes(file) && !archive.includes(file));
    plan[name] = [gate('exec', 'node', 'scripts/verification-build.mjs', 'check'), gate('exec', 'tsx', 'tests/support/prepare-state.ts', '--empty')];
    if (node.length) plan[name].push(nodeTests(node, `verification/${name}-results.jsonl`));
    if (browser.length) plan[name].push(playwright(browser, 'verification/browser-results.jsonl'));
    if (archive.length) plan[name].push(playwright(archive, 'verification/browser-results.jsonl', 'tests/archive/playwright.config.mjs'));
  }
  const planned = Object.values(plan).flatMap(gates => gates.flatMap(stage => stage.files ?? []));
  if (planned.length !== new Set(planned).size || JSON.stringify([...files].sort()) !== JSON.stringify([...planned].sort())) throw Error('Verification must schedule every selected journey exactly once.');
  return plan;
}

export function verificationBatches(options = verificationOptions()) {
  return Object.entries(verificationPlan(options)).filter(([name]) => name !== 'source').map(([name, stages]) => {
    const files = stages.flatMap(stage => stage.files ?? []);
    return { batch: name, shards: [name], browsers: files.some(browserFile), disk: files.some(browserFile) || files.some(file => journeyFiles.includes(file)) };
  });
}
export const capacityExecution = status => ({ runner: 'emitted-worker', name: 'RECORD-006 DATA-001 DATA-002 BASE-DATA-001 complete declared-capacity search, archive roundtrip and erasure', file: 'tests/performance/records-capacity.ts', status });
