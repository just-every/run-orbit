import assert from 'node:assert/strict';
import {createDependencies} from './dependencies';
import {createId} from '../../src/core/shared/ids';
import type {SlackFixture} from './slack-notices-proof';
type Edge={posts:any[];call:(path:string,method?:string,body?:unknown)=>Promise<any>;outcome:(mode:'sent'|'rate'|'denied'|'timeout'|'revoked')=>void;safety:(value:Record<string,unknown>)=>void;signed:(payload:any,route:string)=>Promise<any>;secret:string;token:string};
/** Authenticated routes with Slack faked only at the network edge; no real provider call or consent was used. */
export async function proveDashboardSlack(f:SlackFixture,edge:Edge){
 const cookie=`__Host-orbit_session=${f.token}`,base='/api/v2/workspaces/workspace/dashboards/synthetic-orbit-slack';
 const response=(path:string,method='GET',body?:unknown)=>f.app.request('https://orbit.test'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const call=async(path:string,method='GET',body?:unknown)=>{const r=await response(path,method,body);assert.ok(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;};
 const settings=(await(await f.request('settings')).json() as any).workspace,timezone=async(zone:string)=>{const r=await f.request('settings','PUT',{name:settings.name,timezone:zone,currency:settings.currency,workingHours:{days:[1,2,3,4,5],start:'09:00',end:'17:00'},staleIntervalDays:settings.stale_interval_days,awaitingResponseWorkingDays:settings.awaiting_response_working_days,freeMailDomains:JSON.parse(settings.free_mail_domains_json)});assert.equal(r.status,200,await r.clone().text());};
 const confirm=(dashboard=true)=>edge.call('channels','PUT',{id:'CINTERNAL',events:['stage','due','won','handoff',...(dashboard?['dashboard']:[])],enabled:true});
 const schedule={version:0,frequency:'weekly',hour:8,minute:0,weekday:1,day:1,recipientIds:[f.actor],channelId:null as string|null,pdf:false,csv:false};
 let version=0;
 const save=async(channelId:string|null)=>{const saved=await call(base+'/schedule','PUT',{...schedule,version,channelId});version=saved.definition.version;assert.equal(saved.state,'paused','every new schedule version starts paused');return saved;};
 const enable=()=>call(base+'/schedule/slack','POST',{version,enabled:true});
 const process=()=>edge.call('process','POST',{}),notices=async()=>(await call(base+'/schedule')).history;
 const occurrence=async()=>{const data=await call(base+'/schedule'),at=data.nextAt;f.setClock(new Date(Date.parse(at)-60000));await save('CINTERNAL');await enable();f.setClock(new Date(at));return at;};
 try{
  f.setClock(new Date('2026-10-25T14:00:00Z'));await timezone('America/New_York');
  await call(base,'PUT',{version:0,definition:{name:'Private dashboard with $999,999 and customer names',filters:{ownerIds:[],pipelineIds:[],from:'2026-10',through:'2026-12',field:null},tiles:[]}});
  const first=await save(null);assert.equal(first.nextAt,'2026-10-26T12:00:00.000Z');const before=edge.posts.length;
  f.setClock(new Date(first.nextAt));await process();assert.equal(edge.posts.length,before,'email and a schedule with no Slack channel send nothing');
  assert.equal((await response(base+'/schedule/slack','POST',{version,enabled:true})).status,400);
  f.setClock(new Date('2026-11-01T14:00:00Z'));assert.equal((await call(base+'/schedule')).nextAt,'2026-11-02T13:00:00.000Z');
  assert.equal((await call(base+'/schedule')).channels.length,0,'a route that did not choose dashboard-ready cannot receive it');
  await confirm();await edge.call('channels','PUT',{id:'CUNCHOSEN',events:['won'],enabled:true});
  schedule.recipientIds=[];await save('CINTERNAL');const active=await enable();assert.equal(active.state,'active');assert.deepEqual(active.definition.recipientIds,[],'Slack has a channel audience, independent of email recipients');
  f.setClock(new Date(active.nextAt));await process();assert.equal(edge.posts.length,before+1);await process();assert.equal(edge.posts.length,before+1,'one durable occurrence per chosen channel, replayed once');
  const sent=edge.posts.at(-1),notice=(await edge.call('')).notices.find((n:any)=>n.event_kind==='dashboard'&&n.state==='sent');assert.equal(sent.channel,'CINTERNAL');
  assert.deepEqual(JSON.parse(notice.content_json),{eventKind:'dashboard',link:'https://orbit.test/app/dashboards/synthetic-orbit-slack'});
  assert.deepEqual(sent.blocks,[{type:'section',text:{type:'plain_text',text:'Dashboard ready.',emoji:false}},{type:'actions',elements:[{type:'button',action_id:'orbit_open',text:{type:'plain_text',text:'Open in Orbit'},url:'https://orbit.test/app/dashboards/synthetic-orbit-slack'}]}]);
  for(const forbidden of ['$999,999','customer names','Private dashboard','PDF','CSV','image','count','sum'])assert.ok(!JSON.stringify(sent).includes(forbidden));assert.equal(new URL(JSON.parse(notice.content_json).link).search,'');
  assert.equal((await f.app.request('https://orbit.test'+base)).status,401,'dashboard data requires native sign-in; the emitted Worker separately checks the linked HTML document');assert.equal((await response(base)).status,200);assert.equal((await notices())[0].state,'sent');
  await occurrence();edge.outcome('rate');const rateBefore=edge.posts.length;await process();assert.equal((await notices())[0].state,'rate-limited');await process();assert.equal(edge.posts.length,rateBefore);const retry=(await edge.call('')).notices.find((n:any)=>n.event_kind==='dashboard'&&n.state==='rate-limited').retry_at;f.setClock(new Date(Date.parse(retry)+1));await process();assert.equal(edge.posts.length,rateBefore+1);
  await occurrence();edge.outcome('denied');await process();const failed=(await notices())[0];assert.equal(failed.state,'failed');const failureBefore=edge.posts.length;edge.outcome('sent');await process();assert.equal(edge.posts.length,failureBefore);await edge.call(`notices/${failed.id}/retry`,'POST',{});assert.equal(edge.posts.length,failureBefore+1);
  await occurrence();edge.outcome('timeout');await process();const uncertain=(await notices())[0];assert.equal(uncertain.state,'uncertain');const timeoutBefore=edge.posts.length;edge.outcome('sent');await process();assert.equal(edge.posts.length,timeoutBefore);assert.equal((await f.request(`settings/slack/notices/${uncertain.id}/retry`,'POST',{})).status,409);
  for(const safety of [{is_shared:true},{is_archived:true},{is_frozen:true},{is_member:false}]){
   await occurrence();edge.safety(safety);const count=edge.posts.length;await process();assert.equal(edge.posts.length,count);assert.equal((await call(base+'/schedule')).state,'paused');edge.safety({});await confirm();await process();assert.equal(edge.posts.length,count);assert.equal((await call(base+'/schedule')).state,'paused','route recovery never resumes the schedule');
  }
  // Signed safety events pause before the occurrence, even if the route is reconfirmed first.
  for(const type of ['channel_shared','channel_archive','member_left_channel']){
   const at=(await call(base+'/schedule')).nextAt;f.setClock(new Date(Date.parse(at)-60000));await save('CINTERNAL');await enable();
   const event={type:'event_callback',team_id:'TWORKSPACE',api_app_id:'AORBIT',authorizations:[{team_id:'TWORKSPACE',enterprise_id:null}],event_id:'Ev'+crypto.randomUUID().replaceAll('-',''),event:{type,channel:'CINTERNAL',user:'UBOT'}};
   assert.equal((await edge.signed(event,'events')).status,200);assert.equal((await call(base+'/schedule')).state,'paused');await confirm();f.setClock(new Date(at));const count=edge.posts.length;await process();assert.equal(edge.posts.length,count);
  }
  await occurrence();const optOutBefore=edge.posts.length;await confirm(false);assert.equal((await call(base+'/schedule')).state,'paused');await process();await confirm();await process();assert.equal(edge.posts.length,optOutBefore,'removing the event choice suspends without replay after re-selection');
  await occurrence();const disconnectBefore=edge.posts.length;await edge.call('disconnect','POST',{});assert.equal((await call(base+'/schedule')).state,'paused');await edge.call('connect','POST',{token:edge.token,signingSecret:edge.secret});await confirm();await process();assert.equal(edge.posts.length,disconnectBefore);assert.equal((await call(base+'/schedule')).state,'paused');
  await occurrence();edge.outcome('revoked');const revokedBefore=edge.posts.length;await process();assert.equal((await call(base+'/schedule')).state,'paused');edge.outcome('sent');await edge.call('connect','POST',{token:edge.token,signingSecret:edge.secret});await confirm();await process();assert.equal(edge.posts.length,revokedBefore);assert.equal((await call(base+'/schedule')).state,'paused');
  const other=createId(),deps=createDependencies(f.db);await deps.auth.ensureOperator({id:other,email:'synthetic-orbit-owner@example.test',displayName:'Other operator'});const session=await deps.auth.createSession(other),otherCookie=`__Host-orbit_session=${session.token}`,sharedBase=base+'-shared';
  const otherCall=async(path:string,method:string,body:unknown)=>{const r=await f.app.request('https://orbit.test'+path,{method,headers:{Cookie:otherCookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify(body)});assert.ok(r.ok,await r.clone().text());return r.json() as Promise<any>;};
  await otherCall(sharedBase,'PUT',{version:0,definition:{name:'Private source owner dashboard',filters:{ownerIds:[],pipelineIds:[],from:'2026-10',through:'2026-12',field:null},tiles:[]}});
  await otherCall(sharedBase+'/sharing','PUT',{version:1,audience:'named',grants:[{operatorId:f.actor,access:'view'}]});
  const saved=await call(sharedBase+'/schedule','PUT',{...schedule,version:0,channelId:'CINTERNAL'});await call(sharedBase+'/schedule/slack','POST',{version:1,enabled:true});
  const refused=await f.app.request('https://orbit.test'+sharedBase+'/schedule/slack',{method:'POST',headers:{Cookie:otherCookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({version:1,enabled:true})});assert.equal(refused.status,403,'only the installation owner enables Slack');
  await otherCall(sharedBase+'/sharing','PUT',{version:2,audience:'private',grants:[]});f.setClock(new Date(saved.nextAt));const unsharedBefore=edge.posts.length;await process();assert.equal(edge.posts.length,unsharedBefore);assert.equal((await call(sharedBase+'/schedule')).state,'paused','lost dashboard sharing suspends the schedule');
  const deletedBase=base+'-deleted';await call(deletedBase,'PUT',{version:0,definition:{name:'Deleted before send',filters:{ownerIds:[],pipelineIds:[],from:'2026-10',through:'2026-12',field:null},tiles:[]}});const deleted=await call(deletedBase+'/schedule','PUT',{...schedule,version:0,channelId:'CINTERNAL'});await call(deletedBase+'/schedule/slack','POST',{version:1,enabled:true});await f.db.prepare('DELETE FROM sales_dashboards WHERE id=?').bind('synthetic-orbit-slack-deleted').run();f.setClock(new Date(deleted.nextAt));const deletedBefore=edge.posts.length;await process();assert.equal(edge.posts.length,deletedBefore,'a deleted dashboard cannot post');
  // Saving a fresh version and removing dashboard authority both prevent any queued disclosure.
  await occurrence();await f.db.prepare("UPDATE sales_dashboards SET authority=0 WHERE id='synthetic-orbit-slack'").run();const unavailableBefore=edge.posts.length;await process();assert.equal(edge.posts.length,unavailableBefore);await f.db.prepare("UPDATE sales_dashboards SET authority=1 WHERE id='synthetic-orbit-slack'").run();schedule.recipientIds=[f.actor];await save(null);await process();assert.equal(edge.posts.length,unavailableBefore);
 }finally{edge.outcome('sent');edge.safety({});f.setClock(undefined);await timezone(settings.timezone);await confirm(false);}
}
