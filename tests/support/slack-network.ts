import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
/** Existing Slack stand-in, shared by native transport and emitted-UI fixtures. */
export function slackNetwork(){
 const native=globalThis.fetch,secret=randomBytes(32).toString('hex'),token='test-only-slack-bot',posts:any[]=[],deletes:any[]=[],responses:any[]=[];
 let lastMethod='',deletionOutcome:'sent'|'denied'|'timeout'|'rate'|'missing'|'wrong'='sent';
 let outcome:'sent'|'rate'|'timeout'|'revoked'|'failed'|'denied'|'missing'|'frozen'|'archived'|'auth-unavailable'='sent',attempts=0,safety:Record<string,unknown>={},userSafety:Record<string,unknown>={};
 const channel=(id='CINTERNAL')=>({id,name:id==='CINTERNAL'?'sales-internal':'external',is_channel:true,is_frozen:false,is_member:id!=='CNOTMEMBER',is_archived:false,is_shared:id==='CEXTERNAL',is_ext_shared:id==='CEXTERNAL',is_org_shared:false,is_pending_ext_shared:false,connected_team_ids:[],pending_connected_team_ids:[],context_team_id:'TWORKSPACE',...safety});
 const fetcher:typeof fetch=async(input,init)=>{
  if(String(input).startsWith('https://hooks.slack.com/actions/')){responses.push(JSON.parse(String(init?.body)));return new Response('ok');}
  if(!String(input).startsWith('https://slack.com/api/'))return native(input,init);
  assert.equal(init?.redirect,'manual');assert.equal(new Headers(init?.headers).get('authorization'),'Bearer '+token);
  const url=new URL(String(input)),method=url.pathname.split('/').at(-1),body=init?.body?JSON.parse(String(init.body)):Object.fromEntries(url.searchParams);
  if(outcome==='revoked')return Response.json({ok:false,error:'token_revoked'});
  if(method!=='chat.postMessage')lastMethod=String(method);
  if(method==='auth.test'&&outcome==='auth-unavailable')return Response.json({ok:false,error:'missing_scope'});
  if(method==='auth.test')return Response.json({ok:true,team_id:'TWORKSPACE',user_id:'UBOT',bot_id:'BBOT',enterprise_id:null});
  if(method==='users.info')return Response.json({ok:true,user:{id:body.user,team_id:'TWORKSPACE',deleted:false,is_bot:false,is_app_user:false,is_restricted:false,is_ultra_restricted:false,...userSafety}});
  if(method==='conversations.open')return Response.json({ok:true,channel:{id:'DPERSONAL'}});
  if(method==='conversations.list')return Response.json({ok:true,channels:[channel(),channel('CEXTERNAL'),channel('CNOTMEMBER')],response_metadata:{next_cursor:''}});
  if(method==='conversations.info')return Response.json({ok:true,channel:body.channel==='DPERSONAL'?{id:'DPERSONAL',is_im:true,user:'UPERSONAL',is_user_deleted:false}:channel(body.channel)});
  if(method==='chat.delete'){deletes.push(body);if(deletionOutcome==='timeout')throw new TypeError('Deletion acknowledgment lost');if(deletionOutcome==='denied')return Response.json({ok:false,error:'cant_delete_message'});if(deletionOutcome==='missing')return Response.json({ok:false,error:'message_not_found'});if(deletionOutcome==='rate'){deletionOutcome='sent';return new Response('',{status:429,headers:{'Retry-After':'2'}});}return Response.json({ok:true,channel:deletionOutcome==='wrong'?'DOTHER':body.channel,ts:body.ts});}
  assert.equal(method,'chat.postMessage');assert.equal(lastMethod,'conversations.info','Channel check immediately precedes every post');lastMethod='chat.postMessage';attempts++;
  if(outcome==='denied')return Response.json({ok:false,error:'restricted_action'});
  if(outcome==='rate'){outcome='sent';return new Response('',{status:429,headers:{'Retry-After':'1'}});}if(outcome==='timeout')throw new TypeError('connection lost after request left');if(outcome==='failed')return Response.json({ok:false,error:'not_in_channel'});if(outcome==='missing')return Response.json({ok:false,error:'channel_not_found'});if(outcome==='frozen')return Response.json({ok:false,error:'channel_is_frozen'});if(outcome==='archived')return Response.json({ok:false,error:'is_archived'});
  const ts=`1800000000.${String(posts.length+1).padStart(6,'0')}`;posts.push({...body,ts});return Response.json({ok:true,channel:body.channel,ts,message:{user:'UBOT',bot_id:'BBOT',app_id:'AORBIT',text:body.text,blocks:body.blocks}});
 };
 globalThis.fetch=fetcher;
 return {fetcher,posts,deletes,responses,secret,token,get attempts(){return attempts;},setOutcome(value:typeof outcome){outcome=value;},setDeletionOutcome(value:typeof deletionOutcome){deletionOutcome=value;},setUserSafety(value:Record<string,unknown>){userSafety=value;},setSafety(value:Record<string,unknown>){safety=value;},restore(){globalThis.fetch=native;}};
}
