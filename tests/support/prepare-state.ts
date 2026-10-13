import { execFileSync } from 'node:child_process';
import { testState } from './test-state';

// Applies every migration to the isolated test state and seeds the sample workspace.
execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--local', '--config', 'wrangler.jsonc', '--persist-to', testState()], { stdio: 'inherit', env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' } });
await import('./seed-sample');
