import {suspendDashboardSchedules} from './dashboard-suspension';
import {createId} from '../../shared/ids';
import {Hono} from 'hono';
import {audit} from '../records/shared';
import {archiveImportActive} from '../../platform/archive-maintenance';
import {rejectedRateLimit} from '../../platform/public-rate-limit';
import {credentials,installation} from './installation';
import {verified,slackBody} from './signature';
import type {SlackConfig} from './contracts';
/** Event IDs, not Slack retry headers, deduplicate signed safety notifications. */
export function createSlackEventRoutes(db:D1Database,config:SlackConfig){
 const app=new Hono();
 app.post('/',async c=>{
  const refuse=async(reason:string,status:403|400)=>{await db.batch([audit(db,null,'slack.event-refused','slack','event',{reason})]);return c.json({error:'Slack event refused'},status);};
  // Unverified callbacks spend their network's public budget instead of writing an audit row each.
  const reject=async(status:401|413|503,error='Slack event refused')=>(await rejectedRateLimit(db,c.req.raw))??c.json({error},status);
  if(await archiveImportActive(db))return reject(503);
  const item=await installation(db);if(!item)return reject(401);
  let secret:string;try{secret=(await credentials(db,config)).signingSecret;}catch{return reject(401);}
  let raw:string;try{raw=await slackBody(c.req.raw);}catch{return reject(413,'Slack request exceeds the supported body size');}if(!await verified(secret,raw,c.req.header('X-Slack-Request-Timestamp')??'',c.req.header('X-Slack-Signature')??''))return reject(401);
  let payload:any;try{payload=JSON.parse(raw);}catch{return refuse('payload',400);}
  if(payload.type==='url_verification'&&typeof payload.challenge==='string')return c.json({challenge:payload.challenge});
  const enterprise=payload.enterprise_id??payload.authorizations?.find((a:any)=>a.team_id===item.team_id)?.enterprise_id??'';
  if(!item.app_id||payload.team_id!==item.team_id||payload.api_app_id!==item.app_id||enterprise!==item.enterprise_id||typeof payload.event_id!=='string'||!/^Ev[A-Za-z0-9]+$/.test(payload.event_id))return refuse('foreign-installation',403);
  if(await db.prepare('SELECT 1 FROM slack_events WHERE id=?').bind(payload.event_id).first())return c.json({received:true,replayed:true});
  const event=payload.event??{},now=new Date().toISOString(),guard=createId(),statements=[db.prepare("INSERT INTO runtime_controls(name,value) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM slack_installation WHERE connected_at=? AND team_id=? AND app_id=?) THEN 'allowed' ELSE NULL END").bind(guard,item.connected_at,item.team_id,item.app_id),db.prepare('INSERT INTO slack_events VALUES(?,?,?)').bind(payload.event_id,String(event.type??'unknown').slice(0,80),now)];
  const channel=typeof event.channel==='string'?event.channel:event.channel?.id;
  const suspend=['channel_shared','channel_unshared','channel_archive','group_archive','channel_left'].includes(event.type)||event.type==='member_left_channel'&&event.user===item.bot_user_id;
  if(suspend&&typeof channel==='string')statements.push(...suspendDashboardSchedules(db,'Channel safety changed; enable the saved schedule again after confirmation.',channel),db.prepare("UPDATE slack_channels SET enabled=0,last_error='Channel safety changed; administrator must re-confirm' WHERE id=?").bind(channel),db.prepare("UPDATE slack_notices SET state='paused',error='Channel suspended; administrator must re-confirm' WHERE channel_id=? AND state IN ('queued','rate-limited')").bind(channel));
  if(event.type==='user_change'&&event.user?.deleted===true&&event.user.team_id===item.team_id)statements.push(db.prepare('UPDATE slack_mappings SET revoked_at=? WHERE team_id=? AND enterprise_id=? AND app_id=? AND slack_user_id=?').bind(now,item.team_id,item.enterprise_id,item.app_id,event.user.id));
  if(['app_uninstalled','tokens_revoked'].includes(event.type))statements.push(...suspendDashboardSchedules(db,'Slack revoked; reconnect and enable the saved schedule again.'),db.prepare("UPDATE slack_installation SET state='revoked',error='Slack app or token revoked'"),db.prepare('UPDATE slack_mappings SET revoked_at=?').bind(now),db.prepare("UPDATE slack_notices SET state='paused',error='Slack revoked' WHERE state IN ('queued','rate-limited')"));
  statements.push(db.prepare('DELETE FROM runtime_controls WHERE name=?').bind(guard),audit(db,null,'slack.safety-event','slack',payload.event_id,{event:String(event.type??'unknown').slice(0,80)}));
  try{await db.batch(statements);}catch{if(await db.prepare('SELECT 1 FROM slack_events WHERE id=?').bind(payload.event_id).first())return c.json({received:true,replayed:true});return c.json({error:'Event not committed; Slack may retry'},503);}
  return c.json({received:true});
 });return app;
}
