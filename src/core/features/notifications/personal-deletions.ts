import {archiveImportActive} from '../../platform/archive-maintenance';
import {systemClock} from '../../platform/clock';
import type {SlackConfig} from '../slack/contracts';
import {credentials,installation,providerFailure} from '../slack/installation';
import {slackCall,SlackProviderError} from '../slack/provider';
/** Deletion survives local erasure. Consent ending never authorizes another post. */
export async function processPersonalDeletions(db:D1Database,config:SlackConfig){
 if(await archiveImportActive(db))return;
 const clock=config.clock??systemClock,now=clock.now().toISOString(),item=await installation(db);
 const pending=(await db.prepare("SELECT * FROM slack_personal_deletions WHERE state IN('queued','paused','rate-limited') AND (retry_at IS NULL OR retry_at<=?) ORDER BY created_at,notice_id LIMIT 20").bind(now).all<{notice_id:string;team_id:string;app_id:string;channel_id:string;message_ts:string}>()).results;
 if(!pending.length)return;
 let token:string;
 try{token=(await credentials(db,config)).token;}catch{await db.prepare("UPDATE slack_personal_deletions SET state='paused',error='Reconnect original Slack credentials to delete personal messages' WHERE state IN('queued','rate-limited')").run();return;}
 for(const row of pending){
  if(!item||row.team_id!==item.team_id||row.app_id!==item.app_id){await db.prepare("UPDATE slack_personal_deletions SET state='held',error='Original Slack installation required' WHERE notice_id=?").bind(row.notice_id).run();continue;}
  try{
   const auth=await slackCall(token,'auth.test',{},config.fetcher);
   if(auth.team_id!==row.team_id||auth.user_id!==item.bot_user_id)throw new SlackProviderError('invalid_auth');
   const result=await slackCall(token,'chat.delete',{channel:row.channel_id,ts:row.message_ts},config.fetcher);
   if(result.channel!==row.channel_id||result.ts!==row.message_ts)throw new SlackProviderError('unaccepted_response',true);
   await finish(row.notice_id);
  }catch(error){
   if(error instanceof SlackProviderError&&error.code==='message_not_found'){await finish(row.notice_id);continue;}
   await providerFailure(db,error);
   const provider=error instanceof SlackProviderError?error:null,rate=provider?.retryAfter;
   await db.prepare("UPDATE slack_personal_deletions SET state=?,error=?,retry_at=?,updated_at=? WHERE notice_id=? AND state<>'deleted'").bind(rate?'rate-limited':provider?.revoked?'paused':!provider||provider.uncertain?'uncertain':'failed',provider?.code??'Deletion outcome uncertain',rate?new Date(clock.now().getTime()+rate*1000).toISOString():null,now,row.notice_id).run();
   if(provider?.revoked)break;
  }
 }
 async function finish(id:string){await db.prepare("UPDATE slack_personal_deletions SET state='deleted',error=NULL,retry_at=NULL,updated_at=? WHERE notice_id=?").bind(clock.now().toISOString(),id).run();}
}
