import type { AuthenticatedOperator } from '../identity';
import { actorFence, clearGuards, guard, version } from '../identity/store';
import { audit, RecordError } from '../records/shared';

export async function ownerEmailSettings(db:D1Database, actor:AuthenticatedOperator) {
 const owner=await db.prepare("SELECT id,email FROM operators WHERE setup_owner=1 AND status='active'").first<{id:string;email:string}>();
 return owner?{email:owner.email,editable:owner.id===actor.operatorId}:null;
}

/** Change only the current owner's identity, preserving the asking session and its kind. */
export async function updateOwnerEmail(db:D1Database, actor:AuthenticatedOperator, input:{email:string;currentEmail:string}) {
 const owner=await db.prepare(`SELECT email,updated_at,${version('o')} AS authority_version FROM operators o WHERE id=? AND setup_owner=1 AND status='active'`).bind(actor.operatorId).first<{email:string;updated_at:string;authority_version:number}>();
 if(!owner)throw new RecordError(403,'Only this installation’s owner can change their email.');
 const email=input.email.toLowerCase(),clock=Date.now(),now=new Date(clock).toISOString();
 const updatedAt=new Date(Math.max(Date.now(),Date.parse(owner.updated_at)+1)).toISOString();
 try {
  await db.batch([
   guard(db,actorFence({id:actor.sessionId,operator:{id:actor.operatorId,version:owner.authority_version}},clock)),
   guard(db,{sql:`EXISTS(SELECT 1 FROM operators o JOIN sessions s ON s.operator_id=o.id JOIN identity_sessions i ON i.session_id=s.id WHERE o.id=? AND o.setup_owner=1 AND o.status='active' AND o.email=? AND o.updated_at=? AND s.id=? AND (i.kind='dev' OR (i.proof_at>=? AND i.proof_at<=? AND i.proof_version=${version('o')})))`,args:[actor.operatorId,input.currentEmail.toLowerCase(),owner.updated_at,actor.sessionId,clock-600_000,clock]}),
   db.prepare('UPDATE operators SET email=?,updated_at=? WHERE id=?').bind(email,updatedAt,actor.operatorId),
   db.prepare('UPDATE owner_bootstrap SET email=? WHERE owner_id=?').bind(email,actor.operatorId),
   // Keep just the asking session; old email links and proofs lose authority.
   db.prepare(`UPDATE identity_sessions SET authority_version=(SELECT ${version('o')} FROM operators o WHERE o.id=?),proof_at=NULL,proof_version=NULL WHERE session_id=?`).bind(actor.operatorId,actor.sessionId),
   db.prepare('UPDATE sessions SET revoked_at=COALESCE(revoked_at,?) WHERE operator_id=? AND id<>?').bind(now,actor.operatorId,actor.sessionId),
   db.prepare('UPDATE identity_proofs SET revoked_at=COALESCE(revoked_at,?) WHERE operator_id=?').bind(clock,actor.operatorId),
   audit(db,actor.operatorId,'owner.email_changed','operator',actor.operatorId),
   clearGuards(db),
  ]);
 } catch(error) {
  if(String(error).includes('UNIQUE'))throw new RecordError(409,'An operator already uses this email.');
  if(/identity_guards|CHECK constraint/.test(String(error)))throw new RecordError(409,'The owner or session changed. Reload Settings before saving.');
  throw error;
 }
 return {email,updated:true};
}
