import {ensureDeploymentSourceKey} from './source-key.mjs';
import {captureRedirects} from './capture-notices.mjs';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cloudflare } from '@runeditrun/rer/modules/deploy-kit/provider';
import { ownerTarget, ownerPlan, ownerWorkerName, ownerDeploy, ownerHealth, settleOwnerState } from '@runeditrun/rer/modules/deploy-kit/owner';
import { packageBuild } from '@runeditrun/rer/modules/deploy-kit/prepare';
import { missing, invalid, refuse } from '@runeditrun/rer/errors';
import { claimOrbitOwner } from './hosted-owner.mjs';
import { ownerSecret } from '@runeditrun/rer/internal/modules/deploy-kit/owner-secret.mjs';

// Optional features are uploaded only when the owner supplies them; deployed
// secrets are kept by name on later deploys.
export const optionalSecrets = ['MAIL_FROM', 'SENDGRID_API_KEY', 'MAIL_REPLY_TO', 'SENDGRID_UNSUBSCRIBE_GROUP_ID', 'RER_MAIL_RELAY_SECRET', 'SENDGRID_WEBHOOK_PUBLIC_KEY', 'SENDGRID_PARSE_PUBLIC_KEY', 'ORBIT_ENCRYPTION_KEY', 'OPENAI_API_KEY', 'AI_MODEL', 'AI_INPUT_COST_PER_MILLION', 'AI_OUTPUT_COST_PER_MILLION', 'AI_CACHED_INPUT_COST_PER_MILLION'];
const required = ['OWNER_EMAIL'];

export async function declaration(root, env = process.env) {
 let value; try { value = JSON.parse(await readFile(join(root, 'deploy.json'), 'utf8')); } catch { throw invalid('Malformed owner-account deploy declaration deploy.json.'); }
 for (const name of optionalSecrets) if (name === 'ORBIT_ENCRYPTION_KEY' || env[name]?.trim()) value.secrets.push({ binding: name, environment: name });
 value.secrets.push({ binding: 'SESSION_SECRET', environment: 'SESSION_SECRET' });
 // The optional oidc-provider@1 address; left empty, the app keeps email links.
 if (env.IDENTITY_PROVIDER?.trim()) value.vars.IDENTITY_PROVIDER = env.IDENTITY_PROVIDER.trim();
 return value;
}

/** Base deploy-kit owner-account deploy, health, then the first owner's claim with a one-use token. */
export function orbitDeploy(lifecycle) {
 return async ({ root, options, store, signal, operationToken, setupManifest, linkDependencies }) => {
  const environment = options.environment ?? 'production';
  const plan = await declaration(root);
  await lifecycle.run(root, {}, store, () => {}, signal, { verb: 'build', operationToken });
  if (options.dryRun) {
   // Validate the real declaration and packaged build against a synthetic target; no provider request.
   const worker = ownerWorkerName(plan.project, environment);
   const artifact = await packageBuild({ root, source: { sha: '0'.repeat(40), tree: '0'.repeat(40) }, runIdentity: { id: '0', attempt: '1' }, productDirectory: '' });
   const preview=ownerPlan({ project: plan.project, environment, worker, origin: `https://${worker}.example.invalid` }, plan, artifact);
   store.report(`Worker: ${preview.worker}`);
   for(const kind of ['d1','r2','kv','queues'])for(const resource of preview[kind]??[])store.report(`${kind}: ${resource.name} (${resource.binding})`);
   store.report(`Secrets: ${preview.secrets.map(item=>item.binding).join(', ')}`);
   for(const database of preview.d1)for(const migration of database.migrations)store.report(`Migration: ${database.binding}/${migration.name}`);
   store.report('deploy: dry run complete; no deployment occurred and no provider request was made.');
   return { dryRun: true, deployed: false };
  }
  const absent = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', ...required].filter(name => !process.env[name]?.trim());
  if (absent.length) throw missing(`Deployment requires ${absent.join(', ')} in the environment. See OPERATIONS.md.`);
  const mail = ['MAIL_FROM', 'SENDGRID_API_KEY'].map(name => Boolean(process.env[name]?.trim()));
  if (mail[0] !== mail[1]) throw missing('Sign-in mail requires both MAIL_FROM and SENDGRID_API_KEY, or neither. See OPERATIONS.md.');
  if (mail[0] && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(process.env.MAIL_FROM.trim())) throw invalid('MAIL_FROM must be a verified sender email address.');
  const env = { ...process.env };
  store.addSecrets?.([env.SETUP_TOKEN, env.SENDGRID_API_KEY, ...optionalSecrets.map(name => env[name])].filter(Boolean));
  const api = cloudflare({ accountId: env.CLOUDFLARE_ACCOUNT_ID, token: env.CLOUDFLARE_API_TOKEN });
  const target = await ownerTarget(api, { project: plan.project, environment });
  await ensureDeploymentSourceKey(api,target.worker,env,store);
  const { execFileSync } = await import('node:child_process');
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  if (git('status', '--porcelain', '--untracked-files=no')) throw refuse('Deploy from a committed checkout.');
  const artifact = await packageBuild({ root, source: { sha: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}') }, runIdentity: { id: '0', attempt: '1' }, productDirectory: '' });
  const statePath = join(root, '.rer', 'deploy', `${target.environment}.json`);
  const { retiredSecrets = [] } = await settleOwnerState({ api, target, statePath });
  if (!retiredSecrets.includes('SETUP_TOKEN')) env.SETUP_TOKEN ||= randomBytes(32).toString('hex');
  store.addSecrets?.([env.SETUP_TOKEN].filter(Boolean));
  const deployed = ownerPlan(target, { ...plan, secrets: plan.secrets.filter(item => !retiredSecrets.includes(item.binding)) }, artifact);
  // The fingerprint names every declared secret, so retiring the spent token leaves an unchanged build a no-op.
  const declaredSecrets = ownerPlan(target, plan, artifact).secrets;
  const { receipt, sentSecrets } = await ownerDeploy({ api, target, plan: deployed, artifact, statePath, env, declaredSecrets });
  let setupToken = sentSecrets.includes('SETUP_TOKEN') ? env.SETUP_TOKEN : undefined;
  await ownerHealth({ api, target, plan: deployed, statePath, healthOptions: { readiness: { single: true, totalMs: 30000 } } });
  // Base retires the spent token and records its Worker version. Updates omit it
  // from both the upload and owner claim, including after a process restart.
  const claimed = await claimOrbitOwner({ setupManifest, hook: { returnTo: '/setup' }, declaration: plan,
   deployed: { origin: receipt.origin, sentSecrets, retiredSecrets }, env,
   supplied: process.env.SETUP_TOKEN?.trim() ? [] : ['SETUP_TOKEN'],
   beforeClaim: token => linkDependencies?.(receipt.origin, token),
   addSecret: value => store.addSecrets?.([value]),
   secret: ([action, binding], values) => {
    if (action === '--set' && binding === 'SETUP_TOKEN') setupToken = values[binding];
    return ownerSecret({ api, target, statePath, binding, value: action === '--set' ? values[binding] : undefined });
   },
  });
  if (claimed === undefined) await linkDependencies?.(receipt.origin);
  store.report(`deploy: ${receipt.origin} is healthy. Open ${receipt.origin}/signin and request a sign-in link for the owner email.`);
  for (const line of captureRedirects(receipt.origin)) store.report(line);
  // rer reads its kit record from state and redacts the deployed token; it never prints it.
  return { deployed: true, origin: receipt.origin, dependenciesLinked: true, state: statePath, ...(setupToken ? { setupToken } : {}) };
 };
}
