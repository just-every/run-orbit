import {actionMapping} from '../slack/identity';
import {installation} from '../slack/installation';
import {mentionable,parseMentions,type MentionSource} from '../records/mentions';
import type {RecordKind} from '../records/shared';
export interface PersonalPreference {operator_id:string;enabled:number;revision:string;slack_user_id:string;team_id:string;enterprise_id:string;app_id:string;policy_epoch:number;mapping_confirmed_at:string;installation_epoch:string}
export interface PersonalNotice {id:string;operator_id:string;event_key:string;preference_revision:string;state:string;updated_at:string}
/** A reconnect, mapping change or policy change requires fresh personal consent. */
export async function personalAuthority(db:D1Database,actor:string,revision?:string){
 const item=await installation(db),p=await db.prepare('SELECT * FROM slack_personal_preferences WHERE operator_id=?').bind(actor).first<PersonalPreference>();
 if(!item||item.state!=='connected'||!p?.enabled||revision&&p.revision!==revision||p.installation_epoch!==item.connected_at||p.team_id!==item.team_id||p.enterprise_id!==item.enterprise_id||p.app_id!==item.app_id)return null;
 const mapping=await actionMapping(db,item,p.slack_user_id),current=await db.prepare('SELECT confirmed_at FROM slack_mappings WHERE team_id=? AND enterprise_id=? AND app_id=? AND slack_user_id=? AND operator_id=? AND revoked_at IS NULL').bind(item.team_id,item.enterprise_id,item.app_id,p.slack_user_id,actor).first<{confirmed_at:string}>();
 return mapping?.operator_id===actor&&mapping.policy_epoch===p.policy_epoch&&current?.confirmed_at===p.mapping_confirmed_at?{item,p}:null;
}
/** Resolve a surviving mention rather than trusting an old notification's text. */
export async function personalSource(db:D1Database,notice:Pick<PersonalNotice,'event_key'|'operator_id'>){
 const match=/^mention:(entry|task|handoff):(.+)$/.exec(notice.event_key);if(!match)return null;
 const source=match[1] as MentionSource,id=match[2]!;
 const queries={entry:"SELECT r.record_type AS kind,r.record_id AS recordId,json_extract(t.payload_json,'$.text') AS text FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE t.id=? AND t.kind IN('manual.note','manual.call','manual.meeting') AND EXISTS(SELECT 1 FROM json_each(t.payload_json,'$.mentions') WHERE value=?)",task:"SELECT record_type AS kind,COALESCE(contact_id,company_id,opportunity_id) AS recordId,notes AS text FROM sales_tasks WHERE id=? AND ? IS NOT NULL",handoff:"SELECT 'opportunity' AS kind,opportunity_id AS recordId,description AS text FROM handoff_tasks WHERE id=? AND ? IS NOT NULL"};
 const row=await db.prepare(queries[source]).bind(id,notice.operator_id).first<{kind:RecordKind;recordId:string;text:string}>();if(!row)return null;
 if(source!=='entry'&&!parseMentions(row.text??'',await mentionable(db)).some(c=>c.id===notice.operator_id))return null;
 // Personal delivery requires current record authority, including its company.
 const visible=await db.prepare(`SELECT 1 FROM graph_records g WHERE g.workspace_id='workspace' AND g.kind=? AND g.id=? AND g.retired_into_id IS NULL AND (g.visibility='workspace' OR g.owner_id=?) AND NOT EXISTS(SELECT 1 FROM graph_records parent WHERE parent.kind='company' AND parent.id IN(SELECT company_id FROM contacts WHERE ?='contact' AND id=? UNION SELECT company_id FROM opportunities WHERE ?='opportunity' AND id=?) AND (parent.retired_into_id IS NOT NULL OR parent.visibility<>'workspace' AND parent.owner_id IS NOT ?))`).bind(row.kind,row.recordId,notice.operator_id,row.kind,row.recordId,row.kind,row.recordId,notice.operator_id).first();
 if(!visible)return null;
 const href=source==='task'?`/app#sales-task-${id}`:source==='handoff'?`/app/opportunities/${row.recordId}#handoff-${id}`:row.kind==='opportunity'?`/app/opportunities/${row.recordId}#entry-${id}`:`/app/records?kind=${row.kind}&record=${row.recordId}#entry-${id}`;
 return {href};
}
