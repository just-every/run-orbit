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
  const source=async()=>{
   const response=await f.request('/sources');assert.equal(response.status,200);
   return ((await response.json()) as any).sources.find((row:any)=>row.id===id);
  };
  const originals=async()=>(await f.db.prepare('SELECT * FROM capture_items WHERE source_id=? ORDER BY id').bind(id).all()).results;
  const retained=await originals();assert.equal(retained.length,30);
  f.state.outage=true;const before=await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor');const unavailable=await (await f.request(`/sources/${id}/sync`,{})).json() as any;assert.equal(unavailable.summary.halted,'unavailable');assert.equal(await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor'),before);
  const outage=await source();assert.equal(outage.state,'connected');assert.match(outage.last_error,/Provider unavailable/);assert.ok(outage.last_error_at);assert.deepEqual(await originals(),retained);
  f.state.outage=false;f.state.revoked=true;assert.equal((await (await f.request(`/sources/${id}/sync`,{})).json() as any).summary.halted,'revoked');const reads=f.state.reads.length;assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);assert.equal(f.state.reads.length,reads);
  const revoked=await source();assert.equal(revoked.state,'error');assert.match(revoked.last_error,/Access was revoked/);assert.ok(revoked.last_error_at);assert.deepEqual(await originals(),retained);
  f.state.revoked=false;assert.equal(await f.connect(id),id);assert.equal(await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor'),null);assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);
  const reconnected=await source();assert.equal(reconnected.state,'connected');assert.equal(reconnected.last_error,null);assert.equal(reconnected.last_error_at,null);assert.equal(reconnected.has_credential,1);assert.deepEqual(reconnected.scope,{mail:{folders:[]},calendars:[]});
  // This message did not exist before the new authorization. A full selected
  // read after reconnect must admit it while retaining every earlier original.
  const freshProviderId=String(f.state.total++),freshSubject=`Provider ${freshProviderId}`;
  assert.equal(await f.db.prepare('SELECT id FROM signals WHERE source_id=? AND subject=?').bind(id,freshSubject).first(),null);
  assert.equal((await f.request(`/sources/${id}/scope`,selected)).status,200);
  const readStart=f.state.reads.length;await f.drain(id);
  assert.equal(await f.count(id),31,'reconnected adapter resumes positive intake');
  const fresh=await f.db.prepare('SELECT id FROM signals WHERE source_id=? AND subject=?').bind(id,freshSubject).first<{id:string}>();assert.ok(fresh);
  const captured=await originals();assert.equal(captured.length,31);
  assert.deepEqual(captured.filter(row=>retained.some(old=>old.id===row.id)),retained,'reconnect preserves all original identities and content');
  const added=captured.filter(row=>!retained.some(old=>old.id===row.id));assert.equal(added.length,1);assert.equal(added[0]!.signal_id,fresh.id);assert.equal(added[0]!.body,`Evidence ${freshProviderId}`);
  assert.ok(f.state.reads.slice(readStart).some(url=>url.includes(provider==='google'?`/messages/${freshProviderId}?`:`/messages/${freshProviderId}/$value`)));
  const detail=await f.app.request(`https://orbit.test/api/v1/records/contact/${f.ana}`,{headers:{cookie:f.cookie}});assert.equal(detail.status,200);assert.ok(((await detail.json()) as any).timeline.some((entry:any)=>entry.id===fresh.id));
  const recovered=await source();assert.equal(recovered.state,'connected');assert.deepEqual(recovered.scope,selected);assert.equal(recovered.captured_count,31);assert.equal(recovered.last_error,null);assert.equal(recovered.last_error_at,null);assert.ok(recovered.last_success_at);assert.ok(recovered.proposals_waiting>0);assert.equal(recovered.skipped_count,revoked.skipped_count);
  const effects=async()=>({signals:(await f.db.prepare('SELECT * FROM signals WHERE source_id=? ORDER BY id').bind(id).all()).results,proposals:(await f.db.prepare('SELECT * FROM capture_proposals WHERE signal_id IN(SELECT id FROM signals WHERE source_id=?) ORDER BY id').bind(id).all()).results,timeline:(await f.db.prepare('SELECT * FROM timeline_entries WHERE id IN(SELECT id FROM signals WHERE source_id=?) ORDER BY id').bind(id).all()).results});
  const resumedEffects=await effects();await f.reopen();await f.drain(id);await f.drain(id);
  assert.deepEqual(await originals(),captured,'restarted replay keeps original evidence exactly once');assert.deepEqual(await effects(),resumedEffects,'replay creates no signals, proposals or timeline duplicates');assert.equal((await source()).captured_count,31);
  assert.equal((await f.request(`/sources/${id}/disconnect`,{confirmed:true})).status,200);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials WHERE source_id=?').bind(id).first('n'),0);
  const disconnected=await source();assert.equal(disconnected.state,'disconnected');assert.equal(disconnected.has_credential,0);assert.equal(disconnected.captured_count,31);assert.deepEqual(await originals(),captured);
  const stoppedReads=f.state.reads.length;assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);assert.equal(f.state.reads.length,stoppedReads);
 }finally{await f.dispose();}}
 for(const provider of ['google','microsoft'] as const)await captureMailRuleJourney(await fixture(provider),provider==='google');
});
