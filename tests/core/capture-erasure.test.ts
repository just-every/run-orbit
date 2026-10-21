import assert from 'node:assert/strict';
import {test} from 'node:test';
import {captureErasureFixture} from '../support/capture-erasure-fixture';
import {captureFixture,fixtureMailbox,eml} from '../support/capture-fixture';
import {capturePrivacyFixture} from '../support/capture-privacy-fixture';
import {json,exported,captured} from '../support/capture-data-archive';

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
