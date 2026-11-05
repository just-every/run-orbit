import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {test} from 'node:test';
import {captureFixture,eml} from '../support/capture-fixture';
import {createApp} from '../support/app';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {exported} from '../support/capture-data-archive';
import {pollCalendarLinks} from '../../src/core/features/capture/calendar-link/source';
import {receiveRoutedEmail} from '../../src/core/features/capture/forward/inbound';

const security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'5c'.repeat(32)})!;
const rfc=(minutes:number)=>new Date(Date.now()-minutes*60000).toUTCString().replace('GMT','+0000');

test('CAPTURE-008 CAPTURE-009 the Orbit address and a calendar link capture customer evidence with no provider console',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-05T12:00:00.000Z')});
 const f=await captureFixture();
 try{
  // Only the network edges are fakes: SendGrid's signed parse post and the calendar's web server.
  const keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),feed={status:200,body:''},reads:{url:string;method:string}[]=[];
  const fetchFeed=async(url:string,init?:RequestInit)=>{reads.push({url,method:init?.method??'GET'});return new Response(feed.body,{status:feed.status,headers:{'content-type':'text/calendar'}});};
  const app=createApp({database:f.db,assets:{fetch:async()=>new Response('')},sourceSecurity:security,captureMailAddress:'orbit@capture.orbit.test',
   mailEventKeys:{parseKey:keys.publicKey.export({type:'spki',format:'der'}).toString('base64')},
   captureFetch:fetchFeed});
  const api=(path:string,body?:unknown)=>app.request(`https://orbit.test/api/v1/capture${path}`,{method:body===undefined?'GET':'POST',headers:{cookie:f.cookie,origin:'https://orbit.test','content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const parse=async(to:string[],raw:string,signed=true)=>{
   const form=new FormData();form.set('email',raw);form.set('envelope',JSON.stringify({to,from:'seller@orbit.test'}));form.set('to',to.join(','));
   const request=new Request('https://orbit.test/api/v1/mail/capture',{method:'POST',body:form}),body=Buffer.from(await request.arrayBuffer()),timestamp=String(Math.floor(Date.now()/1000));
   return app.request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('Content-Type')!,'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':signed?sign('sha256',Buffer.concat([Buffer.from(timestamp),body]),keys.privateKey).toString('base64'):'MEUCIQ'},body});
  };
  const routed=async(to:string,raw:string)=>{let rejected:string|null=null;await receiveRoutedEmail({from:'seller@orbit.test',to,raw:new Response(raw).body!,rawSize:raw.length,headers:new Headers(),setReject:(reason:string)=>{rejected=reason;}} as unknown as ForwardableEmailMessage,f.db,{security,address:'orbit@capture.orbit.test'});return rejected;};
  const forwardSignals=()=>f.db.prepare("SELECT type FROM signals WHERE source_id='capture-forward' ORDER BY occurred_at").all<{type:string}>().then(r=>r.results.map(row=>row.type));

  // The owner creates a private address; its tag is the only way in.
  assert.deepEqual(await (await api('/forward')).json(),{configured:true,available:true,address:null,confirmations:[],local:false});
  const created=await api('/forward',{});assert.equal(created.status,201);
  const address=(await created.json() as {address:string}).address;assert.match(address,/^orbit\+[a-z2-9]{16}@capture\.orbit\.test$/);

  // A BCC copy of Ana's reply arrives through SendGrid Inbound Parse: it never names the address in its headers.
  const reply=eml({From:'Ana Ruiz <ana@acme.example>',To:'Sam Seller <seller@orbit.test>',Subject:'Re: Proposal for Acme',Date:rfc(20),'Message-ID':'<bcc-reply@acme.example>'},'Yes, let us talk on Tuesday.');
  assert.equal((await parse([address],reply,false)).status,401);
  assert.deepEqual(await (await parse(['orbit@capture.orbit.test','orbit+guess@capture.orbit.test'],reply)).json(),{accepted:false});
  assert.deepEqual(await forwardSignals(),[]);
  assert.deepEqual(await (await parse(['seller@orbit.test',address.toUpperCase()],reply)).json(),{accepted:true});
  assert.deepEqual(await forwardSignals(),['email.replied']);
  // A reply stops scheduled outreach to that person at once (CAPTURE-003); every other change waits for review.
  assert.equal(await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(f.scheduled).first('state'),'cancelled');
  assert.ok(((await (await api('/proposals')).json()) as {proposals:unknown[]}).proposals.length>0);

  // Cloudflare Email Routing: a forwarded thread credits the original sender; a Gmail confirmation is shown, not stored.
  const forwarded=eml({From:'Sam Seller <seller@orbit.test>',To:address,Subject:'Fwd: Rollout plan',Date:rfc(10),'Message-ID':'<fwd-routed@orbit.test>'},'FYI\n\n---------- Forwarded message ---------\nFrom: Bob Stone <bob@acme.example>\nSubject: Rollout plan\n\nCan we start in May?');
  assert.equal(await routed(address,forwarded),null);
  const confirmation=eml({From:`Gmail Team <${['forwarding-noreply','google.com'].join('@')}>`,To:address,Subject:'(#481516234) Gmail Forwarding Confirmation - Receive Mail from sam@gmail.example',Date:rfc(5),'Message-ID':'<confirm@mail.example>'},'Confirmation code: 481516234\n\nTo allow sam@gmail.example to forward, click https://mail-settings.google.com/mail/vf-abc123-example');
  assert.equal(await routed(address,confirmation),null);
  assert.equal(await routed('orbit+guess@capture.orbit.test',forwarded),'Unknown address.');
  assert.deepEqual(await forwardSignals(),['email.replied','capture-forward:email.forwarded']);
  const status=await (await api('/forward')).json() as {confirmations:{code:string;account:string;link:string}[]};
  assert.deepEqual(status.confirmations.map(c=>[c.code,c.account,c.link]),[['481516234','sam@gmail.example','https://mail-settings.google.com/mail/vf-abc123-example']]);

  // Replacing the address cuts the old one off at once and keeps what was captured.
  const replaced=(await (await api('/forward',{})).json() as {address:string}).address;assert.notEqual(replaced,address);
  const late=eml({From:'Ana Ruiz <ana@acme.example>',To:address,Subject:'Late',Date:rfc(2),'Message-ID':'<late@acme.example>'},'Still there?');
  assert.equal(await routed(address,late),'Unknown address.');
  assert.equal((await forwardSignals()).length,2);

  // The same cron polling door used by the Worker reads only due links.
  const link='webcal://calendar.example/private/synthetic-orbit-9/basic.ics';
  const sources=async()=>{const response=await api('/sources');assert.equal(response.status,200);return (await response.json() as {sources:any[]}).sources;};
  const beforeLink=await sources();feed.body='<html>Calendar web page</html>';
  const wrong=await api('/calendar-links',{url:link});assert.equal(wrong.status,400);
  assert.match((await wrong.json() as {error:string}).error,/does not return a calendar/);
  assert.deepEqual(await sources(),beforeLink,'validation refuses the link before registering a source');
  const seller=['seller','orbit.test'].join('@'),bob=['bob','acme.example'].join('@');
  const event=(uid:string,sequence:number,start:string,end:string,extra:string[]=[])=>[
   'BEGIN:VEVENT',`UID:${uid}`,`SEQUENCE:${sequence}`,'DTSTAMP:20261104T091122Z','CREATED:20261103T081511Z',
   start,end,'SUMMARY:Acme kickoff',`ORGANIZER:mailto:${seller}`,`ATTENDEE;CN="Bob Stone":mailto:${bob}`,...extra,'END:VEVENT',
  ].join('\r\n');
  const original=event('synthetic-orbit-9',0,'DTSTART;TZID=Asia/Tokyo:20261108T143045','DTEND;TZID=Asia/Tokyo:20261108T154512');
  const revised=event('synthetic-orbit-9',1,'DTSTART:20261109T180015Z','DTEND:20261109T193022Z',['LAST-MODIFIED:20261105T114137Z']);
  const cancelled=event('synthetic-orbit-9',2,'DTSTART:20261109T180015Z','DTEND:20261109T193022Z',['LAST-MODIFIED:20261105T114537Z']);
  const outside=[event('synthetic-orbit-10',0,'DTSTART:20260501T090000Z','DTEND:20260501T100000Z'),event('synthetic-orbit-11',0,'DTSTART:20271201T090000Z','DTEND:20271201T100000Z')];
  const calendar=(item:string,method='REQUEST')=>['BEGIN:VCALENDAR','VERSION:2.0',`METHOD:${method}`,'X-WR-CALNAME:Sam at work',item,...outside,'END:VCALENDAR'].join('\r\n');
  feed.body=calendar(original);
  const linked=await api('/calendar-links',{url:link});assert.equal(linked.status,201);
  const {id,summary}=await linked.json() as {id:string;summary:{captured:number}};assert.equal(summary.captured,1);
  const source=()=>sources().then(rows=>rows.find(item=>item.id===id));
  const connected=await source();
  assert.deepEqual([connected.adapter,connected.name,connected.state,connected.captured_count],['ical','Sam at work','connected',1]);
  assert.equal(connected.last_success_at,'2026-11-05T12:00:00.000Z');
  assert.ok(!JSON.stringify(connected).includes('synthetic-orbit-9/basic.ics'),'the private link is absent from source reads');

  // Records export is the native read door for original item and signal identities.
  const snapshot=async()=>{
   await f.refreshSession();
   const archive=await exported(f,true);
   const rows=(table:string)=>archive.parts.flatMap((part:any)=>part.records.filter((row:any)=>row.table===table).map((row:any)=>row.row)) as any[];
   assert.ok(!archive.manifest.tables.some((table:any)=>table.name==='capture_credentials'));
   assert.ok(!JSON.stringify(archive).includes('synthetic-orbit-9/basic.ics'),'private links never travel in the archive');
   const signals=rows('signals').filter(row=>row.source_id===id).sort((a,b)=>a.id.localeCompare(b.id));
   const items=rows('capture_items').filter(row=>row.source_id===id).sort((a,b)=>a.id.localeCompare(b.id));
   return {signals,items,effects:Object.fromEntries(['signals','capture_items','capture_proposals','signal_links','timeline_entries','evaluations','evaluation_contributions','contacts','companies','opportunities','recommendations','recommendation_evidence','notifications','drafts','outbound_messages'].map(table=>[table,rows(table).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]))};
  };
  const first=await snapshot();assert.equal(first.signals.length,1);assert.equal(first.items.length,1);
  const check=(state:Awaited<ReturnType<typeof snapshot>>,sequence:number,type:string,start:string,end:string,occurred:string)=>{
   const item=state.items.find(row=>row.headers.includes(`SEQUENCE: ${sequence}\n`));assert.ok(item,`retained original sequence ${sequence}`);
   const signal=state.signals.find(row=>row.id===item.signal_id);assert.ok(signal);
   assert.equal(signal.source_id,id);assert.equal(item.source_id,id);assert.equal(signal.type,type);assert.equal(signal.occurred_at,occurred);
   const payload=JSON.parse(signal.payload_json);
   assert.equal(payload.data.captureItemId,item.id);assert.equal(payload.data.start,start);assert.equal(payload.data.end,end);assert.equal(payload.occurredAt,occurred);
   return {item,signal};
  };
  const initial=check(first,0,'meeting.booked','2026-11-08T05:30:45.000Z','2026-11-08T06:45:12.000Z','2026-11-03T08:15:11.000Z');
  assert.ok(initial.item.body.includes('DTSTART;TZID=Asia/Tokyo:20261108T143045'),'the written event time remains original evidence');
  const linkEvidence=async()=>{
   const response=await api('/proposals');assert.equal(response.status,200);
   const proposals=(await response.json() as {proposals:any[]}).proposals.filter(row=>row.source_name==='Sam at work'&&row.kind==='link_signal');
   for(const proposal of proposals)assert.equal((await api(`/proposals/${proposal.id}/accept`,{})).status,200);
  };
  const plan=async(signalId:string)=>{
   const response=await f.request(`/api/v1/today/meetings/${signalId}`);assert.equal(response.status,200,await response.clone().text());
   return (await response.json() as {plan:{meeting:any}}).plan.meeting;
  };
  await linkEvidence();
  assert.deepEqual(await plan(initial.signal.id),{signalId:initial.signal.id,status:'booked',subject:'Acme kickoff',occurredAt:'2026-11-03T08:15:11.000Z',start:'2026-11-08T05:30:45.000Z',end:'2026-11-08T06:45:12.000Z',source:'Sam at work',href:`/app/opportunities/${f.opportunity}`});
  const poll=()=>pollCalendarLinks(f.db,security,fetchFeed);
  const advance=async()=>{t.mock.timers.tick(16*60000);await poll();};
  const unchanged=(await (await api(`/sources/${id}/sync`,{})).json() as {summary:{captured:number;replayed:number}}).summary;
  assert.equal(unchanged.captured,0);assert.equal(unchanged.replayed,0,'an unchanged feed does not replay individual events');
  const initialReads=reads.length;
  feed.body=calendar(revised);await poll();
  t.mock.timers.tick(14*60000);await poll();
  assert.equal(reads.length,initialReads,'not due: even a changed feed is not fetched early');
  assert.equal((await source()).captured_count,1);
  t.mock.timers.tick(2*60000);await poll();
  assert.equal(reads.length,initialReads+1,'the next due poll fetches the changed feed');
  assert.equal((await source()).last_success_at,'2026-11-05T12:16:00.000Z');
  const changed=await snapshot();assert.equal(changed.signals.length,2);assert.equal(changed.items.length,2);
  assert.deepEqual(check(changed,0,'meeting.booked','2026-11-08T05:30:45.000Z','2026-11-08T06:45:12.000Z','2026-11-03T08:15:11.000Z'),initial,'revision retains the original identities and bytes');
  const revision=check(changed,1,'meeting.booked','2026-11-09T18:00:15.000Z','2026-11-09T19:30:22.000Z','2026-11-03T08:15:11.000Z');
  assert.notEqual(revision.signal.id,initial.signal.id);assert.notEqual(revision.item.id,initial.item.id);assert.notEqual(revision.signal.source_event_id,initial.signal.source_event_id);
  await linkEvidence();assert.equal((await plan(revision.signal.id)).start,'2026-11-09T18:00:15.000Z');
  const afterReview=await snapshot();await advance();
  assert.deepEqual((await snapshot()).effects,afterReview.effects,'unchanged revised feed has no new effect');
  // A changed envelope forces item replay instead of relying only on the feed cursor.
  feed.body=calendar(revised).replace('VERSION:2.0','VERSION:2.0\r\nPRODID:synthetic-orbit-12');await advance();
  assert.deepEqual((await snapshot()).effects,afterReview.effects,'revised item replay preserves every downstream identity');

  feed.body=calendar(cancelled,'CANCEL');await advance();
  const cancellation=await snapshot();assert.equal(cancellation.signals.length,3);assert.equal(cancellation.items.length,3);
  const cancelledEvidence=check(cancellation,2,'meeting.cancelled','2026-11-09T18:00:15.000Z','2026-11-09T19:30:22.000Z','2026-11-05T11:45:37.000Z');
  assert.match(cancelledEvidence.item.headers,/METHOD: CANCEL/);
  assert.deepEqual(cancellation.items.filter(item=>item.id!==cancelledEvidence.item.id),changed.items,'cancelling retains both previous originals');
  await linkEvidence();const cancelledPlan=await plan(cancelledEvidence.signal.id);
  assert.deepEqual([cancelledPlan.status,cancelledPlan.start,cancelledPlan.end,cancelledPlan.occurredAt],['cancelled','2026-11-09T18:00:15.000Z','2026-11-09T19:30:22.000Z','2026-11-05T11:45:37.000Z']);
  const retained=await snapshot();await advance();
  feed.body=calendar(cancelled,'CANCEL').replace('VERSION:2.0','VERSION:2.0\r\nPRODID:synthetic-orbit-13');await advance();
  assert.deepEqual((await snapshot()).effects,retained.effects,'both unchanged-feed and cancellation item replay create no new effect');
  assert.equal((await source()).captured_count,3);
  assert.ok(reads.every(read=>read.method==='GET'&&read.url===link.replace('webcal:','https:')),'calendar intake only reads the normalized private link');
  assert.equal(f.sent.length,2,'refresh, revision, cancellation and replay submit no customer mail');

  // A broken link halts intake and retains the captured history.
  feed.status=404;
  assert.equal((await (await api(`/sources/${id}/sync`,{})).json() as {summary:{halted:string}}).summary.halted,'revoked');
  const stopped=await source();assert.equal(stopped.state,'error');assert.match(stopped.last_error,/calendar refused this link \(HTTP 404\)/i);
  assert.deepEqual((await snapshot()).effects,retained.effects);
  const stoppedReads=reads.length;feed.status=200;feed.body=calendar(original);await advance();
  assert.equal(reads.length,stoppedReads,'a halted source stays stopped until explicitly reconnected');
  assert.equal((await api(`/sources/${id}/sync`,{})).status,409);
  assert.deepEqual((await snapshot()).effects,retained.effects,'a recovered web server cannot restart a halted source');
 }finally{await f.dispose();}
});
