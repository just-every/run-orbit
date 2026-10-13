import { devAdmitted } from '../../scripts/base-cli/modules/operator-auth/dev-admission.mjs';
import { personColumns, personOf, sessionStore, sha256, version, LIFETIME, SESSION_COOKIE, type PersonRow } from '../../src/core/features/identity/store';
import type { AuthenticatedOperator } from '../../src/core/features/identity';
import type { Clock } from '../../src/core/platform/clock';
import { createId } from '../../src/core/shared/ids';

export const sessionCookieName = SESSION_COOKIE;

/**
 * Test-only operators and sessions written straight to Orbit's tables, the
 * same rows Base's email link issues, so suites can act as an operator
 * without a mailbox. Never imported by application code.
 */
export function testAuth(db: D1Database, clock: Clock = { now: () => new Date() }) {
  const store = sessionStore(db, { devAdmitted });
  return {
    async ensureOperator(input: { id: string; email: string; displayName: string }) {
      const now = clock.now().toISOString();
      await db.prepare("INSERT INTO operators(id,email,display_name,status,created_at,updated_at) VALUES(?,?,?,'active',?,?) ON CONFLICT DO NOTHING")
        .bind(input.id, input.email.trim().toLowerCase(), input.displayName, now, now).run();
    },
    /** An email-link-like session: by default a fresh app-local proof, as an email-link sign-in is. */
    async createSession(operatorId: string, lifetimeMs: number = LIFETIME.native, { proof = true }: { proof?: boolean } = {}) {
      const now = clock.now().getTime(), id = createId(now), expiresAt = new Date(now + lifetimeMs).toISOString();
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
      await db.batch([
        db.prepare('INSERT INTO sessions(id,operator_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)').bind(id, operatorId, await sha256(token), expiresAt, new Date(now).toISOString()),
        db.prepare(`INSERT INTO identity_sessions(session_id,kind,authority_version,proof_at,proof_version) SELECT ?,'native',${version('o')},?,CASE WHEN ? IS NULL THEN NULL ELSE ${version('o')} END FROM operators o WHERE o.id=?`)
          .bind(id, proof ? now : null, proof ? now : null, operatorId),
      ]);
      return { id, token, expiresAt };
    },
    /** A session in the format Orbit's engine wrote before Base sign-in, for stores still on that schema. */
    async legacySession(operatorId: string, lifetimeMs: number = LIFETIME.native) {
      const now = clock.now().getTime(), id = createId(now), token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
      await db.prepare('INSERT INTO sessions(id,operator_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)').bind(id, operatorId, await sha256(token), new Date(now + lifetimeMs).toISOString(), new Date(now).toISOString()).run();
      return { id, token, expiresAt: new Date(now + lifetimeMs).toISOString() };
    },
    async authenticate(cookieHeader: string | undefined): Promise<AuthenticatedOperator | undefined> {
      const session = await store.read(new Request('https://orbit.test/', { headers: cookieHeader ? { cookie: cookieHeader } : {} }), clock.now().getTime());
      return session ? { sessionId: session.id, operatorId: session.operator.id, email: session.operator.email, displayName: session.operator.displayName, devSession: session.kind === 'dev' } : undefined;
    },
    async revoke(sessionId: string) {
      await db.prepare('UPDATE sessions SET revoked_at=COALESCE(revoked_at,?) WHERE id=?').bind(clock.now().toISOString(), sessionId).run();
    },
    async person(id: string) {
      return personOf(await db.prepare(`SELECT ${personColumns('o')} FROM operators o WHERE o.id=?`).bind(id).first<PersonRow>());
    },
  };
}
export type TestAuth = ReturnType<typeof testAuth>;
