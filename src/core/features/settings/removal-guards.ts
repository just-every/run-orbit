import {createId} from '../../shared/ids';
import {actorFence,version} from '../identity/store';
import {RecordError} from '../records/shared';

export const removalGuard=(db:D1Database,condition:string,...values:unknown[])=>db.prepare(`INSERT INTO runtime_controls(name,value) SELECT ?,CASE WHEN ${condition} THEN 'valid' ELSE NULL END`).bind(`handover_${createId()}`,...values);

/** Table names and columns come only from native database queries, never request input. */
export function removalRowGuard(db:D1Database,table:string,row:Record<string,string|number|null>){
 const entries=Object.entries(row);
 return removalGuard(db,`EXISTS(SELECT 1 FROM ${table} WHERE ${entries.map(([key])=>`"${key.replaceAll('"','""')}" IS ?`).join(' AND ')})`,...entries.map(([,value])=>value));
}

export async function removalAuthority(db:D1Database,actor:string,sessionId?:string){
 const statements=[removalGuard(db,"EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))",actor)];
 if(sessionId){
  const person=await db.prepare(`SELECT ${version('o')} AS version FROM operators o WHERE id=?`).bind(actor).first<{version:number}>();
  if(!person)throw new RecordError(403,'An active full operator must review this removal.');
  const fence=actorFence({id:sessionId,operator:{id:actor,version:person.version}},Date.now());
  statements.push(removalGuard(db,fence.sql,...fence.args));
 }
 return statements;
}
export const clearRemovalGuards=(db:D1Database)=>db.prepare("DELETE FROM runtime_controls WHERE name LIKE 'handover_%'");
