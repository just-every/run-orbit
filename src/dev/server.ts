// Local dev identity. LOCAL-ONLY: vite.config.ts loads this entry for `vite dev`
// alone; the deployed main (src/core/app/worker.ts) never imports it, and
// `rer build` refuses output that contains this layer's marker.
import worker, { runtimeBindings } from '../core/app/worker';
import { cliSession } from './cli-session';
import localBusinessName from 'virtual:orbit-local-business';
import { applyLocalBusinessName } from './local-business';
import { identityConfig } from '../core/features/identity/auth';
// @ts-expect-error Base's HTML page helper is plain ESM.
import { pageResponse } from '@runeditrun/rer/internal/modules/operator-auth/page.mjs';
import { devGate, devNotFound, isLoopbackHost, safeReturnTo } from '@runeditrun/rer/modules/operator-auth';
import { registerDevAdmission, devAdmitted } from '@runeditrun/rer/modules/operator-auth/dev-admission';
import { decorateLabel } from '@runeditrun/rer/modules/demo/label';
import { clearSessionCookie, sessionStore, sha256 } from '../core/features/identity/store';
import { createId } from '../core/shared/ids';
import type { PlatformBindings } from '../core/platform/assets';

export const DEV_LAYER_MARKER = 'rer-dev-layer:local-only-never-deploy';
const headers = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex, nofollow', 'x-rer-dev-layer': DEV_LAYER_MARKER };
const text = (status: number, body: string) => new Response(body, { status, headers: { ...headers, 'content-type': 'text/plain; charset=utf-8' } });

/**
 * Orbit's real roles as dev personas at `<as>@dev.localhost`, created only here:
 * a native full operator who sells, and an invited collaborator with the
 * read-only analyst profile, whose field access the owner controls.
 */
const PERSONAS = [
  { as: 'seller', role: 'admin', displayName: 'Dev seller' },
  { as: 'collaborator', role: 'member', displayName: 'Dev collaborator', profile: 'analyst' },
] as const;

function managedInstallation(env: PlatformBindings & { RER_INSTALLATION_ID?: string; RER_MANAGEMENT_ORIGIN?: string }) {
  if (!env.RER_INSTALLATION_ID || !env.RER_MANAGEMENT_ORIGIN) return false;
  try { return !isLoopbackHost(new URL(env.RER_MANAGEMENT_ORIGIN).hostname); } catch { return true; }
}

async function identity(env: PlatformBindings) {
  const store = sessionStore(env.DB, { devAdmitted });
  const owner = (await store.person("o.setup_owner=1 AND o.status='active'"))?.email;
  const everyone = () => [...(owner ? [{ as: 'owner', email: owner, role: 'owner' }] : []), ...PERSONAS.map(p => ({ as: p.as, email: `${p.as}@dev.localhost`, role: p.role }))];
  return {
    store, everyone,
    list: () => [...everyone(), { as: 'signed-out' }],

  };
}

/** Creates a persona once, through the same tables and triggers Orbit's own invitations use. */
async function provision(db: D1Database, persona: typeof PERSONAS[number]) {
  const email = `${persona.as}@dev.localhost`, now = new Date().toISOString(), id = createId();
  const absent = 'NOT EXISTS(SELECT 1 FROM operators WHERE email=?)';
  if (!('profile' in persona)) {
    await db.prepare(`INSERT INTO operators(id,email,display_name,status,created_at,updated_at) SELECT ?,?,?,'active',?,? WHERE ${absent} AND EXISTS(SELECT 1 FROM access_workspaces)`)
      .bind(id, email, persona.displayName, now, now, email).run();
    return;
  }
  // A collaborator is recorded before its operator row, then accepts its invitation.
  await db.batch([
    db.prepare(`INSERT INTO access_collaborators(operator_id,invited_at) SELECT ?,? WHERE ${absent} AND EXISTS(SELECT 1 FROM access_workspaces)`).bind(id, now, email),
    db.prepare("INSERT INTO operators(id,email,display_name,status,created_at,updated_at) SELECT ?,?,?,'active',?,? WHERE EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=?)").bind(id, email, persona.displayName, now, now, id),
    db.prepare(`INSERT INTO access_invitations(id,workspace_id,email,role,invited_by,token_hash,expires_at,accepted_by,revoked_at,created_at)
      SELECT ?,w.id,?,?,(SELECT id FROM operators WHERE setup_owner=1),?,?,?,NULL,? FROM access_workspaces w WHERE EXISTS(SELECT 1 FROM operators WHERE id=?)`)
      .bind(crypto.randomUUID(), email, persona.profile, await sha256(crypto.randomUUID()), new Date(Date.now() + 86_400_000).toISOString(), id, now, id),
    db.prepare("INSERT INTO access_memberships(workspace_id,operator_id,role,status,created_at) SELECT w.id,?,?,'active',? FROM access_workspaces w WHERE EXISTS(SELECT 1 FROM operators WHERE id=?)").bind(id, persona.profile, now, id),
  ]);
}

async function enter(request: Request, env: PlatformBindings, gate: NonNullable<ReturnType<typeof devGate>>) {
  if (request.method !== 'GET') return text(405, 'Method not allowed');
  const url = new URL(request.url), as = url.searchParams.get('as') ?? 'owner', reply = new Headers(headers);
  // A harness presenting the key header also receives the browser cookie.
  if (!(request.headers.get('cookie') ?? '').includes(`${gate.cookieName}=`)) reply.append('set-cookie', await gate.setCookie());
  const { store, everyone } = await identity(env), now = Date.now();
  if (as === 'signed-out') {
    await store.revokeToken(request, now);
    reply.append('set-cookie', clearSessionCookie());
    reply.set('location', '/');
    return new Response(null, { status: 303, headers: reply });
  }
  const chosen = everyone().find(entry => entry.as === as);
  if (!chosen) return devNotFound();
  const declared = PERSONAS.find(entry => entry.as === as);
  if (declared) await provision(env.DB, declared);
  const person = await store.person('lower(o.email)=?', chosen.email);
  if (!person) return text(409, 'The owner that rer setup claimed is not in this database. Run rer setup.');
  if (person.status !== 'active') return text(403, `${as} is not an active operator in this workspace.`);
  const existing = await store.read(request, now);
  if (existing?.kind !== 'dev' || existing.operatorId !== person.id) {
    const issued = await store.issue({ person, kind: 'dev', now, freshProof: true });
    if (!issued) return text(409, 'The operator changed while signing in. Try again.');
    reply.append('set-cookie', issued.cookie);
  }
  reply.set('location', safeReturnTo(url.searchParams.get('returnTo')));
  return new Response(null, { status: 303, headers: reply });
}

export default {
  ...worker,
  async fetch(request: Request, original: PlatformBindings, execution: ExecutionContext): Promise<Response> {
    const env = runtimeBindings(original) as PlatformBindings & { RER_INSTALLATION_ID?: string; RER_MANAGEMENT_ORIGIN?: string }, path = new URL(request.url).pathname;
    if (managedInstallation(env)) {
      // Never admit a dev credential beside a managed installation.
      registerDevAdmission(null);
      if (env.RER_DEV_IDENTITY !== 'off') return text(503, 'Dev identity refuses to run beside RER_INSTALLATION_ID with a non-loopback RER_MANAGEMENT_ORIGIN. Remove those bindings from local settings or use rer dev --login.');
      return path === '/auth/dev/enter' || path === '/__dev/personas' || path === '/auth/local/cli-session' ? devNotFound() : worker.fetch(request, original, execution);
    }
    const gate = devGate({ key: env.RER_DEV_KEY, origin: env.AUTH_ORIGIN ?? '', local: env.AUTH_LOCAL === 'true' });
    registerDevAdmission(gate ? (r: Request) => gate.admits(r) : null);
    if (gate && await gate.admits(request)) await applyLocalBusinessName(env.DB, localBusinessName);
    if (path === '/auth/local/cli-session') return gate && env.RER_DEV_IDENTITY !== 'off' ? cliSession(request, env) : devNotFound();
    if (path === '/auth/dev/enter' || path === '/__dev/personas') {
      if (!gate || env.RER_DEV_IDENTITY === 'off' || !await gate.admits(request)) return devNotFound();
      return path === '/__dev/personas' ? Response.json((await identity(env)).list(), { headers }) : enter(request, env, gate);
    }
    if (path === '/signin' && gate && env.RER_DEV_IDENTITY !== 'off' && request.method === 'GET') {
      if (!await gate.admits(request)) return new Response(null, {status:303, headers:{...headers, location:'/__dev/key'}});
      const returnTo = safeReturnTo(new URL(request.url).searchParams.get('returnTo'));
      return decorateLabel(await pageResponse({branding:identityConfig(env)!.branding, title:'Orbit', heading:'Open your local app', content:`<a class="action" href="/auth/dev/enter?as=owner&returnTo=${encodeURIComponent(returnTo)}">Continue as owner</a>`}), env.RER_DEMO === '1' ? 'Demo' : 'Dev');
    }
    const response = await worker.fetch(request, original, execution);
    if (!gate || request.method !== 'GET' || path.startsWith('/__dev/')) return response;
    return decorateLabel(response, env.RER_DEMO === '1' ? 'Demo' : 'Dev');
  },
} satisfies ExportedHandler<PlatformBindings>;
