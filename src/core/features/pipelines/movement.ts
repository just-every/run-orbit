import {audit,mutationJob,RecordError,requireRecord,timeline} from '../records/shared';
import {stageChangedReason} from '../outreach/stop-reason';
import {assertRequiredFields,stagePolicy,stagePolicyFence,type StagePolicy} from './stage-policy';
export function movementPayload(previous:StagePolicy,current:StagePolicy){return {
 previous:previous.stage_id,current:current.stage_id,
 previousPipelineId:previous.pipeline_id,previousPipelineName:previous.pipeline_name,previousStageName:previous.stage_name,
 currentPipelineId:current.pipeline_id,currentPipelineName:current.pipeline_name,currentStageName:current.stage_name,
 text:`Moved from ${previous.pipeline_name} / ${previous.stage_name} to ${current.pipeline_name} / ${current.stage_name}`
};}
export async function moveOpportunity(db:D1Database,id:string,stageId:string,reviewedStageId:string,actor:string){
 const deal=await requireRecord(db,'opportunity',id);
 if(deal.stage_id!==reviewedStageId)throw new RecordError(409,'The opportunity moved since you reviewed it. Reload before moving.');
 const [previous,current,contacts]=await Promise.all([
  stagePolicy(db,deal.stage_id),stagePolicy(db,stageId),
  db.prepare('SELECT contact_id,is_primary FROM opportunity_contacts WHERE opportunity_id=? ORDER BY contact_id').bind(id).all<{contact_id:string;is_primary:number}>()
 ]);
 assertRequiredFields(current,{...deal,contact_ids:contacts.results.map(contact=>contact.contact_id),primary_contact_id:contacts.results.find(contact=>contact.is_primary)?.contact_id??null});
 if(previous.stage_id===current.stage_id)return {id};
 const now=new Date().toISOString(),payload=movementPayload(previous,current);
 try{await db.batch([
  ...stagePolicyFence(db,[previous,current],{id,stage_id:deal.stage_id,updated_at:deal.updated_at}),
  db.prepare('UPDATE opportunities SET stage_id=?,updated_at=? WHERE id=?').bind(stageId,now,id),
  db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Opportunity stage changed',updated_at=? WHERE opportunity_id=?").bind(now,id),
  db.prepare("UPDATE outbound_messages SET state='cancelled',failure=?,updated_at=? WHERE opportunity_id=? AND state='scheduled'").bind(stageChangedReason,now,id),
  mutationJob(db,id,actor,'Opportunity stage changed'),...timeline(db,actor,'opportunity',id,'stage.changed',payload,now),audit(db,actor,'stage.changed','opportunity',id,payload)
 ]);}catch(error){if(/runtime_controls.value|FOREIGN KEY constraint/.test(String(error)))throw new RecordError(409,'The opportunity or pipeline rules changed. Reload before moving.');throw error;}
 return {id};
}
export function movementHistory(entries:Record<string,unknown>[]){return entries.filter(entry=>entry.kind==='stage.changed').map(entry=>{
 const payload=JSON.parse(String(entry.payload_json));
 return {id:entry.id,occurred_at:entry.occurred_at,actor_id:entry.actor_id,actor_name:entry.actor_name,...payload};
});}
