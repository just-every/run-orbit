import type { CompletedSession, Session } from '../../../../scripts/base-cli/modules/operator-auth/index.mjs';
import type { NativePerson } from '../../../../scripts/base-cli/modules/operator-auth/accounts/native.mjs';
import { safeReturnTo } from '../../../../scripts/base-cli/modules/operator-auth/index.mjs';
import { createId } from '../../shared/ids';

/**
 * Orbit's people projected onto Base roles: the setup owner is `owner`, every
 * other native full operator `admin` (TEAM-002: any operator may invite or
 * remove operators), and an invited collaborator `member`. Workspace roles,
 * field access and invitations stay in Orbit's access_* tables.
 */
export type OrbitRole = 'owner' | 'admin' | 'member';
export type OrbitPerson = NativePerson<OrbitRole>;
export type OrbitSession = Session<OrbitRole> & { hash: string };

export const SESSION_COOKIE = '__Host-orbit_session';
const DAY = 86_400_000;
/** Orbit's existing 14-day email sessions; Base caps provider sessions at 24 hours. */
export const LIFETIME = { native: 14 * DAY, oidc: DAY, dev: 7 * DAY } as const;
const iso = (ms: number) => new Date(ms).toISOString();

/** The authority version: operators.updated_at in epoch milliseconds, set by every change to an operator. */
export const version = (o: string) => `COALESCE(unixepoch(${o}.updated_at)*1000+CAST(substr(${o}.updated_at,21,3) AS INTEGER),0)`;
const role = (o: string) => `CASE WHEN ${o}.setup_owner=1 THEN 'owner' WHEN EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=${o}.id) THEN 'member' ELSE 'admin' END`;
export const personColumns = (o: string) => `${o}.id,${o}.email,${o}.display_name,${o}.status,${o}.setup_owner,${o}.created_at,${version(o)} AS authority_version,${role(o)} AS orbit_role`;

export interface PersonRow { id: string; email: string; display_name: string; status: string; setup_owner: number; created_at: string; authority_version: number; orbit_role: OrbitRole }

export function personOf(row: PersonRow | null): OrbitPerson | null {
  if (!row) return null;
  const active = row.status === 'active';
  return {
    id: row.id, email: row.email.toLowerCase(), role: row.orbit_role, status: active ? 'active' : 'inactive',
    owner: active && row.setup_owner === 1, version: row.authority_version, displayName: row.display_name, createdAt: Date.parse(row.created_at),
  };
}

export type Fence = { sql: string; args: (string | number | null)[] };

/** Current id, email, version and active status, in SQL a batch guard repeats. */
export function personFence(person: { id: string; email: string; version: number }): Fence {
  return { sql: `EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND lower(o.email)=? AND ${version('o')}=? AND o.status='active')`, args: [person.id, person.email, person.version] };
}

/** Session provenance lives in identity_sessions (alias i), joined LEFT so pre-upgrade sessions keep a NULL kind. */
export const PROVENANCE = 'LEFT JOIN identity_sessions i ON i.session_id=s.id';
const PROVIDER_PIN = "(i.provider_id IS NULL OR EXISTS(SELECT 1 FROM oa_identity_providers ip WHERE ip.provider_id=i.provider_id AND ip.issuer=i.issuer AND ip.linked_at=i.provider_linked_at AND ip.status='linked'))";
const PROVIDER_SESSION = `(s.created_at>? AND EXISTS(SELECT 1 FROM identity_settings st WHERE st.id=1 AND st.idp_sign_in=1 AND st.generation=i.provider_generation) AND ${PROVIDER_PIN} AND EXISTS(SELECT 1 FROM identity_bindings b WHERE b.issuer=i.issuer AND b.subject=i.subject AND b.operator_id=s.operator_id))`;
/** Sessions from before Base adoption carry no kind or version and keep their existing native contract. */
const CURRENT = (o: string) => `(i.kind IS NULL OR i.authority_version=${version(o)}) AND (i.kind IS NOT 'oidc' OR ${PROVIDER_SESSION})`;

/** The asking session still holds current authority, including a provider session's cap, generation, pin and binding. */
export function actorFence(actor: { id: string; operator: { id: string; version: number } }, now: number): Fence {
  return {
    sql: `EXISTS(SELECT 1 FROM sessions s JOIN operators o ON o.id=s.operator_id ${PROVENANCE} WHERE s.id=? AND o.id=? AND ${version('o')}=? AND o.status='active' AND s.revoked_at IS NULL AND s.expires_at>? AND ${CURRENT('o')})`,
    args: [actor.id, actor.operator.id, actor.operator.version, iso(now), iso(now - LIFETIME.oidc)],
  };
}

/** The current setup owner is this actor. */
export const ownerFence = (actor: { operator: { id: string } }): Fence => ({ sql: "EXISTS(SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active')", args: [actor.operator.id] });

export const guard = (db: D1Database, fence: Fence) => db.prepare(`INSERT INTO identity_guards(value) VALUES(CASE WHEN ${fence.sql} THEN 1 ELSE 0 END)`).bind(...fence.args);
export const clearGuards = (db: D1Database) => db.prepare('DELETE FROM identity_guards');
export const refused = (cause: unknown) => /identity_guards|CHECK constraint|Owner bootstrap requires|UNIQUE constraint/.test(String(cause));

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
const opaqueToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');

export function readSessionToken(request: Request): string | undefined {
  for (const fragment of (request.headers.get('cookie') ?? '').split(';')) {
    const [name, ...value] = fragment.trim().split('=');
    if (name === SESSION_COOKIE && value.length === 1 && /^[a-f0-9]{64}$/.test(value[0]!)) return value[0];
  }
  return undefined;
}
export const sessionCookie = (token: string, expiresAt: number, now: number) => `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0, Math.floor((expiresAt - now) / 1000))}`;
export const clearSessionCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export interface ProviderPrincipal { issuer: string; subject: string; sid?: string; providerGeneration?: number; providerPin?: { id: string; linkedAt: number } }
export type SessionKind = keyof typeof LIFETIME;

/** Sessions keep Orbit's cookie and token digest, so sessions issued before the upgrade stay readable. */
export function sessionStore(db: D1Database, input: { devAdmitted: (request: Request) => Promise<boolean> }) {
  async function person(where: string, ...args: (string | number)[]) {
    return personOf(await db.prepare(`SELECT ${personColumns('o')} FROM operators o WHERE ${where} LIMIT 1`).bind(...args).first<PersonRow>());
  }
  return {
    db, person,
    async read(request: Request, now: number): Promise<OrbitSession | null> {
      const token = readSessionToken(request);
      if (!token) return null;
      const row = await db.prepare(`SELECT s.id AS session_id,i.kind,s.created_at AS session_created_at,s.expires_at,i.issuer,i.subject,i.sid,s.token_hash,${personColumns('o')}
        FROM sessions s JOIN operators o ON o.id=s.operator_id ${PROVENANCE}
        WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND o.status='active' AND ${CURRENT('o')}`)
        .bind(await sha256(token), iso(now), iso(now - LIFETIME.oidc))
        .first<PersonRow & { session_id: string; kind: SessionKind | null; session_created_at: string; expires_at: string; issuer: string | null; subject: string | null; sid: string | null; token_hash: string }>();
      if (!row) return null;
      // A dev session counts only on a request that passes the checkout's key gate.
      if (row.kind === 'dev' && !await input.devAdmitted(request)) return null;
      await db.prepare('UPDATE sessions SET last_seen_at=? WHERE id=?').bind(iso(now), row.session_id).run();
      return {
        hash: row.token_hash, id: row.session_id, kind: row.kind ?? 'native', operatorId: row.id, operator: personOf(row)!,
        createdAt: Date.parse(row.session_created_at), expiresAt: Date.parse(row.expires_at),
        ...(row.issuer ? { issuer: row.issuer, subject: row.subject ?? undefined, sid: row.sid ?? undefined } : {}),
      };
    },
    /** Issues a session in one batch with its fences; null when a fence refused. */
    async issue({ person: p, kind, now, returnTo, statements = [], principal, freshProof = false }: { person: OrbitPerson; kind: SessionKind; now: number; returnTo?: string; statements?: D1PreparedStatement[]; principal?: ProviderPrincipal; freshProof?: boolean }): Promise<CompletedSession<OrbitRole> | null> {
      const id = createId(now), token = opaqueToken(), expiresAt = now + LIFETIME[kind];
      try {
        await db.batch([
          guard(db, personFence(p)), ...statements,
          db.prepare('INSERT INTO sessions (id,operator_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)').bind(id, p.id, await sha256(token), iso(expiresAt), iso(now)),
          db.prepare(`INSERT INTO identity_sessions (session_id,kind,authority_version,issuer,subject,sid,provider_id,provider_linked_at,provider_generation,proof_at,proof_version)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(id, kind, p.version,
            principal?.issuer ?? null, principal?.subject ?? null, principal?.sid ?? null, principal?.providerPin?.id ?? null, principal?.providerPin?.linkedAt ?? null,
            principal?.providerGeneration ?? null, freshProof ? now : null, freshProof ? p.version : null),
          clearGuards(db),
        ]);
      } catch (cause) {
        if (refused(cause)) return null;
        throw cause;
      }
      return { session: { id, kind, createdAt: now, expiresAt }, operator: p, cookie: sessionCookie(token, expiresAt, now), returnTo: safeReturnTo(returnTo) };
    },
    async revokeToken(request: Request, now: number) {
      const token = readSessionToken(request);
      if (token) await db.prepare('UPDATE sessions SET revoked_at=COALESCE(revoked_at,?) WHERE token_hash=?').bind(iso(now), await sha256(token)).run();
    },
  };
}
export type SessionStore = ReturnType<typeof sessionStore>;
