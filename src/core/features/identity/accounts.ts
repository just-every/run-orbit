import type { NativeAccountsAdapter } from '@runeditrun/rer/modules/operator-auth/accounts/native';
import { safeReturnTo } from '@runeditrun/rer/modules/operator-auth';
import { createId } from '../../shared/ids';
import { bootstrapStatement } from './bootstrap';
import { dependencyAuthority } from './dependencies';
import { actorFence, clearGuards, clearSessionCookie, guard, ownerFence, personColumns, personOf, refused, sha256, sessionCookie, version, LIFETIME, type OrbitRole, type PersonRow, type SessionStore } from './store';

const iso = (ms: number) => new Date(ms).toISOString();

/**
 * Base's native accounts contract over Orbit's operators and sessions. Orbit
 * has one workspace, so every operator belongs to it. Orbit's own settings and
 * access routes keep operator administration and collaborator invitations;
 * Base refuses its own administration routes for a native seed.
 */
export function createNativeAccounts(store: SessionStore, input: { clock: () => number }): NativeAccountsAdapter<OrbitRole> {
  const { db } = store;
  const refuse = async (): Promise<never> => { throw new Error('Orbit binds and issues provider sessions atomically.'); };
  const settings = () => db.prepare('SELECT idp_sign_in,generation FROM identity_settings WHERE id=1').first<{ idp_sign_in: number; generation: number }>();
  const accounts: NativeAccountsAdapter<OrbitRole> = {
    findById: id => store.person('o.id=?', id),
    findByEmail: email => store.person('lower(o.email)=lower(?)', email),
    findBinding: ({ issuer, subject }) => store.person('o.id=(SELECT operator_id FROM identity_bindings WHERE issuer=? AND subject=?)', issuer, subject),
    bind: refuse,
    issueSession: refuse,
    getSession: (request, { now }) => store.read(request, now),
    async signOut(request, { now }) {
      await store.revokeToken(request, now);
      return { cookie: clearSessionCookie() };
    },
    async revokeSession(id) {
      await db.prepare('UPDATE sessions SET revoked_at=COALESCE(revoked_at,?) WHERE id=?').bind(iso(input.clock()), id).run();
    },
    owner: () => store.person("o.setup_owner=1 AND o.status='active'"),
    async identityEnabled() { return (await settings())?.idp_sign_in === 1; },
    async policyVersion() { return (await settings())!.generation; },
    // Domain requirements fence provider admission below; email links remain available.
    async requiredProvider() { return null; },
    async currentBoundSubject({ personId, issuer }) {
      const rows = (await db.prepare('SELECT subject FROM identity_bindings WHERE issuer=? AND operator_id=?').bind(issuer, personId).all<{ subject: string }>()).results;
      return rows.length === 1 ? rows[0]!.subject : null;
    },
    async bindAndIssueSession({ person, principal, returnTo }) {
      if(principal.emailVerified!==true||typeof principal.email!=='string'||principal.email.trim().toLowerCase()!==person.email||person.role==='member')return null;
      if (!Number.isSafeInteger(principal.providerGeneration) || principal.providerGeneration < 0) return null;
      const pin = principal.providerPin, now = input.clock();
      // One transaction: current person, setting, generation and pin; a binding never moves to another operator. Orbit has no passwords to revoke.
      return store.issue({ person, kind: 'oidc', now, returnTo, principal, statements: [
        guard(db, {sql:"NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=?) AND NOT EXISTS(SELECT 1 FROM identity_domain_policies WHERE domain=? AND provider_id<>?)",args:[person.id,person.email.split('@')[1]??'',principal.provider??'']}),
        guard(db, { sql: 'EXISTS(SELECT 1 FROM identity_settings WHERE id=1 AND idp_sign_in=1 AND generation=?)', args: [principal.providerGeneration] }),
        ...(pin ? [guard(db, { sql: "EXISTS(SELECT 1 FROM oa_identity_providers WHERE provider_id=? AND status='linked' AND issuer=? AND client_id=? AND linked_at=?)", args: [pin.id, pin.issuer, pin.clientId, pin.linkedAt] })] : []),
        db.prepare('INSERT INTO identity_bindings (issuer,subject,operator_id,created_at) VALUES (?,?,?,?) ON CONFLICT(issuer,subject) DO NOTHING').bind(principal.issuer, principal.subject, person.id, iso(now)),
        guard(db, { sql: 'EXISTS(SELECT 1 FROM identity_bindings WHERE issuer=? AND subject=? AND operator_id=?)', args: [principal.issuer, principal.subject, person.id] }),
      ] });
    },
    /** Verified admission claims the first owner, creating the workspace and its first session together. */
    async bootstrap({ email, displayName, returnTo, now }) {
      const ownerId = createId(now), sessionId = createId(now + 1), token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join(''), expiresAt = now + LIFETIME.native;
      try {
        await db.batch([
          bootstrapStatement(db, { ownerId, email, displayName, now }),
          db.prepare('INSERT INTO sessions (id,operator_id,token_hash,expires_at,created_at) SELECT ?,id,?,?,? FROM operators WHERE id=?')
            .bind(sessionId, await sha256(token), iso(expiresAt), iso(now), ownerId),
          db.prepare(`INSERT INTO identity_sessions (session_id,kind,authority_version,proof_at,proof_version) SELECT ?,'native',${version('o')},?,${version('o')} FROM operators o WHERE o.id=?`)
            .bind(sessionId, now, ownerId),
          db.prepare("UPDATE identity_settings SET first_setup=0 WHERE id=1"),
        ]);
      } catch (cause) {
        if (refused(cause)) return null;
        throw cause;
      }
      const owner = personOf(await db.prepare(`SELECT ${personColumns('o')} FROM operators o WHERE o.id=?`).bind(ownerId).first<PersonRow>());
      if (!owner) return null;
      return { session: { id: sessionId, kind: 'native', createdAt: now, expiresAt }, operator: owner, cookie: sessionCookie(token, expiresAt, now), returnTo: safeReturnTo(returnTo) };
    },
    /** `rer setup` ends first-setup provider eligibility once the owner is claimed (Base checks the local CLI proof and owner). */
    async completeLocalSetup() {
      await db.prepare("UPDATE identity_settings SET first_setup=0 WHERE id=1 AND EXISTS(SELECT 1 FROM operators WHERE setup_owner=1 AND status='active')").run();
      return { complete: true };
    },
    async setIdentitySettings({ actor, idpSignIn, now }) {
      try {
        await db.batch([
          guard(db, actorFence(actor, now)), guard(db, ownerFence(actor)),
          db.prepare('UPDATE identity_settings SET idp_sign_in=?,first_setup=0,generation=generation+1 WHERE id=1').bind(Number(idpSignIn)),
          db.prepare("UPDATE sessions SET revoked_at=COALESCE(revoked_at,?) WHERE id IN (SELECT session_id FROM identity_sessions WHERE kind='oidc') AND ?=0").bind(iso(now), Number(idpSignIn)),
          db.prepare("INSERT INTO identity_audit VALUES('idpSignIn',?,?,?)").bind(actor.operator.id, String(idpSignIn), now),
          clearGuards(db),
        ]);
        return true;
      } catch (cause) {
        if (refused(cause)) return false;
        throw cause;
      }
    },
    async checkCredentialFence(credential) {
      const current = await store.person('o.id=?', credential.personId);
      return current?.status === 'active' && current.version === credential.fence;
    },
  };
  accounts.dependencies = dependencyAuthority({ store, accounts, clock: input.clock });
  return accounts;
}
