import {provePersonalSlack} from './personal-slack-proof';
import {slackNetwork} from './slack-network';
import {proveDashboardSlack} from './dashboard-slack-proof';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createId} from '../../src/core/shared/ids';
import {snapshot} from '../../src/core/features/delegation/evidence';
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
  const routed=((await call('')).channels as any[]).map(c=>c.id);for(const id of ['CEXTERNAL','CNOTMEMBER'])assert.ok(!routed.includes(id),`${id} is refused and leaves no stored route`);
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
  const contactRead=await f.request(`records/contact/${contact}`);assert.equal(contactRead.status,200);
  const person=(await contactRead.json() as any).record;assert.ok(person.name&&person.email,'The source entries include real seeded contact details');
  const phone='+1 202 555 0184',amount='USD 73921.47',cents='7392147',entries:string[]=[];
  const privateTexts=['synthetic-orbit-104-call Private customer call contents','synthetic-orbit-104-meeting private meeting minutes'];
  for(const [index,kind] of (['call','meeting'] as const).entries()){
   const text=`${privateTexts[index]}; ${person.name}; ${person.email}; ${phone}; ${amount}; ${cents} cents`;
   const beforePosts=posts.length,beforeAttempts=edge.attempts;
   const saved=await f.request(`records/opportunity/${deal}/entries`,'POST',{kind,text,occurredAt:new Date(Date.now()-60000).toISOString(),durationMinutes:5,contactIds:[contact]});
   assert.equal(saved.status,200,await saved.clone().text());const entry=(await saved.json() as any).id;assert.ok(entry&&!entries.includes(entry));entries.push(entry);
   const detail=await f.request(`records/opportunity/${deal}`);assert.equal(detail.status,200);
   const source=(await detail.json() as any).timeline.find((item:any)=>item.id===entry);assert.equal(source?.kind,`manual.${kind}`);assert.equal(JSON.parse(source.payload_json).text,text);
   const matching=(await notices()).filter(n=>n.source_id===entry);assert.equal(matching.length,1,`One ${kind} notice belongs to its returned manual entry`);
   const notice=matching[0];assert.equal(notice.event_key,entry);assert.equal(notice.event_kind,'handoff');assert.equal(notice.state,'sent');assert.equal(notice.record_type,'opportunity');assert.equal(notice.record_id,deal);
   const content=JSON.parse(notice.content_json);
   assert.deepEqual(Object.keys(content).sort(),['eventKind','recordDisplayName','stageFrom','stageTo','ownerDisplayName','dueDate','link'].sort());assert.equal(content.eventKind,'handoff');
   const href=new URL(content.link);assert.equal(href.origin,'https://orbit.test');assert.equal(href.pathname,`/app/opportunities/${deal}`);assert.equal(href.search+href.hash+href.username+href.password,'','The record link carries no capability');
   assert.equal((await f.request(`records/opportunity/${deal}`,'GET',undefined,{Cookie:''})).status,401,'The linked record needs an Orbit session');
   const submitted=posts.filter(p=>p.client_msg_id===notice.id);assert.equal(submitted.length,1,`One adapter submission is correlated to the ${kind} notice`);
   const post=submitted[0];assert.equal(post.channel,notice.channel_id);assert.equal(post.ts,notice.message_ts);assert.ok(post.text.includes(content.link));
   assert.deepEqual(post.blocks.flatMap((block:any)=>(block.elements??[]).filter((element:any)=>element.url).map((element:any)=>element.url)),[content.link]);
   assert.equal(post.unfurl_links,false);assert.equal(post.unfurl_media,false);
   for(const payload of [notice.content_json,post.text,JSON.stringify(post.blocks)])for(const forbidden of [...privateTexts,person.name,person.email,phone,amount,cents])assert.ok(!payload.includes(forbidden),`${kind} notice excludes private source content from storage and Slack`);
   assert.equal(posts.length,beforePosts+1);assert.equal(edge.attempts,beforeAttempts+1);
   await process();assert.equal(posts.length,beforePosts+1);assert.equal(edge.attempts,beforeAttempts+1,'Processing again never submits the manual notice again');
   assert.deepEqual((await notices()).filter(n=>n.source_id===entry),matching,'Processing again retains the same sent notice and provider receipt');
  }
  // BOUNDARY-001: challenge the won notice and a person's actual handoff, not a call's generic handoff notice.
  const privateProduct='synthetic-orbit-private-product-74',privateCommitment='synthetic-orbit-private-commitment-74',privateHandoff='synthetic-orbit-private-handoff-74',privateDescription='synthetic-orbit-private-description-74',privateWin='Private win reason synthetic-orbit-private-win-74',amountCents=987654321;
  const privateAmount='$9,876,543.21',recordPath=`records/opportunity/${deal}`,beforeRecord=await(await f.request(recordPath)).json() as any;
  const amountSaved=await f.request(recordPath,'PATCH',{changes:{value_cents:amountCents},base:{value_cents:beforeRecord.record.value_cents}});assert.equal(amountSaved.status,200,await amountSaved.clone().text());
  const context=await(await f.request(`relationships/opportunity/${deal}`)).json() as any;
  const contextSaved=await f.request(`relationships/opportunity/${deal}`,'PUT',{revision:context.revision,companyId:context.company?.id??null,primaryContactId:context.stakeholders.find((s:any)=>s.isPrimary)?.contactId??null,stakeholders:context.stakeholders.map((s:any)=>({contactId:s.contactId,roles:s.roles,verified:s.verified})),products:[privateProduct],nextStep:'Review privately',mutualCommitments:`${privateCommitment}: ${privateAmount}`});assert.equal(contextSaved.status,200,await contextSaved.clone().text());
  const target=`opportunities/${deal}/handoffs/${createId()}`,review=await snapshot(f.db,target,true),handoffInput={operationKey:createId(),operation:'orbit.handoff.upsert',target,expectedRevision:review.revision,expectedAudienceRevision:review.audience.audienceRevision,content:{title:privateHandoff,description:`${privateDescription}: ${privateProduct}; ${privateCommitment}; ${privateAmount}`,assigneeId:f.actor,dueAt:null,status:'open'}};
  const native=(path:string,body?:unknown)=>f.app.request('https://orbit.test/delegation/'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:`__Host-orbit_session=${f.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const handoffResponse=await native('handoffs',handoffInput);assert.equal(handoffResponse.status,200,await handoffResponse.clone().text());const handoff=await handoffResponse.json() as any;assert.equal(handoff.state,'confirmed');
  const savedHandoff=(await(await native('handoffs/'+deal)).json() as any).tasks.find((t:any)=>t.target===target).task;
  assert.deepEqual([savedHandoff.title,savedHandoff.description,savedHandoff.actor_id,savedHandoff.source_client_id],[privateHandoff,handoffInput.content.description,f.actor,null],'The notice source is a saved person-authored handoff with real private content');
  await process();
  const callResult=await f.request(`records/opportunity/${deal}/entries`,'POST',{kind:'call',text:'Private customer call contents',occurredAt:new Date().toISOString(),durationMinutes:5});assert.equal(callResult.status,200);
  const won=await f.request(`records/opportunity/${deal}/lifecycle`,'POST',{state:'won',reason:privateWin});assert.equal(won.status,200,await won.clone().text());assert.ok((await notices()).some(n=>n.event_kind==='won'&&n.state==='sent'));assert.ok((await notices()).some(n=>n.event_kind==='handoff'&&n.state==='sent'));
  const detail=await(await f.request(recordPath)).json() as any,savedContext=await(await f.request(`relationships/opportunity/${deal}`)).json() as any;
  assert.equal(detail.record.value_cents,amountCents);assert.deepEqual(savedContext.products,[privateProduct]);assert.equal(savedContext.mutualCommitments,`${privateCommitment}: ${privateAmount}`);
  const wonSource=detail.timeline.filter((e:any)=>e.kind==='lifecycle.changed'&&JSON.parse(e.payload_json).reason===privateWin);assert.equal(wonSource.length,1);assert.equal(wonSource[0].actor_id,f.actor);assert.equal(JSON.parse(wonSource[0].payload_json).state,'won');
  const handoffSource=detail.timeline.find((e:any)=>e.id===handoff.receipt.id);assert.ok(handoffSource);assert.equal(handoffSource.kind,'handoff.updated');assert.equal(handoffSource.actor_id,f.actor);assert.equal(JSON.parse(handoffSource.payload_json).handoffId,target.split('/')[3]);assert.equal(JSON.parse(handoffSource.payload_json).sourceClientId,null);
  const sourceIds=[wonSource[0].id,handoffSource.id],proofNotices=[];
  for(const [kind,sourceId] of [['won',sourceIds[0]],['handoff',sourceIds[1]]]){
   const matches=(await notices()).filter(n=>n.event_kind===kind&&n.source_id===sourceId&&n.record_id===deal&&n.channel_id==='CINTERNAL');assert.equal(matches.length,1,`${kind} has exactly one notice for its exact native source`);const notice=matches[0];proofNotices.push(notice);
   assert.equal(notice.event_key,sourceId);assert.equal(notice.state,'sent');
   const content=JSON.parse(notice.content_json),link=`https://orbit.test/app/opportunities/${deal}`;
   assert.deepEqual(content,{eventKind:kind,link,recordDisplayName:beforeRecord.record.title,stageFrom:null,stageTo:null,ownerDisplayName:'Owner',dueDate:null},`${kind} stores only permitted fields and values`);
   const submitted=posts.filter(p=>p.client_msg_id===notice.id);assert.equal(submitted.length,1);const payload=submitted[0];assert.equal(payload.ts,notice.message_ts);assert.equal(payload.channel,notice.channel_id);
   assert.equal(payload.unfurl_links,false);assert.equal(payload.unfurl_media,false);assert.equal(payload.parse,'none');
   assert.equal(payload.text,`Orbit · ${kind}\nFirst customer\nOwner: Owner\n${link}`);assert.deepEqual(payload.blocks[0],{type:'section',text:{type:'plain_text',text:`Orbit · ${kind}\nFirst customer\nOwner: Owner`,emoji:false}});assert.equal(payload.blocks[1].elements.find((b:any)=>b.action_id==='orbit_open').url,link);
   for(const marker of [privateProduct,privateCommitment,privateHandoff,privateDescription,privateWin,privateAmount,String(amountCents),'9876543.21','9,876,543','Private customer call contents']){
    assert.ok(!notice.content_json.includes(marker),`${kind} stores no ${marker}`);assert.ok(!JSON.stringify(payload).includes(marker),`${kind} submits no ${marker}, including blocks and metadata`);
   }
   const url=new URL(content.link);assert.equal(url.search,'');assert.equal(url.hash,'');assert.equal(url.username,'');assert.equal(url.password,'');
  }
  assert.equal((await f.request(recordPath,'GET',undefined,{Cookie:''})).status,401,'The linked deal data needs a native session');
  const sentBeforeReplay=posts.length;assert.equal((await native('handoffs',handoffInput)).status,409,'Replaying the old native review cannot create a second handoff');await process();await process();assert.equal(posts.length,sentBeforeReplay);
  assert.deepEqual((await notices()).filter(n=>sourceIds.includes(n.source_id)).sort((a,b)=>a.id.localeCompare(b.id)),proofNotices.sort((a,b)=>a.id.localeCompare(b.id)),'Timer replay retains the exact notice identities and stored content');
  const amountRestored=await f.request(recordPath,'PATCH',{changes:{value_cents:beforeRecord.record.value_cents},base:{value_cents:amountCents}});assert.equal(amountRestored.status,200,await amountRestored.clone().text());
  const booking=await(await f.request('sources/bookings','PUT',{name:'Internal booking notices',enabled:true})).json() as any,raw=JSON.stringify({triggerEvent:'BOOKING_CREATED',createdAt:new Date().toISOString(),payload:{uid:crypto.randomUUID(),attendees:[{email:'maya@harbour.test'}]}}),bookingCount=posts.length;
  const booked=()=>f.app.request('https://orbit.test/api/v1/signals/bookings/calcom',{method:'POST',headers:{'X-Cal-Signature-256':createHmac('sha256',booking.secret).update(raw).digest('hex')},body:raw});assert.equal((await booked()).status,201);await process();assert.equal(posts.length,bookingCount+1);assert.equal((await booked()).status,409);await process();assert.equal(posts.length,bookingCount+1);assert.ok(posts.every(p=>!p.text.includes('maya@harbour.test')&&!p.text.includes('Maya')&&!p.text.includes('Private win reason')&&!p.text.includes('Private customer call contents')));
  await proveDashboardSlack(f,{posts,call,signed,secret,token,outcome:value=>edge.setOutcome(value),safety:value=>edge.setSafety(value)});
  await provePersonalSlack(f,deal,edge);
  // DATA-001: a second deal's notice reaches Slack now, so a contact erasure while Slack is revoked leaves a pending deletion for the Records export.
  const witness=await(await f.request('workbench/opportunities','POST',{title:'Erasure witness',companyName:'Witness company',contactName:'Witness contact',email:'witness@harbour.test',stageId:f.stage,valueCents:1000})).json() as any,witnessContact=await f.db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(witness.id).first<string>('contact_id');assert.ok(witnessContact);
  const witnessMove=await f.request(`records/opportunity/${witness.id}/move`,'POST',{stageId:second,reviewedStageId:f.stage});assert.ok(witnessMove.ok,await witnessMove.clone().text());assert.ok((await notices()).some(n=>n.record_id===witness.id&&n.state==='sent'&&n.message_ts),'The witness deal notice reached Slack');
  edge.setOutcome('revoked');await process();assert.equal((await f.request('settings/slack/verify','POST',{})).status,503);assert.equal((await call('')).installation.state,'revoked');assert.equal((await call('')).installation.error,'token_revoked');const products=await(await f.request('settings/products')).json() as any;assert.equal(products.products.find((p:any)=>p.products.includes('Slack')).state,'unresolved-setup');await move(second,f.stage);assert.ok((await notices()).some(n=>n.state==='paused'));
  const erased=await f.request(`records/contact/${witnessContact}`,'DELETE',{confirmed:true});assert.equal(erased.status,200,await erased.clone().text());await process();const pending=(await call('')).deletions as any[];assert.ok(pending.length>0&&pending.every(d=>d.state==='paused'),'An erasure while Slack is revoked leaves its provider deletion pending');
  edge.setOutcome('sent');await proveSlackArchive(f,{contact,secret,token,deletes,posts,call,signed});
 }finally{edge.restore();}
}
