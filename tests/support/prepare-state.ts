import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { testState } from './test-state';

// Applies every migration to the isolated test state and seeds the sample workspace.
const template = process.env.ORBIT_TEST_DATABASE_TEMPLATE;
if (template && existsSync(join(template, 'v3'))) {
  cpSync(join(template, 'v3'), join(testState(), 'v3'), { recursive: true });
} else {
  execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--local', '--config', 'wrangler.jsonc', '--persist-to', testState()], { stdio: 'inherit', env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' } });
// Copy only the empty, fully migrated database, after Wrangler has closed it.
// Every journey gets a private copy; upgrade journeys still apply their own history.
  if (template) {
    mkdirSync(template, { recursive: true });
    cpSync(join(testState(), 'v3'), join(template, 'v3'), { recursive: true });
  }
}
if (!process.argv.includes('--empty')) await import('./seed-sample');
