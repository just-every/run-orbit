import {z} from 'zod';
import type {ActorContext} from '../../shared/expansion-contracts';
import {AccessError} from '../access/errors';
import type {Dashboards} from './repository';
export const removeInput=z.object({confirmed:z.literal(true)}).strict();
/** A real delete of the dashboard definition, its sharing, schedule and every person's default; the saved reports behind its tiles stay. */
export async function removeDashboard(dashboards:Dashboards,c:ActorContext,id:string){
 const current=await dashboards.head(c,id);if(!current.manage)throw new AccessError('permission','Only the dashboard owner or installation owner removes a dashboard.');
 const key=[current.c.workspaceId,id],where='WHERE workspace_id=? AND dashboard_id=?';
 await dashboards.store.commit(current.c,'analytics.read',id,current.h.version,[...dashboards.fence(current.c,id,current.h),
  {sql:`DELETE FROM sales_dashboard_defaults ${where}`,bindings:key},
  {sql:`DELETE FROM sales_dashboard_schedules ${where}`,bindings:key},
  {sql:`DELETE FROM sales_dashboard_shares ${where}`,bindings:key},
  {sql:`DELETE FROM sales_dashboard_versions ${where}`,bindings:key},
  {sql:'DELETE FROM sales_dashboards WHERE workspace_id=? AND id=?',bindings:key},
  {sql:"UPDATE slack_notices SET state='held',error='Dashboard removed; historical notice held' WHERE event_kind='dashboard' AND record_id=? AND state IN ('queued','rate-limited')",bindings:[id]}
 ],{action:'dashboard.removed'});
 return {removed:true};
}
