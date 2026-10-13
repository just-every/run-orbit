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
   const cancelled=()=>f.db.prepare("SELECT i.body,s.occurred_at FROM capture_items i JOIN signals s ON s.id=i.signal_id WHERE s.source_id=? AND s.type='meeting.cancelled'").bind(id).all();
   const rows=(await cancelled()).results;assert.equal(rows.length,1);assert.match(rows[0].body,/UID:series-uid/);assert.match(rows[0].body,/RECURRENCE-ID:20261020T100000Z/);
   const observed=rows[0].occurred_at.replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');assert.ok(rows[0].body.includes(`X-ORBIT-DELETION-OBSERVED-AT:${observed}`),'undated deletion explicitly labels its observation time');
   await f.drain(id);assert.equal((await cancelled()).results.length,1);
   seriesDeleted=true;await f.drain(id);assert.equal((await cancelled()).results.length,2,'series deletion cancels remaining captured occurrence');
   await f.drain(id);assert.equal((await cancelled()).results.length,2,'series cancellation replay does not repeat');
   seriesDeleted=false;await f.drain(id);assert.equal((await cancelled()).results.length,2,'individual tombstone after series deletion replays');
   const second=await f.connect({calendars:['calendar'],calendarWindow:window});await f.drain(second);assert.equal(await f.count(second),0,'another source cannot resolve tombstone');
   const erased=await f.app.request(`https://orbit.test/api/v1/records/contact/${f.ana}`,{method:'DELETE',headers:{cookie:f.cookie,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({confirmed:true})});
   assert.equal(erased.status,200);await f.drain(id);assert.equal(await f.count(id),0,'erased originals and deletions cannot return');
  }finally{await f.dispose();}
  if(provider==='google')for(const partial of [false,true])await googleDeletionProof(partial);
}

async function googleDeletionProof(partial:boolean){
 const f=await captureRecoveryFixture('google');try{
  let phase:'booked'|'individual'|'series'|'replay'|'first-cancellation'='booked';
  const modified='2026-10-12T12:00:00Z';
  const master={id:'series-master',iCalUID:'series-uid',summary:'Recurring meeting',created:'2026-10-01T10:00:00Z',updated:'2026-10-01T10:00:00Z',start:{dateTime:'2026-10-20T10:00:00Z'},end:{dateTime:'2026-10-20T11:00:00Z'},organizer:{email:'ana@acme.example'},recurrence:['RRULE:FREQ=DAILY;COUNT=2']};
  const instances=[20,21].map(day=>({...master,id:`occurrence-${day}`,recurrence:undefined,recurringEventId:master.id,originalStartTime:{dateTime:`2026-10-${day}T10:00:00Z`},start:{dateTime:`2026-10-${day}T10:00:00Z`},end:{dateTime:`2026-10-${day}T11:00:00Z`}}));
  const full=(event:object)=>({...event,status:'cancelled',updated:modified});
  const matching=(event:object)=>full({...event,...(partial?{end:undefined}:{})});
  const first=full({...master,id:'first-cancellation',iCalUID:'first-uid',recurrence:undefined});
  const incomplete=[
   ...['2025-10-20T10:00:00Z','2026-10-20T10:00:00Z','2028-10-20T10:00:00Z'].map(dateTime=>({start:{dateTime},end:undefined})),
   {start:undefined},{start:undefined,end:undefined},{end:{}},{start:{}},
   {start:{dateTime:'2026-10-20T10:00:00',timeZone:'Unknown/Zone'}},
  ].map((bounds,index)=>full({...master,id:`incomplete-${index}`,iCalUID:`incomplete-uid-${index}`,recurrence:undefined,...bounds}));
  f.respond(url=>{
   if(url.pathname.endsWith('/events/series-master/instances'))return Response.json({items:[...instances,...incomplete]});
   if(!url.pathname.endsWith('/events'))return;
   // A full individual can omit its recurrence fields; provider ID still resolves
   // just that occurrence. A full master need not retain its recurrence rule.
   const items=phase==='booked'?[master]:phase==='individual'?[matching({...instances[0],originalStartTime:undefined,recurringEventId:undefined,...(partial?{start:{dateTime:'2028-10-20T10:00:00Z'}}:{})})]:phase==='series'?[matching({...master,recurrence:undefined,start:{dateTime:'2025-10-20T10:00:00Z'},end:{dateTime:'2025-10-20T11:00:00Z'}})]:phase==='replay'?[{id:master.id,status:'cancelled'},{id:instances[0]!.id,status:'cancelled'},{id:'first-cancellation',status:'cancelled'}]:[first,...incomplete,full({...master,id:'outside-window',iCalUID:'outside-uid',start:{dateTime:'2025-10-20T10:00:00Z'},end:{dateTime:'2025-10-20T11:00:00Z'}})];
   return Response.json({items:[...items,{id:'unknown-id',status:'cancelled',updated:modified}],nextSyncToken:phase});
  });
  const id=await f.connect({calendars:['calendar'],calendarWindow:window});await f.drain(id);assert.equal(await f.count(id),2);
  const cancelled=async()=> (await f.db.prepare("SELECT i.body,s.occurred_at FROM capture_items i JOIN signals s ON s.id=i.signal_id WHERE s.source_id=? AND s.type='meeting.cancelled'").bind(id).all<{body:string;occurred_at:string}>()).results;
  phase='individual';await f.drain(id);let rows=await cancelled();assert.equal(rows.length,1,'full or partial individual cancellation preserves its sibling');assert.match(rows[0]!.body,/RECURRENCE-ID:20261020T100000Z/);
  phase='series';await f.drain(id);rows=await cancelled();assert.deepEqual(rows.map(row=>/^RECURRENCE-ID:(.+)$/m.exec(row.body)?.[1]).sort(),['20261020T100000Z','20261021T100000Z'],'full or partial master resolves both stored occurrences even without recurrence and with its start outside the window');
  for(const row of rows){assert.equal(row.occurred_at,'2026-10-12T12:00:00.000Z');assert.doesNotMatch(row.body,/X-ORBIT-DELETION-OBSERVED-AT/);assert.ok(row.body.includes(`DTSTART:${/^RECURRENCE-ID:(.+)$/m.exec(row.body)![1]}`),'captured start survives changed or missing cancellation bounds');}
  await f.drain(id);phase='replay';await f.drain(id);assert.equal((await cancelled()).length,2,'full and ID-only series/individual deletions replay');
  phase='first-cancellation';await f.drain(id);rows=await cancelled();assert.equal(rows.length,3,'a first complete cancellation is captured, but unknown cancellations without a proven window overlap are not');assert.ok(rows.some(row=>row.body.includes('UID:first-uid')&&row.occurred_at==='2026-10-12T12:00:00.000Z'));
  await f.drain(id);phase='replay';await f.drain(id);assert.equal((await cancelled()).length,3,'first complete cancellation also replays as a bare ID');
  const erased=await f.app.request(`https://orbit.test/api/v1/records/contact/${f.ana}`,{method:'DELETE',headers:{cookie:f.cookie,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({confirmed:true})});assert.equal(erased.status,200);
  phase='first-cancellation';await f.drain(id);phase='series';await f.drain(id);assert.equal(await f.count(id),0,'full cancellations do not restore erased evidence');
 }finally{await f.dispose();}
}
