import {archiveImportActive} from '../../platform/archive-maintenance';
import {systemClock} from '../../platform/clock';
import type {SlackConfig} from '../slack/contracts';
import {credentials,installation,providerFailure} from '../slack/installation';
import {checkedPersonalUser,checkedPersonalDm,slackCall,SlackProviderError} from '../slack/provider';
import {personalAuthority,personalSource,type PersonalNotice} from './personal-access';
/** The claim is durable before transport; interrupted submissions never resend. */
export async function processPersonalSlack(db:D1Database,config:SlackConfig){
 if(await archiveImportActive(db))return;
 const clock=config.clock??systemClock,now=clock.now().toISOString(),item=await installation(db);
 await db.prepare("UPDATE slack_personal_notices SET state='uncertain',error='Submission interrupted; inspect Slack without resending' WHERE state='submitting' AND updated_at<?").bind(new Date(clock.now().getTime()-60000).toISOString()).run();
 if(!item||item.state!=='connected'||!config.security)return;
 const pending=(await db.prepare("SELECT * FROM slack_personal_notices WHERE state IN('queued','rate-limited') AND (retry_at IS NULL OR retry_at<=?) ORDER BY created_at,id LIMIT 20").bind(now).all<PersonalNotice>()).results;
 if(!pending.length)return;
 const {token}=await credentials(db,config);
 for(const notice of pending){
  let submitted=false;
  try{
   const authority=await personalAuthority(db,notice.operator_id,notice.preference_revision),source=await personalSource(db,notice);
   if(!authority||!source){await withdraw(db,notice.id);continue;}
   const {p}=authority;
   const auth=await slackCall(token,'auth.test',{},config.fetcher);if(auth.team_id!==item.team_id||auth.user_id!==item.bot_user_id)throw new SlackProviderError('invalid_auth');
   await checkedPersonalUser(token,p.slack_user_id,item.team_id,config.fetcher);
   const opened=await slackCall(token,'conversations.open',{users:p.slack_user_id,return_im:true},config.fetcher);
   const channel=opened.channel?.id;if(typeof channel!=='string'||!/^D[A-Z0-9]+$/.test(channel))throw new SlackProviderError('unsafe_personal_destination');
   await checkedPersonalDm(token,channel,p.slack_user_id,config.fetcher);
   // Provider checks can take time: read current consent, mapping and source again.
   if(!await personalAuthority(db,notice.operator_id,notice.preference_revision)||!await personalSource(db,notice)){await withdraw(db,notice.id);continue;}
   const claim=await db.prepare("UPDATE slack_personal_notices SET state='submitting',channel_id=?,error=NULL,retry_at=NULL,updated_at=? WHERE id=? AND state IN('queued','rate-limited') AND EXISTS(SELECT 1 FROM slack_personal_preferences WHERE operator_id=? AND enabled=1 AND revision=?)").bind(channel,clock.now().toISOString(),notice.id,notice.operator_id,notice.preference_revision).run();if(!claim.meta.changes)continue;
   submitted=true;
   const link=item.origin+source.href,text='Orbit · You were mentioned in a private entry. Open it securely in Orbit.';
   const result=await slackCall(token,'chat.postMessage',{channel,client_msg_id:notice.id,text:text+'\n'+link,unfurl_links:false,unfurl_media:false,parse:'none',blocks:[{type:'section',text:{type:'plain_text',text,emoji:false}},{type:'actions',elements:[{type:'button',action_id:'orbit_personal_open',text:{type:'plain_text',text:'Open in Orbit'},url:link}]}]},config.fetcher);
   if(typeof result.ts!=='string'||result.channel!==channel||(result.message?.app_id??result.message?.bot_profile?.app_id)!==item.app_id)throw new SlackProviderError('unaccepted_response',true);
   await db.prepare("UPDATE slack_personal_notices SET state='sent',message_ts=?,updated_at=? WHERE id=? AND state='submitting'").bind(result.ts,clock.now().toISOString(),notice.id).run();
  }catch(error){
   await providerFailure(db,error);
   const provider=error instanceof SlackProviderError?error:null,rate=provider?.retryAfter,state=submitted&&(!provider||provider.uncertain)?'uncertain':rate?'rate-limited':'failed';
   await db.prepare("UPDATE slack_personal_notices SET state=?,error=?,retry_at=?,updated_at=? WHERE id=? AND state IN('queued','rate-limited','submitting')").bind(state,provider?.code??'Personal delivery unavailable',rate?new Date(clock.now().getTime()+rate*1000).toISOString():null,clock.now().toISOString(),notice.id).run();
   if(provider?.revoked)break;
  }
 }
}
async function withdraw(db:D1Database,id:string){await db.prepare("UPDATE slack_personal_notices SET state='withdrawn',error='Mention, access, mapping or personal consent ended' WHERE id=? AND state IN('queued','rate-limited','failed')").bind(id).run();}
