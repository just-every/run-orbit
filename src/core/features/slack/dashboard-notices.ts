import type {Clock} from '../../platform/clock';
import {nextDashboardSend,type DashboardSchedule} from '../dashboards/schedules';
/** A dashboard channel gets only a fixed generic event and a sign-in link. Its audience never reads source figures. */
export function dashboardNoticeFence(id:string|null,version:string|null,channel:string){return {sql:"EXISTS(SELECT 1 FROM sales_dashboard_schedules s JOIN sales_dashboards d ON d.workspace_id=s.workspace_id AND d.id=s.dashboard_id JOIN operators o ON o.id=s.actor_id AND o.status='active' AND o.setup_owner=1 WHERE s.workspace_id='workspace' AND s.dashboard_id=? AND s.version=? AND s.state='active' AND d.authority=1 AND json_extract(s.body_json,'$.channelId')=? AND s.version=(SELECT max(v.version) FROM sales_dashboard_schedules v WHERE v.workspace_id=s.workspace_id AND v.dashboard_id=s.dashboard_id))",args:[id,version,channel]};}
export async function enqueueDashboardNotices(db:D1Database,clock:Clock){
 const now=clock.now();
 // A suspended destination needs a new owner save, never a replay on reconnect.
 await db.prepare("UPDATE sales_dashboard_schedules SET state='paused' WHERE state='active' AND (NOT EXISTS(SELECT 1 FROM slack_installation WHERE state='connected') OR NOT EXISTS(SELECT 1 FROM slack_channels c WHERE c.id=json_extract(sales_dashboard_schedules.body_json,'$.channelId') AND c.enabled=1))").run();
 const rows=(await db.prepare("SELECT s.dashboard_id,s.version,s.body_json,s.created_at,w.timezone FROM sales_dashboard_schedules s JOIN sales_dashboards d ON d.workspace_id=s.workspace_id AND d.id=s.dashboard_id CROSS JOIN workspace_settings w WHERE s.state='active' AND d.authority=1 AND s.version=(SELECT max(v.version) FROM sales_dashboard_schedules v WHERE v.workspace_id=s.workspace_id AND v.dashboard_id=s.dashboard_id)").all<{dashboard_id:string;version:number;body_json:string;created_at:string;timezone:string}>()).results;
 for(const row of rows){
  const schedule=JSON.parse(row.body_json) as DashboardSchedule;if(!schedule.channelId)continue;
  const fence=dashboardNoticeFence(row.dashboard_id,String(row.version),schedule.channelId);if(!await db.prepare(`SELECT 1 WHERE ${fence.sql}`).bind(...fence.args).first())continue;
  const last=await db.prepare("SELECT max(due_at) AS due FROM slack_notices WHERE event_kind='dashboard' AND record_id=? AND source_id=?").bind(row.dashboard_id,String(row.version)).first<string>('due');
  const due=nextDashboardSend(schedule,row.timezone,new Date(last??row.created_at));if(due>now.toISOString())continue;
  await db.prepare(`INSERT OR IGNORE INTO slack_notices(id,event_key,event_kind,channel_id,record_type,record_id,source_id,due_at,created_at,updated_at) SELECT ?,?,'dashboard',?,'dashboard',?,?,?,?,? WHERE ${fence.sql}`).bind(crypto.randomUUID(),`dashboard:${row.dashboard_id}:${row.version}:${due}`,schedule.channelId,row.dashboard_id,String(row.version),due,now.toISOString(),now.toISOString(),...fence.args).run();
 }
}
