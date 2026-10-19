import { createId } from '../../shared/ids';
import { isFullOperator } from '../access/identity-class';
import { matches, roleAllows } from '../access/policy';
import { RecordError, type RecordKind } from './shared';
/** RECORD-017: where a mention can be written. The notification's event key names the source, so each colleague is notified once per source. */
export type MentionSource='entry'|'task'|'handoff';
export interface Colleague {id:string;name:string;email:string}
const kindName=(kind:RecordKind)=>kind==='opportunity'?'deal':kind;
export class MentionAccessError extends RecordError {
 constructor(readonly colleagues:Colleague[],kind:RecordKind){super(409,`${colleagues.map(c=>c.name).join(', ')} cannot see this ${kindName(kind)}. Share it with ${colleagues.length===1?'them':'each of them'} explicitly or remove the mention; a mention never grants access.`);}
}
/** Active colleagues an author may mention: active full operators and collaborators who accepted their invitation. Teams arrive with TEAM-005. */
export async function mentionable(db:D1Database){return (await db.prepare("SELECT o.id,o.display_name AS name,o.email FROM operators o WHERE o.status='active' AND (NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id) OR EXISTS(SELECT 1 FROM access_memberships m WHERE m.operator_id=o.id AND m.status='active')) ORDER BY o.display_name COLLATE NOCASE,o.id").all<Colleague>()).results;}
/** Colleagues the text mentions as @Display Name or @email. At each @ the longest matching name wins; a name two colleagues share must be written as an email. */
export function parseMentions(text:string,colleagues:Colleague[]){
 const tokens=colleagues.flatMap(c=>[c.name,c.email].filter(Boolean).map(token=>({token:token.toLowerCase(),c}))).sort((a,b)=>b.token.length-a.token.length),lower=text.toLowerCase(),found=new Map<string,Colleague>();
 for(let at=lower.indexOf('@');at>=0;at=lower.indexOf('@',at+1)){
  const hits=tokens.filter(({token})=>lower.startsWith(token,at+1)&&!/[\p{L}\p{N}_]/u.test(lower[at+1+token.length]??''));
  if(!hits.length)continue;
  const longest=hits.filter(hit=>hit.token.length===hits[0]!.token.length);
  if(new Set(longest.map(hit=>hit.c.id)).size>1)throw new RecordError(409,`More than one active colleague is named ${longest[0]!.c.name}; mention them by email instead.`);
  found.set(longest[0]!.c.id,longest[0]!.c);
 }
 return [...found.values()];
}
/** Whether a colleague can open the record. Until TEAM-005 roles exist every full operator sees every record, so only a collaborator can be without access: their role must read records or a live grant must cover this one. */
export async function canSee(db:D1Database,operatorId:string,kind:RecordKind,recordId:string){
 if(await isFullOperator(db,operatorId))return true;
 const member=await db.prepare("SELECT m.role,b.actions_json FROM access_memberships m LEFT JOIN access_role_bundles b ON b.workspace_id=m.workspace_id AND b.role=m.role WHERE m.operator_id=? AND m.status='active'").bind(operatorId).first<{role:string;actions_json:string|null}>();
 if(!member)return false;
 const record=await db.prepare('SELECT visibility,owner_id FROM graph_records WHERE id=? AND kind=?').bind(recordId,kind).first<{visibility:string;owner_id:string|null}>();
 const roleReads=member.actions_json?(JSON.parse(member.actions_json) as string[]).includes('graph.read'):roleAllows(member.role,'graph.read');
 if(roleReads&&!(record?.visibility==='restricted'&&record.owner_id!==operatorId))return true;
 const grants=(await db.prepare("SELECT resource_type,resource_id,actions_json FROM access_grants WHERE subject_kind='operator' AND subject_id=? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?)").bind(operatorId,new Date().toISOString()).all<{resource_type:string;resource_id:string;actions_json:string}>()).results;
 return grants.some(grant=>matches(grant.resource_type,kind)&&matches(grant.resource_id,recordId)&&(JSON.parse(grant.actions_json) as string[]).includes('graph.read'));
}
const recordName:Record<RecordKind,string>={contact:'SELECT COALESCE(name,email) AS name FROM contacts WHERE id=?',company:'SELECT name FROM companies WHERE id=?',opportunity:'SELECT title AS name FROM opportunities WHERE id=?'};
/** The mentions in an entry, task note or handoff, refused before saving when a mentioned colleague cannot see the record, and one in-app notification for each mentioned colleague not yet notified for this source. */
export async function mentionPlan(db:D1Database,input:{source:MentionSource;sourceId:string;kind:RecordKind;recordId:string;label:string;text:string;author:string}){
 const mentioned=parseMentions(input.text,await mentionable(db)).filter(c=>c.id!==input.author),hidden:Colleague[]=[];
 for(const colleague of mentioned)if(!await canSee(db,colleague.id,input.kind,input.recordId))hidden.push(colleague);
 if(hidden.length)throw new MentionAccessError(hidden,input.kind);
 const name=(await db.prepare(recordName[input.kind]).bind(input.recordId).first<{name:string|null}>())?.name??kindName(input.kind),at=new Date().toISOString();
 return {mentions:mentioned.map(c=>c.id),statements:mentioned.map(colleague=>db.prepare("INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at) SELECT ?,?,?,?,'record.mention',a.display_name||?,? FROM operators a WHERE a.id=?").bind(createId(),colleague.id,input.kind==='opportunity'?input.recordId:null,`mention:${input.source}:${input.sourceId}`,` mentioned you in a ${input.label} on ${name}.`,at,input.author))};
}
/** Deleting a source withdraws its unread mention notifications. */
export function withdrawMentions(db:D1Database,source:MentionSource,sourceId:string){return db.prepare("DELETE FROM notifications WHERE kind='record.mention' AND event_key=? AND read_at IS NULL").bind(`mention:${source}:${sourceId}`);}
/** Erasing a record erases every mention notification whose entry, task or handoff went with it. */
export function erasedMentions(db:D1Database){return db.prepare(`DELETE FROM notifications WHERE kind='record.mention' AND CASE WHEN event_key LIKE 'mention:entry:%' THEN NOT EXISTS(SELECT 1 FROM timeline_entry_records WHERE timeline_entry_id=substr(notifications.event_key,15)) WHEN event_key LIKE 'mention:task:%' THEN NOT EXISTS(SELECT 1 FROM sales_tasks WHERE id=substr(notifications.event_key,14)) ELSE NOT EXISTS(SELECT 1 FROM handoff_tasks WHERE id=substr(notifications.event_key,17)) END`);}
/** Where a mention notification opens: the exact entry, task or handoff. */
export const mentionHrefSql=`CASE WHEN n.kind='record.mention' THEN COALESCE(
 (SELECT CASE WHEN r.record_type='opportunity' THEN '/app/opportunities/'||r.record_id ELSE '/app/records?kind='||r.record_type||'&record='||r.record_id END||'#entry-'||r.timeline_entry_id FROM timeline_entry_records r WHERE n.event_key LIKE 'mention:entry:%' AND r.timeline_entry_id=substr(n.event_key,15) LIMIT 1),
 (SELECT '/app#sales-task-'||t.id FROM sales_tasks t WHERE n.event_key LIKE 'mention:task:%' AND t.id=substr(n.event_key,14)),
 (SELECT '/app/opportunities/'||h.opportunity_id||'#handoff-'||h.id FROM handoff_tasks h WHERE n.event_key LIKE 'mention:handoff:%' AND h.id=substr(n.event_key,17))) END`;
export interface Mention {source:MentionSource;id:string;kind:string;text:string;author:string|null;recordType:RecordKind;recordId:string;at:string;href:string}
const recordHref=(type:RecordKind,id:string)=>type==='opportunity'?`/app/opportunities/${id}`:`/app/records?kind=${type}&record=${id}`;
/** The Mentions view: every entry, task note and handoff that mentions this colleague now. */
export async function mentionsOf(db:D1Database,operatorId:string):Promise<Mention[]>{
 const entries=(await db.prepare("SELECT t.id,t.kind,json_extract(t.payload_json,'$.text') AS text,a.display_name AS author,r.record_type AS recordType,r.record_id AS recordId,t.occurred_at AS at FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id LEFT JOIN operators a ON a.id=t.actor_id WHERE t.kind IN('manual.note','manual.call','manual.meeting') AND EXISTS(SELECT 1 FROM json_each(t.payload_json,'$.mentions') WHERE value=?) ORDER BY t.occurred_at DESC,t.id DESC LIMIT 200").bind(operatorId).all<Omit<Mention,'source'|'href'>>()).results;
 // Task notes and handoffs keep mentions in their text: a colleague's notification names the source, and the text must still mention them.
 const colleagues=await mentionable(db),still=(text:string)=>parseMentions(text,colleagues).some(c=>c.id===operatorId);
 const tasks=(await db.prepare("SELECT t.id,'task' AS kind,t.notes AS text,a.display_name AS author,t.record_type AS recordType,COALESCE(t.contact_id,t.company_id,t.opportunity_id) AS recordId,t.updated_at AS at FROM notifications n JOIN sales_tasks t ON n.event_key LIKE 'mention:task:%' AND t.id=substr(n.event_key,14) LEFT JOIN operators a ON a.id=t.updated_by WHERE n.operator_id=? AND n.kind='record.mention'").bind(operatorId).all<Omit<Mention,'source'|'href'>>()).results;
 const handoffs=(await db.prepare("SELECT h.id,'handoff' AS kind,h.description AS text,a.display_name AS author,'opportunity' AS recordType,h.opportunity_id AS recordId,h.updated_at AS at FROM notifications n JOIN handoff_tasks h ON n.event_key LIKE 'mention:handoff:%' AND h.id=substr(n.event_key,17) LEFT JOIN operators a ON a.id=h.actor_id WHERE n.operator_id=? AND n.kind='record.mention'").bind(operatorId).all<Omit<Mention,'source'|'href'>>()).results;
 return [...entries.map(row=>({...row,source:'entry' as const,href:`${recordHref(row.recordType,row.recordId)}#entry-${row.id}`})),
  ...tasks.filter(row=>still(row.text)).map(row=>({...row,source:'task' as const,href:`/app#sales-task-${row.id}`})),
  ...handoffs.filter(row=>still(row.text)).map(row=>({...row,source:'handoff' as const,href:`/app/opportunities/${row.recordId}#handoff-${row.id}`}))].sort((a,b)=>b.at.localeCompare(a.at));
}
