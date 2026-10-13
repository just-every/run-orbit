import assert from 'node:assert/strict';
import {captureRecoveryFixture} from './capture-recovery-fixture';
import type {Provider} from '../../src/core/features/capture/providers/config';
const window={start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'};
const hugeMail=['From: Ana <ana@acme.example>','To: seller@orbit.test','Date: Mon, 05 Oct 2026 10:00:00 +0000','Message-ID: <oversize@acme.example>','Subject: Large attachment','MIME-Version: 1.0','Content-Type: multipart/mixed; boundary=parts','','--parts','Content-Type: text/plain','','Please see attachment.','--parts','Content-Type: application/pdf','Content-Transfer-Encoding: base64','Content-Disposition: attachment; filename=document.pdf','','A'.repeat(8*1024*1024+1),'--parts--',''].join('\r\n');
const selected={mail:{folders:['INBOX','SENT']},calendars:['calendar'],calendarWindow:window};
const skipped=(f:Awaited<ReturnType<typeof captureRecoveryFixture>>,id:string)=>f.db.prepare('SELECT skipped_count FROM capture_sources WHERE id=?').bind(id).first('skipped_count');

export async function oversizedMessageProof(provider:Provider){
  const f=await captureRecoveryFixture(provider);try{
   const id=await f.connect(selected);let large=true;
   f.respond(url=>large&&(provider==='google'?url.pathname.endsWith('/messages/0'):url.pathname.endsWith('/messages/0/$value'))?(provider==='google'?Response.json({labelIds:['INBOX','SENT'],raw:Buffer.from(hugeMail).toString('base64url')}):new Response(hugeMail)):undefined);
   const summaries=[];for(let i=0;i<10;i++){const r=await f.sync(id);summaries.push(r.summary);if(!r.more)break;}
   assert.equal(await f.count(id),25,'24 other messages and meeting must be captured');
   assert.equal(await skipped(f,id),2,'one oversize and one unknown across two labels/folders');
   assert.ok(summaries.some(r=>Object.keys(r.skipReasons).some(reason=>/size limit/.test(reason))));
   await f.select(id,selected);await f.drain(id);assert.equal(await skipped(f,id),2,'rescan does not recount');
   large=false;await f.select(id,selected);await f.drain(id);assert.equal(await f.count(id),26,'same identity can be captured after size drops');
   for(const mode of ['malformed','list','transport']){
    await f.select(id,{mail:{folders:['INBOX']}});const before=(await f.source(id))!.cursor;
    f.respond(url=>{
     if(mode==='list'&&(url.pathname.endsWith('/messages')||url.pathname.endsWith('/messages/delta')))return new Response('x'.repeat(8*1024*1024+1));
     if(provider==='google'?url.pathname.endsWith('/messages/0'):url.pathname.endsWith('/messages/0/$value')){
      if(mode==='transport')return new Response(new ReadableStream({start(controller){controller.error(new Error('edge interrupted'));}}));
      if(mode==='malformed')return provider==='google'?Response.json({labelIds:['INBOX']}):new Response(null,{status:503});
     }
    });
    const result=await f.sync(id);assert.equal(result.summary.halted,'unavailable',mode);assert.equal((await f.source(id))!.cursor,before);
   }
  }finally{await f.dispose();}
}

export async function deletedEventProof(provider:Provider){
  const f=await captureRecoveryFixture(provider);try{
   let deleted=false,seriesDeleted=false;f.respond(url=>{
    if(url.pathname.endsWith('/calendarList/other'))return Response.json({id:'other'});
    if(!url.pathname.endsWith('/events')&&!url.pathname.endsWith('/calendarView/delta()'))return;
    const other=url.pathname.includes('/other/');
    const event=provider==='google'?{id:'same-id',recurringEventId:'series-master',iCalUID:other?'other-uid':'series-uid',originalStartTime:{dateTime:'2026-10-20T10:00:00Z'},created:'2026-10-01T10:00:00Z',updated:'2026-10-01T10:00:00Z',start:{dateTime:'2026-10-20T10:00:00Z'},end:{dateTime:'2026-10-20T11:00:00Z'},organizer:{email:'ana@acme.example'}}:{id:'same-id',seriesMasterId:'series-master',iCalUId:other?'other-uid':'series-uid',originalStart:'2026-10-20T10:00:00Z',createdDateTime:'2026-10-01T10:00:00Z',lastModifiedDateTime:'2026-10-01T10:00:00Z',start:{dateTime:'2026-10-20T10:00:00',timeZone:'UTC'},end:{dateTime:'2026-10-20T11:00:00',timeZone:'UTC'},organizer:{emailAddress:{address:'ana@acme.example'}}};
    const tomb=(id:string)=>provider==='google'?{id,status:'cancelled',...(id==='same-id'?{iCalUID:'series-uid',recurringEventId:'series-master',originalStartTime:{dateTime:'2026-10-20T10:00:00Z'}}:{})}:{id,'@removed':{reason:'deleted'}};
    const occurrence={...event,id:'second-occurrence',...(provider==='google'?{originalStartTime:{dateTime:'2026-10-21T10:00:00Z'}}:{originalStart:'2026-10-21T10:00:00Z'})};
    const items=deleted?(other?[]:[tomb(seriesDeleted?'series-master':'same-id'),tomb('unseen-id')]):[event,...(other?[]:[occurrence])];
    return provider==='google'?Response.json({items,nextSyncToken:'round'}):Response.json({value:items,'@odata.deltaLink':`${url.origin}${url.pathname}?$deltatoken=round`});
   });
   const id=await f.connect({calendars:['calendar','other'],calendarWindow:window});await f.drain(id);assert.equal(await f.count(id),3);
   deleted=true;await f.drain(id);
   const cancelled=()=>f.db.prepare("SELECT i.body FROM capture_items i JOIN signals s ON s.id=i.signal_id WHERE s.source_id=? AND s.type='meeting.cancelled'").bind(id).all();
   const rows=(await cancelled()).results;assert.equal(rows.length,1);assert.match(rows[0].body,/UID:series-uid/);assert.match(rows[0].body,/RECURRENCE-ID:20261020T100000Z/);
   await f.drain(id);assert.equal((await cancelled()).results.length,1);
   seriesDeleted=true;await f.drain(id);assert.equal((await cancelled()).results.length,2,'series deletion cancels remaining captured occurrence');
   await f.drain(id);assert.equal((await cancelled()).results.length,2,'series cancellation replay does not repeat');
   seriesDeleted=false;await f.drain(id);assert.equal((await cancelled()).results.length,2,'individual tombstone after series deletion replays');
   const second=await f.connect({calendars:['calendar'],calendarWindow:window});await f.drain(second);assert.equal(await f.count(second),0,'another source cannot resolve tombstone');
   const erased=await f.app.request(`https://orbit.test/api/v1/records/contact/${f.ana}`,{method:'DELETE',headers:{cookie:f.cookie,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({confirmed:true})});
   assert.equal(erased.status,200);await f.drain(id);assert.equal(await f.count(id),0,'erased originals and deletions cannot return');
  }finally{await f.dispose();}
}
