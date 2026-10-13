import {currentGrant,guard} from './authority';
import {nativeAuthority} from './native-authority';
import {handoffContent,snapshot} from './evidence';
import {deny,revision,random,scoped,type Effect,type Grant} from './protocol';
export async function receipt(db:D1Database,g:Grant,key:string){
 await currentGrant(db,g.id,g);
 const stored=await db.prepare('SELECT * FROM delegation_receipts WHERE client_id=? AND principal_id=? AND account_id=? AND operation_key=?').bind(g.client_id,g.principal_id,g.account_id,key).first<{target:string;receipt_json:string;request_hash:string}>();
 if(!stored)deny(404,'OPERATION_NOT_FOUND');scoped(g,stored!.target,'crm.handoff.write');
 const now=await snapshot(db,stored!.target);await currentGrant(db,g.id,g);
 return {state:'confirmed' as const,receipt:JSON.parse(stored!.receipt_json),observed:{target:stored!.target,revision:now.revision,content:handoffContent(now.value.handoff as Record<string,unknown>),observedAt:new Date().toISOString()}};
}
export async function writeHandoff(db:D1Database,input:Effect,identity:{grant?:Grant;actor:string}){
 const {grant:g,actor}=identity;
 if(g){await currentGrant(db,g.id,g);scoped(g,input.target,'crm.handoff.write');}else await nativeAuthority(db,actor);
 const requestHash=await revision({operation:input.operation,target:input.target,expectedRevision:input.expectedRevision,expectedAudienceRevision:input.expectedAudienceRevision,content:input.content});
 if(g){const previous=await db.prepare('SELECT request_hash FROM delegation_receipts WHERE client_id=? AND principal_id=? AND account_id=? AND operation_key=?').bind(g.client_id,g.principal_id,g.account_id,input.operationKey).first<{request_hash:string}>();if(previous){if(previous.request_hash!==requestHash)deny(409,'OPERATION_CONFLICT');return receipt(db,g,input.operationKey);}}
 if(!/^opportunities\/[^/]+\/handoffs\/[^/]+$/.test(input.target))deny(422,'UNSUPPORTED_OPERATION');
 const before=await snapshot(db,input.target,true);
 if(before.revision!==input.expectedRevision)deny(409,'REVISION_CONFLICT');
 if(before.audience.audienceRevision!==input.expectedAudienceRevision)deny(409,'AUDIENCE_CHANGED');
 if((before.value.opportunity as Record<string,unknown>).lifecycle!=='open')deny(409,'REVISION_CONFLICT');
 if(input.content.assigneeId&&!before.audience.principalIds.includes(input.content.assigneeId))deny(400,'INVALID_REQUEST');
 const now=new Date().toISOString(),id=random(),parts=input.target.split('/'),old=before.value.handoff as Record<string,unknown>|null;
 const task={id:parts[3],opportunity_id:parts[1],title:input.content.title,description:input.content.description,assignee_id:input.content.assigneeId,due_at:input.content.dueAt,status:input.content.status,source_client_id:g?.client_id??null,actor_id:actor,revision:random(),created_at:old?.created_at??now,updated_at:now};
 const afterRevision=await revision({...before.value,handoff:task});
 const record={id,operationKey:input.operationKey,requestHash,provider:'orbit',installationId:before.installationId,accountId:'workspace',principalId:actor,operation:input.operation,target:input.target,beforeRevision:before.revision,afterRevision,committedAt:now};
 const statements=[guard(db,id,before.epoch,g,actor),db.prepare(`INSERT INTO handoff_tasks(id,opportunity_id,title,description,assignee_id,due_at,status,source_client_id,actor_id,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,assignee_id=excluded.assignee_id,due_at=excluded.due_at,status=excluded.status,source_client_id=excluded.source_client_id,actor_id=excluded.actor_id,revision=excluded.revision,updated_at=excluded.updated_at`).bind(...Object.values(task)),db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,'handoff.updated',?,?,'operator',?,'orbit-handoff',?)").bind(id,now,now,actor,JSON.stringify({handoffId:task.id,status:task.status,assigneeId:task.assignee_id,dueAt:task.due_at,sourceClientId:task.source_client_id})),db.prepare("INSERT INTO timeline_entry_records VALUES(?,'opportunity',?)").bind(id,task.opportunity_id)];
 statements.push(db.prepare('INSERT OR IGNORE INTO handoff_contacts(handoff_id,contact_id) SELECT ?,contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(task.id,task.opportunity_id));
 if(g)statements.push(db.prepare('INSERT INTO delegation_receipts VALUES(?,?,?,?,?,?,?,?)').bind(id,g.client_id,g.principal_id,g.account_id,input.operationKey,input.target,requestHash,JSON.stringify(record)));
 statements.push(db.prepare('DELETE FROM delegation_guards WHERE id=?').bind(id));
 try{await db.batch(statements);}catch(error){if(g){const existing=await db.prepare('SELECT request_hash FROM delegation_receipts WHERE client_id=? AND principal_id=? AND account_id=? AND operation_key=?').bind(g.client_id,g.principal_id,g.account_id,input.operationKey).first<{request_hash:string}>();if(existing){if(existing.request_hash!==requestHash)deny(409,'OPERATION_CONFLICT');return receipt(db,g,input.operationKey);}}if(String(error).includes('delegation_guards'))deny(409,'REVISION_CONFLICT');throw error;}
 if(g)await currentGrant(db,g.id,g);else await nativeAuthority(db,actor);
 return {state:'confirmed' as const,receipt:record,observed:{target:input.target,revision:afterRevision,content:input.content,observedAt:now}};
}
