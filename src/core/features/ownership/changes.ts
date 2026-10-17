import {createId} from '../../shared/ids';
import {RecordError,requireRecord,tables,timeline,type RecordKind} from '../records/shared';
import {ownerNotificationStatements} from './notifications';
export interface OwnerChange {kind:RecordKind;id:string;name:string;previousOwnerId:string|null;previousOwnerName:string|null;ownerId:string|null;ownerName:string|null}
export interface OwnerHistory extends OwnerChange {actorId:string;source?:string;operationId?:string;occurredAt?:string;condition?:{sql:string;bindings:unknown[]}}
export function ownerGuard(db:D1Database,sql:string,bindings:unknown[]=[]){const id=`owner_${createId()}`;return [db.prepare(`INSERT INTO runtime_controls(name,value) SELECT ?,CASE WHEN ${sql} THEN 'valid' ELSE NULL END`).bind(id,...bindings),db.prepare('DELETE FROM runtime_controls WHERE name=?').bind(id)];}
export const fullOperatorSql="EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id))";
export function ownerAuthorityFence(db:D1Database,actorId:string,ownerId:string|null,sessionId?:string|null){return [...ownerGuard(db,fullOperatorSql,[actorId]),...(ownerId?ownerGuard(db,fullOperatorSql,[ownerId]):[]),...(sessionId?ownerGuard(db,"EXISTS(SELECT 1 FROM sessions WHERE id=? AND operator_id=? AND revoked_at IS NULL AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))",[sessionId,actorId]):[])];}
export function recordSnapshotCondition(kind:RecordKind,row:Record<string,any>){const fields=Object.keys(row);return {sql:`EXISTS(SELECT 1 FROM ${tables[kind]} WHERE ${fields.map(field=>`"${field.replaceAll('"','""')}" IS ?`).join(' AND ')})`,bindings:fields.map(field=>row[field])};}
export async function ownerName(db:D1Database,id:string|null){return id?(await db.prepare('SELECT display_name FROM operators WHERE id=?').bind(id).first<{display_name:string}>())?.display_name??null:null;}
export async function requireOwner(db:D1Database,id:string|null){if(id&&!await db.prepare(`SELECT 1 WHERE ${fullOperatorSql}`).bind(id).first())throw new RecordError(409,'Owner must be an active full operator.');return ownerName(db,id);}
export function ownerHistoryStatements(db:D1Database,input:Omit<OwnerHistory,'name'> & {name?:string}){
 if(input.previousOwnerId===input.ownerId)return [];
 const payload={previous:input.previousOwnerId,current:input.ownerId,previousOwnerId:input.previousOwnerId,previousOwnerName:input.previousOwnerName,ownerId:input.ownerId,ownerName:input.ownerName,source:input.source??'Operator',...(input.operationId?{operationId:input.operationId}:{})};
 const now=input.occurredAt??new Date().toISOString();
 if(!input.condition)return timeline(db,input.actorId,input.kind,input.id,'owner.changed',payload,now);
 const event=createId(),condition=input.condition;
 return [db.prepare(`INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) SELECT ?,'owner.changed',?,?,'operator',?,'records',? WHERE ${condition.sql}`).bind(event,now,now,input.actorId,JSON.stringify(payload),...condition.bindings),db.prepare('INSERT INTO timeline_entry_records SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM timeline_entries WHERE id=?)').bind(event,input.kind,input.id,event)];
}
export async function prepareOwnerChange(db:D1Database,input:{kind:RecordKind;id:string;ownerId:string|null;actorId:string;source?:string;operationId?:string;notify?:boolean}){
 const before=await requireRecord(db,input.kind,input.id),name=await requireOwner(db,input.ownerId),previous=await ownerName(db,before.owner_id??null),now=new Date().toISOString();
 const change:OwnerChange={kind:input.kind,id:input.id,name:before.name??before.title??before.email??input.id,previousOwnerId:before.owner_id??null,previousOwnerName:previous,ownerId:input.ownerId,ownerName:name};
 const snapshot=recordSnapshotCondition(input.kind,before),statements=[...ownerAuthorityFence(db,input.actorId,input.ownerId),...ownerGuard(db,snapshot.sql,snapshot.bindings)];
 if(change.previousOwnerId!==input.ownerId){statements.push(db.prepare(`UPDATE ${tables[input.kind]} SET owner_id=?,updated_at=? WHERE id=?`).bind(input.ownerId,now,input.id),...ownerHistoryStatements(db,{...change,...input,occurredAt:now}));if(input.notify!==false)statements.push(...await ownerNotificationStatements(db,{actorId:input.actorId,operationId:input.operationId??createId(),source:input.source,changes:[change]}));}
 return {statements,change};
}
