import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {isolatedDatabase} from './isolated-database';
import {createDependencies} from './dependencies';
import {createApp} from './app';
import {createId} from '../../src/core/shared/ids';
export interface BookingFixture {db:D1Database;app:{request:(input:string,init?:RequestInit)=>Promise<Response>};request:(path:string,method?:string,body?:unknown)=>Promise<Response>}
export async function proveBookingLifecycle(f:BookingFixture,secret:string,dealId:string){
 const base=Date.now()-180000,at=(n:number)=>new Date(base+n*1000).toISOString(),start=at(3600),end=at(5400),newStart=at(7200),newEnd=at(9000);
 const post=async(vendor:'calcom'|'calendly',payload:unknown)=>{const raw=JSON.stringify(payload),ts=String(Math.floor(Date.now()/1000)),signature=createHmac('sha256',secret).update(vendor==='calcom'?raw:ts+'.'+raw).digest('hex');return f.app.request(`https://orbit.test/api/v1/signals/bookings/${vendor}`,{method:'POST',headers:{[vendor==='calcom'?'X-Cal-Signature-256':'Calendly-Webhook-Signature']:vendor==='calcom'?signature:`t=${ts},v1=${signature}`},body:raw});};
 const cal=(triggerEvent:string,uid:string,n:number,extra:Record<string,unknown>={})=>({triggerEvent,createdAt:at(n),payload:{uid,attendees:[{email:'maya@harbour.test',name:'Maya'}],title:'Customer planning',startTime:start,endTime:end,...extra}});
 const accepted=async(vendor:'calcom'|'calendly',body:unknown)=>{const response=await post(vendor,body);assert.equal(response.status,201,await response.clone().text());return response.json() as Promise<any>;};
 const detail=async()=>{const response=await f.request(`opportunities/${dealId}`);assert.equal(response.status,200);return (await response.json() as any).opportunity;};
 const activity=async(providerId:string)=>{const rows=(await detail()).timeline.filter((t:any)=>t.payload?.changes?.some((c:any)=>c.providerId===providerId));assert.equal(rows.length,1,'One durable activity per booking chain');return rows[0];};
 const book=cal('BOOKING_CREATED','synthetic-orbit-1',0),booked=await accepted('calcom',book);const original=(await activity('synthetic-orbit-1')).id;assert.equal(original,booked.id);
 // Approve a scheduled message through the ordinary review door, then reschedule the booking.
 const contact=(await (await f.request('sources/recipe-context')).json() as any).contacts.find((c:any)=>c.email==='maya@harbour.test');
 const saved=await f.request(`workbench/opportunities/${dealId}/drafts`,'POST',{contactId:contact.id,subject:'Planning follow-up',body:'Reviewed schedule'});
 assert.equal(saved.status,201,await saved.clone().text());const draft=await saved.json() as any;
 const schedule=new Date(Date.now()+86400000).toISOString(),preview=await (await f.request(`workbench/drafts/${draft.id}/approval-preview?scheduledAt=${encodeURIComponent(schedule)}`)).json() as any;
 const approved=await f.request(`workbench/drafts/${draft.id}/approve`,'POST',{revision:1,scheduledAt:schedule,scheduledAtConfirmation:preview.scheduledAt,quietHoursConfirmation:preview.localTime});assert.equal(approved.status,200,await approved.clone().text());const message=await approved.json() as any;
 const reschedule=cal('BOOKING_RESCHEDULED','synthetic-orbit-2',30,{rescheduleUid:'synthetic-orbit-1',startTime:newStart,endTime:newEnd,rescheduleStartTime:start,rescheduleEndTime:end});
 await accepted('calcom',reschedule);let row=await activity('synthetic-orbit-2');assert.equal(row.id,original);assert.equal(row.payload.booking.state,'rescheduled');assert.equal(row.payload.booking.startTime,newStart);assert.equal(row.payload.booking.oldStartTime,start);assert.deepEqual(row.payload.booking.attendees,[{email:'maya@harbour.test',name:'Maya'}]);
 const messages=async()=>(await (await f.request(`workbench/opportunities/${dealId}/messages`)).json() as any).messages;
 assert.equal((await messages()).find((m:any)=>m.id===message.id).state,'cancelled');
 assert.equal((await post('calcom',reschedule)).status,409);assert.equal((await activity('synthetic-orbit-2')).payload.changes.length,2,'Replay adds no activity change');
 await accepted('calcom',cal('BOOKING_CREATED','synthetic-orbit-2',10));assert.equal((await activity('synthetic-orbit-2')).payload.booking.state,'rescheduled','Late create cannot regress reschedule');
 await accepted('calcom',cal('BOOKING_CANCELLED','synthetic-orbit-1',60));assert.equal((await activity('synthetic-orbit-2')).payload.booking.state,'rescheduled','Old booking cancellation cannot cancel its replacement');
 await accepted('calcom',cal('BOOKING_CANCELLED','synthetic-orbit-2',90,{startTime:newStart,endTime:newEnd}));assert.equal((await activity('synthetic-orbit-2')).payload.booking.state,'cancelled');
 const ended={triggerEvent:'MEETING_ENDED',uid:'synthetic-orbit-2',attendees:[{email:'maya@harbour.test'}],title:'Customer planning',startTime:at(80),endTime:at(100)};await accepted('calcom',ended);assert.equal((await activity('synthetic-orbit-2')).payload.booking.state,'cancelled','A cancelled meeting never completes');
 assert.equal((await messages()).find((m:any)=>m.id===message.id).state,'cancelled','Cancellation never resumes outreach');
 await accepted('calcom',cal('BOOKING_CREATED','synthetic-orbit-3',20,{startTime:at(30),endTime:at(40)}));assert.equal((await activity('synthetic-orbit-3')).payload.booking.state,'booked','Passing the scheduled time is not completion');
 await accepted('calcom',{...ended,uid:'synthetic-orbit-3'});assert.equal((await activity('synthetic-orbit-3')).payload.booking.state,'completed');
 // Both deliveries of a Calendly reschedule describe the same invitee chain, in either arrival order.
 for(const reverse of [false,true]){
  const prefix=`https://api.calendly.com/scheduled_events/synthetic-orbit-${reverse?5:4}`,old=prefix+'/invitees/old',next=prefix+'/invitees/new';
  const event=(kind:string,uri:string,n:number,extra:Record<string,unknown>={})=>({event:kind,created_at:at(n),payload:{uri,event:prefix,email:'maya@harbour.test',...extra}});
  const created=await accepted('calendly',event('invitee.created',old,0));
  const deliveries=[event('invitee.created',next,30,{old_invitee:old,rescheduled:true}),event('invitee.canceled',old,30,{new_invitee:next,rescheduled:true})];
  for(const body of reverse?deliveries.reverse():deliveries)await accepted('calendly',body);
  row=await activity(next);assert.equal(row.id,created.id);assert.equal(row.payload.booking.state,'rescheduled');
  await accepted('calendly',event('invitee.canceled',next,90));assert.equal((await activity(next)).payload.booking.state,'cancelled');
 }
 const firstReschedule=await accepted('calcom',cal('BOOKING_RESCHEDULED','synthetic-orbit-reverse-new',30,{rescheduleUid:'synthetic-orbit-reverse-old',startTime:newStart,endTime:newEnd}));
 await accepted('calcom',cal('BOOKING_CREATED','synthetic-orbit-reverse-old',0));assert.equal((await activity('synthetic-orbit-reverse-new')).id,firstReschedule.id);assert.equal((await activity('synthetic-orbit-reverse-new')).payload.booking.state,'rescheduled','An original booking arriving after its replacement cannot regress it');
 const different=await f.request('records/contact','POST',{name:'Synthetic Orbit changed attendee',email:'synthetic-orbit-8@different.test'});assert.equal(different.status,201);
 const changedIdentity=await accepted('calcom',cal('BOOKING_RESCHEDULED','synthetic-orbit-changed',120,{rescheduleUid:'synthetic-orbit-2',attendees:[{email:'synthetic-orbit-8@different.test'}]}));assert.equal(changedIdentity.linked,false,'A changed attendee cannot silently relink a booking chain');
 const ambiguous=cal('BOOKING_RESCHEDULED','synthetic-orbit-6',30,{rescheduleUid:'synthetic-orbit-1',attendees:[{email:'maya@harbour.test'},{email:'someone@else.test'}]});const held=await accepted('calcom',ambiguous);assert.equal(held.linked,false,'Several attendees wait for human review');assert.equal((await activity('synthetic-orbit-2')).payload.booking.state,'cancelled');
 const products=await (await f.request('settings/products')).json() as any;assert.equal(products.products.find((p:any)=>p.products.includes('Dial')).state,'unavailable');
 assert.equal((await f.request('sources/bookings','PATCH',{enabled:false})).status,200);const disconnected=await (await f.request('settings/products')).json() as any;assert.equal(disconnected.products.find((p:any)=>p.products.includes('Cal.com')).state,'unresolved-setup');assert.equal((await f.request('sources/bookings','PATCH',{enabled:true})).status,200);
 // Exact domain rows survive authenticated export/restore; source secrets do not travel.
 const call=async(path:string,method='GET',body?:unknown)=>{const response=await f.request(path,method,body);assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;};
 let exported=await call('records/archive/exports','POST',{});while(exported.state==='preparing')exported=await call(`records/archive/exports/${exported.id}/advance`,'POST',{});const archive=await call(`records/archive/exports/${exported.id}/download`);assert.equal(JSON.stringify(archive).includes(secret),false);
 const target=await isolatedDatabase();try{
  const deps=createDependencies(target.db),owner=createId();await deps.auth.ensureOperator({id:owner,email:'synthetic-orbit-7@example.test',displayName:'Receiver'});await deps.workspace.ensureWorkspace({name:'Booking receiver',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});const session=await deps.auth.createSession(owner),app=createApp({database:target.db,assets:{fetch:async()=>new Response('')}});
  const restore=async(path:string,method='GET',body?:unknown)=>{const response=await app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;};
  let imported=await restore('records/archive/imports','POST',{manifest:archive.manifest,confirmed:true});for(const part of archive.parts)await restore(`records/archive/imports/${imported.id}/parts/${part.index}`,'PUT',part);for(let n=0;n<1000&&imported.state!=='complete';n++)imported=await restore(`records/archive/imports/${imported.id}/finalize`,'POST',{});assert.equal(imported.state,'complete');
  assert.deepEqual((await target.db.prepare('SELECT * FROM booking_activity_ids ORDER BY provider_id').all()).results,(await f.db.prepare('SELECT * FROM booking_activity_ids ORDER BY provider_id').all()).results);assert.equal(await target.db.prepare("SELECT secret_ciphertext FROM signal_sources WHERE id='bookings'").first('secret_ciphertext'),null);
 }finally{await target.dispose();}
 await call(`records/contact/${contact.id}`,'DELETE',{confirmed:true});assert.equal(await f.db.prepare('SELECT count(*) n FROM booking_activity_ids').first('n'),0,'Contact erasure cascades the entire booking identity model');assert.equal((await (await f.request('sources/unlinked')).json() as any).signals.some((s:any)=>s.id===held.id),false,'Held booking evidence erases too');
 const remaining=(await (await f.request('sources/unlinked')).json() as any).signals;assert.equal(remaining.some((s:any)=>s.id===changedIdentity.id),false,'Held changes with another attendee erase through provider lineage');
 const replay=await post('calcom',{triggerEvent:'BOOKING_RESCHEDULED',createdAt:new Date().toISOString(),payload:{uid:'synthetic-orbit-replay',rescheduleUid:'synthetic-orbit-2',attendees:[{email:'maya@harbour.test'}]}});assert.equal(replay.status,403,'A freshly signed replay cannot resurrect erased booking lineage');
}
