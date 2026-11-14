import type {Event,Run} from './contracts';
import type {PlannedAction} from './planning';
import {record,sourceAvailable} from './repository';

type Row=Record<string,any>;
type Item={text:string;href?:string;label?:string;detail?:string};
const label=(value:string)=>value.replaceAll('_',' ').replace(/^./,s=>s.toUpperCase());
// Diagnostic messages can contain database identifiers. Exact diagnostics remain in technical details.
const readable=(value:string)=>value.replace(/\b[0-9A-HJKMNP-TV-Z]{26}\b|\b[0-9a-f]{32,64}\b|\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi,'record');
const parse=(value:string|null)=>JSON.parse(value??'[]');

/** A read-only projection of retained execution evidence. It never dispatches or changes a run. */
export async function presentRun(db:D1Database,run:Run,event:Event|null,steps:Row[],actor:string){
 const person=async(id:string|null)=>id?await db.prepare('SELECT display_name FROM operators WHERE id=?').bind(id).first<string>('display_name')??'Former operator':'Unassigned';
 async function reference(kind:string,id:string):Promise<{label:string;href?:string}>{
  const row=await record(db,kind,id);
  return row?{label:String(row.title??row.name),href:`/app/${kind==='opportunity'?'opportunities':kind==='company'?'companies':'contacts'}/${encodeURIComponent(id)}`}:{label:`${kind==='opportunity'?'Deal':label(kind)} no longer available`};
 }
 async function value(field:string,input:unknown):Promise<string>{
  if(input==null||input==='')return 'Empty';
  if(field==='owner_id')return person(String(input));
  if(field==='stage_id')return await db.prepare('SELECT name FROM pipeline_stages WHERE id=?').bind(input).first<string>('name')??'Former stage';
  if(typeof input==='boolean')return input?'Yes':'No';
  if(typeof input==='object'||typeof input==='string'&&/^[\[{]/.test(input))return 'Structured value (see technical details)';
  return readable(String(input));
 }
 async function writeItem(result:Row):Promise<Item>{
  const stored=result.writeId?await db.prepare('SELECT record_type,record_id,field,before_json,after_json FROM workflow_record_writes WHERE id=?').bind(result.writeId).first<Row>():null;
  const kind=stored?.record_type??result.recordType??run.record_type,id=stored?.record_id??result.recordId??run.record_id;
  const ref=await reference(kind,id),field=stored?.field??result.field;
  let text=result.skipped?'Skipped change':result.archived?'Archived created deal':result.undone?'Restored change':field==='create_record'?'Created record':'Updated record';
  let detail=result.reason?readable(String(result.reason)):undefined;
  if(field&&field!=='create_record'){
   const before=stored?parse(stored.before_json):result.before,after=stored?parse(stored.after_json):result.after;
   text=`${result.undone?'Restored':result.skipped?'Skipped':'Changed'} ${label(field)}`;
   if(!result.skipped)detail=`${await value(field,result.undone?after:before)} → ${await value(field,result.undone?before:after)}`;
  }
  return {text,...ref,detail};
 }
 async function effectItem(result:Row):Promise<Item>{
  if(result.taskId){const task=await db.prepare('SELECT title FROM sales_tasks WHERE id=?').bind(result.taskId).first<{title:string}>();return task?{text:result.kind==='remind_task'?'Created task with reminder':'Created task',label:task.title,href:`/app/tasks/${encodeURIComponent(result.taskId)}`}:{text:'Created task',detail:'Task no longer available'};}
  if(result.kind==='notify')return {text:'Notified team',detail:(await Promise.all((result.recipients??[]).map(person))).join(', ')};
  if(result.kind==='assign_owner')return {text:'Assigned owner',detail:await person(result.ownerId)};
  if(result.kind==='webhook')return {text:result.submitted?'Webhook accepted':'Webhook not submitted',detail:result.status?`HTTP ${result.status}`:undefined};
  return writeItem(result);
 }
 const plans=parse(run.plan_json) as PlannedAction[];
 const actions=await Promise.all(plans.map(async(plan,index)=>{
  const step=steps.find(s=>s.ordinal===index),raw=step?parse(step.result_json):[],results=Array.isArray(raw)?raw:[];
  const items=await Promise.all(results.map(effectItem));
  // Approved writes can have no step result, but their durable write receipts still exist.
  if(!items.length){const writes=(await db.prepare("SELECT record_type AS recordType,record_id AS recordId,field,before_json,after_json FROM workflow_record_writes WHERE run_id=? AND id IN(SELECT value FROM json_each(?))").bind(run.id,JSON.stringify(plan.writes.map(w=>w.id))).all<Row>()).results;
   for(const w of writes)items.push(await writeItem({...w,before:parse(w.before_json),after:parse(w.after_json)}));
  }
  return {label:label(plan.action.kind),status:step?.status??(run.status==='needs_approval'?'needs_approval':'not_started'),attempts:step?.attempts??0,items,error:plan.error?readable(plan.error):undefined};
 }));
 const allowed=event&&await sourceAvailable(db,event,actor);
 const entry=allowed&&event.kind==='activity_logged'?await db.prepare('SELECT id,kind,payload_json FROM timeline_entries WHERE id=?').bind(event.id.split(':')[0]).first<Row>():null;
 const target=await reference(run.record_type,run.record_id);
 const activity=entry?parse(entry.payload_json):null;
 const trigger={label:entry?`${label(entry.kind.split('.').at(-1))} logged`:event?label(event.kind):'Trigger unavailable',text:allowed?(activity?.text?readable(String(activity.text)):readable(event!.evidence)):'Source evidence is no longer available',href:allowed&&target.href?target.href+(entry?`#entry-${encodeURIComponent(entry.id)}`:''):undefined,at:event?.occurred_at};
 const undo=run.status==='undone'?await Promise.all((parse(run.outcome_json) as Row[]).map(writeItem)):undefined;
 return {ownerName:await person(run.owner_id),createdAt:run.created_at,updatedAt:run.updated_at,trigger,actions,undo,reason:run.reason?readable(run.reason):null};
}
