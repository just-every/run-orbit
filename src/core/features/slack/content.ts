import {recordHref} from '../today/links';
import type {Notice} from './contracts';
/** Workspace channels can carry only workspace-visible records, including the account and its linked people. */
export function workspaceRecordFence(kind:string,id:string|null){return{sql:`EXISTS(SELECT 1 FROM graph_records WHERE workspace_id='workspace' AND kind=? AND id=? AND visibility='workspace' AND retired_into_id IS NULL) AND NOT EXISTS(SELECT 1 FROM graph_records g WHERE g.workspace_id='workspace' AND (g.visibility<>'workspace' OR g.retired_into_id IS NOT NULL) AND
 ((g.kind=? AND g.id=?) OR (?='opportunity' AND ((g.kind='company' AND g.id IN(SELECT company_id FROM opportunities WHERE id=?)) OR (g.kind='contact' AND g.id IN(SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?)))) OR (?='contact' AND g.kind='company' AND g.id IN(SELECT company_id FROM contacts WHERE id=?))))`,args:[kind,id,kind,id,kind,id,id,kind,id]};}
export async function workspaceRecord(db:D1Database,kind:string,id:string|null){const fence=workspaceRecordFence(kind,id);return Boolean(await db.prepare(`SELECT 1 WHERE ${fence.sql}`).bind(...fence.args).first());}
export interface NoticeContent {eventKind:string;recordDisplayName:string;stageFrom:string|null;stageTo:string|null;ownerDisplayName:string|null;dueDate:string|null;link:string}
export async function noticeContent(db:D1Database,notice:Notice,origin:string):Promise<NoticeContent|null>{
 const select={opportunity:'SELECT r.title AS name,o.display_name AS owner FROM opportunities r LEFT JOIN operators o ON o.id=r.owner_id WHERE r.id=?',contact:'SELECT name,NULL AS owner FROM contacts WHERE id=?',company:'SELECT name,NULL AS owner FROM companies WHERE id=?'};
 const row=await db.prepare(select[notice.record_type]).bind(notice.record_id).first<{name:string|null;owner:string|null}>();if(!row)return null;
 const dueOwner=notice.event_kind==='due'?await db.prepare('SELECT o.display_name AS name FROM sales_tasks t LEFT JOIN operators o ON o.id=t.owner_id WHERE t.id=? UNION ALL SELECT o.display_name FROM handoff_tasks h LEFT JOIN operators o ON o.id=h.assignee_id WHERE h.id=?').bind(notice.source_id,notice.source_id).first<{name:string|null}>():null;
 return {eventKind:notice.event_kind,recordDisplayName:row.name??'Unnamed record',stageFrom:notice.stage_from,stageTo:notice.stage_to,ownerDisplayName:dueOwner?.name??row.owner,dueDate:notice.due_at,link:origin+recordHref({type:notice.record_type,id:notice.record_id!})};
}
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function slackMessage(id:string,content:NoticeContent){
 const lines=[`Orbit · ${content.eventKind}`,content.recordDisplayName,...(content.stageFrom||content.stageTo?[`Stage: ${content.stageFrom??'—'} → ${content.stageTo??'—'}`]:[]),...(content.ownerDisplayName?[`Owner: ${content.ownerDisplayName}`]:[]),...(content.dueDate?[`Due: ${content.dueDate}`]:[])];
 return {text:lines.map(escape).join('\n')+'\n'+content.link,unfurl_links:false,unfurl_media:false,parse:'none',blocks:[{type:'section',text:{type:'plain_text',text:lines.join('\n'),emoji:false}},{type:'actions',elements:[{type:'button',action_id:'orbit_ack',text:{type:'plain_text',text:'Acknowledge'},value:id},{type:'button',action_id:'orbit_task',text:{type:'plain_text',text:'Create internal task'},value:id},{type:'button',action_id:'orbit_open',text:{type:'plain_text',text:'Open in Orbit'},url:content.link}]}]};
}
