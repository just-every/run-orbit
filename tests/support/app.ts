import { createApp as createOrbitApp } from '../../src/core/app/app';
import { nativeDelegationRoutes } from '../../src/core/features/delegation/native';
import { operatorFromRequest, requireStepUp } from '../../src/core/features/identity';
import type { PlatformBindings } from '../../src/core/platform/assets';

type AppInput = Omit<Parameters<typeof createOrbitApp>[0], 'authenticate' | 'stepUp'>;
export { TEST_SESSION_SECRET } from './worker-identity.mjs';
import { TEST_SESSION_SECRET } from './worker-identity.mjs';

/** Base admission over the request's own origin, with test-only installation settings. */
export function identityBindings(database: D1Database, request: Request) {
  return { DB: database, AUTH_ORIGIN: new URL(request.url).origin, AUTH_LOCAL: 'false', SESSION_SECRET: TEST_SESSION_SECRET, OWNER_EMAIL: 'owner@orbit.test' } as PlatformBindings;
}

/** The real application with Base operator-auth composed over the test database. */
export function createApp(input: AppInput) {
  return createOrbitApp({
    ...input,
    authenticate: request => operatorFromRequest(request, identityBindings(input.database, request)),
    stepUp: (request, action, returnTo) => requireStepUp(request, identityBindings(input.database, request), action, returnTo),
  });
}

/** Orbit's browser delegation routes with the same Base sign-in and step-up the application composes. */
export function nativeDelegation(database: D1Database) {
  return nativeDelegationRoutes(
    database,
    request => operatorFromRequest(request, identityBindings(database, request)),
    (request, action, returnTo) => requireStepUp(request, identityBindings(database, request), action, returnTo),
  );
}
