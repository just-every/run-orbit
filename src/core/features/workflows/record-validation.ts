import {schemas} from '../records/schema';
import {RecordError,type RecordKind} from '../records/shared';
import {fieldReason,type TypedField} from '../records/typed-fields';
import {stagePolicy} from '../pipelines/stage-policy';
import {targetKind} from './record-targets';
import {canonicalField,customKey,recordKind,type WorkflowRecordAction} from './record-types';

export const nativeFields={
 contact:['name','email','phone','job_title','timezone','company_id','contactability'],
 company:['name','primary_domain'],
 opportunity:['title','stage_id','owner_id','company_id','value_cents','expected_close_at','lifecycle']
} satisfies Record<RecordKind,string[]>;
export async function assertWorkflowActor(db:D1Database,actorId:string){
 if(!await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)").bind(actorId).first())throw new RecordError(403,'Workflow authority was revoked; needs re-activation.');
}
export async function workflowField(db:D1Database,kind:RecordKind,raw:string){
 const field=canonicalField(raw),key=customKey(field);
 if(key===null){
  if(!(nativeFields[kind] as string[]).includes(field))throw new RecordError(400,`Unsupported workflow field: ${field}.`);
  return {field,type:field==='value_cents'?'number':field==='expected_close_at'?'datetime':'text',definition:null};
 }
 const definition=await db.prepare('SELECT * FROM record_custom_fields WHERE kind=? AND field_key=?').bind(kind,key).first<TypedField>();
 if(!definition||definition.archived)throw new RecordError(400,`Workflow field ${field} is unavailable or archived.`);
 return {field,type:definition.value_type,definition};
}
export async function validateAction(db:D1Database,actorId:string,action:WorkflowRecordAction,triggerType:string){
 await assertWorkflowActor(db,actorId);
 const trigger=recordKind(triggerType),kind=targetKind(trigger,action.target);
 if(action.kind==='create_record'){
  if(recordKind(action.recordType??'opportunity')!=='opportunity')throw new RecordError(400,'Native workflows currently create associated deals only.');
  if(!action.pipelineId||!action.stage)throw new RecordError(400,'Choose a pipeline and stage for the new deal.');
  if((await stagePolicy(db,action.stage)).pipeline_id!==action.pipelineId)throw new RecordError(400,'The new deal stage does not belong to the named pipeline.');
  const values=action.values??{};
  const allowed=['title','stage_id','owner_id','company_id','value_cents','expected_close_at','contact_ids','primary_contact_id','custom_fields'];
  for(const field of Object.keys(values))if(!allowed.includes(field))throw new RecordError(400,`Unsupported new deal field: ${field}.`);
  if(values.stage_id!==undefined&&values.stage_id!==action.stage)throw new RecordError(400,'The new deal has conflicting stages.');
  return;
 }
 const field=action.kind==='move_stage'?'stage_id':action.field;
 if(!field)throw new RecordError(400,'Name the workflow field.');
 const spec=await workflowField(db,kind,field);
 if(action.kind==='move_stage'){
  if(kind!=='opportunity'||!action.stage)throw new RecordError(400,'Choose a deal stage.');
  const policy=await stagePolicy(db,action.stage);
  if(action.pipelineId&&policy.pipeline_id!==action.pipelineId)throw new RecordError(400,'The stage does not belong to the named pipeline.');
 }
 if(spec.field==='contactability'&&(action.kind!=='set'||action.value!=='do_not_contact'))throw new RecordError(400,'Workflows can only set Do not contact; permission and consent cannot be granted.');
 if(['add','subtract'].includes(action.kind)&&(spec.type!=='number'||typeof action.value!=='number'||!Number.isFinite(action.value)))throw new RecordError(400,`${field}: arithmetic requires a finite number and a numeric field.`);
 if(action.kind==='stamp'&&(!['date','datetime'].includes(spec.type)||!Number.isSafeInteger(action.offsetDays??0)))throw new RecordError(400,`${field}: stamps require a date field and a whole-day offset.`);
 if(action.kind==='set'&&spec.definition){const reason=fieldReason(spec.definition,action.value);if(reason)throw new RecordError(400,`${field}: ${reason}.`);}
 if((action.kind==='set'||action.kind==='clear')&&!spec.definition){
  const value=action.kind==='clear'?null:action.value;
  if(spec.field==='lifecycle'){
   if(!['open','won','lost'].includes(String(value)))throw new RecordError(400,'Choose an open, won or lost lifecycle.');
  }else{
   const schema=schemas[kind].shape as Record<string,{safeParse:(value:unknown)=>{success:boolean}}>;
   if(!schema[spec.field]?.safeParse(value).success)throw new RecordError(400,`${field}: incompatible field value.`);
  }
 }
 if(action.kind==='copy'){
  if(!action.sourceField)throw new RecordError(400,'Name the source field.');
  if(action.sourceTarget!=='form'){
   const source=await workflowField(db,targetKind(trigger,action.sourceTarget),action.sourceField);
   const stringLike=['text','picklist','date','datetime'];
   if(source.type!==spec.type&&!(['text','number'].includes(source.type)&&['text','number'].includes(spec.type))&&!(stringLike.includes(source.type)&&spec.type==='text')&&!(source.type==='text'&&spec.type==='picklist')&&!(source.type==='datetime'&&spec.type==='date'))throw new RecordError(400,`Cannot copy ${source.type} into ${spec.type}.`);
  }
 }
}
export function recordInput(kind:RecordKind,row:Record<string,unknown>){
 const values:Record<string,unknown>={custom_fields:JSON.parse(String(row.custom_fields_json??'{}'))};
 for(const field of nativeFields[kind])if(field!=='lifecycle'&&field in row)values[field]=row[field];
 return values;
}
export function validateRecordInput(kind:RecordKind,input:Record<string,unknown>){
 const result=schemas[kind].safeParse(input);
 if(!result.success)throw new RecordError(400,result.error.issues.map(issue=>issue.message).join(' '));
 return result.data;
}
