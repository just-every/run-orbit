import type {FormDefinition} from './definition';
import {createId} from '../../shared/ids';
import {RecordError} from '../records/shared';
const active="status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)";
export async function validateFormAssignment(db:D1Database,form:FormDefinition){
 const ids=form.assignment?.operatorIds??[];if(!ids.length)return;
 const available=(await db.prepare(`SELECT id FROM operators WHERE ${active} AND id IN(SELECT value FROM json_each(?))`).bind(JSON.stringify(ids)).all<{id:string}>()).results;
 if(available.length!==ids.length)throw new RecordError(400,'Select active full operators for form assignment.');
}
/** Retain an existing owner. Otherwise choose from the exact reviewed user list. */
export async function formAssignment(db:D1Database,form:FormDefinition,formId:string,contactId:string,existing:boolean,at:string){
 const previous=existing?await db.prepare("SELECT owner_id,revision FROM record_ownership WHERE record_type='contact' AND record_id=?").bind(contactId).first<{owner_id:string|null;revision:number}>():null;
 const guard=crypto.randomUUID(),statements:D1PreparedStatement[]=[db.prepare("INSERT INTO access_write_guards VALUES(?,CASE WHEN COALESCE((SELECT revision FROM record_ownership WHERE record_type='contact' AND record_id=?),0)=? THEN 1 ELSE 0 END)").bind(guard,contactId,previous?.revision??0),db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(guard)];
 if(previous?.owner_id)return {ownerId:previous.owner_id,reason:'Kept existing contact owner',statements,changed:false};
 const config=form.assignment??{mode:'unassigned' as const,operatorIds:[]},available=(await db.prepare(`SELECT id FROM operators WHERE ${active} AND id IN(SELECT value FROM json_each(?)) ORDER BY id`).bind(JSON.stringify(config.operatorIds)).all<{id:string}>()).results.map(row=>row.id),ordered=config.operatorIds.filter(id=>available.includes(id));
 let ownerId:string|null=null,reason='Unassigned form queue';
 if(config.mode==='fixed'){ownerId=ordered[0]??null;reason=ownerId?'Reviewed fixed form owner':'Fixed owner unavailable; unassigned form queue';}
 if(config.mode==='round_robin'){
  const cursor=await db.prepare('SELECT last_operator_id,revision FROM form_assignment_rotation WHERE form_id=?').bind(formId).first<{last_operator_id:string|null;revision:number}>();
  if(ordered.length){const last=cursor?.last_operator_id?config.operatorIds.indexOf(cursor.last_operator_id):-1;ownerId=Array.from({length:config.operatorIds.length},(_,i)=>config.operatorIds[(last+1+i)%config.operatorIds.length]).find(id=>ordered.includes(id))??null;reason='Reviewed form round robin';}
  else reason='No active rotation member; unassigned form queue';
  const fence=`form_rotation_${crypto.randomUUID()}`;statements.push(db.prepare("INSERT INTO runtime_controls(name,value) SELECT ?,CASE WHEN COALESCE((SELECT revision FROM form_assignment_rotation WHERE form_id=?),0)=? THEN 'valid' ELSE NULL END").bind(fence,formId,cursor?.revision??0),db.prepare('DELETE FROM runtime_controls WHERE name=?').bind(fence));
  statements.push(db.prepare('INSERT INTO form_assignment_rotation VALUES(?,?,1,?) ON CONFLICT(form_id) DO UPDATE SET last_operator_id=excluded.last_operator_id,revision=form_assignment_rotation.revision+1,updated_at=excluded.updated_at').bind(formId,ownerId,at));
 }
 if(config.operatorIds.length){const fence=crypto.randomUUID();statements.push(db.prepare(`INSERT INTO access_write_guards VALUES(?,CASE WHEN (SELECT json_group_array(id) FROM(SELECT id FROM operators WHERE ${active} AND id IN(SELECT value FROM json_each(?)) ORDER BY id))=? THEN 1 ELSE 0 END)`).bind(fence,JSON.stringify(config.operatorIds),JSON.stringify(available)),db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(fence));}
 // Save explicit unassignment too, so a legacy owner can never reappear later.
 statements.push(db.prepare("INSERT INTO record_ownership VALUES('contact',?,?,1,?) ON CONFLICT(record_type,record_id) DO UPDATE SET owner_id=excluded.owner_id,revision=record_ownership.revision+1,updated_at=excluded.updated_at").bind(contactId,ownerId,at));
 if(ownerId)statements.push(db.prepare("INSERT INTO record_ownership_history(id,record_type,record_id,previous_owner_id,owner_id,actor_id,batch_id,action,revision,occurred_at) SELECT ?,'contact',?,NULL,?,NULL,NULL,'assigned',revision,? FROM record_ownership WHERE record_type='contact' AND record_id=?").bind(createId(),contactId,ownerId,at,contactId));
 return {ownerId,reason,statements,changed:true};
}
export function formAssignmentTimeline(db:D1Database,contactId:string,submissionId:string,ownerId:string|null,reason:string,source:string,at:string){const entry=createId();return [db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,'form.assignment',?,?,'source',NULL,?,?)").bind(entry,at,at,source,JSON.stringify({submissionId,ownerId,reason})),db.prepare("INSERT INTO timeline_entry_records VALUES(?,'contact',?)").bind(entry,contactId)];}
export function formSubmissionNotice(db:D1Database,submissionId:string,ownerId:string|null,opportunityId:string|null,at:string){
 if(!ownerId)return [];
 return [db.prepare(`INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at) SELECT ?,?,?,?,'form.submitted','Form enquiry received',? FROM operators WHERE id=? AND ${active}`).bind(createId(),ownerId,opportunityId,`form:${submissionId}`,at,ownerId)];
}
