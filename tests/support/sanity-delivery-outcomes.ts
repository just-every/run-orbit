import assert from 'node:assert/strict';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {launchFixture} from './launch-fixture';
import {createOutboundMail} from '../../src/core/platform/outbound-mail';
import {runHostedTimers} from '../../src/core/features/outreach/scheduler';
import {signedDeliveryEvents} from './signed-reply';
import {createId} from '../../src/core/shared/ids';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';
import {signRelayBody} from '../../src/base/sendgrid-event-relay/crypto';
import type {TestContext} from 'node:test';

/** Approve through HTTP, run the scheduled transport, and receive signed real-provider-shaped receipts. */
export async function deliveryOutcomes(context:TestContext){
 const f=await launchFixture(),nativeFetch=globalThis.fetch;
 context.mock.timers.enable({apis:['Date'],now:Date.parse('2030-01-07T10:00:00Z')});
 let status=202,sends=0,lookups=0,lookupAvailable=true,lastWire:any;
 globalThis.fetch=async(input,init)=>{const url=String(input);if(url==='https://api.sendgrid.com/v3/mail/send'){sends++;lastWire=JSON.parse(String(init?.body));return new Response(null,{status});}if(url.startsWith('https://api.sendgrid.com/v3/messages?')){lookups++;if(!lookupAvailable)return Response.json({error:'Activity lookup unavailable'},{status:403});return Response.json({messages:[{msg_id:'provider-verified-receipt',status:'processed'}]});}return nativeFetch(input,init);};
 try{
  const session=await createDependencies(f.db).auth.createSession(f.actor),mail=createOutboundMail({SENDGRID_API_KEY:'synthetic-orbit-delivery',MAIL_FROM:'sender@orbit.test',MAIL_REPLY_TO:'reply@orbit.test',SENDGRID_UNSUBSCRIBE_GROUP_ID:'7'})!;
  const app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:mail});
  const request=(path:string,method='GET',body?:unknown)=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const api=async(path:string,method='GET',body?:unknown)=>{const response=await request(path,method,body);assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;};
  const customer=await f.customer(),other=await f.customer(),post=signedDeliveryEvents(f.db);
  const history=async(id=customer.opportunityId)=>(await api(`workbench/opportunities/${id}/messages`)).messages as any[];
  const message=async(id:string)=>(await history()).find(row=>row.id===id)!;
  const draft=async(subject:string)=>api(`workbench/opportunities/${customer.opportunityId}/drafts`,'POST',{contactId:customer.contactId,subject,body:'Exact reviewed content'});
  const approve=async(subject:string,scheduledAt?:string)=>{const saved=await draft(subject),response=await request(`workbench/drafts/${saved.id}/approve`,'POST',{revision:1,...(scheduledAt?{scheduledAt}:{})});return{response,body:await response.json() as any,draftId:saved.id};};
  // An accepted provider submission has no invented receipt; a delivery event makes it delivered.
  const exact=await draft('Accepted without provider message ID'),concurrent=await Promise.all([request(`workbench/drafts/${exact.id}/approve`,'POST',{revision:1,idempotencyKey:'one-reviewed-intent'}),request(`workbench/drafts/${exact.id}/approve`,'POST',{revision:1,idempotencyKey:'one-reviewed-intent'})]);
  assert.deepEqual(concurrent.map(response=>response.status).sort(),[200,409]);const confirmed=concurrent.find(response=>response.status===200)!;const accepted={response:confirmed,body:await confirmed.json() as any,draftId:exact.id};assert.equal(accepted.body.state,'accepted');

  const key=await f.db.prepare('SELECT idempotency_key,provider_message_id FROM outbound_messages WHERE id=?').bind(accepted.body.id).first<any>();assert.equal(key.provider_message_id,null);assert.equal(lastWire.custom_args.rer_delivery_id,key.idempotency_key);
  assert.equal((await request(`workbench/drafts/${accepted.draftId}/approve`,'POST',{revision:1})).status,409);assert.equal(sends,1);
  const event=(id:string,kind:string,extra:Record<string,unknown>={})=>({sg_event_id:createId(),event:kind,timestamp:Math.floor(Date.now()/1000),email:customer.email,rer_product:'orbit',rer_delivery_id:id,...extra});
  const delivered=event(key.idempotency_key,'delivered',{sg_message_id:'actual-delivery-receipt'});assert.equal((await post([delivered])).status,200);assert.equal((await post([delivered])).status,200);assert.equal((await message(accepted.body.id)).state,'delivered');
  // A lost local acceptance transaction reconciles the durable provider key without another submission.
  await f.db.prepare("CREATE TRIGGER test_settlement_failure BEFORE INSERT ON timeline_entries WHEN NEW.kind='message.accepted' BEGIN SELECT RAISE(ABORT,'Lost local acceptance transaction'); END").run();
  const reconciling=await approve('Provider accepted before local transaction failed');assert.equal(reconciling.body.state,'reconciling');
  await f.db.prepare('DROP TRIGGER test_settlement_failure').run();const reconcilingSends=sends;context.mock.timers.setTime(Date.now()+6*60000);await runHostedTimers(f.db,mail);assert.equal(sends,reconcilingSends);assert.equal((await message(reconciling.body.id)).state,'accepted');
  // Ambiguous submission uses the durable key for lookup and never submits another copy.
  status=408;const lookupsBefore=lookups;const unknown=await approve('Lost provider acknowledgement');assert.equal(unknown.response.status,502);assert.equal(unknown.body.state,'delivery-unknown');const before=sends;
  context.mock.timers.setTime(Date.now()+6*60000);await runHostedTimers(f.db,mail);await runHostedTimers(f.db,mail);assert.equal(sends,before);assert.equal(lookups-lookupsBefore,1);assert.equal((await message(unknown.body.id)).state,'accepted');
  const unresolved=await approve('Provider account has no activity lookup');lookupAvailable=false;context.mock.timers.setTime(Date.now()+6*60000);await runHostedTimers(f.db,mail);assert.equal((await message(unresolved.body.id)).state,'delivery-unknown');
  context.mock.timers.setTime(Date.now()+25*3600000);await runHostedTimers(f.db,mail);assert.equal((await message(unresolved.body.id)).state,'failed');assert.equal(sends,before+1);
  // Retryable known-unsent responses exhaust within their bounded window, then notify once.
  status=429;const limited=await approve('Known unsent provider limit');assert.equal(limited.body.state,'scheduled');const retrySends=sends;
  for(let i=0;i<6;i++){context.mock.timers.setTime(Date.now()+5*60000);await runHostedTimers(f.db,mail);}
  const exhausted=await message(limited.body.id);assert.equal(exhausted.state,'failed');assert.ok(sends>retrySends&&sends-retrySends<6);assert.ok(exhausted.failure);
  const notices=(await api('notifications')).notifications;assert.equal(notices.filter((n:any)=>n.kind==='message.failed'&&n.opportunityId===customer.opportunityId).length,2,'each failed message notifies once');
  // A retry already beyond its window fails even during a weekend quiet-hour deferral.
  status=429;context.mock.timers.setTime(Date.parse('2030-01-11T17:30:00Z'));const expired=await approve('Retry window crosses the weekend');const atExpiry=sends;context.mock.timers.setTime(Date.parse('2030-01-12T10:00:00Z'));await runHostedTimers(f.db,mail);assert.equal(sends,atExpiry);assert.equal((await message(expired.body.id)).state,'failed');assert.match((await message(expired.body.id)).failure,/retry window expired/);
  context.mock.timers.setTime(Date.parse('2030-01-14T10:00:00Z'));status=400;const refused=await approve('Permanent provider refusal');assert.equal(refused.body.state,'failed');assert.equal((await api(`records/contact/${customer.contactId}`)).record.contactability,'contactable');
  status=202;const bounced=await approve('Bounce classification');assert.equal(bounced.body.state,'accepted');
  // Provider receipts echo the submitted delivery key; HTTP approval gives a distinct message ID.
  const bounceDeliveryId=lastWire.custom_args.rer_delivery_id;assert.equal(bounceDeliveryId,await f.db.prepare('SELECT idempotency_key FROM outbound_messages WHERE id=?').bind(bounced.body.id).first('idempotency_key'));
  const scheduled=await approve('Future follow-up','2030-01-15T10:00:00Z');
  const blocked=event(bounceDeliveryId,'bounce',{type:'blocked'});assert.equal((await post([blocked])).status,200);assert.equal((await message(bounced.body.id)).state,'bounced');assert.equal((await api(`records/contact/${customer.contactId}`)).record.contactability,'contactable');
  const permanent=event(bounceDeliveryId,'bounce',{type:'bounce'});assert.equal((await post([permanent])).status,200);assert.equal((await post([permanent])).status,200);assert.equal((await api(`records/contact/${customer.contactId}`)).record.contactability,'do_not_contact');assert.equal((await message(scheduled.body.id)).state,'cancelled');assert.equal(await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(scheduled.draftId).first('is_stale'),1);
  const untouched=(await api(`records/contact/${other.contactId}`)).record;assert.equal(untouched.contactability,'contactable');
  // The signed unsubscribe path is independently attributable and applies once inside the response.
  const otherMessage=await f.message(other.contactId,other.opportunityId,'accepted'),otherSchedule=await f.message(other.contactId,other.opportunityId);
  const unsubscribe={...event(otherMessage.id,'unsubscribe'),email:other.email},relaySecret='synthetic-orbit-relay-secret-'.repeat(2),relay=createMailEventRoutes(f.db,{relaySecret}),raw=JSON.stringify([unsubscribe]),timestamp=String(Math.floor(Date.now()/1000)),signature=await signRelayBody(relaySecret,timestamp,raw);
  const relayPost=(body=raw,sig=signature)=>relay.request('https://orbit.test/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':sig},body});
  assert.equal((await relayPost(raw+' ')).status,401);assert.equal((await relayPost(raw,'v1='+'0'.repeat(64))).status,401);
  await f.db.prepare("CREATE TRIGGER test_stop_failure BEFORE INSERT ON timeline_entries WHEN NEW.kind='provider.unsubscribe' BEGIN SELECT RAISE(ABORT,'Injected atomic stop failure'); END").run();
  assert.equal((await relayPost()).status,503);assert.equal((await api(`records/contact/${other.contactId}`)).record.contactability,'contactable');assert.equal((await history(other.opportunityId)).find(row=>row.id===otherSchedule.id).state,'scheduled');
  await f.db.prepare('DROP TRIGGER test_stop_failure').run();const started=Date.now();assert.equal((await relayPost()).status,200);assert.equal((await relayPost()).status,200);assert.ok(Date.now()-started<60000);

  assert.equal((await api(`records/contact/${other.contactId}`)).record.contactability,'do_not_contact');assert.equal((await history(other.opportunityId)).find(row=>row.id===otherSchedule.id).state,'cancelled');
  // With no assigned owner, the latest native operator activity is responsible for the failure.
  const colleague=await api('settings/operators','POST',{email:`${createId().toLowerCase()}@operator.test`,displayName:'Responsible colleague'}),colleagueSession=await createDependencies(f.db).auth.createSession(colleague.id),unassigned=await f.customer();
  await api(`records/opportunity/${unassigned.opportunityId}`,'PUT',{title:'Unassigned customer',stage_id:f.stage,value_cents:0,owner_id:null});
  const future=await api(`workbench/opportunities/${unassigned.opportunityId}/drafts`,'POST',{contactId:unassigned.contactId,subject:'Responsible operator proof',body:'Reviewed content'});
  const futureMessage=await api(`workbench/drafts/${future.id}/approve`,'POST',{revision:1,scheduledAt:'2030-01-14T11:00:00Z'});
  // Make the colleague's action later than draft creation under the frozen clock.
  context.mock.timers.setTime(Date.now()+60000);
  const note=await app.request(`https://orbit.test/api/v1/records/opportunity/${unassigned.opportunityId}/entries`,{method:'POST',headers:{Cookie:`__Host-orbit_session=${colleagueSession.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({kind:'note',text:'I own the current follow-up',occurredAt:new Date().toISOString()})});assert.equal(note.status,200);
  status=400;context.mock.timers.setTime(Date.parse('2030-01-14T11:00:00Z'));await runHostedTimers(f.db,mail);assert.equal((await history(unassigned.opportunityId)).find(row=>row.id===futureMessage.id).state,'failed');
  const colleagueInbox=await app.request('https://orbit.test/api/v1/notifications',{headers:{Cookie:`__Host-orbit_session=${colleagueSession.token}`}});assert.equal((await colleagueInbox.json() as any).notifications.filter((notice:any)=>notice.opportunityId===unassigned.opportunityId&&notice.kind==='message.failed').length,1);
  context.mock.timers.setTime(Date.parse('2030-01-15T10:00:00Z'));const stoppedSends=sends;await runHostedTimers(f.db,mail);assert.equal(sends,stoppedSends);
 }finally{globalThis.fetch=nativeFetch;context.mock.timers.reset();await f.dispose();}
}
