import {suspendDashboardSchedules} from './dashboard-suspension';
import {systemClock} from '../../platform/clock';
import {dashboardNoticeFence,enqueueDashboardNotices} from './dashboard-notices';
import {processSlackDeletions} from './deletions';
import {createId} from '../../shared/ids';
import {archiveImportActive} from '../../platform/archive-maintenance';
import {credentials,installation,providerFailure} from './installation';
import {checkedChannel,slackCall,SlackProviderError} from './provider';
import {noticeContent,slackMessage,workspaceRecord,workspaceRecordFence} from './content';
import type {Channel,Notice,SlackConfig} from './contracts';
/** Repeated timer ticks and route replays select the same source identity, never a new delivery. */
async function enqueueDue(db:D1Database){
 const now=new Date().toISOString();
 await db.prepare(`INSERT OR IGNORE INTO slack_notices(id,event_key,event_kind,channel_id,record_type,record_id,source_id,due_at,created_at,updated_at)
 SELECT lower(hex(randomblob(16))),'due:'||t.id||':'||t.reminder_revision,'due',c.id,t.record_type,COALESCE(t.contact_id,t.company_id,t.opportunity_id),t.id,t.due_at,?,?
 FROM sales_tasks t JOIN sales_task_series s ON s.id=t.series_id CROSS JOIN slack_channels c
 WHERE t.status='open' AND s.cancelled_at IS NULL AND t.due_at<=? AND c.enabled=1 AND EXISTS(SELECT 1 FROM json_each(c.events_json) WHERE value='due') AND EXISTS(SELECT 1 FROM slack_installation)`)
 .bind(now,now,now).run();
 for(const source of [
  {key:"'handoff-due:'||h.id||':'||h.due_at",table:"handoff_tasks h JOIN opportunities o ON o.id=h.opportunity_id",id:'h.id',record:'h.opportunity_id',due:'h.due_at',where:"h.status='open' AND h.source_client_id IS NULL AND o.lifecycle='open'"},
  {key:"'next-due:'||o.id||':'||o.next_due_at",table:'opportunities o',id:'o.id',record:'o.id',due:'o.next_due_at',where:"o.lifecycle='open' AND o.queue_state='next'"}
 ])await db.prepare(`INSERT OR IGNORE INTO slack_notices(id,event_key,event_kind,channel_id,record_type,record_id,source_id,due_at,created_at,updated_at)
 SELECT lower(hex(randomblob(16))),${source.key},'due',c.id,'opportunity',${source.record},${source.id},${source.due},?,? FROM ${source.table} CROSS JOIN slack_channels c
 WHERE ${source.where} AND ${source.due}<=? AND c.enabled=1 AND EXISTS(SELECT 1 FROM json_each(c.events_json) WHERE value='due')`).bind(now,now,now).run();

}
export async function processSlack(db:D1Database,config:SlackConfig){
 try{await processSlackDeletions(db,config);await processPending(db,config);}catch{await db.batch([...suspendDashboardSchedules(db,'Slack processing failed; enable the saved schedule again after resolving setup.'),db.prepare("UPDATE slack_installation SET state='error',error='Slack processing failed; inspect setup and reconnect'"),db.prepare("UPDATE slack_notices SET state='paused',error='Slack processing failed; notices paused' WHERE state IN ('queued','rate-limited')")]);}
}
async function processPending(db:D1Database,config:SlackConfig){
 const clock=config.clock??systemClock;
 if(await archiveImportActive(db))return;
 const item=await installation(db);if(!item)return;
 await enqueueDue(db);await enqueueDashboardNotices(db,config.clock??systemClock);
 if(item.state!=='connected'||!config.security||!await db.prepare("SELECT 1 FROM slack_credentials WHERE id='slack'").first()){
  await db.prepare("UPDATE slack_notices SET state='paused',error='Slack unresolved setup; reconnect in Settings' WHERE state IN ('queued','rate-limited')").run();return;
 }
 if(item.retry_at&&item.retry_at>clock.now().toISOString())return;
 const {token}=await credentials(db,config),now=clock.now().toISOString();
 try{const auth=await slackCall(token,'auth.test',{},config.fetcher);if(auth.team_id!==item.team_id||auth.user_id!==item.bot_user_id)throw new SlackProviderError('invalid_auth');}
 catch(error){await providerFailure(db,error);if(error instanceof SlackProviderError&&error.revoked)return;
 const code=error instanceof SlackProviderError?error.code:'Workspace verification failed',retry=error instanceof SlackProviderError&&error.retryAfter?new Date(clock.now().getTime()+error.retryAfter*1000).toISOString():null;
 await db.batch([db.prepare('UPDATE slack_installation SET error=?,retry_at=?').bind(code,retry),db.prepare('UPDATE slack_channels SET last_error=?,retry_at=? WHERE enabled=1').bind(code,retry),db.prepare("UPDATE slack_notices SET state=?,error=?,retry_at=? WHERE state IN ('queued','rate-limited')").bind(retry?'rate-limited':'queued',code,retry)]);return;}
 // A crash after claiming may have submitted a message. It is held, never reclaimed for resend.
 await db.prepare("UPDATE slack_notices SET state='uncertain',error='Submission interrupted; inspect Slack and resolve by hand' WHERE state='submitting' AND updated_at<?").bind(new Date(clock.now().getTime()-60000).toISOString()).run();
 const pending=(await db.prepare(`SELECT n.* FROM slack_notices n JOIN slack_channels c ON c.id=n.channel_id WHERE n.state IN ('queued','rate-limited') AND c.enabled=1 AND (n.retry_at IS NULL OR n.retry_at<=?) AND (c.retry_at IS NULL OR c.retry_at<=?) ORDER BY n.created_at,n.id LIMIT 20`).bind(now,now).all<Notice>()).results;
 for(const notice of pending){
  if((await installation(db))?.state!=='connected')break;
  const channel=await db.prepare('SELECT * FROM slack_channels WHERE id=?').bind(notice.channel_id).first<Channel>();
  if(!channel||!channel.enabled||(channel.retry_at&&channel.retry_at>clock.now().toISOString()))continue;
  const prepared=await noticeContent(db,notice,item.origin);
  if(!prepared){await db.prepare("UPDATE slack_notices SET state='redacted',content_json=NULL,error='Underlying record unavailable' WHERE id=?").bind(notice.id).run();continue;}
  const content=prepared.content;
  let submitted=false;
  try{
   await checkedChannel(token,channel.id,item.team_id,config.fetcher);
   const visibility=notice.record_type==='dashboard'?dashboardNoticeFence(notice.record_id,notice.source_id,notice.channel_id):prepared.private?{sql:'EXISTS(SELECT 1 FROM graph_records WHERE kind=? AND id=? AND retired_into_id IS NULL)',args:[notice.record_type,notice.record_id]}:workspaceRecordFence(notice.record_type,notice.record_id);
   const claimed=await db.prepare(`UPDATE slack_notices SET state='submitting',content_json=?,privacy=?,installation_epoch=?,error=NULL,retry_at=NULL,updated_at=? WHERE id=? AND state IN ('queued','rate-limited') AND EXISTS(SELECT 1 FROM slack_installation WHERE state='connected') AND EXISTS(SELECT 1 FROM slack_channels WHERE id=? AND enabled=1) AND ${visibility.sql}`).bind(JSON.stringify(content),prepared.private?'withheld':null,item.connected_at,clock.now().toISOString(),notice.id,channel.id,...visibility.args).run();
   if(!claimed.meta.changes)continue;
   const buttons={ack:crypto.randomUUID(),task:crypto.randomUUID()};
   if(notice.record_type!=='dashboard')await db.batch([db.prepare('DELETE FROM slack_action_tokens WHERE notice_id=? AND consumed_at IS NULL').bind(notice.id),...Object.entries(buttons).map(([kind,id])=>db.prepare('INSERT INTO slack_action_tokens(id,notice_id,action,event_key,channel_id,record_type,record_id,installation_epoch) VALUES(?,?,?,?,?,?,?,?)').bind(id,notice.id,kind==='ack'?'orbit_ack':'orbit_task',notice.event_key,notice.channel_id,notice.record_type,notice.record_id,item.connected_at))]);
   submitted=true;
   const result=await slackCall(token,'chat.postMessage',{channel:channel.id,client_msg_id:notice.id,...slackMessage(buttons,content)},config.fetcher);
   if(typeof result.ts!=='string'||result.channel!==channel.id)throw new SlackProviderError('unaccepted_response',true);
   const appId=result.message?.app_id??result.message?.bot_profile?.app_id;
   if(typeof appId!=='string'||!/^A[A-Z0-9]+$/.test(appId)||item.app_id&&item.app_id!==appId)throw new SlackProviderError('unaccepted_response',true);
   item.app_id=appId;
   await db.batch([db.prepare('UPDATE slack_installation SET app_id=? WHERE connected_at=?').bind(appId,item.connected_at),db.prepare("UPDATE slack_notices SET state='sent',message_ts=?,delivery_team_id=?,delivery_app_id=?,error=NULL,updated_at=? WHERE id=? AND state='submitting'").bind(result.ts,item.team_id,appId,clock.now().toISOString(),notice.id),db.prepare('UPDATE slack_channels SET last_error=NULL,retry_at=NULL WHERE id=?').bind(channel.id)]);
  }catch(error){
   await providerFailure(db,error);
   if(error instanceof SlackProviderError&&['not_in_channel','channel_not_found','is_archived','is_frozen','channel_is_frozen','channel_is_archived'].includes(error.code)||!(error instanceof SlackProviderError)){await db.batch([...suspendDashboardSchedules(db,'Channel safety changed; enable the saved schedule again after confirmation.',channel.id),db.prepare("UPDATE slack_channels SET enabled=0,last_error='Channel safety changed; administrator must re-confirm' WHERE id=?").bind(channel.id),db.prepare("UPDATE slack_notices SET state='paused',error='Channel suspended; administrator must re-confirm' WHERE channel_id=? AND state IN ('queued','rate-limited')").bind(channel.id)]);}
   const code=error instanceof SlackProviderError?error.code:'Channel safety check failed',rate=error instanceof SlackProviderError?error.retryAfter:null;
   const retry=rate?new Date(clock.now().getTime()+rate*1000).toISOString():null;
   const state=error instanceof SlackProviderError&&error.revoked?'paused':rate?'rate-limited':submitted&&(!(error instanceof SlackProviderError)||error.uncertain)?'uncertain':'failed';
   await db.batch([db.prepare("UPDATE slack_notices SET state=?,error=?,retry_at=?,content_json=CASE WHEN ?='failed' THEN NULL ELSE content_json END,updated_at=? WHERE id=? AND state IN ('queued','rate-limited','submitting','paused')").bind(state,code,retry,state,clock.now().toISOString(),notice.id),db.prepare('UPDATE slack_channels SET last_error=?,retry_at=? WHERE id=?').bind(code,retry,channel.id)]);
  }
 }
}
