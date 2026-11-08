import {providerFixture as fixture} from '../support/capture-provider-fixture';
import {captureMailRuleJourney} from '../support/capture-mail-rule';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const selected={mail:{folders:['INBOX','SENT']},calendars:['calendar'],calendarWindow:{start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'}};

test('CAPTURE-010 workspace mail rules and one-action corrections preserve CAPTURE-006 selected scope, crash replay, incremental reads and unknown-mail exclusion',async()=>{
 for(const provider of ['google','microsoft'] as const){const f=await fixture(provider);try{
  f.state.fixedWindow=true;
  const id=await f.connect();assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);assert.equal(f.state.reads.length,0);
  let continuation:string|undefined,mail:string[]=[],calendars:string[]=[];do{const response=await f.request(`/sources/${id}/options${continuation?`?continuation=${encodeURIComponent(continuation)}`:''}`);assert.equal(response.status,200);const value=await response.json() as any;mail.push(...value.mail.map((x:any)=>x.id));calendars.push(...value.calendars.map((x:any)=>x.id));continuation=value.continuation;}while(continuation);
  assert.deepEqual(mail,['INBOX','SENT']);assert.deepEqual(calendars,['calendar']);
  assert.equal((await f.request(`/sources/${id}/scope`,selected)).status,200);
  f.crash();assert.equal((await f.request(`/sources/${id}/sync`,{})).status,500);assert.ok((await f.count(id))!>0);
  await f.reopen();await f.drain(id);assert.equal(await f.count(id),26);assert.equal(await f.db.prepare("SELECT count(*) n FROM capture_items WHERE headers LIKE '%unknown%' OR body LIKE '%unknown%'").first('n'),0);
  f.state.incremental=true;f.state.tombstones=true;await f.drain(id);assert.equal(await f.count(id),28);
  assert.equal(await f.db.prepare("SELECT count(*) n FROM signals WHERE source_id=? AND type='meeting.cancelled'").bind(id).first('n'),1);
  assert.ok(Number(await f.db.prepare('SELECT skipped_count FROM capture_sources WHERE id=?').bind(id).first('skipped_count'))>0);
  if(provider==='google'){f.state.expireHistory=true;await f.drain(id);assert.equal(await f.count(id),28);assert.ok(f.state.reads.some(url=>url.includes('startHistoryId=900719925474099312345')));}
  f.state.recurring=true;await f.drain(id);assert.equal(await f.count(id),30);await f.drain(id);assert.equal(await f.count(id),30,'recurring occurrences replay independently');
  const starts=(await f.db.prepare("SELECT json_extract(payload_json,'$.data.start') AS start FROM signals WHERE source_id=? AND type LIKE 'meeting.%'").bind(id).all<{start:string}>()).results.map(row=>row.start);assert.ok(starts.includes('2026-11-01T05:30:00.000Z'));assert.ok(starts.includes('2026-11-08T06:30:00.000Z'));
  const original=(await f.contact()).timeline,originalEvidence=(await f.db.prepare('SELECT * FROM capture_items WHERE source_id=? ORDER BY id').bind(id).all()).results;
  assert.ok(original.some((entry:any)=>entry.id===originalEvidence[0].signal_id),'seeded evidence is visible on its known contact');
  const extended={...selected,calendarWindow:{start:'2025-01-01T00:00:00.000Z',end:'2028-01-01T00:00:00.000Z'}};
  assert.deepEqual((await f.source(id)).scope,selected);await f.drain(id);assert.equal(await f.count(id),30,'unchanged fixed dates never roll forward implicitly');
  const readStart=f.state.reads.length;
  assert.equal((await f.request(`/sources/${id}/scope`,extended)).status,200);
  await f.reopen();assert.deepEqual((await f.source(id)).scope,extended,'saved date extension survives a real store restart');
  await f.drain(id);assert.equal(await f.count(id),32,'both newly included meetings are captured');
  const restarted=f.state.reads.slice(readStart).map(raw=>new URL(raw)).filter(url=>provider==='google'?url.pathname.endsWith('/events'):/\/calendarView\/delta\(\)$/.test(url.pathname));
  assert.ok(restarted.length>0);const first=restarted[0];
  assert.equal(first.searchParams.get(provider==='google'?'timeMin':'startDateTime'),extended.calendarWindow.start);
  assert.equal(first.searchParams.get(provider==='google'?'timeMax':'endDateTime'),extended.calendarWindow.end);
  for(const token of ['syncToken','pageToken','$skiptoken','$deltatoken'])assert.equal(first.searchParams.has(token),false,'changed dates restart without the old cursor');
  const extendedEvidence=(await f.db.prepare('SELECT * FROM capture_items WHERE source_id=? ORDER BY id').bind(id).all()).results;
  for(const item of originalEvidence)assert.deepEqual(extendedEvidence.find(row=>row.id===item.id),item,'original evidence bytes and identities stay intact');
  const timeline=(await f.contact()).timeline,proposals=await f.proposals();
  for(const title of ['synthetic-orbit-401','synthetic-orbit-402']){const captured=proposals.filter((proposal:any)=>proposal.kind==='link_signal'&&proposal.details.evidence.subject===title);assert.equal(captured.length,1,'each newly included known-participant meeting is visible once in Capture review');assert.deepEqual(captured[0].details.contactIds,[f.ana]);}
  for(const entry of original)assert.deepEqual(timeline.find((current:any)=>current.id===entry.id),entry);
  await f.reopen();await f.drain(id);await f.drain(id);
  assert.deepEqual((await f.db.prepare('SELECT * FROM capture_items WHERE source_id=? ORDER BY id').bind(id).all()).results,extendedEvidence);
  assert.deepEqual((await f.contact()).timeline,timeline,'repeated synchronization preserves the same visible history');
  assert.deepEqual(await f.proposals(),proposals,'replay retains the same visible evidence and review identities');
  assert.deepEqual((await f.source(id)).scope,extended);
  for(const raw of f.state.reads){const path=new URL(raw).pathname;assert.ok(!/\/users\/(?!me\/)|\/users$/.test(path),'only the authorized mailbox is read');if(path.includes('/calendars/'))assert.match(path,/\/calendars\/calendar(?:\/|$)/,'calendar metadata and event reads stay on the selected calendar');if(provider==='microsoft'&&path.includes('/mailFolders/'))assert.ok(/\/mailFolders\/(INBOX|SENT)\//.test(path)||/\/mailFolders\/(INBOX|SENT)$/.test(path));if(provider==='google'){const label=new URL(raw).searchParams.get('labelIds')??new URL(raw).searchParams.get('labelId');if(label)assert.ok(selected.mail.folders.includes(label));}}
  assert.equal(f.state.writes.length,0,'extending a read window never writes to the provider');
  f.state.outage=true;const before=await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor');const unavailable=await (await f.request(`/sources/${id}/sync`,{})).json() as any;assert.equal(unavailable.summary.halted,'unavailable');assert.equal(await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor'),before);
  f.state.outage=false;f.state.revoked=true;assert.equal((await (await f.request(`/sources/${id}/sync`,{})).json() as any).summary.halted,'revoked');const reads=f.state.reads.length;assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);assert.equal(f.state.reads.length,reads);
  f.state.revoked=false;await f.connect(id);assert.equal(await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor'),null);assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);
  assert.equal((await f.request(`/sources/${id}/disconnect`,{confirmed:true})).status,200);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials WHERE source_id=?').bind(id).first('n'),0);
 }finally{await f.dispose();}}
 for(const provider of ['google','microsoft'] as const)await captureMailRuleJourney(await fixture(provider),provider==='google');
});
