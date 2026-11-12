import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createId} from '../../src/core/shared/ids';

type Fixture={db:D1Database;stage:string;request:(path:string,method?:string,body?:unknown,headers?:Record<string,string>)=>Promise<Response>;app:{request:(url:string,init:RequestInit)=>Promise<Response>};setClock:(now:Date|undefined)=>void;sends:()=>number};
const json=async(response:Response,status=200)=>{assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
/** Real authenticated HTTP doors and signed documented callbacks; no repository or lifecycle fake. */
export async function proveCalendlyBookings(f:Fixture,secret:string){
 const post=async(payload:any,status=201,key=secret)=>{
  const body=JSON.stringify(payload),timestamp=String(Math.floor(Date.now()/1000));
  const response=await f.app.request('https://orbit.test/api/v1/signals/bookings/calendly',{method:'POST',headers:{'Calendly-Webhook-Signature':`t=${timestamp},v1=${createHmac('sha256',key).update(timestamp+'.'+body).digest('hex')}`},body});
  return json(response,status);
 };
 const generic=JSON.stringify({eventId:createId(),type:'meeting.booked',subject:'Generic source data stays generic',occurredAt:'2026-01-01T00:00:00.000Z',data:{provider:'calendly',calendly:{}}}),timestamp=String(Math.floor(Date.now()/1000));
 const beforeGeneric=await f.db.prepare('SELECT count(*) AS n FROM booking_lifecycle').first('n');
 await json(await f.app.request('https://orbit.test/api/v1/signals/bookings',{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':createHmac('sha256',secret).update(timestamp+'.'+generic).digest('hex')},body:generic}),201);
 assert.equal(await f.db.prepare('SELECT count(*) AS n FROM booking_lifecycle').first('n'),beforeGeneric,'Only the verified vendor door interprets provider lifecycle fields');
 const inventory=async()=>({messages:(await f.db.prepare('SELECT * FROM outbound_messages ORDER BY id').all()).results,drafts:(await f.db.prepare('SELECT id,is_stale,stale_reason,updated_at FROM drafts ORDER BY id').all()).results,sends:f.sends()});
 const evidence=async()=>Object.fromEntries(await Promise.all(['signals','signal_links','timeline_entries','timeline_entry_records','booking_lifecycle'].map(async table=>[table,(await f.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results])));
 for(const reverse of [false,true]){
  const suffix=createId(),email=[`synthetic-orbit-${suffix.toLowerCase()}`,'example.test'].join('@');
  const deal=await json(await f.request('workbench/opportunities','POST',{title:`Calendly lifecycle ${suffix}`,companyName:`Synthetic calendar ${suffix}`,contactName:'Synthetic attendee',email,stageId:f.stage,valueCents:10000}),201);
  const detail=(await json(await f.request(`opportunities/${deal.id}`))).opportunity,contact=detail.contacts[0],company=detail.companyId??detail.company?.id;
  assert.ok(contact.id);assert.ok(company,'A booking has an actual account record');
  const unrelated=await json(await f.request('records/opportunity','POST',{title:'Unrelated account deal',company_id:company,stage_id:f.stage,value_cents:500}),201);
  const schedule=async(subject:string)=>{
   f.setClock(new Date('2030-01-07T10:00:00.000Z'));
   try{
    const draft=await json(await f.request(`workbench/opportunities/${deal.id}/drafts`,'POST',{contactId:contact.id,subject,body:'An operator reviewed this exact future message.'}),201);
    const preview=await json(await f.request(`workbench/drafts/${draft.id}/approval-preview?scheduledAt=2030-01-08T10%3A00%3A00.000Z`));
    const approved=await json(await f.request(`workbench/drafts/${draft.id}/approve`,'POST',{revision:1,scheduledAt:'2030-01-08T10:00:00.000Z',scheduledAtConfirmation:preview.scheduledAt,quietHoursConfirmation:preview.localTime}));
    assert.equal(approved.state,'scheduled');return approved.id;
   }finally{f.setClock(undefined);}
  };
  const stopped=await schedule('Before the booking'),sends=f.sends();
  const event=(id:string)=>`https://api.calendly.com/scheduled_events/synthetic-orbit-${suffix}-${id}`;
  const invitee=(id:string)=>`${event(id)}/invitees/synthetic-orbit-${id}`;
  const payload=(kind:string,id:string,extra:Record<string,unknown>={})=>({event:kind,created_at:kind==='invitee.created'&&id==='old'?'2026-01-01T09:00:00.000Z':id==='old'?'2026-01-01T10:00:00.000Z':kind==='invitee.created'?'2026-01-01T10:00:01.000Z':'2026-01-01T11:00:00.000Z',payload:{uri:invitee(id),event:event(id),email,name:'Exact Calendly Attendee',rescheduled:false,old_invitee:null,new_invitee:null,scheduled_event:{uri:event(id),name:'Discovery consultation',start_time:id==='old'?'2030-01-09T13:00:00.000Z':'2030-01-10T15:00:00.000Z',end_time:id==='old'?'2030-01-09T13:45:00.000Z':'2030-01-10T16:00:00.000Z',location:{type:'physical',location:'Synthetic meeting room'}},...extra}});
  const original=payload('invitee.created','old'),oldCancel=payload('invitee.canceled','old',{rescheduled:true,new_invitee:invitee('new'),cancellation:{canceled_by:'Exact Calendly Attendee',canceler_type:'invitee',reason:'Rescheduled'}}),replacement=payload('invitee.created','new',{old_invitee:invitee('old'),rescheduled:true});
  const accepted=await post(original),activityId=accepted.id;assert.equal(accepted.linked,true);
  const read=async(status:string,start:string,uri:string,history:number)=>{
   let booking:any;
   for(const [kind,id] of [['contact',contact.id],['company',company],['opportunity',deal.id]]){
    const data=await json(await f.request(`records/${kind}/${id}`));
    const meetings=data.timeline.map((entry:any)=>({...entry,payload:JSON.parse(entry.payload_json)})).filter((entry:any)=>entry.payload.booking?.email===email);
    assert.equal(meetings.length,1,`${kind} reads one meeting activity`);assert.equal(meetings[0].id,activityId);
    booking=meetings[0].payload.booking;
    assert.deepEqual([booking.status,booking.email,booking.name,booking.eventName,booking.start,booking.inviteeUri,booking.eventUri,booking.history.length],[status,email,'Exact Calendly Attendee','Discovery consultation',start,uri,uri.split('/invitees/')[0],history]);
    assert.equal(booking.end,uri===invitee('old')?'2030-01-09T13:45:00.000Z':'2030-01-10T16:00:00.000Z');
    assert.deepEqual(booking.location,{type:'physical',location:'Synthetic meeting room'});
   }
   const dealRead=(await json(await f.request(`opportunities/${deal.id}`))).opportunity;
   assert.equal(dealRead.timeline.filter((entry:any)=>entry.payload?.booking?.email===email).length,1);
   const unrelatedRead=await json(await f.request(`records/opportunity/${unrelated.id}`));assert.equal(unrelatedRead.timeline.some((entry:any)=>JSON.parse(entry.payload_json).booking?.email===email),false,'The account does not spread its meeting to an unrelated deal');
   const plan=(await json(await f.request(`today/meetings/${activityId}`))).plan;
   assert.deepEqual([plan.meeting.signalId,plan.meeting.status,plan.meeting.start,plan.meeting.end],[activityId,status,start,booking.end]);assert.equal(plan.attendees[0].contact.id,contact.id);assert.equal(plan.primaryOpportunityId,deal.id);
   const brief=(await json(await f.request('today'))).brief,lines=brief.accounts.flatMap((account:any)=>account.lines).filter((line:any)=>line.evidence?.id===activityId);
   assert.equal(lines.length,1);assert.equal(lines[0].signalType,`meeting.${status}`);assert.equal(lines[0].title,'Discovery consultation');assert.ok(lines[0].href.endsWith(`#entry-${activityId}`));
   return booking;
  };
  await read('booked','2030-01-09T13:00:00.000Z',invitee('old'),1);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(stopped).first<any>())?.state,'cancelled');assert.equal(f.sends(),sends);
  // New operator approval after the original stop detects an accidental second stop.
  const later=await schedule('After the first booking'),afterStop=await inventory();
  const seen=(await json(await f.request('today'))).brief;
  await json(await f.request('today/seen','POST',{through:seen.generatedAt}));
  const afterSeen=(await json(await f.request('today'))).brief;
  assert.equal(afterSeen.accounts.flatMap((account:any)=>account.lines).some((line:any)=>line.evidence?.id===activityId),false,'A seen booking leaves the new activity window');
  const first=reverse?replacement:oldCancel,second=reverse?oldCancel:replacement;
  assert.equal((await post(first)).id,activityId);assert.equal((await post(second)).id,activityId);
  const rescheduled=await read('booked','2030-01-10T15:00:00.000Z',invitee('new'),3);
  assert.ok(rescheduled.history.some((item:any)=>item.inviteeUri===invitee('old')&&item.start==='2030-01-09T13:00:00.000Z'));
  assert.deepEqual(await inventory(),afterStop,'Rescheduling neither repeats nor revives the original outreach stop');
  const rescheduleSeen=(await json(await f.request('today'))).brief;
  await json(await f.request('today/seen','POST',{through:rescheduleSeen.generatedAt}));
  const cancel=payload('invitee.canceled','new',{cancellation:{canceled_by:'Synthetic host',canceler_type:'host',reason:'Customer requested cancellation'}});
  assert.equal((await post(cancel)).id,activityId);
  const cancelled=await read('cancelled','2030-01-10T15:00:00.000Z',invitee('new'),4);
  assert.deepEqual(cancelled.cancellation,cancel.payload.cancellation);assert.deepEqual(await inventory(),afterStop,'Cancellation sends nothing and changes no scheduled mail');
  const final=await evidence();for(const delivery of [replacement,original,cancel,oldCancel])await post(delivery,409);
  assert.deepEqual(await evidence(),final,'Identical and reordered replays preserve every receipt, link and timeline byte');assert.deepEqual(await inventory(),afterStop);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(later).first<any>())?.state,'scheduled');
  const bad=payload('invitee.created','forged');await post(bad,401,'synthetic-orbit-wrong-secret');assert.deepEqual(await evidence(),final);
  await json(await f.request('sources/bookings','PATCH',{enabled:false}));await post(bad,403);assert.deepEqual(await evidence(),final);await json(await f.request('sources/bookings','PATCH',{enabled:true}));
  const unknown={...payload('invitee.created','unknown'),payload:{...payload('invitee.created','unknown').payload,email:['synthetic-orbit-unknown','example.test'].join('@')}};
  const unlinked=await post(unknown);assert.equal(unlinked.linked,false);const unknownList=await json(await f.request('sources/unlinked'));assert.ok(JSON.stringify(unknownList).includes(unlinked.id));
  // Erasure removes retained booking copies; a later signed replay cannot relink the erased person.
  await json(await f.request(`records/contact/${contact.id}`,'DELETE',{confirmed:true}));
  const erased=await json(await f.request(`records/opportunity/${deal.id}`));assert.equal(JSON.stringify(erased).includes(email),false);
  const replay=await post(original);assert.equal(replay.linked,false);const erasedAgain=await json(await f.request(`records/opportunity/${deal.id}`));assert.equal(JSON.stringify(erasedAgain).includes(email),false);
  assert.equal(await f.db.prepare("SELECT count(*) AS n FROM booking_lifecycle WHERE json_extract(event_json,'$.email')=?").bind(email).first('n'),1,'Only the unlinked replay remains, with no customer activity');
 }
}
