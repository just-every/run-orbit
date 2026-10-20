import {Hono} from 'hono';
import {payloadHash} from '../../platform/source-security';
import {archiveImportActive} from '../../platform/archive-maintenance';
import {createId} from '../../shared/ids';
import {newTask} from '../tasks/mutations';
import {insertTask} from '../tasks/repository';
import {taskEffects} from '../tasks/effects';
import {credentials,installation} from './installation';
import {workspaceRecord,workspaceRecordFence} from './content';
import type {Notice,SlackConfig} from './contracts';
async function verified(secret:string,raw:string,timestamp:string,signature:string){
 if(!/^\d{10}$/.test(timestamp)||Math.abs(Date.now()-Number(timestamp)*1000)>300000||!/^v0=[a-f0-9]{64}$/.test(signature))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 return crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.slice(3).match(/../g)!,part=>parseInt(part,16)),new TextEncoder().encode(`v0:${timestamp}:${raw}`));
}
export function createSlackActionRoutes(db:D1Database,config:SlackConfig){
 const app=new Hono();
 app.post('/',async c=>{
  const refuse=(text:string)=>c.json({response_type:'ephemeral',text:'Not changed: '+text});
  if(await archiveImportActive(db))return refuse('Orbit is restoring an archive.');
  const item=await installation(db);if(!item||item.state!=='connected')return refuse('Slack is disconnected or revoked.');
  let secret:string;try{secret=(await credentials(db,config)).signingSecret;}catch{return refuse('Slack credentials need setup.');}
  const raw=await c.req.text();if(raw.length>65536)return c.json({error:'Action too large.'},413);
  if(!await verified(secret,raw,c.req.header('X-Slack-Request-Timestamp')??'',c.req.header('X-Slack-Signature')??''))return c.json({error:'Invalid, unsigned or stale Slack action.'},401);
  let payload:any;try{payload=JSON.parse(new URLSearchParams(raw).get('payload')??'');}catch{return refuse('Invalid Slack action.');}
  if(payload.type!=='block_actions'||payload.team?.id!==item.team_id||payload.actions?.length!==1)return refuse('Foreign workspace or unsupported action.');
  const action=payload.actions[0],id=action.value;
  if(!['orbit_ack','orbit_task'].includes(action.action_id)||typeof id!=='string'||typeof action.action_ts!=='string'||typeof payload.user?.id!=='string')return refuse('Unsupported action. Customer mail cannot be changed from Slack.');
  const notice=await db.prepare("SELECT n.* FROM slack_notices n JOIN slack_channels c ON c.id=n.channel_id WHERE n.id=? AND n.state='sent' AND c.enabled=1").bind(id).first<Notice>();
  if(!notice||payload.channel?.id!==notice.channel_id||payload.container?.channel_id!==notice.channel_id||payload.container?.message_ts!==notice.message_ts||payload.message?.ts!==notice.message_ts||payload.message?.user!==item.bot_user_id)return refuse('Foreign channel or message; Orbit did not send this notice.');
  const mapping=await db.prepare("SELECT m.operator_id FROM slack_mappings m JOIN operators o ON o.id=m.operator_id WHERE m.slack_user_id=? AND m.revoked_at IS NULL AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=o.id)").bind(payload.user.id).first<{operator_id:string}>();
  if(!mapping)return refuse('Slack identity is unmapped, revoked or its operator was removed.');
  if(!await workspaceRecord(db,notice.record_type,notice.record_id))return refuse('Record access changed. Open Orbit for authorized work.');
  const replay=await payloadHash(`${item.team_id}:${payload.user.id}:${action.action_id}:${action.action_ts}:${id}`),now=new Date().toISOString();
  if(await db.prepare('SELECT 1 FROM slack_actions WHERE id=?').bind(replay).first())return refuse('This action was already received; replay refused.');
  const task=action.action_id==='orbit_task'?newTask({title:'Follow up on Slack notice',recordType:notice.record_type,recordId:notice.record_id!,ownerId:mapping.operator_id,dueAt:notice.due_at??now,priority:'normal',type:'follow_up',notes:'',recurrence:'none',timezone:'UTC',reminderMinutes:null},mapping.operator_id,now):null;
  const guard=createId(),visibility=workspaceRecordFence(notice.record_type,notice.record_id);
  try{await db.batch([
   db.prepare(`INSERT INTO runtime_controls(name,value) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM slack_mappings m JOIN operators o ON o.id=m.operator_id JOIN slack_installation i ON i.state='connected' JOIN slack_notices n ON n.id=? JOIN slack_channels c ON c.id=n.channel_id AND c.enabled=1 WHERE m.slack_user_id=? AND m.operator_id=? AND m.revoked_at IS NULL AND o.status='active' AND n.state='sent' AND n.message_ts=? AND i.team_id=? AND i.connected_at=? AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=o.id)) AND ${visibility.sql} AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN ('restore','archive_import')) THEN 'allowed' ELSE NULL END`).bind(guard,id,payload.user.id,mapping.operator_id,notice.message_ts,item.team_id,item.connected_at,...visibility.args),
   db.prepare('INSERT INTO slack_actions VALUES(?,?,?,?,?,?,?)').bind(replay,id,payload.user.id,mapping.operator_id,action.action_id,task?.id??null,now),
   ...(task?[db.prepare('INSERT INTO sales_task_series(id,created_at) VALUES(?,?)').bind(task.series_id,now),insertTask(db,task),...taskEffects(db,task,mapping.operator_id,'task.created')]:[db.prepare('UPDATE slack_notices SET acknowledged_by=?,acknowledged_at=? WHERE id=?').bind(mapping.operator_id,now,id)]),
   db.prepare('DELETE FROM runtime_controls WHERE name=?').bind(guard)
  ]);}catch{return refuse('The action was replayed or its identity, workspace or notice changed. Reload Orbit.');}
  return c.json({response_type:'ephemeral',text:task?'Internal task created under your mapped Orbit identity.':'Notice acknowledged under your mapped Orbit identity.'});
 });
 return app;
}
