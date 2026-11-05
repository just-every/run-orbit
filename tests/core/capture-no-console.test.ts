import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {test} from 'node:test';
import {captureFixture,eml} from '../support/capture-fixture';
import {createApp} from '../support/app';
import {exported} from '../support/capture-data-archive';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {receiveRoutedEmail} from '../../src/core/features/capture/forward/inbound';

const security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'5c'.repeat(32)})!;
const rfc=(minutes:number)=>new Date(Date.now()-minutes*60000).toUTCString().replace('GMT','+0000');
const stamp=(date:Date)=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');

test('CAPTURE-008 CAPTURE-009 the Orbit address and a calendar link capture customer evidence with no provider console',async()=>{
 const f=await captureFixture();
 try{
  // Only the network edges are fakes: SendGrid's signed parse post and the calendar's web server.
  const keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),feed={status:200,body:''};
  const app=createApp({database:f.db,assets:{fetch:async()=>new Response('')},sourceSecurity:security,captureMailAddress:'orbit@capture.orbit.test',
   mailEventKeys:{parseKey:keys.publicKey.export({type:'spki',format:'der'}).toString('base64')},
   captureFetch:async()=>new Response(feed.body,{status:feed.status,headers:{'content-type':'text/calendar'}})});
  const api=(path:string,body?:unknown)=>app.request(`https://orbit.test/api/v1/capture${path}`,{method:body===undefined?'GET':'POST',headers:{cookie:f.cookie,origin:'https://orbit.test','content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const parse=async(to:string[],raw:string,signed=true)=>{
   const form=new FormData();form.set('email',raw);form.set('envelope',JSON.stringify({to,from:'seller@orbit.test'}));form.set('to',to.join(','));
   const request=new Request('https://orbit.test/api/v1/mail/capture',{method:'POST',body:form}),body=Buffer.from(await request.arrayBuffer()),timestamp=String(Math.floor(Date.now()/1000));
   return app.request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('Content-Type')!,'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':signed?sign('sha256',Buffer.concat([Buffer.from(timestamp),body]),keys.privateKey).toString('base64'):'MEUCIQ'},body});
  };
  const routed=async(to:string,raw:string)=>{let rejected:string|null=null;await receiveRoutedEmail({from:'seller@orbit.test',to,raw:new Response(raw).body!,rawSize:Buffer.byteLength(raw),headers:new Headers(),setReject:(reason:string)=>{rejected=reason;}} as unknown as ForwardableEmailMessage,f.db,{security,address:'orbit@capture.orbit.test'});return rejected;};
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

  // Both delivery doors acknowledge oversized mail, count it visibly, and retain no part of it.
  const sourceStatus=async()=>{
   const response=await api('/sources');assert.equal(response.status,200);
   return (await response.json() as {sources:{id:string;captured_count:number;skipped_count:number;last_error:string|null;last_error_at:string|null}[]}).sources.find(source=>source.id==='capture-forward')!;
  };
  const inventory=async()=>Promise.all(['signals','capture_items','capture_proposals','timeline_entries'].map(async table=>{
   const rows=(await f.db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).results;
   return {table,count:rows.length,hash:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
  }));
  const before=await inventory(),sourceBefore=await sourceStatus();
  assert.ok(before.every(table=>table.count>0),'nonempty evidence and timeline inventories guard against content loss or replacement');
  for(const [index,door] of ['routed','parse'].entries()){
   const sentinel=`synthetic-orbit-27-${door}`,raw=reply.replace('bcc-reply',sentinel).replace('Yes, let us talk on Tuesday.',`${sentinel} ${'é'.repeat((door==='parse'?6:5)*1024*1024)}`);
   assert.ok(Buffer.byteLength(raw)>(door==='parse'?12:10)*1024*1024&&raw.length<10*1024*1024,'message size is measured in bytes; Inbound Parse crosses the former 11 MiB cap');
   if(door==='routed'){
    assert.match((await routed('orbit+guess@capture.orbit.test',raw))!,/Unknown address/);
   }else{
    assert.equal((await parse([address],raw,false)).status,401);
    assert.deepEqual(await (await parse(['orbit+guess@capture.orbit.test'],raw)).json(),{accepted:false});
   }
   assert.equal((await sourceStatus()).skipped_count,sourceBefore.skipped_count+index,'unauthorized oversized mail is not counted');
   assert.deepEqual(await inventory(),before,'unauthorized oversized mail changes no evidence');
   if(door==='routed')assert.equal(await routed(address,raw),null,'authorized oversized mail is not bounced');
   else{const response=await parse([address],raw);assert.equal(response.status,200);assert.deepEqual(await response.json(),{accepted:true});}
   const after=await sourceStatus();
   assert.equal(after.skipped_count,sourceBefore.skipped_count+index+1,'each accepted oversized message increments Not stored exactly once');
   assert.equal(after.captured_count,sourceBefore.captured_count);
   assert.match(after.last_error!,/larger than 10 MB.*not stored/);assert.ok(after.last_error_at);
   assert.deepEqual(await inventory(),before,'oversized mail creates or changes no signal, captured original, proposal or timeline entry');
   const directory=join(f.platform.directory,'v3','d1'),files=readdirSync(directory,{recursive:true}).filter((name):name is string=>typeof name==='string'&&name.endsWith('.sqlite'));
   assert.ok(files.length>0);
   for(const file of files){
    const store=new DatabaseSync(join(directory,file),{readOnly:true});
    try{for(const {name} of store.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {name:string}[]){
     assert.ok(!JSON.stringify(store.prepare(`SELECT * FROM "${name.replaceAll('"','""')}"`).all()).includes(sentinel),`oversized content absent from ${name}`);
    }}finally{store.close();}
   }
  }

  // Hand-forwarded headers and signal participants keep the mailbox, never its credential tag.
  const stored=JSON.stringify((await f.db.prepare("SELECT headers,body FROM capture_items WHERE source_id='capture-forward'").all()).results);
  const participants=JSON.stringify((await f.db.prepare("SELECT payload_json FROM signals WHERE source_id='capture-forward'").all()).results);
  for(const evidence of [stored,participants]){
   assert.ok(evidence.includes('orbit@capture.orbit.test'),'the untagged receiving mailbox remains in evidence');
   assert.ok(!evidence.toLowerCase().includes(address.toLowerCase()),'the private tag is absent from persisted evidence');
  }
  const archive=JSON.stringify(await exported(f));
  assert.ok(archive.includes('fwd-routed@orbit.test'),'the downloaded archive contains the hand-forwarded capture');
  assert.ok(archive.includes('orbit@capture.orbit.test'),'the archive keeps the untagged mailbox');
  assert.ok(!archive.toLowerCase().includes(address.toLowerCase()),'the downloaded archive never carries the tagged address');

  // Replacing the address cuts the old one off at once and keeps what was captured.
  const replaced=(await (await api('/forward',{})).json() as {address:string}).address;assert.notEqual(replaced,address);
  const late=eml({From:'Ana Ruiz <ana@acme.example>',To:address,Subject:'Late',Date:rfc(2),'Message-ID':'<late@acme.example>'},'Still there?');
  assert.equal(await routed(address,late),'Unknown address.');
  assert.equal((await forwardSignals()).length,2);

  // A calendar's private iCal link: refused when it is not a calendar, then read once per change.
  const start=new Date(Date.now()+3*86400000);
  feed.body='<html>Calendar web page</html>';
  const wrong=await api('/calendar-links',{url:'webcal://calendar.example/private/abc/basic.ics'});assert.equal(wrong.status,400);
  assert.match((await wrong.json() as {error:string}).error,/does not return a calendar/);
  feed.body=['BEGIN:VCALENDAR','VERSION:2.0','X-WR-CALNAME:Sam at work','BEGIN:VEVENT','UID:kickoff@calendar.example','SEQUENCE:0',`DTSTAMP:${stamp(new Date(Date.now()-86400000))}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(new Date(start.getTime()+3600000))}`,'SUMMARY:Acme kickoff','ORGANIZER:mailto:seller@orbit.test','ATTENDEE;CN="Bob Stone":mailto:bob@acme.example','END:VEVENT','END:VCALENDAR'].join('\r\n');
  const linked=await api('/calendar-links',{url:'webcal://calendar.example/private/abc/basic.ics'});assert.equal(linked.status,201);
  const {id,summary}=await linked.json() as {id:string;summary:{captured:number}};assert.equal(summary.captured,1);
  const source=(await (await api('/sources')).json() as {sources:any[]}).sources.find(item=>item.id===id);
  assert.deepEqual([source.adapter,source.name,source.state,source.captured_count],['ical','Sam at work','connected',1]);
  assert.equal(await f.db.prepare("SELECT type FROM signals WHERE source_id=?").bind(id).first('type'),'meeting.booked');
  assert.deepEqual((await (await api(`/sources/${id}/sync`,{})).json() as {summary:{captured:number;replayed:number}}).summary.captured,0);
  // A link that stops working stops intake and says so until the calendar is added again.
  feed.status=404;
  assert.equal((await (await api(`/sources/${id}/sync`,{})).json() as {summary:{halted:string}}).summary.halted,'revoked');
  const stopped=(await (await api('/sources')).json() as {sources:any[]}).sources.find(item=>item.id===id);
  assert.equal(stopped.state,'error');assert.match(stopped.last_error,/calendar refused this link \(HTTP 404\)/);
 }finally{await f.dispose();}
});
