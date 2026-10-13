import {nativeFullPredicate} from './authority';
import { canonical,deny,revision,targetSchema,recordStateSchema } from './protocol';
export async function installation(db:D1Database){return (await db.prepare('SELECT * FROM delegation_installation').first<{id:string;epoch:number}>())!;}
export async function audience(db:D1Database){const ids=(await db.prepare(`SELECT o.id FROM operators o WHERE ${nativeFullPredicate} ORDER BY o.id`).all<{id:string}>()).results.map(r=>r.id);const value={kind:'source-principals' as const,principalIds:ids};return {...value,audienceRevision:await revision(value)};}
export async function snapshot(db:D1Database,target:string,allowAbsent=false,withState=false){
 if(!targetSchema.safeParse(target).success)deny(400,'INVALID_REQUEST');
 const start=await installation(db),parts=target.split('/');
 if(withState&&(parts[0]!=='opportunities'||parts.length!==4))deny(422,'UNSUPPORTED_RECORD_STATE_KIND');
 let recordState:{schema:string;kind:'crm.handoff';state:'open'|'completed'|'cancelled'}|undefined;
 const table=parts[0]!,id=parts[1]!;
 const row=await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first<Record<string,unknown>>();
 if(!row)deny(404,'NOT_FOUND');
 let value:Record<string,unknown>=row!,title=String(row!.title??row!.name??row!.subject??row!.email??target);
 if(table==='opportunities'){
  const contacts=(await db.prepare('SELECT c.*,oc.is_primary FROM contacts c JOIN opportunity_contacts oc ON oc.contact_id=c.id WHERE oc.opportunity_id=? ORDER BY c.id').bind(id).all()).results;
  const company=row!.company_id?await db.prepare('SELECT * FROM companies WHERE id=?').bind(row!.company_id).first():null;
  value={opportunity:row,contacts,company};
  if(parts.length===4){const task=await db.prepare('SELECT * FROM handoff_tasks WHERE id=? AND opportunity_id=?').bind(parts[3],id).first();if(!task&&await db.prepare('SELECT 1 FROM handoff_tasks WHERE id=?').bind(parts[3]).first())deny(404,'NOT_FOUND');if(!task&&(!allowAbsent||withState))deny(404,'NOT_FOUND');if(withState){if(!task||!['open','completed','cancelled'].includes(String(task.status)))deny(422,'INVALID_RECORD_STATE');recordState={schema:recordStateSchema,kind:'crm.handoff',state:task!.status as 'open'|'completed'|'cancelled'};}value={...value,handoff:task};title=String(task?.title??`Handoff for ${title}`);}
 }
 const text=canonical(value);if(new TextEncoder().encode(text).byteLength>2*1024*1024)deny(413,'SOURCE_TOO_LARGE');
 const readers=await audience(db);if((await installation(db)).epoch!==start.epoch)deny(409,'REVISION_CONFLICT');
 return {...(withState?{recordState}:{}),value,text,title,revision:await revision(value),epoch:start.epoch,installationId:start.id,audience:readers};
}
export function handoffContent(row:Record<string,unknown>){return {title:row.title,description:row.description,assigneeId:row.assignee_id,dueAt:row.due_at,status:row.status};}
