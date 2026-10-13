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
  if(parts.length===4){const task=await db.prepare('SELECT * FROM handoff_tasks WHERE id=? AND opportunity_id=?').bind(parts[3],id).first();if(!task&&await db.prepare('SELECT 1 FROM handoff_tasks WHERE id=?').bind(parts[3]).first())deny(404,'NOT_FOUND');if(!task&&(!allowAbsent||withState))deny(404,'NOT_FOUND');if(withState){if(!task||!['open','completed','cancelled'].includes(String(task.status)))deny(422,'INVALID_RECORD_STATE');recordState={schema:recordStateSchema,kind:'crm.handoff',state:task!.status as 'open'|'completed'|'cancelled'};}// Cited evidence joins the revision only when present, so handoffs that cite none keep their earlier revisions.
  const cited=task?await handoffEvidence(db,parts[3]!):[];value={...value,handoff:task&&cited.length?{...task,evidence:cited}:task};title=String(task?.title??`Handoff for ${title}`);}
 }
 const text=canonical(value);if(new TextEncoder().encode(text).byteLength>2*1024*1024)deny(413,'SOURCE_TOO_LARGE');
 const readers=await audience(db);if((await installation(db)).epoch!==start.epoch)deny(409,'REVISION_CONFLICT');
 return {...(withState?{recordState}:{}),value,text,title,revision:await revision(value),epoch:start.epoch,installationId:start.id,audience:readers};
}
export function handoffContent(row:Record<string,unknown>){const evidence=row.evidence as string[]|undefined;return {title:row.title,description:row.description,assigneeId:row.assignee_id,dueAt:row.due_at,status:row.status,...(evidence?.length?{evidence}:{})};}
/** The evidence a handoff cites lives on its latest attributed timeline entry. */
export async function handoffEvidence(db:D1Database,handoffId:string):Promise<string[]>{const row=await db.prepare("SELECT json_extract(payload_json,'$.evidence') AS evidence FROM timeline_entries WHERE source='orbit-handoff' AND json_extract(payload_json,'$.handoffId')=? ORDER BY recorded_at DESC,id DESC LIMIT 1").bind(handoffId).first<{evidence:string|null}>();return row?.evidence?JSON.parse(row.evidence):[];}
/** Evidence IDs that are not on the opportunity, its contacts or its company: signals, timeline entries, drafts and handoffs. */
export async function foreignEvidence(db:D1Database,opportunityId:string,ids:string[]){
 return (await db.prepare(`WITH refs(type,id) AS (SELECT 'opportunity',?1 UNION SELECT 'contact',contact_id FROM opportunity_contacts WHERE opportunity_id=?1 UNION SELECT 'company',company_id FROM opportunities WHERE id=?1 AND company_id IS NOT NULL)
  SELECT j.value AS id FROM json_each(?2) j WHERE NOT (j.value=?1
   OR EXISTS(SELECT 1 FROM signal_links l JOIN refs ON refs.type=l.record_type AND refs.id=l.record_id WHERE l.signal_id=j.value)
   OR EXISTS(SELECT 1 FROM timeline_entry_records r JOIN refs ON refs.type=r.record_type AND refs.id=r.record_id WHERE r.timeline_entry_id=j.value)
   OR EXISTS(SELECT 1 FROM drafts d WHERE d.id=j.value AND d.opportunity_id=?1)
   OR EXISTS(SELECT 1 FROM handoff_tasks h WHERE h.id=j.value AND h.opportunity_id=?1))`).bind(opportunityId,JSON.stringify(ids)).all<{id:string}>()).results.map(row=>row.id);
}
