import assert from 'node:assert/strict';
import {captureErasureFixture} from './capture-erasure-fixture';
import {fixtureMailbox,eml,type CaptureFixture} from './capture-fixture';
import {json,exported} from './capture-data-archive';
export async function eraseCapturedOriginals(f:CaptureFixture){

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
    // Release this inspected snapshot so the caller can export the final erased workspace.
    assert.ok(!privacy.matches(JSON.stringify(await exported(f, true))), 'import undo cannot restore erased capture evidence');

}
