import assert from 'node:assert/strict';
import type {TestContext} from 'node:test';
import {fixture,signIn,collaborator} from '../../newtests/t096/fixture';
import {createApp} from './app';
import {createId} from '../../src/core/shared/ids';
/** Extends the registered record-mail journey through real authenticated HTTP routes. */
export async function recordMailHandover(context:TestContext){
 const f=await fixture();try{
  let deliveries=0;
  const app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:{provider:'rer',optOutOrigin:'https://orbit.test',messageIdDomain:'orbit.test',send:async()=>({providerMessageId:`handover-${++deliveries}`})}});
  let cookie=f.cookie;
  const request=(path:string,method='GET',body?:unknown)=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const call=async(path:string,method='GET',body?:unknown,status=200)=>{const response=await request(path,method,body);assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
  const invite=async(name:string)=>{const email=`${createId().toLowerCase()}@handover.test`;return {...await call('settings/operators','POST',{email,displayName:name},201),email};};
  const sender=await invite('Leaving sender'),receiver=await invite('Receiving operator'),retired=await invite('Removed receiver');
  await call(`settings/operators/${retired.id}`,'DELETE',{confirmed:true});
  const restricted=await collaborator(f);
  const company=await call('records/company','POST',{name:'Promise handover company'},201);
  const contact=await call('records/contact','POST',{name:'Promise buyer',email:`${createId().toLowerCase()}@buyer.test`,company_id:company.id,contactability:'contactable'},201);
  const senderCookie=(await signIn(f.db,sender.email)).cookie;
  cookie=senderCookie;
  await call(`records/contact/${contact.id}/entries`,'POST',{kind:'note',text:'The sender promised a response after the buying call.',occurredAt:new Date().toISOString()});
  const send=async(subject:string,scheduledAt?:string)=>{
   const draft=await call(`workbench/records/contact/${contact.id}/drafts`,'POST',{contactId:contact.id,opportunityId:null,subject,body:`Reviewed content for ${subject}`},201);
   const render=await call(`library/drafts/${draft.id}/render`);
   await call(`library/drafts/${draft.id}/render`,'POST',{revision:1,reviewHash:render.reviewHash});
   const preview=await call(`workbench/drafts/${draft.id}/approval-preview${scheduledAt?`?scheduledAt=${encodeURIComponent(scheduledAt)}`:''}`);
   return call(`workbench/drafts/${draft.id}/approve`,'POST',{revision:1,...(scheduledAt?{scheduledAt,scheduledAtConfirmation:preview.scheduledAt}:{quietHoursConfirmation:preview.localTime})});
  };
  const first=await send('First buyer promise');
  cookie=f.cookie;
  const review=()=>call(`settings/operators/${sender.id}/removal-review`);
  const before=await review();
  assert.deepEqual(before.recordMailObligations.map((row:any)=>row.id),[first.id]);
  assert.equal(before.recordMailObligations[0].subject,'First buyer promise');
  assert.equal(before.recordMailObligations[0].contact_name,'Promise buyer');
  const plan=(value:any,target:string|null=receiver.id)=>({review:value.review,opportunities:null,tasks:null,handoffs:null,recordMailObligations:target});
  const remove=(id:string,handover?:unknown,status=200)=>call(`assistance/record-mail/operators/${id}/remove`,'POST',{confirmed:true,...(handover?{handover}:{})},status);
  await remove(sender.id,undefined,400);
  const missing:any=plan(before);delete missing.recordMailObligations;
  await remove(sender.id,missing,409);
  await remove(sender.id,plan(before,'invalid-id'),400);
  for(const target of [sender.id,retired.id,restricted.operator.operatorId,createId()])await remove(sender.id,plan(before,target),409);
  cookie=restricted.cookie;await remove(sender.id,plan(before),403);cookie=f.cookie;
  const history=()=>call(`workbench/records/contact/${contact.id}/mail`);
  assert.equal((await history()).obligations.find((row:any)=>row.messageId===first.id).ownerId,sender.id);
  // A later accepted message closes and replaces the promise: same count, new identity.
  cookie=senderCookie;const second=await send('Current buyer promise');cookie=f.cookie;
  await remove(sender.id,plan(before),409);
  const replaced=await review();assert.deepEqual(replaced.recordMailObligations.map((row:any)=>row.id),[second.id]);
  await call(`records/contact/${contact.id}`,'PUT',{name:'Updated promise buyer'});
  await remove(sender.id,plan(replaced),409);
  cookie=senderCookie;
  const scheduled=await send('Scheduled buyer follow-up',new Date(Date.now()+86400000).toISOString());
  cookie=f.cookie;
  const fresh=await review(),detail=()=>call(`records/contact/${contact.id}`);
  assert.ok(fresh.scheduledMessages.some((row:any)=>row.id===scheduled.id));
  const historical=(await detail()).timeline.filter((entry:any)=>entry.actor_id===sender.id);
  assert.ok(historical.some((entry:any)=>entry.payload_json.includes('buying call')));
  assert.ok(historical.some((entry:any)=>entry.kind==='message.accepted'));
  await remove(sender.id,plan(fresh));
  cookie=senderCookie;await call('today','GET',undefined,401);cookie=f.cookie;
  const after=await history(),closed=after.obligations.find((row:any)=>row.messageId===first.id),open=after.obligations.find((row:any)=>row.messageId===second.id);
  assert.ok(closed.closedAt);assert.equal(closed.ownerId,sender.id);assert.equal(closed.operatorId,sender.id);
  assert.equal(open.ownerId,receiver.id);assert.equal(open.operatorId,sender.id);assert.equal(open.closedAt,null);
  assert.equal(after.messages.find((row:any)=>row.id===scheduled.id).state,'cancelled');
  assert.equal(after.messages.find((row:any)=>row.id===second.id).state,'accepted');
  const contactDetail=await detail(),events=contactDetail.timeline.filter((entry:any)=>entry.kind==='mail.follow_up.reassigned');
  assert.equal(events.length,1);assert.equal(events[0].actor_id,f.operator.operatorId);
  assert.equal(JSON.parse(events[0].payload_json).messageId,second.id);assert.equal(JSON.parse(events[0].payload_json).current,receiver.id);
  const companyEvents=(await call(`records/company/${company.id}`)).timeline.filter((entry:any)=>entry.kind==='mail.follow_up.reassigned');
  assert.deepEqual(companyEvents.map((entry:any)=>entry.id),events.map((entry:any)=>entry.id),'The same activity links contact and primary company');
  for(const entry of historical)assert.deepEqual(contactDetail.timeline.find((row:any)=>row.id===entry.id),entry,'Historical sender attribution and content stay unchanged');
  await remove(sender.id,plan(fresh),409);
  assert.equal((await detail()).timeline.filter((entry:any)=>entry.kind==='mail.follow_up.reassigned').length,1);
  context.mock.timers.enable({apis:['Date'],now:Date.parse(open.dueAt)+1000});
  try{
   cookie=(await signIn(f.db,receiver.email)).cookie;
   const lines=async()=>{const brief=(await call('today')).brief;return [...brief.accounts.flatMap((account:any)=>account.lines),...brief.unresolved];};
   assert.ok((await lines()).some((line:any)=>line.id===`record-mail-due:${second.id}`),'The receiving operator gets the overdue promise');
   await call(`workbench/record-mail/${first.id}/complete`,'POST',{},409);
   cookie=(await signIn(f.db,'owner@fold.test')).cookie;
   assert.ok(!(await lines()).some((line:any)=>line.id===`record-mail-due:${second.id}`));
   const receiverReview=await call(`settings/operators/${receiver.id}/removal-review`);
   assert.deepEqual(receiverReview.recordMailObligations.map((row:any)=>row.id),[second.id]);
   await remove(receiver.id,plan(receiverReview,null));
   const unassigned=(await history()).obligations.find((row:any)=>row.messageId===second.id);
   assert.equal(unassigned.ownerId,null);assert.equal(unassigned.operatorId,sender.id);assert.equal(unassigned.closedAt,null);
   assert.ok(!(await lines()).some((line:any)=>line.id===`record-mail-due:${second.id}`));
   const unassignment=(await detail()).timeline.filter((entry:any)=>entry.kind==='mail.follow_up.reassigned');
   assert.equal(unassignment.length,2);assert.ok(unassignment.some((entry:any)=>JSON.parse(entry.payload_json).current===null));
   await remove(receiver.id,plan(receiverReview,null),409);
   assert.equal((await detail()).timeline.filter((entry:any)=>entry.kind==='mail.follow_up.reassigned').length,2);
  }finally{context.mock.timers.reset();}
  assert.equal(deliveries,2,'Removal never dispatches the scheduled message');
 }finally{context.mock.timers.reset();await f.close();}
}
