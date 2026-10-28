import {isFullOperator} from '../access/identity-class';
import {createId} from '../../shared/ids';
import {tables,type RecordKind} from '../records/shared';
import {planRecordAction,validateAction,type WorkflowContext,type WorkflowRecordPlan,type WorkflowRecordAction} from './record-plans';
import {planEffect,declaredWebhook,type EffectPlan} from './effects';
import {matches,matchesEvent,record,sourceAvailable} from './repository';
import {WorkflowError,type Version,type Event,type Run,type Definition,type Action} from './contracts';
export interface PlannedAction {action:Action;writes:WorkflowRecordPlan[];effect?:EffectPlan;error?:string;executionAt?:string}
export const recordKinds=new Set(['set','copy','stamp','clear','add','subtract','move_stage','create_record']);
export function workflowContext(db:D1Database,v:Version,e:Event,runId:string,at:string,index:number):WorkflowContext{return {db,actorId:v.activated_by??v.created_by,workflowId:v.workflow_id,workflowName:v.name,version:v.version,eventId:e.id,occurredAt:e.occurred_at,runAt:at,runId,recordId:e.record_id,recordType:e.record_type,evidence:e.evidence,actionIndex:index};}
export async function validateDefinition(db:D1Database,actor:string,d:Definition){
 if(d.trigger.kind==='enrichment')throw new WorkflowError(400,'Authorized enrichment signals require ENRICH-001 setup.');
 for(const c of d.conditions)if(!/^(custom:[a-z][a-z0-9_]*|[a-z][a-z0-9_]*)$/.test(c.field))throw new WorkflowError(400,'Choose a record field.');
 for(const a of d.actions){if(a.approverId&&!await isFullOperator(db,a.approverId))throw new WorkflowError(400,'Choose an active operator as the approval assignee.');if(recordKinds.has(a.kind))await validateAction(db,actor,a as WorkflowRecordAction,d.trigger.recordType);else if(a.kind==='webhook'){if(!a.url)throw new WorkflowError(400,'Declare a webhook URL.');declaredWebhook(a.url);}else if(['notify','create_task','remind_task'].includes(a.kind)&&!a.title?.trim())throw new WorkflowError(400,'Enter action content.');}
}
export async function planActions(db:D1Database,v:Version,e:Event,runId:string,at:string,options:{historical?:boolean;frozen?:PlannedAction[]}={}):Promise<PlannedAction[]>{
 const d=JSON.parse(v.definition_json) as Definition,plans:PlannedAction[]=[],plannedValues=new Map<string,Record<string,unknown>>(),plannedOrigins=new Map<string,string[]>();
 const formValues=e.kind==='form_submitted'?JSON.parse(await db.prepare('SELECT values_json FROM marketing_form_submissions WHERE id=?').bind(e.id).first<string>('values_json')??'{}'):undefined;
 const snapshots=(await db.prepare('SELECT record_type,record_id,values_json FROM workflow_event_snapshots WHERE event_id=?').bind(e.id).all<{record_type:string;record_id:string;values_json:string}>()).results;
 const triggerSnapshots=new Map(snapshots.map(s=>[`${s.record_type}:${s.record_id}`,JSON.parse(s.values_json)]));
 const context=(index:number)=>({...workflowContext(db,v,e,runId,at,index),plannedValues,plannedOrigins,formValues,triggerSnapshots,previewHistorical:options.historical});
 for(const [index,a]of d.actions.entries()){
  try{
   if(options.frozen&&!recordKinds.has(a.kind)){const prior=options.frozen[index];plans.push(prior);for(const w of prior.writes){if(w.reason||w.error)continue;const key=`${w.recordType}:${w.recordId}`,values=plannedValues.get(key)??{};values[w.field]=w.after;plannedValues.set(key,values);}continue;}
   if(recordKinds.has(a.kind)){plans.push({action:a,writes:await planRecordAction(context(index),a as WorkflowRecordAction)});continue;}
   const effect=await planEffect(db,a,{record_id:e.record_id,record_type:e.record_type,workflow_id:v.workflow_id},index);
   if(a.kind==='assign_owner'&&e.record_type==='opportunity'){const action={kind:'set',field:'owner_id',value:effect.ownerId} as WorkflowRecordAction;plans.push({action:a,writes:await planRecordAction(context(index),action),effect});}else plans.push({action:a,writes:[],effect});
  }catch(error){plans.push({action:a,writes:[],error:(error as Error).message});}
 }
 return plans;
}
/** Resolve the run clock once, before any write or exact approval is presented. */
export async function resolveRunClockPlans(db:D1Database,v:Version,e:Event,run:Run,at:string){
 const saved=JSON.parse(run.plan_json) as PlannedAction[];
 if(!saved.some(p=>p.action.kind==='stamp'&&p.action.clock!=='trigger')||saved.every(p=>p.executionAt))return saved;
 const resolved=await planActions(db,v,e,run.id,at,{frozen:saved});
 for(const [index,p]of resolved.entries()){
  p.executionAt=at;
  // A queue already disclosed each prospective new record's identity.
  for(const write of p.writes){const original=saved[index]?.writes.find(w=>w.id===write.id);if(original?.createdValues)write.recordId=original.recordId;}
 }
 await db.prepare("UPDATE workflow_runs SET plan_json=? WHERE id=? AND status='running'").bind(JSON.stringify(resolved),run.id).run();
 return resolved;
}
export async function previewVersion(db:D1Database,v:Version,at:string){
 const d=JSON.parse(v.definition_json) as Definition,kind=d.trigger.recordType;
 const rows=(await db.prepare(`SELECT * FROM ${tables[kind]} ORDER BY id LIMIT 1001`).all<Record<string,any>>()).results;if(rows.length>1000)throw new WorkflowError(400,'Narrow this workflow before previewing more than 1,000 records.');
 const historical=(await db.prepare('SELECT * FROM workflow_events WHERE kind=? AND record_type=? AND occurred_at>=? ORDER BY occurred_at DESC LIMIT 1001').bind(d.trigger.kind,kind,new Date(Date.parse(at)-30*86400000).toISOString()).all<Event>()).results;
 if(historical.length>1000)throw new WorkflowError(400,'Narrow this workflow before previewing more than 1,000 historical events.');
 const records=[];
 for(const row of rows){if(!matches(row,d,at))continue;const e:Event={id:'preview:'+row.id,kind:d.trigger.kind,record_type:kind,record_id:row.id,occurred_at:at,evidence:'Activation preview',chain_json:'[]'},plans=await planActions(db,v,e,'preview',at);
 records.push({recordId:row.id,label:row.title??row.name??row.id,changes:plans.flatMap(p=>p.writes.map(w=>({field:w.field,before:w.before,after:w.after,needsApproval:w.needsApproval,recordId:w.recordId}))),effects:plans.filter(p=>p.effect).map(p=>p.effect!.action),errors:plans.flatMap(p=>[...(p.error?[p.error]:[]),...p.writes.filter(w=>w.error).map(w=>w.error)]),updatedAt:row.updated_at});}
 const history=[];
 for(const e of historical){const saved=await db.prepare('SELECT values_json FROM workflow_event_snapshots WHERE event_id=? AND record_type=? AND record_id=?').bind(e.id,e.record_type,e.record_id).first<string>('values_json');if(!saved||!await record(db,e.record_type,e.record_id)||!await sourceAvailable(db,e,v.activated_by??v.created_by))continue;const row=JSON.parse(saved);if(!matchesEvent(e,d)||!matches(row,d,e.occurred_at))continue;const plans=await planActions(db,v,e,'historical-preview',e.occurred_at,{historical:true});history.push({eventId:e.id,recordId:e.record_id,occurredAt:e.occurred_at,label:row.title??row.name??row.id,changes:plans.flatMap(p=>p.writes.filter(w=>!w.error).map(w=>({recordId:w.recordId,field:w.field,before:w.before,after:w.after,needsApproval:w.needsApproval}))),effects:plans.filter(p=>p.effect).map(p=>p.effect!.action),errors:plans.flatMap(p=>[...(p.error?[p.error]:[]),...p.writes.filter(w=>w.error).map(w=>w.error)])});}
 const from=new Date(Date.parse(at)-30*86400000).toISOString(),recordedFrom=await db.prepare('SELECT recorded_from FROM workflow_journal_metadata WHERE id=1').first<string>('recorded_from');
 return {records,historical:history,historyCoverage:{from,through:at,recordedFrom,complete:!!recordedFrom&&recordedFrom<=from},counts:{records:records.length,historical:history.length,changes:records.reduce((n,r)=>n+r.changes.length,0),approvals:records.reduce((n,r)=>n+r.changes.filter(c=>c.needsApproval).length,0),effects:records.reduce((n,r)=>n+r.effects.length,0)},asOf:at};
}
