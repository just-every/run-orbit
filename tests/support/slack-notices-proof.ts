import assert from 'node:assert/strict';
import {randomBytes,createHmac} from 'node:crypto';
import {isolatedDatabase} from './isolated-database';
import {createDependencies} from './dependencies';
import {createApp} from './app';
import {createId} from '../../src/core/shared/ids';
interface Fixture {db:D1Database;actor:string;stage:string;app:ReturnType<typeof createApp>;request:(path:string,method?:string,body?:unknown,headers?:Record<string,string>)=>Promise<Response>}
export async function proveSlackNotices(f:Fixture,deal:string,contact:string){
 const native=globalThis.fetch,secret=randomBytes(32).toString('hex'),token='test-only-slack-bot',posts:any[]=[];
 let outcome:'sent'|'rate'|'timeout'|'revoked'|'failed'='sent',attempts=0;
 const channel=(id='CINTERNAL')=>({id,name:id==='CINTERNAL'?'sales-internal':'external',is_member:true,is_archived:false,is_shared:id==='CEXTERNAL',is_ext_shared:id==='CEXTERNAL',is_org_shared:false,context_team_id:'TWORKSPACE'});
 globalThis.fetch=async(input,init)=>{if(!String(input).startsWith('https://slack.com/api/'))return native(input,init);assert.equal(init?.redirect,'manual');assert.equal(new Headers(init?.headers).get('authorization'),'Bearer '+token);const url=new URL(String(input)),method=url.pathname.split('/').at(-1),body=init?.body?JSON.parse(String(init.body)):Object.fromEntries(url.searchParams);
  if(outcome==='revoked')return Response.json({ok:false,error:'token_revoked'});
  if(method==='auth.test')return Response.json({ok:true,team_id:'TWORKSPACE',user_id:'UBOT',bot_id:'BBOT'});
  if(method==='conversations.list')return Response.json({ok:true,channels:[channel(),channel('CEXTERNAL'),{...channel('CNOTMEMBER'),is_member:false}],response_metadata:{next_cursor:''}});
  if(method==='conversations.info')return Response.json({ok:true,channel:channel(body.channel)});
  assert.equal(method,'chat.postMessage');attempts++;if(outcome==='rate'){outcome='sent';return new Response('',{status:429,headers:{'Retry-After':'1'}});}if(outcome==='timeout')throw new TypeError('connection lost after request left');if(outcome==='failed')return Response.json({ok:false,error:'not_in_channel'});
  const ts=`1800000000.${String(posts.length+1).padStart(6,'0')}`;posts.push({...body,ts});return Response.json({ok:true,channel:body.channel,ts});
 };
 const call=async(path:string,method='GET',body?:unknown)=>{const r=await f.request('settings/slack'+(path?'/'+path:''),method,body);assert.ok(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;};
 const notices=async()=>((await call('')).notices as any[]),process=()=>call('process','POST',{});
 try{
  await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
  assert.equal((await f.request('settings/slack/connect','POST',{token,signingSecret:secret},{Cookie:''})).status,401);
  await call('connect','POST',{token,signingSecret:secret});assert.ok(!JSON.stringify(await call('')).includes(secret));assert.ok(!JSON.stringify(await call('')).includes(token));
  assert.deepEqual((await call('channels')).channels.map((c:any)=>c.id),['CINTERNAL']);
  assert.equal((await f.request('settings/slack/channels','PUT',{id:'CEXTERNAL',events:['stage'],enabled:true})).status,400);
  await call('channels','PUT',{id:'CINTERNAL',events:['stage','due','won','handoff'],enabled:true});
  const stageUpdate=await f.request('settings/stages','PUT',{stages:[{id:f.stage,name:'Discovery'},{name:'Proposal'}]});assert.equal(stageUpdate.status,200,await stageUpdate.clone().text());const second=(await stageUpdate.json() as any).stages.find((s:any)=>s.name==='Proposal').id;
  const move=async(id:string,from:string,to:string)=>{const response=await f.request(`records/opportunity/${id}/move`,'POST',{stageId:to,reviewedStageId:from});assert.ok(response.ok,await response.clone().text());};
  await move(deal,f.stage,second);assert.equal(posts.length,1);const stage=(await notices()).find(n=>n.event_kind==='stage');assert.equal(stage.state,'sent');assert.ok(posts[0].text.includes('Discovery → Proposal'));assert.ok(!posts[0].text.includes('maya@harbour.test'));assert.ok(!posts[0].text.includes('10000'));assert.ok(!posts[0].text.includes('Discovery call:'));assert.ok(posts[0].text.includes('/app/opportunities/'+deal));
  assert.deepEqual(Object.keys(JSON.parse(stage.content_json)).sort(),['eventKind','recordDisplayName','stageFrom','stageTo','ownerDisplayName','dueDate','link'].sort());
  await move(deal,second,second);await process();assert.equal(posts.length,1,'same event and timer replay add no message');
  await f.db.prepare("UPDATE graph_records SET visibility='restricted',owner_id=? WHERE kind='company' AND id=(SELECT company_id FROM opportunities WHERE id=?)").bind(f.actor,deal).run();
  await move(deal,second,f.stage);assert.equal(posts.length,1);assert.ok((await notices()).some(n=>n.state==='withheld'&&n.content_json===null));
  await f.db.prepare("UPDATE graph_records SET visibility='workspace' WHERE kind='company' AND id=(SELECT company_id FROM opportunities WHERE id=?)").bind(deal).run();
  outcome='rate';const task=await f.request('tasks','POST',{title:'Private overdue task text',recordType:'opportunity',recordId:deal,ownerId:f.actor,dueAt:new Date(Date.now()-86400000).toISOString(),priority:'high',type:'follow_up',notes:'Never export this note to Slack',recurrence:'none',timezone:'UTC',reminderMinutes:null});assert.equal(task.status,201,await task.clone().text());
  assert.ok((await notices()).some(n=>n.state==='rate-limited'));assert.equal((await call('')).channels[0].last_error,'ratelimited');await new Promise(r=>setTimeout(r,1100));await process();assert.equal(posts.length,2);assert.equal(posts[1].text.includes('Private overdue task text'),false);assert.equal(posts[1].text.includes('Never export this note'),false);assert.ok(posts[1].text.includes('Due:'));
  outcome='timeout';await move(deal,f.stage,second);const uncertain=(await notices()).find(n=>n.state==='uncertain');assert.ok(uncertain);const before=attempts;await process();assert.equal(attempts,before);assert.equal((await f.request(`settings/slack/notices/${uncertain.id}/retry`,'POST',{})).status,409);
  outcome='sent';
  const action=(user='UMAPPED',actionId='orbit_ack',change:any={})=>{const message=posts[0];return{type:'block_actions',team:{id:'TWORKSPACE'},user:{id:user},channel:{id:'CINTERNAL'},container:{channel_id:'CINTERNAL',message_ts:message.ts},message:{ts:message.ts,user:'UBOT'},actions:[{action_id:actionId,value:stage.id,action_ts:`1800000001.${randomBytes(3).toString('hex')}`}],...change};};
  const inbound=(payload:any,timestamp=String(Math.floor(Date.now()/1000)),signed=true)=>{const body=new URLSearchParams({payload:JSON.stringify(payload)}).toString(),signature='v0='+createHmac('sha256',secret).update(`v0:${timestamp}:${body}`).digest('hex');return f.app.request('https://orbit.test/api/v1/slack/actions',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Slack-Request-Timestamp':timestamp,...(signed?{'X-Slack-Signature':signature}:{})},body});};
  const refused=async(payload:any)=>{const r=await inbound(payload);assert.match((await r.json() as any).text,/Not changed/);};
  assert.equal((await inbound(action(),undefined,false)).status,401);assert.equal((await inbound(action(),String(Math.floor(Date.now()/1000)-600))).status,401);
  await refused(action());await call('mappings','PUT',{slackUserId:'UMAPPED',operatorId:f.actor,revoked:false});await refused(action('UMAPPED','orbit_ack',{team:{id:'TFOREIGN'}}));await refused(action('UMAPPED','orbit_ack',{channel:{id:'CFOREIGN'}}));await refused(action('UMAPPED','orbit_ack',{message:{ts:posts[0].ts,user:'UOTHER'}}));
  await call('mappings','PUT',{slackUserId:'UMAPPED',operatorId:f.actor,revoked:true});await refused(action());await call('mappings','PUT',{slackUserId:'UMAPPED',operatorId:f.actor,revoked:false});
  const ack=action();assert.match((await(await inbound(ack)).json() as any).text,/acknowledged/);await refused(ack);assert.equal((await notices()).find(n=>n.id===stage.id).acknowledged_by,f.actor);
  const makeTask=action('UMAPPED','orbit_task');assert.match((await(await inbound(makeTask)).json() as any).text,/task created/);await refused(makeTask);
  const created=await f.db.prepare("SELECT t.* FROM sales_tasks t JOIN slack_actions a ON a.task_id=t.id WHERE a.action='orbit_task'").first<any>();assert.equal(created.created_by,f.actor);assert.equal(created.owner_id,f.actor);assert.equal(created.notes,'');
  const removed=await(await f.request('settings/operators','POST',{email:'removed@orbit.test',displayName:'Removed seller'})).json() as any;await call('mappings','PUT',{slackUserId:'UREMOVED',operatorId:removed.id,revoked:false});const removedResponse=await f.request(`settings/operators/${removed.id}`,'DELETE',{confirmed:true});assert.equal(removedResponse.status,200,await removedResponse.clone().text());await refused(action('UREMOVED'));
  outcome='failed';await move(deal,second,f.stage);assert.ok((await notices()).some(n=>n.state==='failed'));outcome='sent';
  await f.request(`records/opportunity/${deal}/entries`,'POST',{kind:'call',text:'Customer call with private content',occurredAt:new Date().toISOString(),durationMinutes:5});
  await f.request(`records/opportunity/${deal}/lifecycle`,'POST',{state:'won',reason:'Private win reason'});assert.ok((await notices()).some(n=>n.event_kind==='won'&&n.state==='sent'));assert.ok((await notices()).some(n=>n.event_kind==='handoff'&&n.state==='sent'));assert.ok(posts.every(p=>!p.text.includes('Private win reason')&&!p.text.includes('Customer call with private content')));
  outcome='revoked';await process(); // no queued delivery need not call the provider; explicit workspace verification does.
  assert.equal((await f.request('settings/slack/verify','POST',{})).status,503);assert.equal((await call('')).installation.state,'revoked');const products=await(await f.request('settings/products')).json() as any;assert.equal(products.products.find((p:any)=>p.products.includes('Slack')).state,'unresolved-setup');
  await move(deal,f.stage,second);assert.ok((await notices()).some(n=>n.state==='paused'));
  await proveArchive(f,contact,secret,token);
 }finally{globalThis.fetch=native;}
}
async function proveArchive(f:Fixture,contact:string,secret:string,token:string){
 const call=async(path:string,method='GET',body?:unknown)=>{const r=await f.request(path,method,body);assert.ok(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;};
 let job=await call('records/archive/exports','POST',{});while(job.state==='preparing')job=await call(`records/archive/exports/${job.id}/advance`,'POST',{});const archive=await call(`records/archive/exports/${job.id}/download`);assert.ok(!JSON.stringify(archive).includes(secret)&&!JSON.stringify(archive).includes(token));assert.ok(!archive.manifest.tables.some((t:any)=>t.name==='slack_credentials'));
 const target=await isolatedDatabase();try{
  const deps=createDependencies(target.db),actor=createId();await deps.auth.ensureOperator({id:actor,email:'target@orbit.test',displayName:'Target'});await deps.workspace.ensureWorkspace({name:'Archive receiver',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});const session=await deps.auth.createSession(actor);
  const app=createApp({database:target.db,assets:{fetch:async()=>new Response('')}});
  const request=async(path:string,method='GET',body?:unknown)=>{const r=await app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.ok(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;};
  let restored=await request('records/archive/imports','POST',{manifest:archive.manifest,confirmed:true});for(const part of archive.parts)await request(`records/archive/imports/${restored.id}/parts/${part.index}`,'PUT',part);for(let n=0;n<1000&&restored.state!=='complete';n++)restored=await request(`records/archive/imports/${restored.id}/finalize`,'POST',{});assert.equal(restored.state,'complete');
  for(const name of ['slack_channels','slack_mappings','slack_notices','slack_actions'])assert.deepEqual((await target.db.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all()).results,(await f.db.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all()).results,`${name} round-trips`);
  assert.equal(await target.db.prepare('SELECT count(*) n FROM slack_credentials').first('n'),0);
 }finally{await target.dispose();}
 await call(`records/contact/${contact}`,'DELETE',{confirmed:true});const rows=await call('settings/slack');assert.ok(rows.notices.every((n:any)=>n.state==='redacted'&&n.content_json===null&&n.record_id===null));
}
