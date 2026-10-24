import {typedFieldFences} from '../records/typed-fields';
import {assertRequiredFields,stagePolicy,stagePolicyFence} from '../pipelines/stage-policy';
import {createId} from '../../shared/ids';
import {RecordError} from '../records/shared';
import type {FormDefinition} from './definition';
export async function formOpportunity(db:D1Database,form:FormDefinition,values:Record<string,any>,input:{newContact:boolean;contactId:string;companyId:string|null;ownerId:string|null;email:string;name?:string;at:string}){
 // Existing deals are never overwritten or multiplied by another enquiry.
 if(form.createOpportunity===false||!input.newContact)return {id:null,statements:[]};
 const stageId=form.opportunity?.stageId??await db.prepare('SELECT id FROM pipeline_stages ORDER BY position LIMIT 1').first<string>('id');
 if(!stageId)throw new RecordError(409,'Select a pipeline stage before capturing a deal.');
 const policy=await stagePolicy(db,stageId);if(form.opportunity?.pipelineId&&policy.pipeline_id!==form.opportunity.pipelineId)throw new RecordError(409,'The selected form stage no longer belongs to its reviewed pipeline.');
 const id=createId(),deal={...values,title:values.title??`Enquiry from ${input.name||input.email}`,stage_id:stageId,owner_id:input.ownerId,company_id:input.companyId,value_cents:values.value_cents??0,contact_ids:[input.contactId],primary_contact_id:input.contactId};assertRequiredFields(policy,deal);
 return{id,statements:[...await typedFieldFences(db,'opportunity',id,values.custom_fields??{},{}),...stagePolicyFence(db,[policy]),db.prepare("INSERT INTO opportunities(id,title,lifecycle,stage_id,owner_id,company_id,value_cents,expected_close_at,custom_fields_json,score,band,queue_state,queue_reason,created_at,updated_at) VALUES(?,?,'open',?,?,?,?,?,?,0,'low','now','Form submitted',?,?)").bind(id,deal.title,stageId,input.ownerId,input.companyId,deal.value_cents,values.expected_close_at??null,JSON.stringify(values.custom_fields??{}),input.at,input.at),db.prepare('INSERT INTO opportunity_contacts(opportunity_id,contact_id,is_primary,created_at) VALUES(?,?,1,?)').bind(id,input.contactId,input.at)]};
}
