import {captureErasureFixture} from '../support/capture-erasure-fixture';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureFixture, fixtureMailbox, eml, type CaptureFixture } from '../support/capture-fixture';
import { launchFixture } from '../support/launch-fixture';
import { createSourceSecurity } from '../../src/core/platform/source-security';
import { connectSource } from '../../src/core/features/capture/sources';
import { capturePrivacyFixture } from '../support/capture-privacy-fixture';
import { localArchiveRoundTrip,uploadRestored } from '../support/capture-privacy-archive';
import { isolatedDatabase } from '../support/isolated-database';

const json = { 'content-type': 'application/json' };
async function exported(f: CaptureFixture, discard = false) {
  const call = async (path: string, init?: RequestInit) => { const response = await f.request(path, init); assert.ok(response.ok, `${path}: ${response.status} ${await response.clone().text()}`); return response.json() as Promise<any>; };
  let job = await call('/api/v1/records/archive/exports', { method: 'POST', headers: json, body: '{}' });
  for (let n = 0; n < 300 && job.state !== 'ready'; n++) job = await call(`/api/v1/records/archive/exports/${job.id}/advance`, { method: 'POST', headers: json, body: '{}' });
  assert.equal(job.state, 'ready');
  const archive = await call(`/api/v1/records/archive/exports/${job.id}/download`);
  if (discard) await call(`/api/v1/records/archive/exports/${job.id}/abort`, { method: 'POST', headers: json, body: '{}' });
  return archive;
}
async function captured(f: CaptureFixture) {
  await f.upload([{ name: 'export.mbox', text: fixtureMailbox(f).mbox }, { name: 'invite.ics', text: fixtureMailbox(f).invite }]);
  const proposals = (await f.db.prepare("SELECT id,kind FROM capture_proposals WHERE status='pending' ORDER BY id").all<{ id: string; kind: string }>()).results;
  assert.equal((await f.request(`/api/v1/capture/proposals/${proposals.find(p => p.kind === 'link_signal')!.id}/accept`, { method: 'POST', headers: json, body: '{}' })).status, 200);
  assert.equal((await f.request(`/api/v1/capture/proposals/${proposals.find(p => p.kind === 'create_contact')!.id}/decline`, { method: 'POST', headers: json, body: '{}' })).status, 200);
}

test('CAPTURE-007 DATA-001 captured evidence, proposals and source state travel in the Records archive and restore equivalently; credentials never travel', async () => {
  const f = await captureFixture(), target = await launchFixture();
  try {
    await captured(f);
    const security = createSourceSecurity({ ORBIT_ENCRYPTION_KEY: '44'.repeat(32) })!;
    await connectSource(f.db, { id: 'capture-provider', adapter: 'fake-mail', name: 'Provider mailbox', scope: { mail: { folders: ['INBOX'] } }, credential: 'provider-grant-never-exported' }, security, f.operator);
    const sealed = await f.db.prepare("SELECT ciphertext FROM capture_credentials WHERE source_id='capture-provider'").first<{ ciphertext: string }>();
    const archive = await exported(f), names = archive.manifest.tables.map((table: { name: string }) => table.name), text = JSON.stringify(archive);
    for (const table of ['capture_sources', 'capture_items', 'capture_proposals']) assert.ok(names.includes(table), `${table} is exported`);
    assert.ok(!names.includes('capture_credentials'));
    assert.ok(!text.includes(sealed!.ciphertext) && !text.includes('provider-grant-never-exported'), 'no credential travels');
    assert.ok(text.includes('Can we talk on Tuesday?'), 'the captured original travels');

    let imported = (await (await target.request('records/archive/imports', 'POST', { confirmed: true, manifest: archive.manifest })).json()) as any;
    for (const part of archive.parts) assert.ok((await target.request(`records/archive/imports/${imported.id}/parts/${part.index}`, 'PUT', part)).ok);
    for (let n = 0; n < 700 && imported.state !== 'complete'; n++) imported = await (await target.request(`records/archive/imports/${imported.id}/finalize`, 'POST', {})).json();
    assert.equal(imported.state, 'complete');
    for (const table of ['capture_sources', 'capture_items', 'capture_proposals', 'signals', 'signal_links', 'unlinked_signals'])
      assert.deepEqual((await target.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results, (await f.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results, `${table} restores equivalently`);
    assert.equal(await target.db.prepare('SELECT count(*) n FROM capture_credentials').first('n'), 0, 'a restored provider source has no credential and must be reconnected');
  } finally { await f.dispose(); await target.dispose(); }
});

test('CAPTURE-007 DATA-002 BASE-DATA-003 erasing a contact erases their captured originals and proposals; the audit trail keeps counts and anonymous replay proofs', async () => {
  const f = await captureFixture();
  try {
    await captured(f);
    const headers = { From: 'Bob Stone <bob@acme.example>', To: 'seller@orbit.test', Date: new Date(Date.now() - 60000).toUTCString(), Subject: 'Other customer correspondence' };
    const originals = [
      { name: 'quoted.eml', text: eml({ ...headers, 'Message-ID': '<erasure-quoted@acme.example>' }, 'Following up.\n\nOn Monday, Ana Ruiz <ana@acme.example> wrote:\n> Private budget details from Ana.') },
      { name: 'reply-to.eml', text: eml({ ...headers, 'Message-ID': '<erasure-reply-to@acme.example>', 'Reply-To': 'Ana Ruiz <ANA@acme.example>' }, 'Please reply to the mailbox in Reply-To.') },
      { name: 'lookalikes.eml', text: eml({ ...headers, 'Message-ID': '<erasure-lookalikes@acme.example>' }, 'Keep joana@acme.example and ana@acme.example.invalid intact.') },
    ];
    assert.equal((await f.upload(originals)).status, 201);
    const rawEvidence = (await f.db.prepare("SELECT id,signal_id FROM capture_items WHERE headers LIKE '%erasure-quoted@%' OR headers LIKE '%erasure-reply-to@%'").all<{ id: string; signal_id: string }>()).results;
    assert.equal(rawEvidence.length, 2);
    const unrelated = await f.db.prepare("SELECT id,headers,body FROM capture_items WHERE headers LIKE '%erasure-lookalikes@%'").first<{ id: string; headers: string; body: string }>();
    assert.ok(unrelated);
    const mentions = async (db: D1Database) => {
      const rows = (await db.prepare("SELECT headers||body AS text FROM capture_items UNION ALL SELECT details_json||COALESCE(proposed_value,'')||record_id FROM capture_proposals UNION ALL SELECT payload_json FROM signals").all<{ text: string }>()).results;
      return rows.filter(row => /(?<![a-z0-9.!#$%&'*+/=?^_`{|}~@-])ana@acme\.example(?=$|[^a-z0-9_@.-]|\.(?![a-z0-9_@.-]))/i.test(row.text) || row.text.includes(f.ana)).length;
    };
    assert.ok(Number(await mentions(f.db)) > 0);
    // These immutable originals predate replay-proof metadata; upgrading must still protect them.
    await f.db.prepare("UPDATE signals SET payload_json=json_remove(payload_json,'$.data.capturePrivacyKeys') WHERE type LIKE 'meeting.%' OR id IN(SELECT signal_id FROM capture_items WHERE headers LIKE '%erasure-quoted@%')").run();
    const others = (await f.db.prepare("SELECT id FROM capture_items WHERE instr(lower(headers||body),'ana@acme.example')=0").all<{id:string}>()).results.map(row=>row.id);
    assert.ok(others.length > 0);
    const privacy=await captureErasureFixture(f);
    await exported(f); // Erasure must withdraw the already-materialized archive.
    assert.equal((await f.request(`/api/v1/records/contact/${f.ana}`, { method: 'DELETE', headers: json, body: JSON.stringify({ confirmed: true }) })).status, 200);
    await privacy.scan();
    assert.equal(await mentions(f.db), 0);
    for (const evidence of rawEvidence) {
      assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items WHERE id=?').bind(evidence.id).first('count(*)'), 0);
      assert.equal(await f.db.prepare('SELECT count(*) FROM signals WHERE id=?').bind(evidence.signal_id).first('count(*)'), 0);
      assert.equal(await f.db.prepare('SELECT count(*) FROM capture_proposals WHERE signal_id=?').bind(evidence.signal_id).first('count(*)'), 0);
    }
    assert.deepEqual(await f.db.prepare('SELECT id,headers,body FROM capture_items WHERE id=?').bind(unrelated.id).first(), unrelated, 'similar identities retain their whole original unchanged');
    assert.equal(Number(await f.db.prepare("SELECT count(*) n FROM capture_items WHERE id IN(SELECT value FROM json_each(?))").bind(JSON.stringify(others)).first('n')), others.length, 'other people\'s evidence stays');
    const audit = await f.db.prepare("SELECT entity_id,details_json FROM audit_entries WHERE action='capture.erased'").first<{ entity_id: string; details_json: string }>();
    assert.equal(audit!.entity_id, 'erased'); assert.ok(JSON.parse(audit!.details_json).capturedItems > 0);
    assert.deepEqual(JSON.parse(audit!.details_json),privacy.counts,'only the counts of erased originals and proposals remain');
    assert.ok(!audit!.details_json.includes('ana') && !audit!.details_json.includes(f.ana));
    assert.equal((await f.upload(originals,true)).status,201);
    const later=new Date(Date.now()+2000),stamp=later.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const revisedCalendar=fixtureMailbox(f).invite.replace('METHOD:REQUEST','METHOD:CANCEL').replace('STATUS:CONFIRMED','STATUS:CANCELLED').replace('SEQUENCE:0','SEQUENCE:1').replace(/^(CREATED|DTSTAMP):[^\r\n]+/gm,`$1:${stamp}`);
    const revisedMail=originals[0]!.text.replace(/^Date:[^\r\n]+/m,`Date: ${later.toUTCString()}`);
    assert.equal((await f.upload([{name:'cancelled.ics',text:revisedCalendar},{name:'revised.eml',text:revisedMail}],true)).status,201);
    assert.equal(await mentions(f.db),0,'raw-only identities and revised calendar phases cannot resurrect erased originals');
    assert.deepEqual(await f.db.prepare('SELECT id,headers,body FROM capture_items WHERE id=?').bind(unrelated.id).first(),unrelated);
    const archive = JSON.stringify(await exported(f, true));
    assert.ok(!archive.includes('Private budget details from Ana.'));
    assert.ok(!privacy.matches(archive) && !archive.includes('Can we talk on Tuesday?'), 'later exports carry none of it');
    await privacy.undo();
    assert.ok(!privacy.matches(JSON.stringify(await exported(f))), 'import undo cannot restore erased capture evidence');
  } finally { await f.dispose(); }
});

test('CAPTURE-007 DATA-002 erased provider originals stay erased after expired history, crashes and reconnect while new evidence remains eligible', async () => {
 const f=await capturePrivacyFixture();
 try {
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

test('CAPTURE-007 DATA-002 erasure fences an already-resolved capture commit and its later replay',async()=>{
 const f=await capturePrivacyFixture();let release:(()=>void)|undefined,inFlight:Promise<Response>|undefined;
 try{
  const original=eml({From:'Ana <ana@acme.example>',To:'seller@orbit.test',Date:new Date(Date.now()-60000).toUTCString(),Subject:'In-flight original','Message-ID':'<in-flight-erasure@acme.example>'},'Resolved before erasure, committed afterwards.');
  const paused=f.pauseCommit();release=paused.release;
  const uploading=inFlight=f.upload([{name:'raced.eml',text:original}]);await paused.ready;
  assert.equal((await f.request(`records/contact/${f.ana}`,{confirmed:true},'DELETE')).status,200);
  paused.release();release=undefined;assert.equal((await uploading).status,201);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_proposals').first('count(*)'),0);
  assert.equal((await f.upload([{name:'replayed.eml',text:original}],true)).status,201);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0);
  const created=await f.request('records/contact',{name:'New Ana',email:'ana@acme.example',company_id:f.company});assert.equal(created.status,201);const contact=await created.json() as {id:string};
  const fresh=original.replace(/^Date:[^\r\n]+/m,`Date: ${new Date(Date.now()+120000).toUTCString()}`).replace('in-flight-erasure@','in-flight-new@');
  const futurePause=f.pauseCommit();release=futurePause.release;inFlight=f.upload([{name:'new-raced.eml',text:fresh}]);await futurePause.ready;
  assert.equal((await f.request(`records/contact/${contact.id}`,{confirmed:true},'DELETE')).status,200);futurePause.release();release=undefined;
  assert.equal((await inFlight).status,409,'fresh evidence with stale contact resolution must stop before committing');
  assert.equal((await f.upload([{name:'new-retried.eml',text:fresh}])).status,201);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),1,'a fresh retry resolves the retained company and remains eligible');
 }finally{release?.();await inFlight?.catch(()=>undefined);await f.dispose();}
});

test('CAPTURE-007 DATA-002 both archive paths carry anonymous replay barriers and Records restore retains destination erasure history',async()=>{
 const f=await captureFixture(),target=await launchFixture(),local=await isolatedDatabase();
 try{
  const archiveCall=async(path:string,method:string,body:unknown)=>{const response=await target.request(path,method,body);assert.ok(response.ok,`${path}: ${response.status} ${response.ok?'':await response.text()}`);return response.json() as Promise<any>;};
  const original=fixtureMailbox(f).reply,historicalDate=new Date(Date.now()-60000).toUTCString();
  assert.equal((await f.upload([{name:'original.eml',text:original}])).status,201);
  assert.equal((await f.request(`/api/v1/records/contact/${f.ana}`,{method:'DELETE',headers:json,body:JSON.stringify({confirmed:true})})).status,200);
  const privateRows=()=>f.db.prepare("SELECT entity_id,details_json FROM audit_entries WHERE action IN('capture.erased_item','capture.erased_mailbox')").all<{entity_id:string;details_json:string}>();
  const proofs=(await privateRows()).results;assert.ok(proofs.length>=2);
  assert.ok(proofs.every(proof=>/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(proof.entity_id)&&proof.details_json==='{}'),'only anonymous keyed matching proofs remain');
  const localContact=(await target.records.save('contact',{name:'Erased destination person',email:'destination@acme.example'},target.actor)).id;
  assert.equal((await target.request(`records/contact/${localContact}`,'DELETE',{confirmed:true})).status,200);
  const retained=(await target.db.prepare("SELECT id FROM audit_entries WHERE action='capture.erased_mailbox'").all<{id:string}>()).results;assert.ok(retained.length);
  const archive=await exported(f);
  let imported=await archiveCall('records/archive/imports','POST',{confirmed:true,manifest:archive.manifest});
  for(const part of archive.parts)await archiveCall(`records/archive/imports/${imported.id}/parts/${part.index}`,'PUT',part);
  for(let step=0;step<700&&imported.state!=='complete';step++)imported=await archiveCall(`records/archive/imports/${imported.id}/finalize`,'POST',{});
  assert.equal(imported.state,'complete');
  for(const proof of retained)assert.ok(await target.db.prepare('SELECT 1 FROM audit_entries WHERE id=?').bind(proof.id).first(),'destination erasure remains in force');
  await uploadRestored(target.db,f.operator,original);
  assert.equal(await target.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0,'Records restore keeps erased mail gone');
  const destinationMail=eml({From:'destination@acme.example',To:'seller@orbit.test',Date:historicalDate,Subject:'Destination history','Message-ID':'<destination-history@acme.example>'},'Old destination evidence');
  await uploadRestored(target.db,f.operator,destinationMail);
  assert.equal(await target.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0,'retained destination matching contexts still work');
  await localArchiveRoundTrip(f.db,local.db);
  await uploadRestored(local.db,f.operator,original);
  assert.equal(await local.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0,'CLI portability restore keeps erased mail gone');
 }finally{await f.dispose();await target.dispose();await local.dispose();}
});
