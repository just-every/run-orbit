import {recordSource} from '../ownership/storage';
import {createId} from '../../shared/ids';
import {audit,RecordError,timeline} from '../records/shared';
import {taskHandoverStatements,TaskError} from '../tasks';
import {prepareOwnerChange,recordSnapshotCondition} from '../ownership/changes';
import {ownerNotificationStatements} from '../ownership/notifications';
import {removalInventory} from './removal-inventory';
import {clearRemovalGuards,removalAuthority,removalGuard,removalRowGuard} from './removal-guards';
export {removalReview} from './removal-inventory';
export interface RemovalChoices {review:string;opportunities:string|null;contacts:string|null;companies:string|null;tasks:string|null;handoffs:string|null}
const sets=['opportunities','contacts','companies','tasks','handoffs'] as const;

export async function removeWithHandover(db:D1Database,id:string,actor:string,choices?:RemovalChoices,sessionId?:string){
 const inventory=await removalInventory(db,id);
 if(inventory.operator.status!=='active')throw new RecordError(409,'This operator is already removed.');
 if(inventory.operator.setup_owner&&id!==actor)throw new RecordError(409,'Only the setup operator can remove themselves.');
 if(inventory.operator.setup_owner&&!await db.prepare("SELECT id FROM operators WHERE status='active' AND id<>? AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id) LIMIT 1").bind(id).first())throw new RecordError(409,'Establish another active administrator before removing the setup owner.');
 if(sets.some(set=>inventory[set].length&&(!choices||!Object.hasOwn(choices,set)||choices[set]===undefined)))throw new RecordError(409,'Review owned work and choose a receiving operator or explicit unassignment for each set before removal.');
 if(choices&&choices.review!==inventory.review)throw new RecordError(409,'Owned work changed. Reload the removal review.');
 const destinations={opportunities:choices?.opportunities??null,contacts:choices?.contacts??null,companies:choices?.companies??null,tasks:choices?.tasks??null,handoffs:choices?.handoffs??null};
 for(const target of new Set(Object.values(destinations)))if(target&&(target===id||!await db.prepare("SELECT id FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)").bind(target).first()))throw new RecordError(409,'Choose another active full operator or explicit unassignment.');
 const now=new Date().toISOString(),operation=createId(),guard=(condition:string,...values:unknown[])=>removalGuard(db,condition,...values);
 const statements=[...await removalAuthority(db,actor,sessionId),removalRowGuard(db,'operators',inventory.operator)];
 if(inventory.operator.setup_owner)statements.push(guard("EXISTS(SELECT 1 FROM operators WHERE status='active' AND id<>? AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id))",id));
 for(const target of new Set(Object.values(destinations)))if(target)statements.push(guard("EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id))",target));
 for(const [set,kind]of [['opportunities','opportunity'],['contacts','contact'],['companies','company']]as const){
  statements.push(guard(`(SELECT count(*) FROM ${recordSource(kind)} WHERE owner_id=?${set==='opportunities'?" AND lifecycle='open'":''})=?`,id,inventory[set].length));
  for(const row of inventory[set]){const snapshot=recordSnapshotCondition(kind,row);statements.push(guard(snapshot.sql,...snapshot.bindings));}
 }
 statements.push(guard("(SELECT count(*) FROM handoff_tasks WHERE assignee_id=? AND status='open')=?",id,inventory.handoffs.length));
 const changes=[];
 for(const [set,kind]of [['opportunities','opportunity'],['contacts','contact'],['companies','company']]as const)for(const row of inventory[set]){
  const prepared=await prepareOwnerChange(db,{kind,id:row.id,ownerId:destinations[set],actorId:actor,source:'Operator removal handover',operationId:operation,notify:false});
  statements.push(...prepared.statements);if(prepared.change)changes.push(prepared.change);
 }
 try{statements.push(...await taskHandoverStatements(db,{fromOwnerId:id,toOwnerId:destinations.tasks,actorId:actor,operationId:operation,reviewedTasks:inventory.tasks.map(task=>({id:task.id,revision:task.revision}))}));}catch(error){if(error instanceof TaskError)throw new RecordError(error.status===403?403:409,error.message);throw error;}
 for(const task of inventory.handoffs)statements.push(guard("EXISTS(SELECT 1 FROM handoff_tasks WHERE id=? AND assignee_id=? AND revision=? AND status='open')",task.id,id,task.revision),db.prepare('UPDATE handoff_tasks SET assignee_id=?,revision=?,updated_at=? WHERE id=?').bind(destinations.handoffs,createId(),now,task.id),...timeline(db,actor,'opportunity',task.opportunity_id,'task.reassigned',{taskId:task.id,previous:id,current:destinations.handoffs,reason:'Operator removal handover'},now));
 statements.push(...await ownerNotificationStatements(db,{actorId:actor,operationId:operation,source:'Operator removal handover',changes}),
  db.prepare("UPDATE outbound_messages SET state='cancelled',failure='Operator removed',updated_at=? WHERE operator_id=? AND state='scheduled'").bind(now,id),
  db.prepare('UPDATE sessions SET revoked_at=? WHERE operator_id=? AND revoked_at IS NULL').bind(now,id),
  db.prepare('UPDATE identity_proofs SET revoked_at=COALESCE(revoked_at,?) WHERE operator_id=?').bind(Date.parse(now),id),
  db.prepare("UPDATE operators SET status='removed',updated_at=? WHERE id=?").bind(now,id),
  audit(db,actor,'operator.removed','operator',id,{operation,choices:destinations,...Object.fromEntries(sets.map(set=>[set,inventory[set].map(row=>row.id)])),scheduledCancelled:inventory.scheduledMessages.length}),
  clearRemovalGuards(db),db.prepare('DELETE FROM sales_task_guards'));
 try{await db.batch(statements);}catch(error){if(/runtime_controls.value|sales_task_revision|sales_task_authority/.test(String(error)))throw new RecordError(409,'Owned work or access changed. Reload the removal review.');throw error;}
 return {removed:true};
}
