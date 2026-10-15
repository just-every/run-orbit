import {ensureLocalSourceKey} from './source-key.mjs';
import { localInstaller } from '@runeditrun/rer/local-installer';
import { developmentTarget, previewTarget } from '@runeditrun/rer/operator-installer';
import { selectLocalState, LocalStateSafetyError } from '@runeditrun/rer/local/state';
import { privateDirectory } from '@runeditrun/rer/private-files';
import { commandAdapter as createCommandAdapter } from '@runeditrun/rer/adapter';
import { localState } from '../local-state.mjs';
import { orbitPortability } from './portability.mjs';
import { orbitDeploy } from './deploy.mjs';
import { captureNotices } from './capture-notices.mjs';
import * as model from './ui/seed.mjs';

export const database = 'orbit-local-db';
const migrate = ({ demo }) => ['pnpm', ['exec', 'wrangler', 'd1', 'migrations', 'apply', database, '--local', '--persist-to', demo?.state ?? '.wrangler/state', '--config', 'wrangler.jsonc'], { env: { ...process.env, WRANGLER_SEND_METRICS: 'false', X_LOCAL_EXPLORER: 'false' } }];

// Orbit signs in through Base operator-auth over its own operators and sessions.
// Locally it claims the first owner with the private setup token, captures
// sign-in mail in Base's outbox and opens `rer dev` signed in (devIdentity).
export const lifecycle = captureNotices(localInstaller({
 features: model.features, node: '22.20.0', tools: ['pnpm', 'node'],
 failure: (error, { store }) => error instanceof LocalStateSafetyError ? store.redact(error.message) : undefined,
 // localState refuses legacy preview state under dist/ before anything builds over it.
 async prepare(context) { localState(context.root); context.localState = await selectLocalState(context.root); await privateDirectory(context.root, ['.wrangler', 'state']); if(context.verb==='setup')await ensureLocalSourceKey(context); },
 guard: async ({ root }) => { await selectLocalState(root); },
 secrets: {
  keepExisting: true, originKey: 'AUTH_ORIGIN',
  values: ({ origin }) => ({ AUTH_LOCAL: 'true', AUTH_ORIGIN: origin, MAIL_PROVIDER: 'development', MAIL_FROM: 'auth@localhost.test' }),
 },
 build: ['pnpm', ['run', 'build:app']],
 migrate,
 start: previewTarget,
 owner: { displayName: input => input.displayName || 'Owner', returnTo: '/setup' },
 signIn: { emailKey: 'OWNER_EMAIL', returnTo: '/setup' },
}));
export const adapter = lifecycle;
export const { install } = lifecycle;
export const commandAdapter = createCommandAdapter(lifecycle, {
 site: { entry: 'src/site/pages.tsx', output: 'dist/site', declaration: 'deploy-site.json', config: 'vite.site.config.ts' },
 publicPages: ['/', '/signin', '/docs', '/docs/run-locally', '/docs/operations', '/docs/moving-in', '/docs/signals-and-mail', '/docs/owner-steps', '/docs/connect-gmail', '/docs/connect-outlook', '/docs/updating', '/docs/record-policies'],
 dev: developmentTarget, preview: previewTarget, verify: ['pnpm', ['run', 'verify:app']],
 deploy: orbitDeploy(lifecycle), portability: orbitPortability(database),
 setup: { manifestFile: 'rer-setup.json' }, browserModule: 'scripts/installer/ui/seed.mjs',
 product: model.product.name, input: { names: { email: 'OWNER_EMAIL', name: 'displayName' } },
 // Local-only persona sign-in; vite.config.ts loads the entry for `vite dev` alone.
 devIdentity: { entry: 'src/dev/server.ts', output: ['dist'], emailLinkTest: 'tests/rer/journey.test.mjs' },
});
