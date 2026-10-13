// Installation identity for test harnesses that start the built Worker: Base
// sign-in pins sessions to AUTH_ORIGIN and keys links with SESSION_SECRET.
export const TEST_SESSION_SECRET = 'orbit-test-session-secret-0123456789abcdef';
export const identityVars = (origin, owner = 'owner@orbit.test') => ({ AUTH_ORIGIN: origin, AUTH_LOCAL: new URL(origin).protocol === 'http:' ? 'true' : 'false', SESSION_SECRET: TEST_SESSION_SECRET, OWNER_EMAIL: owner });
/** `wrangler dev --var` arguments for an origin. */
export const identityVarArgs = (origin, owner) => Object.entries(identityVars(origin, owner)).flatMap(([key, value]) => ['--var', `${key}:${value}`]);
/** Env-file lines for an origin. */
export const identityEnvLines = (origin, owner) => Object.entries(identityVars(origin, owner)).map(([key, value]) => `${key}=${value}\n`).join('');
