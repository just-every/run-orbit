import type { NativeAccountsAdapter } from '@runeditrun/rer/modules/operator-auth/accounts/native';
import type { NativeDependencyAuthority } from '@runeditrun/rer/modules/dependencies';
import { actorFence, clearGuards, guard, ownerFence, refused, type OrbitRole, type SessionStore } from './store';

const STEP_UP_MS = 600_000;
const iso = (ms: number) => new Date(ms).toISOString();

/**
 * Orbit's contribution to Base's dependency linking (oidc-provider@1). Shared
 * code verifies the provider, approval attempt and signatures; these fences
 * and statements join the same D1 transaction.
 */
export function dependencyAuthority({ store, accounts, clock }: { store: SessionStore; accounts: NativeAccountsAdapter<OrbitRole>; clock: () => number }): NativeDependencyAuthority<OrbitRole> {
  const { db } = store;
  /** The current owner's own unexpired session holds a fresh app-local email proof. */
  function ownerSessionFence(actor: { id: string; operator: { id: string; version: number } }, now: number) {
    const session = actorFence(actor, now), owner = ownerFence(actor);
    return { sql: `${session.sql} AND ${owner.sql} AND EXISTS(SELECT 1 FROM identity_sessions WHERE session_id=? AND proof_at>=? AND proof_at<=? AND proof_version=?)`, args: [...session.args, ...owner.args, actor.id, now - STEP_UP_MS, now, actor.operator.version] };
  }
  const revokeProviderSessions = (now: number, where: string, ...args: (string | number)[]) => db.prepare(`UPDATE sessions SET revoked_at=COALESCE(revoked_at,?) WHERE id IN (SELECT session_id FROM identity_sessions WHERE kind='oidc' AND (${where}))`).bind(iso(now), ...args);
  return {
    async unclaimed() { return !await accounts.owner(); },
    ownerFence: (actor, now) => ownerSessionFence(actor, now),
    approvalFence: ({ pending, now }) => ownerSessionFence({ id: pending.approved_session, operator: { id: pending.approved_by, version: pending.approved_version } }, now),
    linkedStatements({ contract, old, issuer, now }) {
      if (contract !== 'oidc-provider@1') return [];
      // An ordinary owner approval keeps provider sign-in off until the owner turns it on.
      return [
        db.prepare('UPDATE identity_settings SET first_setup=0,generation=generation+1 WHERE id=1'),
        db.prepare("INSERT INTO identity_audit VALUES('provider:link',NULL,?,?)").bind(issuer, now),
        ...(old ? [revokeProviderSessions(now, "provider_id='auth' OR issuer=?", String(old.issuer))] : []),
      ];
    },
    unlinkStatements({ contract, actor, now }) {
      return [
        db.prepare("INSERT INTO identity_audit VALUES('provider:unlink',?,?,?)").bind(actor.operator.id, contract, now),
        ...(contract === 'oidc-provider@1' ? [revokeProviderSessions(now, "provider_id='auth'"), db.prepare('UPDATE identity_settings SET generation=generation+1 WHERE id=1')] : []),
      ];
    },
    async consumeLogout({ claims, link, now, fence }) {
      const iss = String(claims.iss), sid = typeof claims.sid === 'string' ? claims.sid : null, sub = typeof claims.sub === 'string' ? claims.sub : null;
      const rows = sid ? (await db.prepare('SELECT DISTINCT i.subject,s.operator_id FROM identity_sessions i JOIN sessions s ON s.id=i.session_id WHERE i.issuer=? AND i.sid=?').bind(iss, sid).all<{ subject: string; operator_id: string }>()).results : [];
      if (sid && (rows.length !== 1 || (sub && rows[0]!.subject !== sub))) return false;
      const subject = sub ?? rows[0]?.subject;
      const bound = subject ? await db.prepare('SELECT operator_id FROM identity_bindings WHERE issuer=? AND subject=?').bind(iss, subject).first<{ operator_id: string }>() : null;
      if (!bound) return false;
      try {
        await db.batch([
          guard(db, { sql: "EXISTS(SELECT 1 FROM rer_dependency_link WHERE interface='oidc-provider@1' AND issuer=? AND client_id=? AND metadata=? AND linked_at=? AND needs_relink=0)", args: [String(link.issuer), String(link.client_id), JSON.stringify(link.metadata), Number(link.linked_at)] }),
          guard(db, { sql: 'EXISTS(SELECT 1 FROM identity_bindings WHERE issuer=? AND subject=? AND operator_id=?)', args: [iss, subject!, bound.operator_id] }),
          db.prepare('INSERT INTO identity_logouts VALUES(?,?)').bind(iss, String(claims.jti)),
          // A fence event ends every session and minted credential of the person: advancing updated_at advances their authority version.
          ...(fence ? [db.prepare("UPDATE operators SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ',max(unixepoch(updated_at,'subsec')+0.001,?/1000.0),'unixepoch') WHERE id=?").bind(now, bound.operator_id)] : []),
          db.prepare('UPDATE sessions SET revoked_at=COALESCE(revoked_at,?) WHERE id IN (SELECT session_id FROM identity_sessions WHERE issuer=? AND subject=? AND (? IS NULL OR sid=?))').bind(iso(now), iss, subject!, sid, sid),
          clearGuards(db),
        ]);
        return true;
      } catch (cause) {
        if (refused(cause)) return false;
        throw cause;
      }
    },
  };
}
