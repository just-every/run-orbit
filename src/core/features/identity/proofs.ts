import type { NativeProofPersistence } from '../../../../scripts/base-cli/modules/operator-auth/identity/email-link/index.mjs';
import { actorFence, clearGuards, guard, personFence, refused, version, type OrbitPerson, type OrbitRole, type SessionStore } from './store';

interface ProofRow { kind: 'magic' | 'step_up'; operator_id: string; authority_version: number; email: string; expires_at: number; return_to: string }

/**
 * Base's email-link and step-up persistence over identity_proofs. Consuming a
 * proof, rechecking current authority and issuing the session (or recording
 * the step-up proof) are one D1 batch; a refused guard aborts all of it.
 */
export function createNativeProofs(store: SessionStore): NativeProofPersistence<OrbitRole> {
  const { db } = store;
  const live = (hash: string, now: number, kind: ProofRow['kind']) => db.prepare(`SELECT r.* FROM identity_proofs r JOIN operators o ON o.id=r.operator_id
    WHERE r.hash=? AND r.kind=? AND r.used_at IS NULL AND r.revoked_at IS NULL AND r.expires_at>? AND o.status='active'
      AND ${version('o')}=r.authority_version AND lower(o.email)=r.email`).bind(hash, kind, now).first<ProofRow>();
  return {
    async limits(keys, now, windowMs) {
      return Promise.all(keys.map(async key => (await db.prepare(`INSERT INTO identity_limits (key,count,start) VALUES (?,1,?)
        ON CONFLICT(key) DO UPDATE SET count=CASE WHEN start<=? THEN 1 ELSE count+1 END,start=CASE WHEN start<=? THEN ? ELSE start END RETURNING count`)
        .bind(key, now, now - windowMs, now - windowMs, now).first<{ count: number }>())!.count));
    },
    async token(record) {
      const person = await store.person('o.id=?', record.operatorId);
      if (!person || person.status !== 'active' || person.version !== record.expectedVersion) return false;
      const fence = personFence(person);
      return (await db.prepare(`INSERT INTO identity_proofs (id,hash,kind,operator_id,authority_version,email,return_to,created_at,expires_at) SELECT ?,?,'magic',?,?,?,?,?,? WHERE ${fence.sql}`)
        .bind(record.id, record.hash, person.id, person.version, person.email, record.returnTo, record.now, record.expiresAt, ...fence.args).run()).meta.changes === 1;
    },
    async preview(digest, now) {
      const row = await live(digest, now, 'magic');
      return row ? { kind: 'magic', email: row.email, operatorId: row.operator_id, version: row.authority_version, expiresAt: row.expires_at, returnTo: row.return_to } : null;
    },
    async consumeLink({ digest, person, now, returnTo }) {
      // An email confirmation is itself a fresh app-local proof for step-up.
      return store.issue({ person: person as OrbitPerson, kind: 'native', now, returnTo, freshProof: true, statements: [
        db.prepare("UPDATE identity_proofs SET used_at=? WHERE hash=? AND kind='magic' AND operator_id=? AND authority_version=? AND email=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>?")
          .bind(now, digest, person.id, person.version, person.email, now),
        guard(db, { sql: 'changes()=1', args: [] }),
      ] });
    },
    revokeLink: (id, now) => db.prepare('UPDATE identity_proofs SET revoked_at=COALESCE(revoked_at,?) WHERE id=?').bind(now, id).run(),
    async stepUpPreview(digest, now) {
      const row = await live(digest, now, 'step_up');
      return row ? { expiresAt: row.expires_at } : null;
    },
    async stepUpChallenge(record, actor) {
      const fence = actorFence(actor, record.now);
      return (await db.prepare(`INSERT INTO identity_proofs (id,hash,kind,operator_id,authority_version,email,session_id,action,return_to,created_at,expires_at) SELECT ?,?,'step_up',?,?,?,?,?,?,?,? WHERE ${fence.sql}`)
        .bind(record.id, record.hash, actor.operator.id, actor.operator.version, actor.operator.email, actor.id, record.action, record.returnTo, record.now, record.expiresAt, ...fence.args).run()).meta.changes === 1;
    },
    async consumeStepUp(digest, actor, now) {
      try {
        const results = await db.batch([
          guard(db, actorFence(actor, now)),
          db.prepare("UPDATE identity_proofs SET used_at=? WHERE hash=? AND kind='step_up' AND operator_id=? AND authority_version=? AND session_id=? AND email=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>? RETURNING action, return_to AS returnTo")
            .bind(now, digest, actor.operator.id, actor.operator.version, actor.id, actor.operator.email, now),
          guard(db, { sql: 'changes()=1', args: [] }),
          // A pre-upgrade session gains a provenance row only to hold its proof; its kind stays NULL.
          db.prepare('INSERT INTO identity_sessions (session_id,proof_at,proof_version) VALUES (?,?,?) ON CONFLICT(session_id) DO UPDATE SET proof_at=excluded.proof_at,proof_version=excluded.proof_version').bind(actor.id, now, actor.operator.version),
          clearGuards(db),
        ]);
        return (results[1]!.results[0] as { action: never; returnTo: string } | undefined) ?? null;
      } catch (cause) {
        if (refused(cause)) return null;
        throw cause;
      }
    },
    revokeStepUp: (id, now) => db.prepare('UPDATE identity_proofs SET revoked_at=COALESCE(revoked_at,?) WHERE id=?').bind(now, id).run(),
    async steppedUp(actor, since, now) {
      const fence = actorFence(actor, now);
      return !!await db.prepare(`SELECT 1 FROM identity_sessions WHERE session_id=? AND proof_at>=? AND proof_at<=? AND proof_version=? AND ${fence.sql}`)
        .bind(actor.id, since, now, actor.operator.version, ...fence.args).first();
    },
  };
}
