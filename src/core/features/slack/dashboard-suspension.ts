/** Safety changes withdraw schedule authority in the same transaction as the route change.
 * Reconfirming a route never restores it, and queued historical occurrences stay held. */
export function suspendDashboardSchedules(db:D1Database,reason:string,channelId?:string,dashboardId?:string){
 const filter=(channelId?" AND json_extract(body_json,'$.channelId')=?":'')+(dashboardId?' AND dashboard_id=?':''),args=[...(channelId?[channelId]:[]),...(dashboardId?[dashboardId]:[])];
 return [
  db.prepare(`INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) SELECT lower(hex(randomblob(16))),NULL,'slack.dashboard-paused','dashboard',dashboard_id,json_object('version',version,'reason',?),strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM sales_dashboard_schedules WHERE state='active'${filter}`).bind(reason,...args),
  db.prepare(`UPDATE sales_dashboard_schedules SET state='paused' WHERE state='active'${filter}`).bind(...args),
  db.prepare(`UPDATE slack_notices SET state='held',error=? WHERE event_kind='dashboard' AND state IN ('queued','rate-limited')${channelId?' AND channel_id=?':''}${dashboardId?' AND record_id=?':''}`).bind(reason,...args)
 ];
}
