import assert from 'node:assert/strict';
import {test} from 'node:test';
import {captureFixture,fixtureMailbox,eml} from '../support/capture-fixture';
import {launchFixture} from '../support/launch-fixture';
import {isolatedDatabase} from '../support/isolated-database';
import {testAuth} from '../support/test-auth';
import {currentSalesData} from '../support/current-sales-data';
import {proveCurrentArchive} from '../support/current-sales-archive';
import {exported,captured} from '../support/capture-data-archive';
import {eraseCapturedOriginals} from '../support/sanity-capture-erasure';
import {localArchiveRoundTrip,uploadRestored} from '../support/capture-privacy-archive';
import {capturePrivacyFixture} from '../support/capture-privacy-fixture';
test('CAPTURE-007 DATA-002 DATA-003 current sales records restore without authority, erase across public reads and cannot return through either archive path',async()=>{
 const f=await captureFixture(),target=await launchFixture(),local=await isolatedDatabase();try{
    await captured(f);
    const current=await currentSalesData(f);
    const archive = await exported(f), names = archive.manifest.tables.map((table: { name: string }) => table.name), text = JSON.stringify(archive);
    for (const table of ['capture_sources', 'capture_items', 'capture_proposals']) assert.ok(names.includes(table), `${table} is exported`);
    assert.ok(!names.includes('capture_credentials'));

    assert.ok(text.includes('Can we talk on Tuesday?'), 'the captured original travels');

    let imported = (await (await target.request('records/archive/imports', 'POST', { confirmed: true, manifest: archive.manifest })).json()) as any;
    for (const part of archive.parts) assert.ok((await target.request(`records/archive/imports/${imported.id}/parts/${part.index}`, 'PUT', part)).ok);
    for (let n = 0; n < 700 && imported.state !== 'complete'; n++) imported = await (await target.request(`records/archive/imports/${imported.id}/finalize`, 'POST', {})).json();
    assert.equal(imported.state, 'complete');
    for (const table of ['capture_sources', 'capture_items', 'capture_proposals', 'signals', 'signal_links', 'unlinked_signals'])
      assert.deepEqual((await target.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results, (await f.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results, `${table} restores equivalently`);
    assert.equal(await target.db.prepare('SELECT count(*) n FROM capture_credentials').first('n'), 0, 'a restored provider source has no credential and must be reconnected');
    await proveCurrentArchive(f,target,current,archive);

    // After transfer work, the owner confirms identity again before privacy operations.
    await f.refreshSignIn();
    await eraseCapturedOriginals(f);
    const original=fixtureMailbox(f).reply;
    const destination=await target.records.save('contact',{name:'Destination private history',email:'destination@acme.example'},target.actor);
    const targetSession=await testAuth(target.db).createSession(target.actor);
    assert.equal((await target.request(`records/contact/${destination.id}`,'DELETE',{confirmed:true},{Cookie:`__Host-orbit_session=${targetSession.token}`})).status,200);
    const retained=(await target.db.prepare("SELECT id FROM audit_entries WHERE action='capture.erased_mailbox'").all<{id:string}>()).results;
    assert.ok(retained.length,'destination has independent anonymous erasure history');
    await f.refreshSignIn();
    const erasedArchive=await exported(f);
    const session=await testAuth(target.db).createSession(target.actor);
    const call=async(path:string,method='GET',body?:unknown)=>{const response=await target.request(path,method,body,{Cookie:`__Host-orbit_session=${session.token}`});assert.ok(response.ok,await response.clone().text());return response.json() as Promise<any>;};
    let job=await call('records/archive/imports','POST',{confirmed:true,manifest:erasedArchive.manifest});
    for(const part of erasedArchive.parts)await call(`records/archive/imports/${job.id}/parts/${part.index}`,'PUT',part);
    for(let step=0;step<700&&job.state!=='complete';step++)job=await call(`records/archive/imports/${job.id}/finalize`,'POST',{});
    assert.equal(job.state,'complete');
    for(const proof of retained)assert.ok(await target.db.prepare('SELECT 1 FROM audit_entries WHERE id=?').bind(proof.id).first());
    await uploadRestored(target.db,f.operator,original);
    const privateItems=(db:D1Database)=>db.prepare("SELECT count(*) n FROM capture_items WHERE instr(lower(headers),'message-id: <reply-1@acme.example>')>0 OR instr(lower(headers),'message-id: <destination-history@acme.example>')>0").first('n');
    assert.equal(await privateItems(target.db),0,'Records restore keeps source erasure and destination history');
    const history=eml({From:'destination@acme.example',To:'seller@orbit.test',Date:'Wed, 01 Jan 2020 09:00:00 +0000','Message-ID':'<destination-history@acme.example>'},'Erased destination history');
    await uploadRestored(target.db,f.operator,history);assert.equal(await privateItems(target.db),0);
    await localArchiveRoundTrip(f.db,local.db);await uploadRestored(local.db,f.operator,original);
    assert.equal(await privateItems(local.db),0,'CLI restore carries the same anonymous replay barrier');

 }finally{await f.dispose();await target.dispose();await local.dispose();}
});
test('CAPTURE-007 DATA-002 erased provider history stays erased across expiry, crash and reconnect while genuinely new evidence remains reviewable',async()=>{
 const f=await capturePrivacyFixture();try{
  const id=await f.connect();await f.drain(id);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),1);
  assert.equal((await f.request(`records/contact/${f.ana}`,{confirmed:true},'DELETE')).status,200);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0);
  assert.ok(await f.db.prepare('SELECT 1 FROM companies WHERE id=?').bind(f.company).first(),'company-domain eligibility remains');
  f.state.expireHistory=true;await f.drain(id);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0,'expired Gmail history must not resurrect an erased original');
  f.state.expireHistory=true;f.crash();assert.equal((await f.request(`capture/sources/${id}/sync`,{})).status,500);
  await f.reopen();await f.drain(id);
  await f.connect(id);await f.drain(id);
  const replacement=await f.connect();await f.drain(replacement);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0,'reopen, reconnect and a new source retain the erasure barrier');
  const fresh=eml({From:'Ana <ana@acme.example>',To:'seller@orbit.test',Date:new Date(Date.now()+2000).toUTCString(),Subject:'New evidence after erasure','Message-ID':'<new-after-erasure@acme.example>'},'A new request after erasure.');
  assert.equal((await f.upload([{name:'fresh.eml',text:fresh}])).status,201);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),1,'new evidence at the retained company is still eligible');
  const proposal=await f.db.prepare("SELECT id FROM capture_proposals WHERE kind='create_contact' AND proposed_value='ana@acme.example'").first<{id:string}>();assert.ok(proposal);
  assert.equal((await f.request(`capture/proposals/${proposal.id}/accept`,{})).status,200);
  assert.equal(await f.db.prepare("SELECT contactability FROM contacts WHERE email_key='ana@acme.example'").first('contactability'),'do_not_contact','capture never grants contact permission');

 }finally{await f.dispose();}
});
