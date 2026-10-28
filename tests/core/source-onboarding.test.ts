import {sourceEvidence} from '../support/sanity-source-evidence';
import {bookingSources} from '../support/sanity-booking-sources';
import {proveSlackNotices} from '../support/slack-notices-proof';
import {createOutboundMail,type OutboundMail} from '../../src/core/platform/outbound-mail';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHmac,randomBytes} from 'node:crypto';
import {isolatedDatabase} from '../support/isolated-database';
import {createApp} from '../support/app';
import {createDependencies} from '../support/dependencies';
import {createId} from '../../src/core/shared/ids';
import {createSourceSecurity} from '../../src/core/platform/source-security';

async function fixture(mail?:OutboundMail,sendCount?:()=>number){const platform=await isolatedDatabase(),db=platform.db,deps=createDependencies(db),actor=createId(),stage=createId();await deps.auth.ensureOperator({id:actor,email:'owner@example.test',displayName:'Owner'});await deps.workspace.ensureWorkspace({name:'First hour',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});await deps.workspace.ensurePipelineStage({id:stage,name:'Discovery',position:0});const session=await deps.auth.createSession(actor);let sends=0,clockNow:Date|undefined;const app=createApp({clock:{now:()=>clockNow??new Date()},database:db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')}),outboundMail:mail??{send:async()=>{sends++;return{providerMessageId:'paid-edge-acceptance'};}}});const headers={Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'};const request=async(path:string,method='GET',body?:unknown,override:Record<string,string>={})=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{...headers,...override},body:body===undefined?undefined:JSON.stringify(body)});return{db,app,stage,actor,token:session.token,setClock:(value:Date|undefined)=>{clockNow=value;},request,dispose:platform.dispose,sends:()=>sendCount?sendCount():sends};}
test('REPORT-004 explicitly enabled Slack schedules respect DST, hold uncertainty and never resume; email stays paused; INTEGRATE-005 INTEGRATE-009 INTEGRATE-010 INTEGRATE-011 Slack notices carry only allowed fields, replay once, withhold private data and refuse unmapped, foreign and replayed actions; BOUNDARY-001 current USD sales journey respects product boundaries and exposes unresolved provider setup; SIGNAL-001 SIGNAL-009 OPP-004 OPP-007 OUT-001 source onboarding authenticates inert connection tests, ranks real evidence and preserves customer reply through reviewed send',async()=>{
 let relayOutcome:'accepted'|'rejected'|'uncertain'='accepted';
 const nativeFetch=globalThis.fetch,relayUrl='https://managed-mail.example.test/send',bodies:Record<string,unknown>[]=[];
 globalThis.fetch=async(input,init)=>{if(String(input)!==relayUrl)return nativeFetch(input,init);assert.equal(new Headers(init?.headers).get('authorization'),'Bearer fixture-managed-mail');bodies.push(JSON.parse(String(init?.body)));if(relayOutcome==='uncertain')throw new TypeError('Paid edge lost acknowledgement');if(relayOutcome==='rejected')return Response.json({error:'rejected'},{status:400});return Response.json({messageId:`<relay-${bodies.length}@example.test>`},{status:202});};
 const mail=createOutboundMail({MAIL_PROVIDER:'rer',MAIL_FROM:'managed@example.test',MAIL_RELAY_URL:relayUrl,MAIL_API_KEY:'fixture-managed-mail',SENDGRID_API_KEY:'must-not-be-used'})!;
 const f=await fixture(mail,()=>bodies.length);try{
 const testEmail=await(await f.request('workbench/sender-test')).json() as any;assert.equal(testEmail.recipient,'owner@example.test');
 assert.equal((await f.request('workbench/sender-test','POST',{attemptId:crypto.randomUUID(),confirmed:true},{Cookie:''})).status,401);
 assert.equal((await f.request('workbench/sender-test','POST',{attemptId:crypto.randomUUID(),confirmed:true,recipient:'someone@example.test'})).status,400);
 assert.equal((await f.request('workbench/sender-test','POST',{attemptId:crypto.randomUUID(),confirmed:true})).status,200);
 assert.equal((await f.request('workbench/sender-test','POST',{attemptId:crypto.randomUUID(),confirmed:true})).status,429);
 assert.equal(f.sends(),1,'A reviewed sender test sends only once to the operator');
 const progress=()=>f.request('workbench/onboarding').then(r=>r.json()) as Promise<any>;assert.equal((await progress()).customer,0);
 const customer=await(await f.request('workbench/opportunities','POST',{title:'First customer',companyName:'Harbour',contactName:'Maya',email:'maya@harbour.test',stageId:f.stage,valueCents:10000})).json() as any;
 const context=await(await f.request('sources/recipe-context')).json() as any,contact=context.contacts[0];assert.ok(contact.id);const newest=await(await f.request('records/contact','POST',{name:'Latest contact',email:'latest@harbour.test'})).json() as any;assert.equal((await(await f.request('sources/recipe-context')).json() as any).contacts[0].id,newest.id);
 const created=await f.request('sources/website','PUT',{name:'Website',enabled:true});assert.equal(created.status,200);const{secret}=await created.json() as any;assert.ok(secret.length>=32);
 assert.equal(JSON.stringify(await(await f.request('sources')).json()).includes(secret),false);
 assert.equal((await f.request('sources/website','PATCH',{enabled:false})).status,200);assert.equal((await f.request('sources/website/test','POST',{contactId:contact.id})).status,403);assert.equal((await f.request('sources/website','PATCH',{enabled:true})).status,200);
 assert.equal((await f.request('sources/website/test','POST',{contactId:contact.id},{Cookie:''})).status,401);
 const other=await fixture();try{assert.equal((await other.request('sources/website/test','POST',{contactId:contact.id},{Cookie:`__Host-orbit_session=${f.token}`})).status,401);assert.equal((await other.request('sources/website/test','POST',{contactId:contact.id})).status,403);}finally{await other.dispose();}
 assert.equal((await f.request('sources/website/test','POST',{contactId:contact.id},{Origin:'https://forged.test'})).status,403);
 assert.equal((await f.request('sources/website/test','POST',{contactId:contact.id,signature:'client-selected'})).status,400);
 const before=await(await f.request(`opportunities/${customer.id}`)).json();
 const a=await f.request('sources/website/test','POST',{contactId:contact.id}),b=await f.request('sources/website/test','POST',{contactId:contact.id});assert.equal(a.status,201,await a.clone().text());assert.equal(b.status,201);const first=await a.json() as any,second=await b.json() as any;assert.notEqual(first.id,second.id);assert.equal(first.linked,false);
 assert.deepEqual(await(await f.request(`opportunities/${customer.id}`)).json(),before,'Connection tests leave the deal, score, evidence and timeline unchanged');assert.equal((await progress()).test,1);
 const {brief}=await(await f.request('today')).json() as any;assert.deepEqual(brief.accounts,[]);assert.deepEqual(brief.unresolved,[]);assert.equal(brief.counts.observed,0);
 const oldBody=JSON.stringify({eventId:crypto.randomUUID(),type:'form.submitted',subject:'Inquiry',occurredAt:new Date().toISOString(),email:contact.email}),timestamp=String(Math.floor(Date.now()/1000));const signed=(key:string)=>f.app.request('https://orbit.test/api/v1/signals/website',{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':createHmac('sha256',key).update(timestamp+'.'+oldBody).digest('hex')},body:oldBody});
 const rotation=await(await f.request('sources/website','PUT',{name:'Website',enabled:true})).json() as any;assert.ok(rotation.secret!==secret,'Rotation creates a fresh signing secret');assert.equal((await signed(secret)).status,401);assert.equal((await signed(rotation.secret)).status,201);
 for(const type of ['email.replied','meeting.booked']){
  const body=JSON.stringify({eventId:crypto.randomUUID(),type,subject:type,occurredAt:new Date().toISOString(),email:contact.email});
  const response=await f.app.request('https://orbit.test/api/v1/signals/website',{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':createHmac('sha256',rotation.secret).update(timestamp+'.'+body).digest('hex')},body});assert.equal(response.status,201);
 }
 const {opportunity}=await(await f.request(`opportunities/${customer.id}`)).json() as any;assert.equal(opportunity.queueReason,'Customer reply');assert.equal(opportunity.band,'high');assert.deepEqual(opportunity.evaluation.contributions.map((c:any)=>c.signalType).sort(),['email.replied','form.submitted','meeting.booked']);assert.ok(opportunity.evaluation.contributions.every((c:any)=>c.signalId!==first.id&&c.signalId!==second.id));
 const draft=await(await f.request(`workbench/opportunities/${customer.id}/drafts`,'POST',{contactId:contact.id,subject:'Your inquiry',body:'Hi Maya, would Thursday suit a walkthrough?'})).json() as any;
 const preview=await(await f.request(`workbench/drafts/${draft.id}/approval-preview`)).json() as any;
 const sent=await f.request(`workbench/drafts/${draft.id}/approve`,'POST',{revision:1,quietHoursConfirmation:preview.localTime});assert.equal(sent.status,200,await sent.clone().text());assert.equal((await sent.json() as any).state,'accepted');assert.equal(f.sends(),2);assert.equal(bodies[1]!.to,contact.email);assert.equal(bodies[1]!.subject,'Your inquiry');assert.equal(bodies[1]!.text,'Hi Maya, would Thursday suit a walkthrough?');assert.equal((await f.db.prepare('SELECT message_id FROM outbound_messages WHERE draft_id=?').bind(draft.id).first<any>()).message_id,'<relay-2@example.test>');
 assert.equal((await progress()).sent,1);assert.equal((await f.db.prepare('SELECT queue_state FROM opportunities WHERE id=?').bind(customer.id).first<any>()).queue_state,'next');
 for(const outcome of ['rejected','uncertain'] as const){
  relayOutcome=outcome;
  const candidate=await(await f.request(`workbench/opportunities/${customer.id}/drafts`,'POST',{contactId:contact.id,subject:`Provider ${outcome}`,body:'Reviewed provider outcome'})).json() as any;
  const review=await(await f.request(`workbench/drafts/${candidate.id}/approval-preview`)).json() as any;
  const before=bodies.length;
  const result=await f.request(`workbench/drafts/${candidate.id}/approve`,'POST',{revision:1,quietHoursConfirmation:review.localTime});assert.equal(result.status,502,await result.clone().text());assert.equal((await result.json() as any).state,outcome==='rejected'?'failed':'delivery-unknown');assert.equal(bodies.length,before+1);
  await f.request(`workbench/drafts/${candidate.id}/approve`,'POST',{revision:1,quietHoursConfirmation:review.localTime});assert.equal(bodies.length,before+1,'The same exact approval never submits again after rejection or uncertainty');
 }

 const products=async()=>((await(await f.request('settings/products')).json()) as any).products as any[],named=(list:any[],name:string)=>list.find(item=>item.products.includes(name));
 assert.equal((await f.request('settings/products','GET',undefined,{Cookie:''})).status,401);
 const unresolved=await products();assert.equal(named(unresolved,'Calendly').state,'awaiting-delivery');
 for(const[name,clause]of[['Dial','INTEGRATE-001'],['Zoom','INTEGRATE-002'],['Twilio','CALL-001'],['Aircall','CALL-001'],['HappyToHelp','INTEGRATE-004'],['Help Scout','INTEGRATE-004'],['Zendesk','INTEGRATE-004'],['DocuSign','QUOTE-001'],['Nectar','INTEGRATE-003'],['Stripe','INTEGRATE-003'],['QuickBooks Online','INTEGRATE-006'],['Xero','INTEGRATE-006'],['Buoy','INTEGRATE-008']]){const product=named(unresolved,name);assert.deepEqual([product?.state,product?.clause,product?.lastDeliveryAt],['unavailable',clause,null],`${name} is unresolved setup, never a connection`);}
 assert.deepEqual([named(unresolved,'Mailchimp').state,named(unresolved,'Mailchimp').clause,named(unresolved,'Mailchimp').link],['unresolved-setup','INTEGRATE-007',undefined],'Mailchimp is unresolved setup until a key check passes and an audience is chosen');
 assert.equal((await f.request('settings/products/dial','POST',{})).status,404,'No substituted connector exists for an unbuilt product');
 assert.equal(named(unresolved,'Slack').state,'unresolved-setup');
 const workspace=(await(await f.request('settings')).json() as any).workspace;assert.equal(workspace.currency,'USD');
 const sendsBeforeSales=bodies.length,booking=await(await f.request('sources/bookings','PUT',{name:'Booking tools',enabled:true})).json() as any;
 const invitee=JSON.stringify({event:'invitee.created',created_at:new Date().toISOString(),payload:{uri:'https://api.calendly.com/scheduled_events/demo/invitees/'+crypto.randomUUID(),event:'https://api.calendly.com/scheduled_events/demo',email:contact.email}}),at=String(Math.floor(Date.now()/1000));
 const booked=await f.app.request('https://orbit.test/api/v1/signals/bookings/calendly',{method:'POST',headers:{'Calendly-Webhook-Signature':`t=${at},v1=${createHmac('sha256',booking.secret).update(at+'.'+invitee).digest('hex')}`},body:invitee});assert.equal(booked.status,201,await booked.clone().text());const bookedSignal=await booked.json() as any;assert.equal(bookedSignal.linked,true);
 const receiving=named(await products(),'Calendly');assert.equal(receiving.state,'receiving');assert.ok(receiving.lastDeliveryAt);assert.equal(named(await products(),'Cal.com').state,'awaiting-delivery');
 const call=await f.request(`records/opportunity/${customer.id}/entries`,'POST',{kind:'call',text:'Discovery call: Maya wants a USD 100 pilot.',occurredAt:new Date(Date.now()-60000).toISOString(),durationMinutes:20});assert.equal(call.status,200,await call.clone().text());
 const detail=await(await f.request(`records/opportunity/${customer.id}`)).json() as any;
 assert.ok(JSON.stringify(detail).includes('Discovery call: Maya wants a USD 100 pilot.'),'Manual sales work stays on the deal');
 const deal=(await(await f.request(`opportunities/${customer.id}`)).json() as any).opportunity;assert.equal(deal.valueCents??deal.value_cents,10000,'The USD source amount is unchanged');assert.ok(deal.evaluation.contributions.some((c:any)=>c.signalId===bookedSignal.id),'A signed booking is customer evidence on the deal');
 assert.equal(bodies.length,sendsBeforeSales,'Bookings, manual work and provider setup never send customer mail');
 await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
 await sourceEvidence(f,customer.id,contact.id,contact.email);
 await bookingSources(f);
 await proveSlackNotices(f,customer.id,contact.id);
 assert.equal(bodies.length,sendsBeforeSales,'Slack actions never approve, edit or send customer mail');

 }finally{globalThis.fetch=nativeFetch;await f.dispose();}
});
