import {canonicalField,fieldValue,type WorkflowContext,type WorkflowRecordPlan} from './record-types';
import type {RecordKind} from '../records/shared';
import {targetKind} from './record-targets';

type Source={recordType:RecordKind;recordId:string};
const equal=(a:unknown,b:unknown)=>JSON.stringify(a??null)===JSON.stringify(b??null);
export const sourceKey=(kind:RecordKind,id:string,field:string)=>`${kind}:${id}:${canonicalField(field)}`;

/** Follow the particular copied field, rather than attributing a whole account. */
export async function fieldContactOrigins(context:WorkflowContext,source:Source,field:string,value:unknown,seen=new Set<string>()):Promise<string[]>{
 const key=sourceKey(source.recordType,source.recordId,field),planned=context.plannedOrigins?.get(key);
 if(planned)return planned;
 if(source.recordType==='contact')return [source.recordId];
 if(seen.has(key))return [];
 seen.add(key);
 const rows=(await context.db.prepare("SELECT plan_json FROM workflow_record_writes WHERE record_type=? AND record_id=? AND field IN(?,'create_record') AND undone_at IS NULL ORDER BY occurred_at DESC,rowid DESC").bind(source.recordType,source.recordId,canonicalField(field)).all<{plan_json:string}>()).results;
 for(const row of rows){
  const plan=JSON.parse(row.plan_json) as WorkflowRecordPlan;
  if(plan.field==='create_record'){
   const created={...plan.createdValues,custom_fields_json:JSON.stringify(plan.createdValues?.custom_fields??{})};
   if(equal(fieldValue(created,field),value))return plan.createdFieldContactIds?.[canonicalField(field)]??[];
   continue;
  }
  if(!equal(plan.after,value))continue;
  if(plan.copiedContactIds)return plan.copiedContactIds;
  // Existing archive receipts still identify the immediate source of a copy.
  if(plan.action.kind!=='copy')return [];
  const root=plan.relatedRecords?.[0],target=plan.action.sourceTarget??'trigger';
  if(!root)return [];
  if(target==='form')return root.recordType==='contact'?[root.recordId]:[];
  const kind=targetKind(root.recordType,target),prior=target==='trigger'?root:plan.relatedRecords?.find(r=>r.recordType===kind);
  return prior?fieldContactOrigins(context,prior,plan.action.sourceField!,value,seen):[];
 }
 return [];
}

export function contactRelated(records:Source[],ids:string[]){
 const combined=[...records,...ids.map(recordId=>({recordType:'contact' as const,recordId}))];
 return combined.filter((record,index)=>combined.findIndex(other=>other.recordType===record.recordType&&other.recordId===record.recordId)===index);
}
export function rememberPlanOrigins(context:WorkflowContext,plan:WorkflowRecordPlan){
 context.plannedOrigins?.set(sourceKey(plan.recordType,plan.recordId,plan.field),plan.copiedContactIds??[]);
}
