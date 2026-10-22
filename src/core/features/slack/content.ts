import {dashboardNoticeFence} from './dashboard-notices';
import {recordHref} from '../today/links';
import type {Notice} from './contracts';
/** All account-linked records must be visible to the full workspace before naming a deal or company. */
export function workspaceRecordFence(kind:string,id:string|null){return{sql:`EXISTS(SELECT 1 FROM graph_records WHERE workspace_id='workspace' AND kind=? AND id=? AND visibility='workspace' AND retired_into_id IS NULL) AND NOT EXISTS(SELECT 1 FROM graph_records g WHERE g.workspace_id='workspace' AND (g.visibility<>'workspace' OR g.retired_into_id IS NOT NULL) AND
 ((g.kind=? AND g.id=?) OR (?='opportunity' AND ((g.kind='company' AND g.id IN(SELECT company_id FROM opportunities WHERE id=?)) OR (g.kind='contact' AND g.id IN(SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?)))) OR (?='contact' AND g.kind='company' AND g.id IN(SELECT company_id FROM contacts WHERE id=?))))`,args:[kind,id,kind,id,kind,id,id,kind,id]};}
export async function workspaceRecord(db:D1Database,kind:string,id:string|null){const fence=workspaceRecordFence(kind,id);return Boolean(await db.prepare(`SELECT 1 WHERE ${fence.sql}`).bind(...fence.args).first());}
export interface NoticeContent {eventKind:string;link:string;recordDisplayName?:string;stageFrom?:string|null;stageTo?:string|null;ownerDisplayName?:string|null;dueDate?:string|null;taskType?:string|null;taskPriority?:string|null}
export async function noticeContent(db:D1Database,notice:Notice,origin:string):Promise<{content:NoticeContent;private:boolean}|null>{
 if(notice.event_kind==='dashboard'&&notice.record_type==='dashboard'){const fence=dashboardNoticeFence(notice.record_id,notice.source_id,notice.channel_id);if(!await db.prepare(`SELECT 1 WHERE ${fence.sql}`).bind(...fence.args).first())return null;return {content:{eventKind:'dashboard',link:origin+'/app/dashboards/'+encodeURIComponent(notice.record_id!)},private:true};}
 if(notice.record_type==='dashboard')return null;
 const select={opportunity:'SELECT r.title AS name,o.display_name AS owner FROM opportunities r LEFT JOIN operators o ON o.id=r.owner_id WHERE r.id=?',contact:'SELECT NULL AS name,NULL AS owner FROM contacts WHERE id=?',company:'SELECT name,NULL AS owner FROM companies WHERE id=?'};
 const row=await db.prepare(select[notice.record_type]).bind(notice.record_id).first<{name:string|null;owner:string|null}>();if(!row)return null;
 const content={eventKind:notice.event_kind,link:origin+recordHref({type:notice.record_type,id:notice.record_id!})};
 // Person names never enter channels. Private records get only a generic notice and the authenticated link.
 if(notice.record_type==='contact'||!await workspaceRecord(db,notice.record_type,notice.record_id))return{content,private:true};
 const task=notice.event_kind==='due'?await db.prepare('SELECT o.display_name AS owner,t.task_type AS type,t.priority FROM sales_tasks t LEFT JOIN operators o ON o.id=t.owner_id WHERE t.id=?').bind(notice.source_id).first<{owner:string|null;type:string;priority:string}>():null;
 return {content:{...content,recordDisplayName:row.name??'Unnamed account',stageFrom:notice.stage_from,stageTo:notice.stage_to,ownerDisplayName:task?.owner??row.owner,dueDate:notice.due_at,...(task?{taskType:task.type,taskPriority:task.priority}:{})},private:false};
}
export interface ActionButtons {ack:string;task:string}
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function slackMessage(buttons:ActionButtons,content:NoticeContent){
 if(content.eventKind==='dashboard')return {text:'Orbit · Dashboard ready.\n'+content.link,unfurl_links:false,unfurl_media:false,parse:'none',blocks:[{type:'section',text:{type:'plain_text',text:'Dashboard ready.',emoji:false}},{type:'actions',elements:[{type:'button',action_id:'orbit_open',text:{type:'plain_text',text:'Open in Orbit'},url:content.link}]}]};
 const lines=[`Orbit · ${content.eventKind}`,content.recordDisplayName??'A private record needs attention.',...(content.stageFrom||content.stageTo?[`Stage: ${content.stageFrom??'—'} → ${content.stageTo??'—'}`]:[]),...(content.ownerDisplayName?[`Owner: ${content.ownerDisplayName}`]:[]),...(content.dueDate?[`Due: ${content.dueDate}`]:[]),...(content.taskType?[`Type: ${content.taskType} · Priority: ${content.taskPriority}`]:[])];
 return {text:lines.map(escape).join('\n')+'\n'+content.link,unfurl_links:false,unfurl_media:false,parse:'none',blocks:[{type:'section',text:{type:'plain_text',text:lines.join('\n'),emoji:false}},{type:'actions',elements:[{type:'button',action_id:'orbit_ack',text:{type:'plain_text',text:'Acknowledge'},value:buttons.ack},{type:'button',action_id:'orbit_task',text:{type:'plain_text',text:'Create internal task'},value:buttons.task},{type:'button',action_id:'orbit_open',text:{type:'plain_text',text:'Open in Orbit'},url:content.link}]}]};
}
