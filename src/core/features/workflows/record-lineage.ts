import {requireRecord,type RecordKind} from '../records/shared';
import {resolveRecordTargets} from './record-targets';
import {canonicalField,fieldValue,plannedRecord,type WorkflowContext,type WorkflowRecordAction,type WorkflowRecordPlan,type WorkflowRecordReference} from './record-types';

export const sourceKey=(kind:RecordKind,id:string,field:string)=>`${kind}:${id}:${canonicalField(field)}`;
export function distinctSources(records:WorkflowRecordReference[]){return [...new Map(records.map(record=>[`${record.recordType}:${record.recordId}`,record])).values()];}
/** Follow the source field's retained value, rather than every field on its account. */
async function fieldSources(context:WorkflowContext,kind:RecordKind,id:string,field:string){
 const key=sourceKey(kind,id,field);
 if(context.plannedSources?.has(key))return context.plannedSources.get(key)!;
 const row=plannedRecord(context,kind,id,await requireRecord(context.db,kind,id)),value=fieldValue(row,field);
 const saved=await context.db.prepare("SELECT plan_json FROM workflow_record_writes WHERE record_type=? AND record_id=? AND (field=? OR field='create_record') ORDER BY occurred_at DESC,rowid DESC LIMIT 1").bind(kind,id,field).first<string>('plan_json');
 if(!saved)return [];
 const plan=JSON.parse(saved) as WorkflowRecordPlan;
 const after=plan.field==='create_record'?(field.startsWith('custom:')?(plan.createdValues?.custom_fields as Record<string,unknown>|undefined)?.[field.slice(7)]:plan.createdValues?.[field]):plan.after;
 if(JSON.stringify(value??null)!==JSON.stringify(after??null))return [];
 return plan.sources?.[field]??(plan.action.kind==='copy'?plan.relatedRecords??[]:[]);
}
export async function copySources(context:WorkflowContext,action:WorkflowRecordAction):Promise<WorkflowRecordReference[]>{
 if(action.sourceTarget==='form')return [{recordId:context.recordId,recordType:context.recordType as RecordKind}];
 const records:WorkflowRecordReference[]=[];
 for(const source of await resolveRecordTargets(context,action,action.sourceTarget??'trigger')){
  records.push({recordId:source.id,recordType:source.kind},...await fieldSources(context,source.kind,source.id,canonicalField(action.sourceField!)));
 }
 return distinctSources(records);
}
