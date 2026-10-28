import {createId} from '../../src/core/shared/ids';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
export async function bookingSources(f:any){
 const{secret}=await(await f.request('sources/bookings','PUT',{name:'Booking tools',enabled:true})).json() as any;
 const originalFetch=globalThis.fetch;let registration:any;
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));assert.equal(url.origin,'https://api.calendly.com');
  if(url.pathname==='/users/me')return Response.json({resource:{uri:'https://api.calendly.com/users/test-user',current_organization:'https://api.calendly.com/organizations/test-org'}});
  if((init?.method??'GET')==='GET')return Response.json({collection:[]});
  registration=JSON.parse(String(init?.body));return Response.json({resource:{uri:'https://api.calendly.com/webhook_subscriptions/test-subscription',callback_url:registration.url,state:'active'}});
 };
 try{
  const connected=await f.request('sources/bookings/calendly','POST',{token:'test-only-calendly-token'});assert.equal(connected.status,200,await connected.clone().text());
  assert.equal(registration.url,'https://orbit.test/api/v1/signals/bookings/calendly');assert.equal(registration.signing_key,secret);assert.deepEqual(registration.events,['invitee.created','invitee.canceled']);
  assert.equal(JSON.stringify(await connected.json()).includes('test-only-calendly-token'),false);
 }finally{globalThis.fetch=originalFetch;}

 for(const vendor of ['calcom','calendly'])for(const cancel of [false,true]){
 const occurredAt=new Date().toISOString(),type=cancel?'meeting.cancelled':'meeting.booked';
 const payload=vendor==='calcom'?{triggerEvent:cancel?'BOOKING_CANCELLED':'BOOKING_CREATED',createdAt:occurredAt,payload:{uid:crypto.randomUUID(),attendees:[{email:'maya@harbour.test'}]}}:{event:cancel?'invitee.canceled':'invitee.created',created_at:occurredAt,payload:{uri:'https://api.calendly.com/scheduled_events/event/invitees/'+crypto.randomUUID(),event:'https://api.calendly.com/scheduled_events/event',email:'maya@harbour.test'}};
 const raw=JSON.stringify(payload),timestamp=String(Math.floor(Date.now()/1000));
 const post=(body:string,ts=timestamp,signature?:string)=>{const hash=signature??createHmac('sha256',secret).update(vendor==='calcom'?body:ts+'.'+body).digest('hex');return f.app.request('https://orbit.test/api/v1/signals/bookings/'+vendor,{method:'POST',headers:{[vendor==='calcom'?'X-Cal-Signature-256':'Calendly-Webhook-Signature']:vendor==='calcom'?hash:'t='+ts+',v1='+hash},body});};
 assert.equal((await post(raw,timestamp,'0'.repeat(64))).status,401);const hash=createHmac('sha256',secret).update(vendor==='calcom'?raw:timestamp+'.'+raw).digest('hex');assert.equal((await post(raw+' ',timestamp,hash)).status,401);
 if(vendor==='calcom')assert.equal((await post(JSON.stringify({...payload,createdAt:new Date(Date.now()-600000).toISOString()}))).status,401);else assert.equal((await post(raw,String(Number(timestamp)-240))).status,401);
 const accepted=await post(raw);assert.equal(accepted.status,201,await accepted.clone().text());const signal=await accepted.json() as any;assert.equal(signal.linked,true);assert.equal((await post(raw)).status,409);assert.equal((await f.db.prepare('SELECT type FROM signals WHERE id=?').bind(signal.id).first()).type,type);
 }
 const unknown=JSON.stringify({triggerEvent:'BOOKING_CREATED',createdAt:new Date().toISOString(),payload:{uid:crypto.randomUUID(),attendees:[{email:'unknown@example.test'}]}});const response=await f.app.request('https://orbit.test/api/v1/signals/bookings/calcom',{method:'POST',headers:{'X-Cal-Signature-256':createHmac('sha256',secret).update(unknown).digest('hex')},body:unknown});const unlinked=await response.json() as any;assert.equal(unlinked.linked,false);assert.match(JSON.stringify(await(await f.request('sources/unlinked')).json()),/No unique record match/);const contact=(await(await f.request('sources/recipe-context')).json() as any).contacts[0];assert.equal((await f.request(`sources/unlinked/${unlinked.id}/link`,'POST',{type:'contact',id:contact.id})).status,200);assert.ok(await f.db.prepare('SELECT signal_id FROM signal_links WHERE signal_id=? AND record_id=?').bind(unlinked.id,contact.id).first());
 const counts=async()=>{const result=[];for(const table of ['signals','signal_links','timeline_entries','evaluations'])result.push(await f.db.prepare(`SELECT count(*) AS n FROM ${table}`).first());return result;};
 for(const vendor of ['orbit','calcom','calendly','automation'])for(const change of ['rotate','disable','disable-enable','remove']){
  const sourceId=createId(),sourcePath=`sources/${sourceId}`;
  const{secret}=await(await f.request(sourcePath,'PUT',{name:'Streaming source',enabled:true})).json() as any;
  const now=new Date().toISOString(),eventId=crypto.randomUUID(),payload=(vendor==='orbit'||vendor==='automation')?{eventId,type:'form.submitted',subject:'Streaming inquiry',occurredAt:now,email:'maya@harbour.test'}:vendor==='calcom'?{triggerEvent:'BOOKING_CREATED',createdAt:now,payload:{uid:eventId,attendees:[{email:'maya@harbour.test'}]}}:{event:'invitee.created',created_at:now,payload:{uri:'https://api.calendly.com/scheduled_events/event/invitees/'+eventId,event:'https://api.calendly.com/scheduled_events/event',email:'maya@harbour.test'}};
  const raw=JSON.stringify(payload),timestamp=String(Math.floor(Date.now()/1000)),signature=createHmac('sha256',secret).update(vendor==='calcom'?raw:timestamp+'.'+raw).digest('hex');
  const headers=vendor==='automation'?{Authorization:`Bearer ${secret}`}:vendor==='orbit'?{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':signature}:vendor==='calcom'?{'X-Cal-Signature-256':signature}:{'Calendly-Webhook-Signature':`t=${timestamp},v1=${signature}`};
  let release!:()=>void,reading!:()=>void;const bodyRead=new Promise<void>(resolve=>reading=resolve),finish=new Promise<void>(resolve=>release=resolve);
  const stream=new ReadableStream<Uint8Array>({async pull(controller){reading();await finish;controller.enqueue(new TextEncoder().encode(raw));controller.close();}},{highWaterMark:0});
  const before=await counts(),pending=f.app.request(new Request(`https://orbit.test/api/v1/signals/${sourceId}`+(vendor==='orbit'?'':'/'+vendor),{method:'POST',headers,body:stream,duplex:'half'} as unknown as RequestInit));
  await Promise.race([bodyRead,pending.then((response:Response)=>{throw Error(`Signed stream ended before reading its body (${response.status})`);})]);
  try{if(change==='rotate')assert.equal((await f.request(sourcePath,'PUT',{name:'Streaming source',enabled:true})).status,200);
  else if(change==='remove')assert.equal((await f.request(sourcePath,'DELETE',{confirmed:true})).status,200);
  else{assert.equal((await f.request(sourcePath,'PATCH',{enabled:false})).status,200);if(change==='disable-enable')assert.equal((await f.request(sourcePath,'PATCH',{enabled:true})).status,200);}
  }finally{release();}assert.equal((await pending).status,403,`${vendor} ${change} revokes the pending request`);assert.deepEqual(await counts(),before,'Revoked delivery leaves no signal, link, timeline or scoring effects');
 }

}
