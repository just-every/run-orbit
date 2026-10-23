import {Hono} from 'hono';
import {archiveImportActive} from '../../platform/archive-maintenance';
import {rejectedRateLimit} from '../../platform/public-rate-limit';
import {createId} from '../../shared/ids';
import {newTask} from '../tasks/mutations';
import {insertTask} from '../tasks/repository';
import {taskEffects} from '../tasks/effects';
import {audit} from '../records/shared';
import {credentials,installation} from './installation';
import {verified,slackBody} from './signature';
import {actionMapping,actorRecordFence,installationMatches} from './identity';
import type {Installation,Notice,SlackConfig} from './contracts';
const refusal='Not changed: Slack action is foreign, expired, already used, unmapped, revoked or no longer authorized. Open Orbit to inspect current work.';
/** Never retain a response_url: it carries a provider capability. It receives generic ephemeral outcomes only. */
async function respond(url:string,text:string,fetcher:typeof fetch=fetch){
 const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.hostname!=='hooks.slack.com'||!parsed.pathname.startsWith('/actions/')||parsed.username||parsed.password||parsed.hash)throw Error('Invalid Slack response destination');
 const result=await fetcher(url,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},body:JSON.stringify({response_type:'ephemeral',text}),signal:AbortSignal.timeout(5000)});if(!result.ok)throw Error('Slack action response unaccepted');
}
export function createSlackActionRoutes(db:D1Database,config:SlackConfig){
 const app=new Hono();
 app.post('/',async c=>{
  const refuse=async(reason:string)=>{await db.batch([audit(db,null,'slack.action-refused','slack','action',{reason})]);return c.json({response_type:'ephemeral',text:refusal});};
  // Unverified callbacks spend their network's public budget instead of writing an audit row each.
  const reject=async(status:200|401|413=200,body:object={response_type:'ephemeral',text:refusal})=>(await rejectedRateLimit(db,c.req.raw))??c.json(body,status);
  if(await archiveImportActive(db))return reject();
  const item=await installation(db);if(!item||item.state!=='connected')return reject();
  let secret:string;try{secret=(await credentials(db,config)).signingSecret;}catch{return reject();}
  let raw:string;try{raw=await slackBody(c.req.raw);}catch{return reject(413,{error:'Slack request exceeds the supported body size'});}if(!await verified(secret,raw,c.req.header('X-Slack-Request-Timestamp')??'',c.req.header('X-Slack-Signature')??''))return reject(401);
  let payload:any;try{payload=JSON.parse(new URLSearchParams(raw).get('payload')??'');}catch{return refuse('payload');}
  if(payload.type!=='block_actions'||!installationMatches(item,payload)||payload.actions?.length!==1)return refuse('foreign-installation');
  // Slack receives its HTTP acknowledgment before task work or response_url delivery.
  c.executionCtx.waitUntil(processAction(db,item,payload).then(text=>respond(payload.response_url,text,config.fetcher)).catch(async()=>{await db.batch([audit(db,null,'slack.action-response-unresolved','slack','action',{})]);}));
  return c.json({response_type:'ephemeral',text:'Action received. Its outcome will appear here shortly.'});
 });return app;
}
async function processAction(db:D1Database,item:Installation,payload:any){
 const reject=async(reason:string)=>{await db.batch([audit(db,null,'slack.action-refused','slack','action',{reason})]);return refusal;};
 const action=payload.actions[0];if(!['orbit_ack','orbit_task'].includes(action.action_id)||typeof action.value!=='string'||typeof payload.user?.id!=='string')return reject('unsupported-action');
 const issued=await db.prepare('SELECT * FROM slack_action_tokens WHERE id=? AND action=? AND consumed_at IS NULL').bind(action.value,action.action_id).first<{id:string;notice_id:string;event_key:string;channel_id:string;record_type:string;record_id:string;installation_epoch:string}>();
 if(!issued||issued.installation_epoch!==item.connected_at)return reject('one-use-action');
 const notice=await db.prepare("SELECT n.* FROM slack_notices n JOIN slack_channels c ON c.id=n.channel_id WHERE n.id=? AND n.state='sent' AND c.enabled=1").bind(issued.notice_id).first<Notice>();
 if(notice?.record_type==='dashboard')return reject('dashboard-has-no-actions');
 if(!notice||notice.installation_epoch!==item.connected_at||notice.event_key!==issued.event_key||notice.record_id!==issued.record_id||notice.record_type!==issued.record_type||notice.channel_id!==issued.channel_id||payload.channel?.id!==notice.channel_id||payload.container?.channel_id!==notice.channel_id||payload.container?.message_ts!==notice.message_ts||payload.message?.ts!==notice.message_ts||payload.message?.user!==item.bot_user_id)return reject('foreign-message');
 const mapping=await actionMapping(db,item,payload.user.id);if(!mapping)return reject('mapping-or-access');
 const visibility=actorRecordFence(notice.record_type,notice.record_id!,mapping.operator_id);
 if(!await db.prepare(`SELECT 1 WHERE ${visibility.sql}`).bind(...visibility.args).first())return reject('record-access');
 const now=new Date().toISOString(),task=action.action_id==='orbit_task'?newTask({title:'Follow up on Slack notice',recordType:notice.record_type,recordId:notice.record_id!,ownerId:mapping.operator_id,dueAt:notice.due_at??now,priority:'normal',type:'follow_up',notes:'',recurrence:'none',timezone:'UTC',reminderMinutes:null},mapping.operator_id,now):null;
 const guard=createId();
 try{await db.batch([
  db.prepare(`INSERT INTO runtime_controls(name,value) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM slack_action_tokens t JOIN slack_mappings m ON m.team_id=? AND m.enterprise_id=? AND m.app_id=? AND m.slack_user_id=? JOIN operators o ON o.id=m.operator_id JOIN access_memberships a ON a.operator_id=o.id AND a.workspace_id='workspace' AND a.status='active' JOIN access_workspaces w ON w.id=a.workspace_id AND w.policy_epoch=m.policy_epoch JOIN slack_installation i ON i.state='connected' AND i.connected_at=t.installation_epoch JOIN slack_notices n ON n.id=t.notice_id JOIN slack_channels c ON c.id=n.channel_id AND c.enabled=1 WHERE t.id=? AND t.consumed_at IS NULL AND m.operator_id=? AND m.revoked_at IS NULL AND o.status='active' AND n.state='sent' AND n.message_ts=? AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=o.id)) AND ${visibility.sql} AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN ('restore','archive_import')) THEN 'allowed' ELSE NULL END`).bind(guard,item.team_id,item.enterprise_id,item.app_id,payload.user.id,issued.id,mapping.operator_id,notice.message_ts,...visibility.args),
  db.prepare('UPDATE slack_action_tokens SET consumed_at=?,operator_id=? WHERE id=? AND consumed_at IS NULL').bind(now,mapping.operator_id,issued.id),
  db.prepare('INSERT INTO slack_actions VALUES(?,?,?,?,?,?,?)').bind(issued.id,notice.id,payload.user.id,mapping.operator_id,action.action_id,task?.id??null,now),
  ...(task?[db.prepare('INSERT INTO sales_task_series(id,created_at) VALUES(?,?)').bind(task.series_id,now),insertTask(db,task),...taskEffects(db,task,mapping.operator_id,'task.created').map(statement=>statement),db.prepare("UPDATE timeline_entries SET source='Slack' WHERE id IN(SELECT entry_id FROM sales_task_timeline WHERE task_id=?)").bind(task.id)]:[db.prepare('UPDATE slack_notices SET acknowledged_by=?,acknowledged_at=? WHERE id=?').bind(mapping.operator_id,now,notice.id)]),
  audit(db,mapping.operator_id,task?'slack.task-created':'slack.acknowledged','slack',issued.id,{noticeId:notice.id,taskId:task?.id??null}),db.prepare('DELETE FROM runtime_controls WHERE name=?').bind(guard)
 ]);}catch{
  const committed=await db.prepare('SELECT task_id FROM slack_actions WHERE id=?').bind(issued.id).first<{task_id:string|null}>().catch(()=>null);
  return committed?'Action already committed under your mapped Orbit identity.':'Action outcome is uncertain or was refused after an authority change. Inspect Orbit by this notice; never create a replacement task to reconcile it.';
 }
 return task?'Internal task created under your mapped Orbit identity.':'Notice acknowledged under your mapped Orbit identity.';
}
