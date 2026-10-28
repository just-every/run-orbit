import {contactRelated,fieldContactOrigins,rememberPlanOrigins} from './provenance';
import {createId} from '../../shared/ids';
import {payloadHash} from '../../platform/source-security';
import {RecordError,requireRecord,type RecordKind} from '../records/shared';
import {RecordsRepository} from '../records/repository';
import {typedFieldSave,fieldReason,normalizedTypedFields} from '../records/typed-fields';
import {assertRequiredFields,stagePolicy} from '../pipelines/stage-policy';
import {shiftTaskDay,taskInstant,taskLocalInput} from '../tasks/time';
import {resolveRecordTargets,targetKind} from './record-targets';
import {recordInput,validateAction,validateRecordInput,workflowField} from './record-validation';
import {approvalFields,canonicalField,customKey,fieldValue,plannedRecord,recordKind,type WorkflowContext,type WorkflowRecordAction,type WorkflowRecordPlan} from './record-types';
export {validateAction} from './record-validation';
export type {WorkflowContext,WorkflowRecordAction,WorkflowRecordPlan,WorkflowRecordReceipt} from './record-types';

async function identity(context:WorkflowContext,action:WorkflowRecordAction,kind:RecordKind,id:string){
 return payloadHash(JSON.stringify([context.workflowId,context.version,context.eventId,context.actionIndex??action,kind,id]));
}
async function stamp(context:WorkflowContext,action:WorkflowRecordAction,type:string){
 const timezone=await context.db.prepare('SELECT timezone FROM workspace_settings WHERE id=?').bind('workspace').first<string>('timezone');
 if(!timezone)throw new RecordError(409,'Workspace timezone is unavailable.');
 const clock=action.clock==='trigger'?context.occurredAt:context.runAt;
 if(!Number.isFinite(Date.parse(clock)))throw new RecordError(400,'The workflow clock is invalid.');
 const local=taskLocalInput(clock,timezone),day=shiftTaskDay(local.slice(0,10),action.offsetDays??0);
 return type==='date'?day:taskInstant(`${day}${local.slice(10)}`,timezone);
}
async function proposed(context:WorkflowContext,action:WorkflowRecordAction,kind:RecordKind,field:string,before:unknown,origins:string[]=[]){
 const spec=await workflowField(context.db,kind,field);
 if(action.kind==='move_stage')return action.stage;
 if(action.kind==='clear')return null;
 if(action.kind==='stamp')return stamp(context,action,spec.type);
 if(action.kind==='add'||action.kind==='subtract'){
  if(typeof before!=='number'||!Number.isFinite(before))throw new RecordError(400,`${field}: the current value is not a finite number.`);
  const next=before+(action.kind==='add'?1:-1)*Number(action.value);
  if(!Number.isFinite(next))throw new RecordError(400,`${field}: arithmetic exceeds the numeric range.`);
  return next;
 }
 if(action.kind!=='copy')return action.value??null;
 let value:unknown;
 if(action.sourceTarget==='form'){
  if(!context.formValues||!Object.hasOwn(context.formValues,action.sourceField!))throw new RecordError(400,'The triggering form field is unavailable.');
  value=context.formValues[action.sourceField!];
  if(context.recordType==='contact')origins.push(context.recordId);
 }else{
  const sources=await resolveRecordTargets(context,action,action.sourceTarget??'trigger');
  if(sources.length!==1)throw new RecordError(400,'Copy actions require exactly one source record.');
  const source=sources[0],row=await requireRecord(context.db,source.kind,source.id);
  value=fieldValue(plannedRecord(context,source.kind,source.id,row),canonicalField(action.sourceField!));
  origins.push(...await fieldContactOrigins(context,{recordType:source.kind,recordId:source.id},action.sourceField!,value));
 }
 if(value===null||value===undefined)return null;
 if(spec.type==='number'&&typeof value==='string'&&value.trim()&&Number.isFinite(Number(value)))return Number(value);
 if(spec.type==='text'&&['string','number','boolean'].includes(typeof value))return String(value);
 if(spec.type==='date'&&typeof value==='string'&&value.includes('T')){
  const timezone=await context.db.prepare('SELECT timezone FROM workspace_settings WHERE id=?').bind('workspace').first<string>('timezone');
  if(!timezone)throw new RecordError(409,'Workspace timezone is unavailable.');
  return taskLocalInput(value,timezone).slice(0,10);
 }
 return value;
}
/** Explicit copy descriptors keep stated object values distinct from lookups. */
async function creationValues(context:WorkflowContext,action:WorkflowRecordAction){
 const values=structuredClone(action.values??{});
 const records:Array<{recordId:string;recordType:RecordKind}>=[],fieldOrigins:Record<string,string[]>={};
 async function resolve(field:string,value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,'sourceField'))return value;
  const copy=value as {sourceField:unknown;sourceTarget?:unknown};
  if(typeof copy.sourceField!=='string'||copy.sourceTarget!==undefined&&typeof copy.sourceTarget!=='string')throw new RecordError(400,`${field}: enter a source field and source target.`);
  const descriptor:WorkflowRecordAction={kind:'copy',field,sourceField:copy.sourceField,sourceTarget:copy.sourceTarget as string|undefined};
  if(descriptor.sourceTarget!=='form'){
   await workflowField(context.db,targetKind(recordKind(context.recordType),descriptor.sourceTarget),descriptor.sourceField!);
   for(const source of await resolveRecordTargets(context,descriptor,descriptor.sourceTarget??'trigger'))records.push({recordId:source.id,recordType:source.kind});
  }
  const origins:string[]=[],resolved=await proposed(context,descriptor,'opportunity',field,null,origins);fieldOrigins[canonicalField(field)]=[...new Set(origins)];return resolved;
 }
 for(const [field,value]of Object.entries(values)){
  if(field==='custom_fields'&&value&&typeof value==='object'&&!Array.isArray(value)){
   for(const [key,input]of Object.entries(value)) (value as Record<string,unknown>)[key]=await resolve(`custom:${key}`,input);
  }else values[field]=await resolve(field,value);
 }
 return {values,records,fieldOrigins};
}
export async function needsRecordApproval(context:WorkflowContext,kind:RecordKind,field:string){
 const protectedField=kind==='opportunity'&&['value_cents','expected_close_at','lifecycle','products','products_json','line_items','quote_values','forecast_category','probability_override'].includes(field);
 const policy=await context.db.prepare('SELECT needs_approval FROM workflow_field_policies WHERE record_type=? AND field=?').bind(kind,field).first<number>('needs_approval');
 return protectedField||policy===1;
}
export async function planRecordAction(context:WorkflowContext,action:WorkflowRecordAction):Promise<WorkflowRecordPlan[]> {
 await validateAction(context.db,context.actorId,action,context.recordType);
 const targets=await resolveRecordTargets(context,action),plans:WorkflowRecordPlan[]=[];
 const relatedRecords=[{recordId:context.recordId,recordType:recordKind(context.recordType)}];
 if(action.kind==='copy'&&action.sourceTarget!=='form')for(const source of await resolveRecordTargets(context,action,action.sourceTarget??'trigger'))relatedRecords.push({recordId:source.id,recordType:source.kind});
 for(const target of targets){
  try {
  const raw=await requireRecord(context.db,target.kind,target.id),snapshot=context.triggerSnapshots?.get(`${target.kind}:${target.id}`),row=plannedRecord(context,target.kind,target.id,snapshot??raw);
  if(action.kind==='create_record'){
   const kind=recordKind(action.recordType??'opportunity'),id=await identity(context,action,kind,target.id);
   const existing=await context.db.prepare('SELECT plan_json FROM workflow_record_writes WHERE id=?').bind(id).first<string>('plan_json');
   if(existing){plans.push(JSON.parse(existing));continue;}
   const copied=await creationValues(context,action);
   const values:Record<string,unknown>={value_cents:0,...copied.values,stage_id:action.stage};
   if(target.kind==='company')values.company_id=target.id;
   else if(row.company_id)values.company_id=row.company_id;
   if(target.kind==='contact'){values.contact_ids=[target.id];values.primary_contact_id=target.id;}
   else if(target.kind==='opportunity'){
    const contacts=(await context.db.prepare('SELECT contact_id,is_primary FROM opportunity_contacts WHERE opportunity_id=?').bind(target.id).all<{contact_id:string;is_primary:number}>()).results;
    values.contact_ids=contacts.map(contact=>contact.contact_id);values.primary_contact_id=contacts.find(contact=>contact.is_primary)?.contact_id??null;
   }
   if(!values.owner_id)throw new RecordError(400,'A created deal requires an explicit workflow owner rule.');
   const recordId=createId();Object.assign(values,validateRecordInput(kind,values));
   const typed=await typedFieldSave(context.db,kind,recordId,values.custom_fields as Record<string,unknown>??{},{});
   values.custom_fields=normalizedTypedFields(values.custom_fields as Record<string,unknown>,{},typed.fields);
   assertRequiredFields(await stagePolicy(context.db,String(action.stage)),values);
   await new RecordsRepository(context.db).prepareSave(kind,values,context.actorId,undefined,{ordinaryEdit:true,createId:recordId});
   const policy=await context.db.prepare('SELECT 1 FROM workflow_field_policies WHERE record_type=? AND needs_approval=1 AND field IN(SELECT value FROM json_each(?)) LIMIT 1').bind(kind,JSON.stringify(approvalFields({field:'create_record',createdValues:values}))).first();
   const needsApproval=Number(values.value_cents)!==0||!!values.expected_close_at||!!policy;
   plans.push({id,recordId,recordType:kind,field:'create_record',before:null,after:values,needsApproval,action,readAt:String(row.updated_at),createdValues:values,createdFieldContactIds:copied.fieldOrigins,relatedRecords:contactRelated([...relatedRecords,...copied.records],Object.values(copied.fieldOrigins).flat())});continue;
  }
  const field=canonicalField(action.kind==='move_stage'?'stage_id':action.field!),spec=await workflowField(context.db,target.kind,field);
  const before=fieldValue(row,field),copiedContactIds:string[]=[],beforeContactIds=await fieldContactOrigins(context,{recordType:target.kind,recordId:target.id},field,before);let after=await proposed(context,action,target.kind,field,before,copiedContactIds);
  if(spec.definition){const reason=fieldReason(spec.definition,after);if(reason)throw new RecordError(400,`${field}: ${reason}.`);}
  const input=recordInput(target.kind,row),key=customKey(field);
  if(key!==null)(input.custom_fields as Record<string,unknown>)[key]=after;else if(field!=='lifecycle')input[field]=after;
  if(field==='lifecycle'&&!['open','won','lost'].includes(String(after)))throw new RecordError(400,'Choose an open, won or lost lifecycle.');
  const parsed=validateRecordInput(target.kind,input) as Record<string,unknown>;
  const previousCustom=JSON.parse(String(row.custom_fields_json??'{}'));
  const typed=await typedFieldSave(context.db,target.kind,target.id,input.custom_fields as Record<string,unknown>,previousCustom);
  if(key!==null)after=normalizedTypedFields(input.custom_fields as Record<string,unknown>,previousCustom,typed.fields)[key]??null;
  else if(field!=='lifecycle'){
   after=parsed[field]??null;
   if(field==='email')after=typeof after==='string'?after.trim().toLowerCase()||null:null;
   if(field==='primary_domain')after=typeof after==='string'?after.trim().toLowerCase().replace(/^www\./,'')||null:null;
  }
  if(field==='stage_id'){
   const previous=await stagePolicy(context.db,String(row.stage_id)),next=await stagePolicy(context.db,String(after));
   if(previous.pipeline_id!==next.pipeline_id)throw new RecordError(409,'Workflow stage moves stay in the deal pipeline.');
   const contacts=(await context.db.prepare('SELECT contact_id,is_primary FROM opportunity_contacts WHERE opportunity_id=?').bind(target.id).all<{contact_id:string;is_primary:number}>()).results;
   assertRequiredFields(next,{...row,...input,contact_ids:contacts.map(c=>c.contact_id),primary_contact_id:contacts.find(c=>c.is_primary)?.contact_id??null});
  }
  if(field!=='lifecycle')await new RecordsRepository(context.db).prepareSave(target.kind,input,context.actorId,target.id,{ordinaryEdit:true});
  // Native edits do not yet store per-field old values. Refuse a target edited
  // after the event rather than treating its later value as trigger-time state.
  const changedAfterTrigger=context.previewHistorical?false:snapshot?JSON.stringify(fieldValue(raw,field)??null)!==JSON.stringify(fieldValue(snapshot,field)??null):Date.parse(String(row.updated_at))>Date.parse(context.occurredAt);
  plans.push({id:await identity(context,action,target.kind,target.id),recordId:target.id,recordType:target.kind,field,before,after,needsApproval:await needsRecordApproval(context,target.kind,field),action,readAt:String(row.updated_at),copiedContactIds:[...new Set(copiedContactIds)],beforeContactIds,relatedRecords:contactRelated(relatedRecords,[...copiedContactIds,...beforeContactIds]),...(changedAfterTrigger?{reason:'Record changed after the triggering event.'}:{})});
  if(!changedAfterTrigger&&context.plannedValues){
   const key=`${target.kind}:${target.id}`,values=context.plannedValues.get(key)??{};
   values[field]=after;context.plannedValues.set(key,values);rememberPlanOrigins(context,plans.at(-1)!);
  }
  }catch(error){
   const field=action.kind==='create_record'?'create_record':canonicalField(action.kind==='move_stage'?'stage_id':action.field!);
   const row=await requireRecord(context.db,target.kind,target.id).catch(()=>null);
   const before=row&&field!=='create_record'?fieldValue(row,field):null;
   const reason=error instanceof Error?error.message:String(error);
   plans.push({id:await identity(context,action,target.kind,target.id),recordId:target.id,recordType:target.kind,field,before,after:before,needsApproval:false,failed:true,reason,error:reason,action,readAt:String(row?.updated_at??context.runAt),relatedRecords});
  }
 }
 return plans;
}
