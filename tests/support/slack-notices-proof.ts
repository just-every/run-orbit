import {slackNetwork} from './slack-network';
import {proveDashboardSlack} from './dashboard-slack-proof';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createId} from '../../src/core/shared/ids';
import type {createApp} from './app';
import {proveSlackActions} from './slack-actions-proof';
import {proveSlackArchive} from './slack-archive-proof';
export interface SlackFixture {token:string;setClock:(value:Date|undefined)=>void;db:D1Database;actor:string;stage:string;app:ReturnType<typeof createApp>;request:(path:string,method?:string,body?:unknown,headers?:Record<string,string>)=>Promise<Response>}
export async function proveSlackNotices(f:SlackFixture,deal:string,contact:string){
 const edge=slackNetwork(),{posts,deletes,responses,secret,token}=edge;
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
  for(const blocked of [{is_frozen:null},{is_frozen:"false"},{is_member:undefined},{is_channel:undefined},{is_archived:undefined},{is_shared:undefined},{is_ext_shared:undefined},{is_org_shared:undefined},{is_pending_ext_shared:undefined},{is_shared:true},{is_ext_shared:true},{is_org_shared:true},{is_pending_ext_shared:true},{is_frozen:true},{is_archived:true},{context_team_id:'TFOREIGN'},{connected_team_ids:['TFOREIGN']},{pending_connected_team_ids:['TFOREIGN']}]){edge.setSafety(blocked);assert.equal((await f.request('settings/slack/channels','PUT',{id:'CINTERNAL',events:['stage'],enabled:true})).status,400);}edge.setSafety({is_frozen:undefined});assert.equal((await f.request('settings/slack/channels','PUT',{id:'CINTERNAL',events:['stage'],enabled:true})).status,200,'ct permits only an omitted is_frozen flag');edge.setSafety({});
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
  edge.setOutcome('rate');const task=await f.request('tasks','POST',{title:'Private overdue task text',recordType:'opportunity',recordId:deal,ownerId:f.actor,dueAt:new Date(Date.now()-86400000).toISOString(),priority:'high',type:'follow_up',notes:'Never send this note to Slack',recurrence:'none',timezone:'UTC',reminderMinutes:null});assert.equal(task.status,201,await task.clone().text());
  assert.ok((await notices()).some(n=>n.state==='rate-limited'));assert.equal((await call('')).channels[0].last_error,'ratelimited');const beforeRate=posts.length;await new Promise(r=>setTimeout(r,1100));await process();assert.equal(posts.length,beforeRate+1);assert.ok(!posts.at(-1).text.includes('Private overdue task text')&&!posts.at(-1).text.includes('Never send this note'));assert.ok(posts.at(-1).text.includes('Due:'));assert.equal(JSON.parse((await notices()).find(n=>n.event_kind==='due').content_json).taskType,'follow_up');
  edge.setOutcome('timeout');await move(f.stage,second);const uncertain=(await notices()).find(n=>n.state==='uncertain');assert.ok(uncertain);assert.equal((await call('')).channels[0].noticeStates.uncertain,1);const before=edge.attempts;await process();assert.equal(edge.attempts,before);assert.equal((await f.request(`settings/slack/notices/${uncertain.id}/retry`,'POST',{})).status,409);edge.setOutcome('sent');
  await proveSlackActions(f,{deal,posts,call,signed});
  // A late share or bot departure suspends without disclosure and never resumes itself.
  edge.setSafety({is_pending_ext_shared:true});const preShare=posts.length;await move(second,f.stage);assert.equal(posts.length,preShare);assert.equal((await call('')).channels[0].enabled,0);edge.setSafety({});await process();assert.equal(posts.length,preShare);await confirm();
  const blocked=(await notices()).find(n=>n.state==='failed');assert.ok(blocked);await call(`notices/${blocked.id}/retry`,'POST',{});assert.ok(posts.length>preShare);
  edge.setOutcome('failed');await move(f.stage,second);const unaccepted=(await notices()).find(n=>n.state==='failed'&&n.error==='not_in_channel');assert.ok(unaccepted);assert.equal((await call('')).channels[0].last_error,'not_in_channel');
  edge.setOutcome('missing');await confirm();await call(`notices/${unaccepted.id}/retry`,'POST',{});assert.equal((await notices()).find(n=>n.id===unaccepted.id).error,'channel_not_found');
  for(const [mode,error] of [['frozen','channel_is_frozen'],['archived','is_archived']] as const){edge.setOutcome(mode);await confirm();await call(`notices/${unaccepted.id}/retry`,'POST',{});assert.equal((await notices()).find(n=>n.id===unaccepted.id).error,error);assert.equal((await call('')).channels[0].enabled,0,'Frozen/archived provider refusal suspends routing');}
  edge.setOutcome('sent');await confirm();await call(`notices/${unaccepted.id}/retry`,'POST',{});assert.equal((await notices()).find(n=>n.id===unaccepted.id).state,'sent');
  const event=(type:string,extra:object={})=>({type:'event_callback',team_id:'TWORKSPACE',api_app_id:'AORBIT',authorizations:[{team_id:'TWORKSPACE',enterprise_id:null}],event_id:'Ev'+crypto.randomUUID().replaceAll('-',''),event:{type,channel:'CINTERNAL',...extra}});
  const shared=event('channel_shared');assert.equal((await signed(shared,'events')).status,200);assert.equal((await call('')).channels[0].enabled,0);assert.equal((await signed(shared,'events')).data.replayed,true);await signed(event('channel_unshared'),'events');assert.equal((await call('')).channels[0].enabled,0);await confirm();await signed(event('member_left_channel',{user:'UBOT'}),'events');assert.equal((await call('')).channels[0].enabled,0);await confirm();
  await call('mappings','PUT',{slackUserId:'UDEACTIVATE',operatorId:f.actor,revoked:false});await signed(event('user_change',{user:{id:'UDEACTIVATE',team_id:'TWORKSPACE',deleted:true}}),'events');assert.ok((await call('')).mappings.find((m:any)=>m.slack_user_id==='UDEACTIVATE').revoked_at);
  const callResult=await f.request(`records/opportunity/${deal}/entries`,'POST',{kind:'call',text:'Private customer call contents',occurredAt:new Date().toISOString(),durationMinutes:5});assert.equal(callResult.status,200);await f.request(`records/opportunity/${deal}/lifecycle`,'POST',{state:'won',reason:'Private win reason'});assert.ok((await notices()).some(n=>n.event_kind==='won'&&n.state==='sent'));assert.ok((await notices()).some(n=>n.event_kind==='handoff'&&n.state==='sent'));
  const booking=await(await f.request('sources/bookings','PUT',{name:'Internal booking notices',enabled:true})).json() as any,raw=JSON.stringify({triggerEvent:'BOOKING_CREATED',createdAt:new Date().toISOString(),payload:{uid:crypto.randomUUID(),attendees:[{email:'maya@harbour.test'}]}}),bookingCount=posts.length;
  const booked=()=>f.app.request('https://orbit.test/api/v1/signals/bookings/calcom',{method:'POST',headers:{'X-Cal-Signature-256':createHmac('sha256',booking.secret).update(raw).digest('hex')},body:raw});assert.equal((await booked()).status,201);await process();assert.equal(posts.length,bookingCount+1);assert.equal((await booked()).status,409);await process();assert.equal(posts.length,bookingCount+1);assert.ok(posts.every(p=>!p.text.includes('maya@harbour.test')&&!p.text.includes('Maya')&&!p.text.includes('Private win reason')&&!p.text.includes('Private customer call contents')));
  await proveDashboardSlack(f,{posts,call,signed,secret,token,outcome:value=>edge.setOutcome(value),safety:value=>edge.setSafety(value)});
  // TEAM-005: a real sales administrator chooses a team audience, which grants no record access.
  const seller=await(await f.request('settings/operators','POST',{email:'synthetic-orbit-team-member@example.test',displayName:'Synthetic team seller'})).json() as {id:string};
  const administrator=await(await f.request('settings/operators','POST',{email:'synthetic-orbit-sales-admin@example.test',displayName:'Synthetic sales administrator'})).json() as {id:string};
  const adminRole={role:'sales-admin',scope:'all',fields:['*'],permissions:['source.connect','export','analytics.define','forecast.read'],includeAssociations:true};
  assert.equal((await f.request(`settings/teams/roles/${administrator.id}`,'PUT',adminRole)).status,200);
  const administratorSession=await (await import('./test-auth')).testAuth(f.db).createSession(administrator.id);
  const adminRequest=(path:string,method='GET',body?:unknown)=>f.request('settings/slack'+(path?'/'+path:''),method,body,{Cookie:'__Host-orbit_session='+administratorSession.token});
  assert.equal((await adminRequest()).status,200);assert.equal((await (await adminRequest()).json() as any).admin,true,'The sales-admin role administers Slack without owning the installation');
  const teamResponse=await f.request('settings/teams','POST',{name:'Synthetic Slack team',active:true,defaultDashboardId:null});assert.equal(teamResponse.status,201);const team=await teamResponse.json() as {id:string};
  assert.equal((await f.request(`settings/teams/${team.id}/members`,'PUT',{operatorIds:[f.actor,seller.id,administrator.id]})).status,200);
  const sellerRole={role:'seller',scope:'assigned',fields:['mail'],permissions:['export'],includeAssociations:false};
  assert.equal((await f.request(`settings/teams/roles/${seller.id}`,'PUT',sellerRole)).status,200);
  edge.setMembers(['UBOT','UOWNER','UTEAM']);
  for(const [slackUserId,operatorId] of [['UOWNER',f.actor],['UTEAM',seller.id]])assert.equal((await adminRequest('mappings','PUT',{slackUserId,operatorId,revoked:false})).status,200);
  assert.equal((await adminRequest('channels','PUT',{id:'CINTERNAL',events:['stage'],enabled:true,teamId:team.id})).status,200);
  const hiddenBefore=posts.length;await move(second,f.stage);assert.equal(posts.length,hiddenBefore,'Team membership and a mapping do not emit even a generic notice for a hidden record');
  const company=await f.db.prepare('SELECT company_id FROM opportunities WHERE id=?').bind(deal).first<string>('company_id');
  for(const [kind,recordId] of [['opportunity',deal],['contact',contact],['company',company]])assert.equal((await f.request('settings/teams/shares','POST',{kind,recordId,subjectKind:'user',subjectId:seller.id,fields:['*'],canEdit:true})).status,201);
  // Access changes invalidate every old mapping until an administrator explicitly confirms it.
  const staleBefore=posts.length;await move(f.stage,second);assert.equal(posts.length,staleBefore);assert.equal((await call('')).channels.find((c:any)=>c.id==='CINTERNAL').enabled,0);
  for(const [slackUserId,operatorId] of [['UOWNER',f.actor],['UTEAM',seller.id]])assert.equal((await adminRequest('mappings','PUT',{slackUserId,operatorId,revoked:false})).status,200);
  assert.equal((await adminRequest('channels','PUT',{id:'CINTERNAL',events:['stage'],enabled:true,teamId:team.id})).status,200);
  const allowedBefore=posts.length;await move(second,f.stage);assert.ok(posts.length>allowedBefore,'An explicitly shared record reaches its authorized team audience');
  const dashboardPath='/api/v2/workspaces/workspace/dashboards/synthetic-orbit-team-ready';
  const dashboardRequest=(path:string,method='GET',body?:unknown,session=f.token)=>f.app.request('https://orbit.test'+dashboardPath+path,{method,headers:{Cookie:'__Host-orbit_session='+session,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  assert.equal((await dashboardRequest('','PUT',{version:0,definition:{name:'Team sales dashboard',filters:{ownerIds:[],pipelineIds:[],from:'2026-10',through:'2026-12',field:null},tiles:[]}})).status,200);
  assert.equal((await dashboardRequest('/sharing','PUT',{version:1,audience:'teams',teamGrants:[{teamId:team.id,access:'view'}],grants:[]})).status,200);
  assert.equal((await adminRequest('channels','PUT',{id:'CINTERNAL',events:['stage','dashboard'],enabled:true,teamId:team.id})).status,200);
  const teamScheduleResponse=await dashboardRequest('/schedule','PUT',{version:0,frequency:'daily',hour:8,minute:0,weekday:1,day:1,recipientIds:[],channelId:'CINTERNAL',pdf:false,csv:false});assert.equal(teamScheduleResponse.status,200,await teamScheduleResponse.clone().text());const teamSchedule=await teamScheduleResponse.json() as any;
  assert.equal((await dashboardRequest('/schedule/slack','POST',{version:1,enabled:true},administratorSession.token)).status,200,'A sales administrator explicitly enables a team dashboard schedule');
  const readyBefore=posts.length;f.setClock(new Date(teamSchedule.nextAt));await process();assert.equal(posts.length,readyBefore+1);assert.equal(posts.at(-1).blocks[0].text.text,'Dashboard ready.');assert.ok(!posts.at(-1).text.includes('Team sales dashboard'));
  assert.equal((await dashboardRequest('/sharing','PUT',{version:2,audience:'private',grants:[],teamGrants:[]})).status,200);
  f.setClock(new Date(Date.parse(teamSchedule.nextAt)+86400000));const privateReadyBefore=posts.length;await process();assert.equal(posts.length,privateReadyBefore,'Removing dashboard team sharing suppresses even the generic dashboard-ready link');f.setClock(undefined);
  edge.setMembers(['UBOT','UOWNER','UTEAM','UOUTSIDER']);assert.equal((await adminRequest('channels','PUT',{id:'CINTERNAL',events:['stage'],enabled:true,teamId:team.id})).status,403,'An unmapped Slack member cannot join a team audience');
  const outsiderBefore=posts.length;await move(f.stage,second);assert.equal(posts.length,outsiderBefore,'Membership is checked again before posting');
  edge.setMembers(['UBOT','UOWNER','UTEAM']);
  assert.equal((await f.request(`settings/teams/roles/${seller.id}`,'PUT',{...sellerRole,role:'read-only',fields:[]})).status,200);
  assert.equal((await adminRequest('channels','PUT',{id:'CINTERNAL',events:['stage'],enabled:true,teamId:team.id})).status,403,'A role change requires fresh mapping confirmation');
  for(const [slackUserId,operatorId] of [['UOWNER',f.actor],['UTEAM',seller.id]])assert.equal((await adminRequest('mappings','PUT',{slackUserId,operatorId,revoked:false})).status,200);
  assert.equal((await adminRequest('channels','PUT',{id:'CINTERNAL',events:['stage','due'],enabled:true,teamId:team.id})).status,200);
  edge.setOutcome('revoked');await process();assert.equal((await f.request('settings/slack/verify','POST',{})).status,503);assert.equal((await call('')).installation.state,'revoked');assert.equal((await call('')).installation.error,'token_revoked');const products=await(await f.request('settings/products')).json() as any;assert.equal(products.products.find((p:any)=>p.products.includes('Slack')).state,'unresolved-setup');await move(second,f.stage);assert.ok((await notices()).some(n=>n.state==='paused'));
  edge.setOutcome('sent');await proveSlackArchive(f,{contact,secret,token,deletes,posts,call});
 }finally{edge.restore();}
}
