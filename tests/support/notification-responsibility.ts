import assert from 'node:assert/strict';
import type {TestContext} from 'node:test';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {replyForm,signedReplies,signedDeliveryEvents} from './signed-reply';
import {createId} from '../../src/core/shared/ids';
import {ManagedMailError} from '../../src/core/platform/managed-outbound-mail';

/** Responsibility is read through both real sessions; only the outgoing mail edge is replaced. */
export async function notificationResponsibility(db:D1Database,context:TestContext,owner:string,latestActor:string){
 context.mock.timers.enable({apis:['Date'],now:new Date('2031-01-06T10:00:00Z')});
 try{
  const deps=createDependencies(db),ownerSession=await deps.auth.createSession(owner),actorSession=await deps.auth.createSession(latestActor);
  const edge:any[]=[];
  let outcome:'accepted'|'failed'|'delivery-unknown'='accepted',submissions=0;
  const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:{
   provider:'rer',optOutOrigin:'https://orbit.test',messageIdDomain:'orbit.test',
   async send(input){
    edge.push(input);submissions++;
    if(outcome!=='accepted')throw new ManagedMailError(outcome==='failed'?'rejected':'uncertain');
    return {providerMessageId:`synthetic-orbit-${submissions}`};
   }
  }});
  const request=(actor:string,path:string,body?:unknown,method=body===undefined?'GET':'POST')=>app.request(`https://orbit.test/api/v1${path}`,{
   method,headers:{Cookie:`__Host-orbit_session=${actor===owner?ownerSession.token:actorSession.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},
   ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  const call=async(actor:string,path:string,body?:unknown,status=200,method?:string)=>{
   const response=await request(actor,path,body,method);assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;
  };
  const stage=(await call(owner,'/workbench')).stages[0].id;
  const replies=signedReplies(db),delivery=signedDeliveryEvents(db);
  for(const assigned of [true,false]){
   const expected=assigned?owner:latestActor,excluded=assigned?latestActor:owner,label=assigned?'Assigned':'Unassigned';
   const email=['synthetic-orbit-'+createId(),'customer.test'].join('@');
   const company=await call(owner,'/records/company',{name:`${label} notification company`},201);
   const contact=await call(owner,'/records/contact',{name:'Notification customer',email,company_id:company.id,contactability:'contactable'},201);
   const deal=await call(owner,'/records/opportunity',{title:`${label} notification deal`,company_id:company.id,contact_ids:[contact.id],primary_contact_id:contact.id,stage_id:stage,owner_id:assigned?owner:null,value_cents:100},201);
   const record=(await call(owner,`/records/opportunity/${deal.id}`)).record;
   assert.equal(record.owner_id,assigned?owner:null,'The assigned owner is explicit and distinct from the acting operator');
   const inbox=async(actor:string,kind:string)=>(await call(actor,'/notifications')).notifications.filter((item:any)=>item.opportunityId===deal.id&&item.kind===kind);
   const initialOtherNow=(await inbox(excluded,'opportunity.now')).length;
   const assertNotice=async(kind:string,count=1)=>{
    const notices=await inbox(expected,kind);
    assert.equal(notices.length,count,`${label}: responsible recipient receives ${kind} once`);
    assert.equal((await inbox(excluded,kind)).length,kind==='opportunity.now'?initialOtherNow:0,`${label}: the other operator receives no ${kind}`);
    return notices;
   };
   const send=async(mode:typeof outcome='accepted')=>{
    // Advance the fixed clock so normal sending limits remain active throughout the journey.
    context.mock.timers.tick(65000);outcome=mode;
    const draft=await call(latestActor,`/workbench/opportunities/${deal.id}/drafts`,{contactId:contact.id,subject:'Reviewed notification proof',body:'Please confirm the next step.'},201);
    const rendered=await call(latestActor,`/library/drafts/${draft.id}/render`);
    await call(latestActor,`/library/drafts/${draft.id}/render`,{revision:1,reviewHash:rendered.reviewHash});
    const preview=await call(latestActor,`/workbench/drafts/${draft.id}/approval-preview`),before=submissions;
    const approval={revision:1,quietHoursConfirmation:preview.localTime};
    const sent=await call(latestActor,`/workbench/drafts/${draft.id}/approve`,approval,mode==='accepted'?200:502);
    assert.equal(sent.state,mode);assert.equal(submissions,before+1);
    const messages=(await call(latestActor,`/workbench/opportunities/${deal.id}/messages`)).messages;
    const message=messages.find((item:any)=>item.id===sent.id);assert.equal(message.state,mode);
    const repeat=await request(latestActor,`/workbench/drafts/${draft.id}/approve`,approval);
    assert.equal(repeat.status,409,'Replaying approval never submits again');assert.equal(submissions,before+1);
    assert.equal(edge.at(-1).id,message.id);assert.ok(edge.at(-1).message_id);
    return {...message,message_id:edge.at(-1).message_id,idempotency_key:edge.at(-1).idempotency_key};
   };
   await send();
   const nowBefore=(await inbox(expected,'opportunity.now')).length;
   context.mock.timers.tick(1000);
   await call(latestActor,`/records/opportunity/${deal.id}/entries`,{kind:'note',text:'Another operator acted most recently.',occurredAt:new Date().toISOString()});
   const latest=(await call(owner,`/records/opportunity/${deal.id}`)).timeline.filter((entry:any)=>entry.actor_type==='operator').sort((a:any,b:any)=>b.recorded_at.localeCompare(a.recorded_at)||b.id.localeCompare(a.id))[0];
   assert.equal(latest.actor_id,latestActor);
   const event={eventId:createId(),type:'meeting.booked',subject:'Confirmed meeting enters NOW',occurredAt:new Date().toISOString()};
   await call(latestActor,`/workbench/opportunities/${deal.id}/events`,event,201);
   const entered=await assertNotice('opportunity.now',nowBefore+1);
   await call(latestActor,`/workbench/opportunities/${deal.id}/events`,event,201);
   assert.deepEqual(await assertNotice('opportunity.now',nowBefore+1),entered,'Source replay preserves the same notification identities');

   const accepted=await send(),beforeReplyNow=(await inbox(expected,'opportunity.now')).length;
   const reply=replyForm(email,`<${createId()}>`,accepted.message_id);
   reply.set('headers',`Message-ID: <${createId()}>\r\nDate: ${new Date().toUTCString()}\r\nReferences: ${accepted.message_id}`);
   assert.equal((await replies(reply)).status,200);
   const received=await assertNotice('customer.reply');
   assert.equal((await inbox(expected,'opportunity.now')).length,beforeReplyNow,'The reply and its NOW transition produce one notice');
   assert.equal((await replies(reply)).status,200);
   assert.deepEqual(await assertNotice('customer.reply'),received,'A genuine provider reply replay preserves one notification');
   assert.equal((await inbox(expected,'opportunity.now')).length,beforeReplyNow);

   const bounceMessage=await send(),bounce={sg_event_id:createId(),event:'bounce',timestamp:Math.floor(Date.now()/1000),email,rer_product:'orbit',rer_delivery_id:bounceMessage.idempotency_key};
   assert.equal((await delivery([bounce])).status,200);
   const bounced=await assertNotice('message.bounced');
   assert.equal((await delivery([bounce])).status,200);
   assert.deepEqual(await assertNotice('message.bounced'),bounced,'Provider event replay preserves one bounce notice');
   await send('failed');await assertNotice('message.failed');
   await send('delivery-unknown');await assertNotice('message.delivery-unknown');
   assert.equal((await inbox(excluded,'customer.reply')).length,0);
   for(const kind of ['message.failed','message.bounced','message.delivery-unknown'])await assertNotice(kind);
  }
 }finally{context.mock.timers.reset();}
}
