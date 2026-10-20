import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createAIProvider} from '../../src/core/features/assistance/provider';
import {createOutboundMail} from '../../src/core/platform/outbound-mail';
import manifest from '../../seed.json' with {type:'json'};
import {createApp} from '../support/app';
import {isolatedDatabase} from '../support/isolated-database';
import {createDependencies} from '../support/dependencies';
import {createId} from '../../src/core/shared/ids';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import {OutreachService} from '../../src/core/features/outreach/service';
import type {OutboundMessage} from '../../src/core/features/outreach/approval-repository';
import {databaseDigest} from '../support/stop-attribution';
test('OUT-020 managed opt-out is approval-bound, suppresses only its recipient and stops replayed dispatch',async context=>{
 const actual=globalThis.fetch,requests:{url:string;body:any}[]=[];
 const relayUrl='https://managed-mail.example.test/send';
 globalThis.fetch=async(input,init)=>{const url=String(input);requests.push({url,body:JSON.parse(String(init?.body??'{}'))});if(url===relayUrl)return Response.json({messageId:`<relay-${requests.length}@example.test>`},{status:202});if(url==='https://api.sendgrid.com/v3/mail/send')return new Response(null,{status:202,headers:{'x-message-id':'test-provider-receipt'}});if(url==='https://api.openai.com/v1/responses')return Response.json({status:'completed',usage:{input_tokens:1,output_tokens:1,input_tokens_details:{cached_tokens:0}},output:[{content:[{type:'output_text',text:JSON.stringify({explanation:'Observed request.',subject:'Request',body:'Thank you for your request.',evidenceIds:['test-evidence']})}]}]});throw new Error('Unexpected outbound target');};
 try{
  await createAIProvider({OPENAI_API_KEY:'test-key',AI_MODEL:'test-model',AI_INPUT_COST_PER_MILLION:'0.2',AI_OUTPUT_COST_PER_MILLION:'1.2'})!.generate({evidence:[{id:'test-evidence',subject:'Test-owned request'}]});
  await createOutboundMail({SENDGRID_API_KEY:'test-key',MAIL_FROM:'test@example.invalid',MAIL_REPLY_TO:'reply@example.invalid',SENDGRID_UNSUBSCRIBE_GROUP_ID:'1'})!.send({id:'test-id',recipient_email:'customer@example.invalid',subject:'Reviewed test subject',body:'Reviewed test body'});
  const exercised=[{id:'openai',adapter:'ai.provider.v1',url:'https://api.openai.com/v1/responses'},{id:'sendgrid',adapter:'mail.sender.v1',url:'https://api.sendgrid.com/v3/mail/send'}];
  assert.deepEqual(requests.map(r=>r.url),exercised.map(provider=>provider.url));
  for(const provider of exercised){
   const declaration=manifest.externals.find(item=>item.id===provider.id);
   assert.ok(declaration,`Exercised provider ${provider.id} must declare its data flow`);
   assert.ok(declaration.adapters.includes(provider.adapter),`Exercised provider ${provider.id} must declare ${provider.adapter}`);
  }
  assert.equal(requests[1]!.body.personalizations[0].to[0].email,'customer@example.invalid');assert.equal(requests[1]!.body.content[0].value,'Reviewed test body');assert.deepEqual(requests[1]!.body.asm,{group_id:1});assert.equal(requests[1]!.body.tracking_settings.subscription_tracking.enable,false);assert.equal(requests[0]!.body.store,false);
  // OUT-020 through the public doors, with SendGrid faked only at the network edge.
  const p=await isolatedDatabase();context.mock.timers.enable({apis:['Date'],now:Date.parse('2030-01-07T10:00:00Z')});try{
   const db=p.db,deps=createDependencies(db),owner=createId(),rep=createId(),stage=createId();
   for(const [id,name] of [[owner,'Owner'],[rep,'Rep']] as const)await deps.auth.ensureOperator({id,email:`${id}@test.invalid`,displayName:name});
   await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(owner).run();
   await deps.workspace.ensureWorkspace({name:'Opt-out',timezone:'UTC',currency:'USD',workingHours:{days:[1,2,3,4,5],start:'08:00',end:'18:00'},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});await deps.workspace.ensurePipelineStage({id:stage,name:'First',position:0});
   const deal=await new WorkbenchRepository(db).createOpportunity({title:'Opt-out deal',companyName:'Opt-out company',contactName:'Opt-out contact',email:'buyer@customer.invalid',stageId:stage,valueCents:0},rep),contact=(await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(deal.id).first<{contact_id:string}>())!.contact_id;
   const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:createOutboundMail({SENDGRID_API_KEY:'test-key',MAIL_FROM:'test@example.invalid',MAIL_REPLY_TO:'reply@example.invalid',SENDGRID_UNSUBSCRIBE_GROUP_ID:'7',DB:db})});
   const tokens=new Map([[owner,(await deps.auth.createSession(owner)).token],[rep,(await deps.auth.createSession(rep)).token]]);
   const call=(target:typeof app)=>async<T=any>(user:string,path:string,body?:unknown)=>{const response=await target.request(`https://orbit.test/api/v1/${path}`,{method:body===undefined?'GET':'POST',headers:{Cookie:`__Host-orbit_session=${tokens.get(user)}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:await response.json() as T};},api=call(app);
   const draft=async(subject:string)=>(await api<{id:string}>(rep,`workbench/opportunities/${deal.id}/drafts`,{contactId:contact,subject,body:'Reviewed body'})).body.id;
   const delivered=()=>requests.at(-1)!.body;
   const review=async(id:string)=>{const row=(await db.prepare('SELECT * FROM drafts WHERE id=?').bind(id).first<any>())!;assert.equal(row.is_stale,1,'Changing opt-out makes the reviewed draft stale');assert.equal((await api(rep,`workbench/drafts/${id}/review`,{revision:row.revision,reviewedUpdatedAt:row.updated_at,recipientContactId:contact,recipientEmail:row.recipient_email,subject:row.subject,body:row.body})).status,200);return row.revision+1;};
   const settings=await api<{types:{type:string;carries:boolean;basis:string}[]}>(rep,'settings/opt-out');
   assert.deepEqual(settings.body.types.map(t=>[t.type,t.carries]),[['one_to_one',false],['sequence',true],['workflow',true]],'A new installation starts one-to-one off and sequence and workflow email on');
   const plain=await draft('Default one-to-one');assert.equal((await api(rep,`workbench/drafts/${plain}/opt-out`)).body.carries,false);
   assert.equal((await api(rep,`workbench/drafts/${plain}/approve`,{revision:1})).body.state,'accepted');assert.equal(delivered().asm,undefined,'No unsubscribe group, so no List-Unsubscribe header and no footer');
   assert.equal((await api(rep,'settings/opt-out/one_to_one',{carries:true,removalAllowed:true})).status,403);
   const pending=await draft('Reviewed before the owner changed the setting');
   assert.equal((await api(owner,'settings/opt-out/one_to_one',{carries:true,removalAllowed:true})).status,200);
   assert.equal((await db.prepare('SELECT stale_reason FROM drafts WHERE id=?').bind(pending).first<{stale_reason:string}>())!.stale_reason,'Opt-out setting changed','A draft reviewed under the old setting needs review again');
   assert.equal((await api(rep,`workbench/drafts/${pending}/approve`,{revision:1})).status,409);
   const changed=(await db.prepare("SELECT actor_id,details_json FROM audit_entries WHERE action='opt_out.setting.changed' AND entity_id='one_to_one'").first<{actor_id:string;details_json:string}>())!;assert.equal(changed.actor_id,owner);assert.deepEqual(JSON.parse(changed.details_json),{previous:{carries:false,removalAllowed:true},current:{carries:true,removalAllowed:true}});
   const opted=await draft('Opted in by the owner');assert.equal((await api(rep,`workbench/drafts/${opted}/approve`,{revision:1})).body.state,'accepted');assert.deepEqual(delivered().asm,{group_id:7});
   const scheduled=await draft('Scheduled under opt-out on'),bound=(await api<{id:string}>(rep,`workbench/drafts/${scheduled}/approve`,{revision:1,scheduledAt:'2030-01-08T10:00:00.000Z'})).body.id;
   assert.equal((await api(owner,'settings/opt-out/one_to_one',{carries:false,removalAllowed:false})).status,200);
   assert.deepEqual((await api(owner,'settings/opt-out')).body.approvedUnsent,{carrying:1,notCarrying:0,approvedBeforeSetting:0},'Settings count approved unsent messages bound to the old state');
   context.mock.timers.setTime(Date.parse('2030-01-08T10:00:00Z'));await new OutreachService(db,createOutboundMail({SENDGRID_API_KEY:'test-key',MAIL_FROM:'test@example.invalid',MAIL_REPLY_TO:'reply@example.invalid',SENDGRID_UNSUBSCRIBE_GROUP_ID:'7',DB:db})!).dispatchDue();
   assert.equal((await db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(bound).first<{state:string}>())!.state,'accepted');assert.deepEqual(delivered().asm,{group_id:7},'A message keeps the opt-out state its approval bound');
   const added=await draft('Rep adds opt-out');assert.equal((await api(rep,`workbench/drafts/${added}/opt-out`,{choice:'added'})).body.carries,true);
   assert.equal((await api(rep,`workbench/drafts/${added}/approve`,{revision:1})).status,409,'A stale draft needs review first');
   assert.equal((await api(rep,`workbench/drafts/${added}/approve`,{revision:await review(added)})).body.state,'accepted');assert.deepEqual(delivered().asm,{group_id:7});
   assert.equal((await api(owner,'settings/opt-out/one_to_one',{carries:true,removalAllowed:false})).status,200);
   const relation=await draft('Relationship mail');assert.equal((await api(rep,`workbench/drafts/${relation}/opt-out`,{choice:'relationship'})).status,409,'Removal can be forbidden per type');
   assert.equal((await api(owner,'settings/opt-out/one_to_one',{carries:true,removalAllowed:true})).status,200);
   assert.equal((await api(rep,`workbench/drafts/${relation}/opt-out`,{choice:'relationship'})).body.carries,false);
   assert.equal((await api(rep,`workbench/drafts/${relation}/approve`,{revision:await review(relation)})).body.state,'accepted');assert.equal(delivered().asm,undefined);
   assert.deepEqual((await db.prepare('SELECT b.carries,b.marking FROM outbound_message_opt_out b JOIN outbound_messages m ON m.id=b.message_id ORDER BY m.created_at').all()).results.map(row=>[row.carries,row.marking]),[[0,null],[1,null],[1,null],[1,'added'],[0,'relationship']]);
   // A relay without an installation origin still refuses opt-out and labels its reply exception.
   const relayMail=createOutboundMail({MAIL_PROVIDER:'rer',MAIL_FROM:'managed@example.test',MAIL_RELAY_URL:relayUrl,MAIL_API_KEY:'fixture-relay-key'})!,relay=call(createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:relayMail})),relaySends=()=>requests.filter(r=>r.url===relayUrl).length;
   const refusal='This relay cannot carry your opt-out link yet (OUT-013)',fresh=await draft('New sales email on the relay');
   assert.deepEqual((({refusal,marking,carries,reply})=>({refusal,marking,carries,reply}))((await relay(rep,`workbench/drafts/${fresh}/opt-out`)).body),{refusal,marking:'transport',carries:false,reply:false},'The review names the refusal before approval');
   const refused=await relay(rep,`workbench/drafts/${fresh}/approve`,{revision:1});assert.equal(refused.status,409);assert.equal(refused.body.error,refusal);assert.equal(relaySends(),0,'A new one-to-one email that needs opt-out never reaches the relay');
   const queued=await draft('Approved through SendGrid, dispatched after the switch'),late=(await api<{id:string}>(rep,`workbench/drafts/${queued}/approve`,{revision:1,scheduledAt:'2030-01-09T10:00:00.000Z'})).body.id;
   context.mock.timers.setTime(Date.parse('2030-01-09T10:00:00Z'));await new OutreachService(db,relayMail).dispatchDue();
   assert.deepEqual(await db.prepare('SELECT state,failure FROM outbound_messages WHERE id=?').bind(late).first(),{state:'failed',failure:refusal},'Dispatch refuses opt-out the relay cannot carry');assert.equal(relaySends(),0);
   assert.equal((await relay(owner,'settings/opt-out')).body.relayRefused,2,'Each refusal is audited and counted');
   assert.equal((await relay(rep,`workbench/opportunities/${deal.id}/events`,{type:'email.replied',subject:'Yes, tell me more',occurredAt:new Date().toISOString(),eventId:'buyer-reply',contactId:contact})).status,201);
   const answer=await draft('Reply in the thread the buyer answered');assert.deepEqual((({refusal,marking,reply})=>({refusal,marking,reply}))((await relay(rep,`workbench/drafts/${answer}/opt-out`)).body),{refusal:null,marking:'transport',reply:true});
   assert.equal((await relay(rep,`workbench/drafts/${answer}/approve`,{revision:1})).body.state,'accepted');assert.equal(relaySends(),1);assert.equal(requests.at(-1)!.body.subject,'Reply in the thread the buyer answered');
   assert.deepEqual(await db.prepare('SELECT b.carries,b.marking FROM outbound_message_opt_out b JOIN outbound_messages m ON m.id=b.message_id WHERE m.draft_id=?').bind(answer).first(),{carries:0,marking:'transport'},'The reply is bound and labeled as sent without opt-out');

   // A configured installation origin gives managed single-recipient mail its own durable capability.
   const managedMail=createOutboundMail({MAIL_PROVIDER:'rer',MAIL_FROM:'managed@example.test',MAIL_RELAY_URL:relayUrl,MAIL_API_KEY:'fixture-relay-key',AUTH_ORIGIN:'https://orbit.test',DB:db})!;
   assert.equal(managedMail.optOutOrigin,'https://orbit.test');
   const managedApp=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:managedMail}),managed=call(managedApp);
   const secondDeal=await new WorkbenchRepository(db).createOpportunity({title:'Separate renewal',companyName:'Other customer',contactName:'Other buyer',email:'other@customer.invalid',stageId:stage,valueCents:0},rep);
   const secondContact=(await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(secondDeal.id).first<{contact_id:string}>())!.contact_id;
   const otherDraft=async(subject:string)=>(await managed<{id:string}>(rep,`workbench/opportunities/${secondDeal.id}/drafts`,{contactId:secondContact,subject,body:'Other reviewed body'})).body.id;
   const approve=async(id:string,scheduledAt?:string)=>{
    const result=await managed<{id:string;state:string}>(rep,`workbench/drafts/${id}/approve`,{revision:1,...(scheduledAt?{scheduledAt}:{})});
    assert.equal(result.status,200);return result.body;
   };
   const capability=async(messageId:string)=>{
    const row=await db.prepare('SELECT token,message_id,contact_id,origin,created_at FROM outbound_opt_out_capabilities WHERE message_id=?').bind(messageId).first<{token:string;message_id:string;contact_id:string;origin:string;created_at:string}>();
    assert.ok(row,'Managed opt-out has a durable message capability');assert.match(row.token,/^[a-f0-9]{64}$/);assert.equal(row.message_id,messageId);assert.equal(row.origin,'https://orbit.test');assert.ok(Number.isFinite(Date.parse(row.created_at)));return row;
   };
   const assertWire=async(messageId:string,subject:string,body='Reviewed body')=>{
    const cap=await capability(messageId),url=`https://orbit.test/unsubscribe/${cap.token}`;
    const wire=requests.filter(request=>request.url===relayUrl).findLast(request=>request.body.subject===subject)!.body;
    assert.equal(wire.text,body+'\n\nUnsubscribe: '+url,'The exact saved body is followed by exactly one opt-out footer');
    assert.equal(wire.listUnsubscribe,'<'+url+'>');assert.equal(wire.listUnsubscribePost,true);return {cap,url,wire};
   };
   const assertPlain=(subject:string,body='Reviewed body')=>{
    const wire=requests.filter(request=>request.url===relayUrl).findLast(request=>request.body.subject===subject)!.body;
    assert.equal(wire.text,body);assert.equal(Object.hasOwn(wire,'listUnsubscribe'),false);assert.equal(Object.hasOwn(wire,'listUnsubscribePost'),false);
   };
   const freshManaged=await draft('Managed reviewed opt-out');
   const reviewState=(await managed(rep,`workbench/drafts/${freshManaged}/opt-out`)).body;
   assert.equal(reviewState.carries,true);assert.equal(reviewState.refusal,null);assert.equal(reviewState.marking,null);
   const approved=await approve(freshManaged);assert.equal(approved.state,'accepted');
   const {cap,url}=await assertWire(approved.id,'Managed reviewed opt-out');assert.equal(cap.contact_id,contact);
   const countBefore=(await db.prepare('SELECT count(*) AS n FROM outbound_opt_out_capabilities').first<{n:number}>())!.n,sendsBeforeReapproval=relaySends();
   assert.equal((await managed(rep,`workbench/drafts/${freshManaged}/approve`,{revision:1})).status,409);
   assert.equal((await managed(rep,`workbench/drafts/${pending}/approve`,{revision:1})).status,409);
   assert.equal((await db.prepare('SELECT count(*) AS n FROM outbound_opt_out_capabilities').first<{n:number}>())!.n,countBefore,'Rejected approvals create no capability');
   assert.equal(relaySends(),sendsBeforeReapproval,'A rejected or replayed approval cannot dispatch again');

   const untouched=await databaseDigest(db),confirmation=await managedApp.request(url),html=await confirmation.text();
   assert.equal(confirmation.status,200);assert.match(html,/<form[^>]*method="post"/);assert.match(html,/<button[^>]*type="submit"/);
   for(const identity of [contact,deal.id,approved.id,'buyer@customer.invalid','Opt-out contact','Managed reviewed opt-out','other@customer.invalid'])assert.equal(html.includes(identity),false,'Public confirmation discloses no recipient or message identity');
   assert.equal(await databaseDigest(db),untouched,'Opening a valid opt-out link changes no database state');
   const invalidUrls=['https://orbit.test/unsubscribe/not-a-token',`https://orbit.test/unsubscribe/${'f'.repeat(64)}`,url.replace('https://orbit.test','https://foreign.test')];
   let generic404:string|undefined;
   for(const invalidUrl of invalidUrls)for(const method of ['GET','POST']){
    const response=await managedApp.request(invalidUrl,{method}),body=await response.text();assert.equal(response.status,404);
    generic404??=body;assert.equal(body,generic404,'Malformed, foreign and wrong-origin capabilities have the same generic refusal');
   }
   assert.equal(await databaseDigest(db),untouched,'Invalid links and wrong-origin posts change no database state');

   // Approval carries its original setting across a provider move and later setting changes.
   const switchedDraft=await draft('SendGrid approval keeps opt-out'),switched=(await api<{id:string}>(rep,`workbench/drafts/${switchedDraft}/approve`,{revision:1,scheduledAt:'2030-01-10T10:00:00.000Z'})).body.id;
   assert.equal(await db.prepare('SELECT token FROM outbound_opt_out_capabilities WHERE message_id=?').bind(switched).first(),null);
   assert.equal((await managed(owner,'settings/opt-out/one_to_one',{carries:false,removalAllowed:true})).status,200);
   const offDraft=await draft('Managed approval keeps opt-out off'),off=await approve(offDraft,'2030-01-10T10:00:00.000Z');
   assert.equal(await db.prepare('SELECT token FROM outbound_opt_out_capabilities WHERE message_id=?').bind(off.id).first(),null);
   assert.equal((await managed(owner,'settings/opt-out/one_to_one',{carries:true,removalAllowed:true})).status,200);
   const olderDraft=await draft('Approval before opt-out bindings'),older=(await api<{id:string}>(rep,`workbench/drafts/${olderDraft}/approve`,{revision:1,scheduledAt:'2030-01-10T10:00:00.000Z'})).body.id;
   await db.prepare('DELETE FROM outbound_message_opt_out WHERE message_id=?').bind(older).run(); // Pre-OUT-020 approval fixture.
   const oldTransportDraft=await otherDraft('Legacy uncarried approval'),oldTransport=await approve(oldTransportDraft,'2030-01-10T10:00:00.000Z');
   await db.prepare("UPDATE outbound_message_opt_out SET carries=0,marking='transport' WHERE message_id=?").bind(oldTransport.id).run(); // Previously reviewed without an available link.
   await db.prepare('DELETE FROM outbound_opt_out_capabilities WHERE message_id=?').bind(oldTransport.id).run();
   context.mock.timers.setTime(Date.parse('2030-01-10T10:00:00Z'));
   const service=new OutreachService(db,managedMail);await service.dispatchDue();
   for(const [id,subject] of [[switched,'SendGrid approval keeps opt-out'],[older,'Approval before opt-out bindings']] as const){
    assert.equal((await db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(id).first<{state:string}>())!.state,'accepted');
    assert.equal((await assertWire(id,subject)).cap.contact_id,contact);
   }
   assertPlain('Managed approval keeps opt-out off');assert.equal(await db.prepare('SELECT token FROM outbound_opt_out_capabilities WHERE message_id=?').bind(off.id).first(),null);
   assert.deepEqual(await db.prepare('SELECT state,failure FROM outbound_messages WHERE id=?').bind(oldTransport.id).first(),{state:'failed',failure:refusal},'A legacy transport marking still requires fresh review unless it is a reply');
   assert.equal((await managed(rep,`workbench/opportunities/${secondDeal.id}/events`,{type:'email.replied',subject:'Renewal question',occurredAt:new Date().toISOString(),eventId:'other-buyer-reply',contactId:secondContact})).status,201);
   const oldReplyDraft=await otherDraft('Legacy uncarried reply'),oldReply=await approve(oldReplyDraft,'2030-01-11T10:00:00.000Z');
   await db.prepare("UPDATE outbound_message_opt_out SET carries=0,marking='transport' WHERE message_id=?").bind(oldReply.id).run();
   // This fixture predates capabilities too: the old review never approved a link.
   await db.prepare('DELETE FROM outbound_opt_out_capabilities WHERE message_id=?').bind(oldReply.id).run();
   context.mock.timers.setTime(Date.parse('2030-01-11T10:00:00Z'));await service.dispatchDue();
   assertPlain('Legacy uncarried reply','Other reviewed body');
   assert.equal((await db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(oldReply.id).first<{state:string}>())!.state,'accepted');

   // Both customers have independently approved future work. Stop only the recipient named by the capability.
   const remaining=[] as string[];
   for(const subject of ['Scheduled buyer follow-up','Held buyer follow-up','Claimed buyer follow-up'])remaining.push((await approve(await draft(subject),'2030-01-14T10:00:00.000Z')).id);
   await db.prepare("UPDATE outbound_messages SET state='draft' WHERE id=?").bind(remaining[1]).run();
   await db.prepare("UPDATE outbound_messages SET state='queued' WHERE id=?").bind(remaining[2]).run();
   const claimed=(await db.prepare('SELECT * FROM outbound_messages WHERE id=?').bind(remaining[2]).first<OutboundMessage>())!;
   const otherFuture=await approve(await otherDraft('Other buyer keeps their renewal follow-up'),'2030-01-14T10:00:00.000Z');
   const beforeStop=relaySends(),stopped=await managedApp.request(url,{method:'POST'});assert.equal(stopped.status,200);
   assert.equal((await db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(contact).first<{contactability:string}>())!.contactability,'do_not_contact');
   assert.equal((await db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(secondContact).first<{contactability:string}>())!.contactability,'contactable');
   for(const id of remaining)assert.equal((await db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(id).first<{state:string}>())!.state,'cancelled','The stop atomically cancels scheduled, held and claimed sends');
   assert.equal((await db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(otherFuture.id).first<{state:string}>())!.state,'scheduled');
   const stoppedDigest=await databaseDigest(db);
   assert.equal((await managedApp.request(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'List-Unsubscribe=One-Click'})).status,200);
   assert.equal((await managedApp.request(url,{method:'POST'})).status,200);
   assert.equal(await databaseDigest(db),stoppedDigest,'Button and RFC 8058 repeats are idempotent');
   assert.equal((await service.submit(claimed)).state,'cancelled');assert.equal(relaySends(),beforeStop,'A stale in-memory dispatch claim cannot send after the stop');
   context.mock.timers.setTime(Date.parse('2030-01-14T10:00:00Z'));await service.dispatchDue();await service.dispatchDue();
   assert.equal(relaySends(),beforeStop+1,'Only the other customer’s scheduled mail is dispatched, once');
   const otherWire=await assertWire(otherFuture.id,'Other buyer keeps their renewal follow-up','Other reviewed body');assert.equal(otherWire.cap.contact_id,secondContact);
   for(const id of remaining)assert.equal((await db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(id).first<{state:string}>())!.state,'cancelled','Replayed scheduled dispatch cannot revive stopped work');
   context.mock.timers.setTime(Date.parse('2040-01-10T10:00:00Z'));
   assert.equal((await managedApp.request(url)).status,200,'A capability has no arbitrary time expiry');
   context.mock.timers.setTime(Date.parse('2030-01-14T10:00:00Z'));
   tokens.set(owner,(await deps.auth.createSession(owner)).token);
   const erased=await managedApp.request(`https://orbit.test/api/v1/records/contact/${contact}`,{method:'DELETE',headers:{Cookie:`__Host-orbit_session=${tokens.get(owner)}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({confirmed:true})});
   assert.equal(erased.status,200);assert.equal(await db.prepare('SELECT id FROM contacts WHERE id=?').bind(contact).first(),null);
   assert.equal((await db.prepare('SELECT count(*) AS n FROM outbound_opt_out_capabilities WHERE contact_id=?').bind(contact).first<{n:number}>())!.n,0,'Public contact erasure removes every capability for that recipient');
   for(const method of ['GET','POST']){const response=await managedApp.request(url,{method});assert.equal(response.status,404);assert.equal(await response.text(),generic404);}
   assert.equal((await managedApp.request(otherWire.url)).status,200,'Erasing one person preserves another person’s capability');
  }finally{context.mock.timers.reset();await p.dispose();}
 }finally{globalThis.fetch=actual;}
});
