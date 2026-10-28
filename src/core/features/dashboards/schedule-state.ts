import {z} from 'zod';
import type {ActorContext} from '../../shared/expansion-contracts';
import {AccessError} from '../access/errors';
import {createId} from '../../shared/ids';
import type {Dashboards} from './repository';
import {dashboardSchedule} from './schedules';
import {dashboardNoticeFence} from '../slack/dashboard-notices';

/** Enable is separate from saving a definition: it grants only Slack destination authority. */
export async function setDashboardSlack(dashboards:Dashboards,c:ActorContext,id:string,input:unknown){
 const {version,enabled}=z.object({version:z.number().int().positive(),enabled:z.boolean()}).strict().parse(input);
 const current=await dashboards.head(c,id),actor=(c.principal.kind==='operator'||c.principal.kind==='agent')?c.principal.operatorId:'';
 if(!await dashboards.db.prepare("SELECT 1 FROM operators WHERE id=? AND status='active' AND setup_owner=1").bind(actor).first())throw new AccessError('permission','Only the installation owner enables Slack schedules until TEAM-005.');
 const schedule=await dashboards.db.prepare('SELECT body_json FROM sales_dashboard_schedules WHERE workspace_id=? AND dashboard_id=? AND version=? AND version=(SELECT max(version) FROM sales_dashboard_schedules WHERE workspace_id=? AND dashboard_id=?)').bind(c.workspaceId,id,version,c.workspaceId,id).first<{body_json:string}>();
 if(!schedule)throw new AccessError('conflict','Schedule changed. Reload before enabling.');
 const channelId=JSON.parse(schedule.body_json).channelId as string|null;
 if(enabled&&(!channelId||!(await dashboards.adminChannels(current.c)).some(channel=>channel.id===channelId)))throw new AccessError('validation','Choose an eligible channel with Dashboard ready routing, then save the schedule.');
 const now=dashboards.clock.now().toISOString(),epoch=await dashboards.db.prepare("SELECT connected_at FROM slack_installation WHERE state='connected'").first<string>('connected_at');
 await dashboards.store.commit(current.c,'analytics.read',id,version,[...dashboards.fence(current.c,id,current.h),...dashboards.store.guard('EXISTS(SELECT 1 FROM sales_dashboard_schedules WHERE workspace_id=? AND dashboard_id=? AND version=? AND version=(SELECT max(version) FROM sales_dashboard_schedules WHERE workspace_id=? AND dashboard_id=?))',[c.workspaceId,id,version,c.workspaceId,id]),
  {sql:'UPDATE sales_dashboard_schedules SET state=?,actor_id=? WHERE workspace_id=? AND dashboard_id=? AND version=?',bindings:[enabled?'active':'paused',actor,c.workspaceId,id,version]},
  {sql:'INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) VALUES(?,?,?,?,?,?,?)',bindings:[createId(),actor,enabled?'slack.dashboard-enabled':'slack.dashboard-paused','dashboard',id,JSON.stringify({version,epoch,reason:enabled?'Explicit owner enable':'Paused by installation owner'}),now]},
  ...(enabled?dashboards.store.guard(dashboardNoticeFence(id,String(version),channelId!).sql,dashboardNoticeFence(id,String(version),channelId!).args):[]),
  {sql:"UPDATE slack_notices SET state='held',error='Schedule authority changed; historical notice held' WHERE event_kind='dashboard' AND record_id=? AND state IN ('queued','rate-limited')",bindings:[id]}
 ],{action:enabled?'dashboard.slack-enabled':'dashboard.slack-paused',scheduleVersion:version});
 return dashboardSchedule(dashboards,c,id);
}
