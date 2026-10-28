import type {RecordKind} from '../records/shared';

export interface WorkflowRecordAction {
 kind:'set'|'copy'|'stamp'|'clear'|'add'|'subtract'|'move_stage'|'create_record';
 target?:string;field?:string;value?:unknown;sourceField?:string;sourceTarget?:string;
 offsetDays?:number;clock?:'trigger'|'run';recordType?:string;pipelineId?:string;
 stage?:string;values?:Record<string,unknown>;
}
export interface WorkflowContext {
 db:D1Database;actorId:string;workflowId:string;workflowName:string;version:number;
 eventId:string;occurredAt:string;runAt:string;runId:string;recordId:string;
 recordType:string;evidence:string;actionIndex?:number;approvedWriteId?:string;
 /** Dispatch supplies fresh version and authority guards in the write transaction. */
 writeFences?:D1PreparedStatement[];
 afterWriteStatements?:D1PreparedStatement[];
 /** Immutable, already authorized form values, when the trigger is a form. */
 formValues?:Record<string,unknown>;
 /** One shared map per preview or run plan, preserving sequential action values. */
 previewHistorical?:boolean;
 triggerSnapshots?:Map<string,Record<string,unknown>>;
 plannedValues?:Map<string,Record<string,unknown>>;
}
export interface WorkflowRecordPlan {
 id:string;recordId:string;recordType:RecordKind;field:string;before:unknown;
 after:unknown;needsApproval:boolean;reason?:string;error?:string;failed?:true;action:WorkflowRecordAction;
 readAt:string;createdValues?:Record<string,unknown>;
 relatedRecords?:Array<{recordId:string;recordType:RecordKind}>;
}
export interface WorkflowRecordReceipt {
 id:string;recordId:string;recordType:RecordKind;field:string;before:unknown;
 after:unknown;applied:boolean;replayed:boolean;undoable:boolean;
}
export function recordKind(value:string):RecordKind {
 if(value==='deal')return 'opportunity';
 if(value==='contact'||value==='company'||value==='opportunity')return value;
 throw new Error(`Native workflow records do not support ${value}.`);
}
export function customKey(field:string){
 return field.startsWith('custom:')?field.slice(7):field.startsWith('custom_fields_json.')?field.slice(19):null;
}
export function canonicalField(field:string){const key=customKey(field);return key===null?field:`custom:${key}`;}
export function approvalFields(plan:Pick<WorkflowRecordPlan,'field'|'createdValues'>){
 if(plan.field!=='create_record')return [plan.field];
 const values=plan.createdValues??{},custom=values.custom_fields;
 return ['create_record',...Object.keys(values).filter(field=>field!=='custom_fields'),...(custom&&typeof custom==='object'?Object.keys(custom).map(key=>`custom:${key}`):[])];
}
export function fieldValue(row:Record<string,unknown>,field:string){
 const key=customKey(field);
 return key===null?row[field]??null:(JSON.parse(String(row.custom_fields_json??'{}'))[key]??null);
}
export function plannedRecord(context:WorkflowContext,kind:RecordKind,id:string,row:Record<string,unknown>){
 const next={...row},custom=JSON.parse(String(row.custom_fields_json??'{}'));
 for(const [field,value]of Object.entries(context.plannedValues?.get(`${kind}:${id}`)??{})){
  const key=customKey(field);if(key===null)next[field]=value;else custom[key]=value;
 }
 next.custom_fields_json=JSON.stringify(custom);return next;
}
