import {nativeActorPredicate} from './authority';
import {deny,random} from './protocol';

export async function nativeAuthority(db:D1Database,actor:string){
 const state=await db.prepare(`SELECT ${nativeActorPredicate} AS allowed, EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AS restoring`).bind(actor).first<{allowed:number;restoring:number}>();
 if(state?.restoring)deny(503,'UNAVAILABLE');
 if(!state?.allowed)deny(403,'SCOPE_DENIED');
}

/** Commit administrative writes with the same current class as native consent. */
export async function nativeMutation(db:D1Database,actor:string,statements:D1PreparedStatement[]){
 const id=random();
 try{
  return await db.batch([
   db.prepare(`INSERT INTO delegation_guards(id,valid) SELECT ?,CASE WHEN ${nativeActorPredicate} AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') THEN 1 ELSE 0 END`).bind(id,actor),
   ...statements,
   db.prepare('DELETE FROM delegation_guards WHERE id=?').bind(id),
  ]);
 }catch(error){
  if(String(error).includes('delegation_guards')){await nativeAuthority(db,actor);deny(403,'SCOPE_DENIED');}
  throw error;
 }
}
