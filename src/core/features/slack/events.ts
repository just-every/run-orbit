import {Hono} from 'hono';
import {audit} from '../records/shared';
import {archiveImportActive} from '../../platform/archive-maintenance';
import {credentials,installation} from './installation';
import {verified} from './signature';
import type {SlackConfig} from './contracts';
/** Event IDs, not Slack retry headers, deduplicate signed safety notifications. */
export function createSlackEventRoutes(db:D1Database,config:SlackConfig){
 const app=new Hono();
 app.post('/',async c=>{
  if(await archiveImportActive(db))return c.json({error:'Archive restore active'},503);
  const item=await installation(db);if(!item)return c.json({error:'Slack setup required'},401);
  let secret:string;try{secret=(await credentials(db,config)).signingSecret;}catch{return c.json({error:'Slack setup required'},401);}
  const raw=await c.req.text();if(raw.length>65536||!await verified(secret,raw,c.req.header('X-Slack-Request-Timestamp')??'',c.req.header('X-Slack-Signature')??''))return c.json({error:'Invalid or stale Slack signature'},401);
  let payload:any;try{payload=JSON.parse(raw);}catch{return c.json({error:'Invalid Slack event'},400);}
  if(payload.type==='url_verification'&&typeof payload.challenge==='string')return c.json({challenge:payload.challenge});
  const enterprise=payload.enterprise_id??payload.authorizations?.find((a:any)=>a.team_id===item.team_id)?.enterprise_id??'';
  if(!item.app_id||payload.team_id!==item.team_id||payload.api_app_id!==item.app_id||enterprise!==item.enterprise_id||typeof payload.event_id!=='string'||!/^Ev[A-Za-z0-9]+$/.test(payload.event_id))return c.json({error:'Foreign Slack event'},403);
  if(await db.prepare('SELECT 1 FROM slack_events WHERE id=?').bind(payload.event_id).first())return c.json({received:true,replayed:true});
  const event=payload.event??{},now=new Date().toISOString(),statements=[db.prepare('INSERT INTO slack_events VALUES(?,?,?)').bind(payload.event_id,String(event.type??'unknown').slice(0,80),now)];
  const channel=typeof event.channel==='string'?event.channel:event.channel?.id;
  const suspend=['channel_shared','channel_unshared','channel_archive','group_archive','channel_left'].includes(event.type)||event.type==='member_left_channel'&&event.user===item.bot_user_id;
  if(suspend&&typeof channel==='string')statements.push(db.prepare("UPDATE slack_channels SET enabled=0,last_error='Channel safety changed; administrator must re-confirm' WHERE id=?").bind(channel),db.prepare("UPDATE slack_notices SET state='paused',error='Channel suspended; administrator must re-confirm' WHERE channel_id=? AND state IN ('queued','rate-limited')").bind(channel));
  if(event.type==='user_change'&&event.user?.deleted===true&&event.user.team_id===item.team_id)statements.push(db.prepare('UPDATE slack_mappings SET revoked_at=? WHERE team_id=? AND enterprise_id=? AND app_id=? AND slack_user_id=?').bind(now,item.team_id,item.enterprise_id,item.app_id,event.user.id));
  if(['app_uninstalled','tokens_revoked'].includes(event.type))statements.push(db.prepare("UPDATE slack_installation SET state='revoked',error='Slack app or token revoked'"),db.prepare('UPDATE slack_mappings SET revoked_at=?').bind(now),db.prepare("UPDATE slack_notices SET state='paused',error='Slack revoked' WHERE state IN ('queued','rate-limited')"));
  statements.push(audit(db,null,'slack.safety-event','slack',payload.event_id,{event:String(event.type??'unknown').slice(0,80)}));
  try{await db.batch(statements);}catch{if(await db.prepare('SELECT 1 FROM slack_events WHERE id=?').bind(payload.event_id).first())return c.json({received:true,replayed:true});return c.json({error:'Event not committed; Slack may retry'},503);}
  return c.json({received:true});
 });return app;
}
