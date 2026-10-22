import {z} from 'zod';
import type {ActorContext} from '../../shared/expansion-contracts';
import {AccessError} from '../access/errors';
import {taskInstant,shiftTaskDay} from '../tasks/time';
import {localTime} from '../outreach/time';
import type {Dashboards} from './repository';
export const scheduleInput=z.object({version:z.number().int().min(0),frequency:z.enum(['daily','weekly','monthly']),hour:z.number().int().min(0).max(23),minute:z.number().int().min(0).max(59),weekday:z.number().int().min(0).max(6),day:z.number().int().min(1).max(28),recipientIds:z.array(z.string().min(1).max(120)).min(1).max(200),channelId:z.string().max(40).nullable(),pdf:z.boolean(),csv:z.boolean()}).strict();
export type DashboardSchedule=z.infer<typeof scheduleInput>;
export const deliveryGap='Email paused: dashboard email needs a system notification sender. The managed relay cannot carry attachments. All dashboard destinations stay paused until that sender exists; nothing will be sent.';
/** The existing task clock resolver handles repeated minutes and spring gaps. No real wait. */
export function nextDashboardSend(input:DashboardSchedule,timezone:string,now:Date){
 const start=localTime(now,timezone).day;
 for(let offset=0;offset<370;offset++){
  const day=shiftTaskDay(start,offset),date=new Date(`${day}T12:00:00Z`);
  if(input.frequency==='weekly'&&date.getUTCDay()!==input.weekday||input.frequency==='monthly'&&date.getUTCDate()!==input.day)continue;
  const instant=taskInstant(`${day}T${String(input.hour).padStart(2,'0')}:${String(input.minute).padStart(2,'0')}`,timezone);
  if(Date.parse(instant)>now.getTime())return instant;
 }
 throw new AccessError('validation','This schedule has no next date.');
}
export async function dashboardSchedule(dashboards:Dashboards,c:ActorContext,id:string,input?:unknown,now=dashboards.clock.now()){
 const current=await dashboards.head(c,id);if(!current.manage)throw new AccessError('permission','Only the dashboard owner or installation owner manages schedules.');
 const latest=await dashboards.db.prepare('SELECT version,body_json,state FROM sales_dashboard_schedules WHERE workspace_id=? AND dashboard_id=? ORDER BY version DESC LIMIT 1').bind(c.workspaceId,id).first<{version:number;body_json:string;state:string}>();
 const suite=await dashboards.metrics.sales.suite(current.c),members=await dashboards.metrics.sales.shares.members(current.c);
 const channels=await dashboards.adminChannels(current.c);
 if(input!==undefined){const parsed=scheduleInput.parse(input);if(parsed.version!==(latest?.version??0))throw new AccessError('conflict','Schedule changed. Reload before saving.');if(parsed.recipientIds.some(person=>!members.some(m=>m.id===person)))throw new AccessError('validation','Choose active recipients only.');if(parsed.channelId&&!channels.some(channel=>channel.id===parsed.channelId))throw new AccessError('validation','Choose an authorized Slack channel.');
  const version=parsed.version+1;await dashboards.store.commit(current.c,'analytics.read',id,version,[...dashboards.fence(current.c,id,current.h),...dashboards.store.guard('COALESCE((SELECT max(version) FROM sales_dashboard_schedules WHERE workspace_id=? AND dashboard_id=?),0)=?',[c.workspaceId,id,parsed.version]),{sql:"INSERT INTO sales_dashboard_schedules VALUES(?,?,?,?,?,?,?)",bindings:[c.workspaceId,id,version,JSON.stringify({...parsed,version}),'paused',c.principal.kind==='operator'?c.principal.operatorId:null,now.toISOString()]}]);return dashboardSchedule(dashboards,c,id,undefined,now);
 }
 const history=(await dashboards.db.prepare("SELECT n.id,n.due_at AS at,n.state,n.error,c.name AS channel FROM slack_notices n JOIN slack_channels c ON c.id=n.channel_id WHERE n.event_kind='dashboard' AND n.record_id=? ORDER BY n.created_at DESC LIMIT 50").bind(id).all<{id:string;at:string;state:string;error:string|null;channel:string}>()).results;
 const definition:DashboardSchedule=latest?JSON.parse(latest.body_json):{version:0,frequency:'weekly',hour:8,minute:0,weekday:1,day:1,recipientIds:[],channelId:null,pdf:false,csv:false};
 return {definition,state:latest?.state??'paused',gap:deliveryGap,timezone:suite.timezone,nextAt:nextDashboardSend(definition,suite.timezone,now),members,channels,history};
}
