import { AuthError, createAuthHandler, createOperatorAuth, createSignInHandler, securityHeaders, type AuthConfig, type MailSender } from '@runeditrun/rer/modules/operator-auth';
import { devAdmitted } from '@runeditrun/rer/modules/operator-auth/dev-admission';
import { createDependencies } from '@runeditrun/rer/modules/dependencies';
import { identityMailSender } from './mail';
export { identityMailSender } from './mail';
import type { PlatformBindings } from '../../platform/assets';
import { createNativeAccounts } from './accounts';
import { createNativeProofs } from './proofs';
import { sessionStore } from './store';
import {OwnerClaimError} from '@runeditrun/rer/modules/owner-claim';
import {ownerClaimResponse} from './owner-claim';
import {demoSignIn} from './demo-signin';

export const clientIp = (local: boolean) => (request: Request) => local ? 'loopback' : request.headers.get('CF-Connecting-IP') ?? '';

/** Base operator-auth settings from the installation's bindings; null until the installation is configured. */
export function identityConfig(bindings: PlatformBindings, sender: MailSender | undefined = identityMailSender(bindings)): AuthConfig | null {
  const local = bindings.AUTH_LOCAL === 'true';
  if (!bindings.AUTH_ORIGIN || !bindings.SESSION_SECRET || !bindings.OWNER_EMAIL) return null;
  return {
    origin: new URL(bindings.AUTH_ORIGIN).origin, local,
    OWNER_EMAIL: bindings.OWNER_EMAIL.trim().toLowerCase(), SESSION_SECRET: bindings.SESSION_SECRET, SETUP_TOKEN: bindings.SETUP_TOKEN,
    ...(sender && bindings.MAIL_FROM ? { MAIL_FROM: bindings.MAIL_FROM } : {}),
    branding: { productName: 'Orbit', accentColor: '#16171d', signInPath: '/signin', theme: '/orbit-auth.css' },
    linkSeconds: 15 * 60, dependencies: true,
  };
}

/** Base operator-auth composed over Orbit's native operators, sessions and proofs for one request. */
export function createOrbitIdentity(bindings: PlatformBindings, options: { waitUntil?: (promise: Promise<unknown>) => void; clock?: () => number; mailSender?: MailSender } = {}) {
  const mail = options.mailSender ?? identityMailSender(bindings), config = identityConfig(bindings, mail);
  if (!config) return null;
  const clock = options.clock ?? Date.now, store = sessionStore(bindings.DB, { devAdmitted });
  const accounts = createNativeAccounts(store, { clock });
  const auth = createOperatorAuth({
    db: bindings.DB, config, accounts, proofs: createNativeProofs(store), clientIp: clientIp(config.local === true), clock,
    ...(mail ? { mailSender: mail } : {}), ...(options.waitUntil ? { waitUntil: options.waitUntil } : {}),
  });
  return { auth, accounts, store, config, clock };
}
export type OrbitIdentity = NonNullable<ReturnType<typeof createOrbitIdentity>>;

// PUBLIC-003: before an installation has its sign-in settings the page says so; the auth API refuses.
/** A sign-in page with no way in yet: it says why and presents no credential field (PUBLIC-003). */
const noWayIn = (message: string, method = 'GET') => new Response(method === 'HEAD' ? null : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in</title></head><body><main><h1>Sign in to Orbit</h1><p role="alert">${message}</p><p><a href="/">Home</a></p></main></body></html>`, { status: 200, headers: { ...securityHeaders(), 'content-type': 'text/html; charset=utf-8', 'content-security-policy': "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } });
const unconfigured = (path: string) => path === '/signin'
  ? noWayIn('Sign-in is not configured for this installation yet. Ask the person who runs it to finish its setup.')
  : Response.json({ error: 'auth_unconfigured' }, { status: 503, headers: securityHeaders() });
const formPost = (request: Request) => (request.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase() === 'application/x-www-form-urlencoded';

/**
 * Orbit's identity front door: the shared sign-in page, Base's /auth routes,
 * provider linking under /.well-known, and sign-out. Null for other paths.
 */
export async function identityResponse(request: Request, bindings: PlatformBindings, options: { waitUntil?: (promise: Promise<unknown>) => void; ownerClaimed: () => Promise<boolean>; mailSender?: MailSender }): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path !== '/signin' && !path.startsWith('/auth/') && !path.startsWith('/.well-known/rer-')) return null;
  try {
    const identity = createOrbitIdentity(bindings, options);
    if (!identity) return unconfigured(path);
    const { auth, config } = identity;
    if (bindings.RER_DEMO === '1' && (path === '/signin' && request.method === 'GET' || path === '/auth/demo/enter')) return await demoSignIn(request, identity);
    if (path === '/auth/owner-claim') return await ownerClaimResponse(request, bindings, identity);
    // PUBLIC-003: without sign-in mail and no linked provider there is no way in, so the page
    // says so and presents no credential field (Base's page always offers the email form).
    if (path === '/signin' && ['GET', 'HEAD'].includes(request.method) && !config.MAIL_FROM && !(await auth.providers?.list() ?? []).some(p => p.visible)) {
      return noWayIn('Sign-in email is not available right now. Ask the person who runs this app to check its mail settings.', request.method);
    }
    // Links from Orbit's retired sign-in engine cannot be redeemed; offer a new one.
    if (path === '/auth/verify') return new Response(null, { status: 303, headers: { ...securityHeaders(), Location: '/signin' } });
    // A sign-out form posted before hydration gets the sign-in page back; scripts get Base's 204.
    if (path === '/auth/signout' && request.method === 'POST' && formPost(request)) {
      const result = await auth.signOut(request);
      return new Response(null, { status: 303, headers: { ...securityHeaders(), 'Set-Cookie': result.cookie, Location: '/signin?notice=signed_out' } });
    }
    const dependencies = await createDependencies({ db: bindings.DB, origin: config.origin, name: 'Orbit', provider: bindings.IDENTITY_PROVIDER, local: config.local, auth }).handle(request);
    return dependencies ?? await createSignInHandler(auth, {
      setup: async () => bindings.SETUP_TOKEN && !await options.ownerClaimed() ? { instructions: 'Use the setup token from your installation to claim the first owner.' } : null,
    })(request) ?? await createAuthHandler(auth)(request);
  } catch (error) {
    const known = error instanceof AuthError || error instanceof OwnerClaimError;
    return Response.json({ error: known ? error.code : 'auth_unavailable' }, { status: known ? error.status : 503, headers: securityHeaders() });
  }
}
