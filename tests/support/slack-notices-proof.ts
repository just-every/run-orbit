import assert from 'node:assert/strict';
import {randomBytes,createHmac} from 'node:crypto';
import {createId} from '../../src/core/shared/ids';
import type {createApp} from './app';
import {proveSlackActions} from './slack-actions-proof';
import {proveSlackArchive} from './slack-archive-proof';
export interface SlackFixture {db:D1Database;actor:string;stage:string;app:ReturnType<typeof createApp>;request:(path:string,method?:string,body?:unknown,headers?:Record<string,string>)=>Promise<Response>}
export async function proveSlackNotices(f:SlackFixture,deal:string,contact:string){
 const native=globalThis.fetch,secret=randomBytes(32).toString('hex'),token='test-only-slack-bot',posts:any[]=[],deletes:any[]=[],responses:any[]=[];
 let outcome:'sent'|'rate'|'timeout'|'revoked'|'failed'|'missing'|'frozen'|'archived'='sent',attempts=0,safety:Record<string,unknown>={};
 const channel=(id='CINTERNAL')=>({id,name:id==='CINTERNAL'?'sales-internal':'external',is_channel:true,is_frozen:false,is_member:id!=='CNOTMEMBER',is_archived:false,is_shared:id==='CEXTERNAL',is_ext_shared:id==='CEXTERNAL',is_org_shared:false,is_pending_ext_shared:false,connected_team_ids:[],pending_connected_team_ids:[],context_team_id:'TWORKSPACE',...safety});
 globalThis.fetch=async(input,init)=>{
  if(String(input).startsWith('https://hooks.slack.com/actions/')){responses.push(JSON.parse(String(init?.body)));return new Response('ok');}
  if(!String(input).startsWith('https://slack.com/api/'))return native(input,init);
  assert.equal(init?.redirect,'manual');assert.equal(new Headers(init?.headers).get('authorization'),'Bearer '+token);
  const url=new URL(String(input)),method=url.pathname.split('/').at(-1),body=init?.body?JSON.parse(String(init.body)):Object.fromEntries(url.searchParams);
  if(outcome==='revoked')return Response.json({ok:false,error:'token_revoked'});
  if(method==='auth.test')return Response.json({ok:true,team_id:'TWORKSPACE',user_id:'UBOT',bot_id:'BBOT',enterprise_id:null});
  if(method==='conversations.list')return Response.json({ok:true,channels:[channel(),channel('CEXTERNAL'),channel('CNOTMEMBER')],response_metadata:{next_cursor:''}});
  if(method==='conversations.info')return Response.json({ok:true,channel:channel(body.channel)});
  if(method==='chat.delete'){deletes.push(body);return Response.json({ok:true,channel:body.channel,ts:body.ts});}
  assert.equal(method,'chat.postMessage');attempts++;
  if(outcome==='rate'){outcome='sent';return new Response('',{status:429,headers:{'Retry-After':'1'}});}if(outcome==='timeout')throw new TypeError('connection lost after request left');if(outcome==='failed')return Response.json({ok:false,error:'not_in_channel'});if(outcome==='missing')return Response.json({ok:false,error:'channel_not_found'});if(outcome==='frozen')return Response.json({ok:false,error:'channel_is_frozen'});if(outcome==='archived')return Response.json({ok:false,error:'is_archived'});
  const ts=`1800000000.${String(posts.length+1).padStart(6,'0')}`;posts.push({...body,ts});return Response.json({ok:true,channel:body.channel,ts,message:{user:'UBOT',bot_id:'BBOT',app_id:'AORBIT',text:body.text,blocks:body.blocks}});
 };
 const call=async(path:string,method='GET',body?:unknown)=>{const r=await f.request('settings/slack'+(path?'/'+path:''),method,body);assert.ok(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;};
 const notices=async()=>((await call('')).notices as any[]),process=()=>call('process','POST',{});
 const signed=async(payload:any,route='actions',options:{stale?:boolean;unsigned?:boolean;bad?:boolean}={})=>{
  const timestamp=String(Math.floor(Date.now()/1000)-(options.stale?600:0)),raw=route==='actions'?new URLSearchParams({payload:JSON.stringify(payload)}).toString():JSON.stringify(payload),signature='v0='+createHmac('sha256',options.bad?'wrong-test-secret':secret).update(`v0:${timestamp}:${raw}`).digest('hex'),work:Promise<unknown>[]=[],before=responses.length;
  const response=await f.app.fetch(new Request('https://orbit.test/api/v1/slack/'+route,{method:'POST',headers:{'Content-Type':route==='actions'?'application/x-www-form-urlencoded':'application/json','X-Slack-Request-Timestamp':timestamp,...(options.unsigned?{}:{'X-Slack-Signature':signature})},body:raw}),{}, {waitUntil(p:Promise<unknown>){work.push(p);},passThroughOnException(){}} as ExecutionContext);
  const result=await response.json() as any;await Promise.all(work);return{status:response.status,text:responses.length>before?responses.at(-1).text:result.text,data:result};
 };
 try{
  await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
  assert.equal((await f.request('settings/slack/connect','POST',{token,signingSecret:secret},{Cookie:''})).status,401);
  await call('connect','POST',{token,signingSecret:secret});assert.ok(!JSON.stringify(await call('')).includes(secret)&&!JSON.stringify(await call('')).includes(token));
  assert.deepEqual((await call('channels')).channels.map((c:any)=>c.id),['CINTERNAL']);
  for(const id of ['CEXTERNAL','CNOTMEMBER'])assert.equal((await f.request('settings/slack/channels','PUT',{id,events:['stage'],enabled:true})).status,400);
  for(const blocked of [{is_frozen:null},{is_frozen:"false"},{is_member:undefined},{is_channel:undefined},{is_archived:undefined},{is_shared:undefined},{is_ext_shared:undefined},{is_org_shared:undefined},{is_pending_ext_shared:undefined},{is_shared:true},{is_ext_shared:true},{is_org_shared:true},{is_pending_ext_shared:true},{is_frozen:true},{is_archived:true},{context_team_id:'TFOREIGN'},{connected_team_ids:['TFOREIGN']},{pending_connected_team_ids:['TFOREIGN']}]){safety=blocked;assert.equal((await f.request('settings/slack/channels','PUT',{id:'CINTERNAL',events:['stage'],enabled:true})).status,400);}safety={is_frozen:undefined};assert.equal((await f.request('settings/slack/channels','PUT',{id:'CINTERNAL',events:['stage'],enabled:true})).status,200,'ct permits only an omitted is_frozen flag');safety={};
  const confirm=()=>call('channels','PUT',{id:'CINTERNAL',events:['stage','due','won','handoff'],enabled:true});await confirm();
  const update=await f.request('settings/stages','PUT',{stages:[{id:f.stage,name:'Discovery'},{name:'Proposal'}]});assert.equal(update.status,200);const second=(await update.json() as any).stages.find((s:any)=>s.name==='Proposal').id;
  const move=async(from:string,to:string)=>{const r=await f.request(`records/opportunity/${deal}/move`,'POST',{stageId:to,reviewedStageId:from});assert.ok(r.ok,await r.clone().text());};
  await move(f.stage,second);assert.equal(posts.length,1);const first=(await notices()).find(n=>n.event_kind==='stage');assert.equal(first.state,'sent');assert.equal((await call('')).installation.app_id,'AORBIT');
  assert.deepEqual(Object.keys(JSON.parse(first.content_json)).sort(),['eventKind','recordDisplayName','stageFrom','stageTo','ownerDisplayName','dueDate','link'].sort());assert.ok(posts[0].text.includes('Discovery → Proposal'));assert.ok(posts[0].text.includes('/app/opportunities/'+deal));assert.equal(posts[0].unfurl_links,false);assert.equal(posts[0].unfurl_media,false);
  for(const forbidden of ['maya@harbour.test','10000','Discovery call:'])assert.ok(!posts[0].text.includes(forbidden));
  await move(second,second);await process();assert.equal(posts.length,1,'source replay and timer add nothing');
  await f.db.prepare("UPDATE graph_records SET visibility='restricted',owner_id=? WHERE kind='company' AND id=(SELECT company_id FROM opportunities WHERE id=?)").bind(f.actor,deal).run();
  await move(second,f.stage);const withheld=(await notices()).find(n=>n.privacy==='withheld');assert.ok(withheld);assert.equal(withheld.state,'sent');assert.deepEqual(Object.keys(JSON.parse(withheld.content_json)).sort(),['eventKind','link']);assert.ok(!posts.at(-1).text.includes('First customer')&&!posts.at(-1).text.includes('Owner:')&&!posts.at(-1).text.includes('Stage:'));
  await f.db.prepare("UPDATE graph_records SET visibility='workspace' WHERE kind='company' AND id=(SELECT company_id FROM opportunities WHERE id=?)").bind(deal).run();
  outcome='rate';const task=await f.request('tasks','POST',{title:'Private overdue task text',recordType:'opportunity',recordId:deal,ownerId:f.actor,dueAt:new Date(Date.now()-86400000).toISOString(),priority:'high',type:'follow_up',notes:'Never send this note to Slack',recurrence:'none',timezone:'UTC',reminderMinutes:null});assert.equal(task.status,201,await task.clone().text());
  assert.ok((await notices()).some(n=>n.state==='rate-limited'));assert.equal((await call('')).channels[0].last_error,'ratelimited');const beforeRate=posts.length;await new Promise(r=>setTimeout(r,1100));await process();assert.equal(posts.length,beforeRate+1);assert.ok(!posts.at(-1).text.includes('Private overdue task text')&&!posts.at(-1).text.includes('Never send this note'));assert.ok(posts.at(-1).text.includes('Due:'));assert.equal(JSON.parse((await notices()).find(n=>n.event_kind==='due').content_json).taskType,'follow_up');
  outcome='timeout';await move(f.stage,second);const uncertain=(await notices()).find(n=>n.state==='uncertain');assert.ok(uncertain);assert.equal((await call('')).channels[0].noticeStates.uncertain,1);const before=attempts;await process();assert.equal(attempts,before);assert.equal((await f.request(`settings/slack/notices/${uncertain.id}/retry`,'POST',{})).status,409);outcome='sent';
  await proveSlackActions(f,{deal,posts,call,signed});
  // A late share or bot departure suspends without disclosure and never resumes itself.
  safety={is_pending_ext_shared:true};const preShare=posts.length;await move(second,f.stage);assert.equal(posts.length,preShare);assert.equal((await call('')).channels[0].enabled,0);safety={};await process();assert.equal(posts.length,preShare);await confirm();
  const blocked=(await notices()).find(n=>n.state==='failed');assert.ok(blocked);await call(`notices/${blocked.id}/retry`,'POST',{});assert.ok(posts.length>preShare);
  outcome='failed';await move(f.stage,second);const unaccepted=(await notices()).find(n=>n.state==='failed'&&n.error==='not_in_channel');assert.ok(unaccepted);assert.equal((await call('')).channels[0].last_error,'not_in_channel');
  outcome='missing';await confirm();await call(`notices/${unaccepted.id}/retry`,'POST',{});assert.equal((await notices()).find(n=>n.id===unaccepted.id).error,'channel_not_found');
  for(const [mode,error] of [['frozen','channel_is_frozen'],['archived','is_archived']] as const){outcome=mode;await confirm();await call(`notices/${unaccepted.id}/retry`,'POST',{});assert.equal((await notices()).find(n=>n.id===unaccepted.id).error,error);assert.equal((await call('')).channels[0].enabled,0,'Frozen/archived provider refusal suspends routing');}
  outcome='sent';await confirm();await call(`notices/${unaccepted.id}/retry`,'POST',{});assert.equal((await notices()).find(n=>n.id===unaccepted.id).state,'sent');
  const event=(type:string,extra:object={})=>({type:'event_callback',team_id:'TWORKSPACE',api_app_id:'AORBIT',authorizations:[{team_id:'TWORKSPACE',enterprise_id:null}],event_id:'Ev'+crypto.randomUUID().replaceAll('-',''),event:{type,channel:'CINTERNAL',...extra}});
  const shared=event('channel_shared');assert.equal((await signed(shared,'events')).status,200);assert.equal((await call('')).channels[0].enabled,0);assert.equal((await signed(shared,'events')).data.replayed,true);await signed(event('channel_unshared'),'events');assert.equal((await call('')).channels[0].enabled,0);await confirm();await signed(event('member_left_channel',{user:'UBOT'}),'events');assert.equal((await call('')).channels[0].enabled,0);await confirm();
  await call('mappings','PUT',{slackUserId:'UDEACTIVATE',operatorId:f.actor,revoked:false});await signed(event('user_change',{user:{id:'UDEACTIVATE',team_id:'TWORKSPACE',deleted:true}}),'events');assert.ok((await call('')).mappings.find((m:any)=>m.slack_user_id==='UDEACTIVATE').revoked_at);
  const callResult=await f.request(`records/opportunity/${deal}/entries`,'POST',{kind:'call',text:'Private customer call contents',occurredAt:new Date().toISOString(),durationMinutes:5});assert.equal(callResult.status,200);await f.request(`records/opportunity/${deal}/lifecycle`,'POST',{state:'won',reason:'Private win reason'});assert.ok((await notices()).some(n=>n.event_kind==='won'&&n.state==='sent'));assert.ok((await notices()).some(n=>n.event_kind==='handoff'&&n.state==='sent'));
  const booking=await(await f.request('sources/bookings','PUT',{name:'Internal booking notices',enabled:true})).json() as any,raw=JSON.stringify({triggerEvent:'BOOKING_CREATED',createdAt:new Date().toISOString(),payload:{uid:crypto.randomUUID(),attendees:[{email:'maya@harbour.test'}]}}),bookingCount=posts.length;
  const booked=()=>f.app.request('https://orbit.test/api/v1/signals/bookings/calcom',{method:'POST',headers:{'X-Cal-Signature-256':createHmac('sha256',booking.secret).update(raw).digest('hex')},body:raw});assert.equal((await booked()).status,201);await process();assert.equal(posts.length,bookingCount+1);assert.equal((await booked()).status,409);await process();assert.equal(posts.length,bookingCount+1);assert.ok(posts.every(p=>!p.text.includes('maya@harbour.test')&&!p.text.includes('Maya')&&!p.text.includes('Private win reason')&&!p.text.includes('Private customer call contents')));
  outcome='revoked';await process();assert.equal((await f.request('settings/slack/verify','POST',{})).status,503);assert.equal((await call('')).installation.state,'revoked');assert.equal((await call('')).installation.error,'token_revoked');const products=await(await f.request('settings/products')).json() as any;assert.equal(products.products.find((p:any)=>p.products.includes('Slack')).state,'unresolved-setup');await move(second,f.stage);assert.ok((await notices()).some(n=>n.state==='paused'));
  outcome='sent';await proveSlackArchive(f,{contact,secret,token,deletes,posts,call});
 }finally{globalThis.fetch=native;}
}
