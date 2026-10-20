import {credentials,installation,providerFailure} from './installation';
import {slackCall,SlackProviderError} from './provider';
import type {SlackConfig} from './contracts';
/** chat.delete is idempotent by channel + timestamp. An absent message is a verified deletion outcome. */
export async function processSlackDeletions(db:D1Database,config:SlackConfig){
 const item=await installation(db);if(!item)return;
 const pending=(await db.prepare("SELECT * FROM slack_deletions WHERE state IN ('queued','paused','rate-limited') AND (retry_at IS NULL OR retry_at<=?) ORDER BY created_at LIMIT 20").bind(new Date().toISOString()).all<{notice_id:string;team_id:string;app_id:string|null;channel_id:string;message_ts:string}>()).results;
 if(!pending.length)return;
 let token:string;try{token=(await credentials(db,config)).token;}catch{await db.prepare("UPDATE slack_deletions SET state='paused',error='Reconnect original Slack credentials to delete provider messages' WHERE state IN ('queued','rate-limited')").run();return;}
 for(const deletion of pending){
  if(deletion.team_id!==item.team_id||deletion.app_id!==item.app_id){await db.prepare("UPDATE slack_deletions SET state='failed',error='Original Slack installation is required for deletion' WHERE notice_id=?").bind(deletion.notice_id).run();continue;}
  try{await slackCall(token,'chat.delete',{channel:deletion.channel_id,ts:deletion.message_ts},config.fetcher);await finish(db,deletion.notice_id);}
  catch(error){if(error instanceof SlackProviderError&&error.code==='message_not_found'){await finish(db,deletion.notice_id);continue;}await providerFailure(db,error);const retry=error instanceof SlackProviderError&&error.retryAfter?new Date(Date.now()+error.retryAfter*1000).toISOString():null;await db.prepare('UPDATE slack_deletions SET state=?,error=?,retry_at=?,updated_at=? WHERE notice_id=?').bind(retry?'rate-limited':error instanceof SlackProviderError&&error.revoked?'paused':error instanceof SlackProviderError&&error.uncertain?'uncertain':'failed',error instanceof SlackProviderError?error.code:'Deletion outcome uncertain',retry,new Date().toISOString(),deletion.notice_id).run();}
 }
}
async function finish(db:D1Database,id:string){await db.prepare("UPDATE slack_deletions SET state='deleted',error=NULL,retry_at=NULL,updated_at=? WHERE notice_id=?").bind(new Date().toISOString(),id).run();}
