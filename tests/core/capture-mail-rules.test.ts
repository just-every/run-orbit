import {providerFixture as fixture} from '../support/capture-provider-fixture';
import {captureMailRuleJourney} from '../support/capture-mail-rule';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const selected={mail:{folders:['INBOX','SENT']},calendars:['calendar'],calendarWindow:{start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'}};

test('CAPTURE-010 workspace mail rules and one-action corrections preserve CAPTURE-006 selected scope, crash replay, incremental reads and unknown-mail exclusion',async()=>{
 for(const provider of ['google','microsoft'] as const){const f=await fixture(provider);try{
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
  f.state.outage=true;const before=await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor');const unavailable=await (await f.request(`/sources/${id}/sync`,{})).json() as any;assert.equal(unavailable.summary.halted,'unavailable');assert.equal(await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor'),before);
  f.state.outage=false;f.state.revoked=true;assert.equal((await (await f.request(`/sources/${id}/sync`,{})).json() as any).summary.halted,'revoked');const reads=f.state.reads.length;assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);assert.equal(f.state.reads.length,reads);
  f.state.revoked=false;await f.connect(id);assert.equal(await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor'),null);assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);
  assert.equal((await f.request(`/sources/${id}/disconnect`,{confirmed:true})).status,200);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials WHERE source_id=?').bind(id).first('n'),0);
 }finally{await f.dispose();}}
 for(const provider of ['google','microsoft'] as const)await captureMailRuleJourney(await fixture(provider),provider==='google');
});
