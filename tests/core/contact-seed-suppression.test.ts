import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createDependencies} from '../../src/core/app/dependencies';
import {suppressionHashes,suppressionPredicate,suppressionProof} from '../../src/core/features/records/suppression';
import {launchFixture} from '../support/launch-fixture';
import {TestDataRepository} from '../support/record-data';
import {beforeSeedBatch,contactSeedInput} from '../support/contact-seed-schema';

test('RECORD-012 DATA-002 modern ordinary seeds retain keyed DNC across erasure, normalized recreation, conflicts and null mailboxes',async()=>{
  const f=await launchFixture();
  try {
    const service=createDependencies(f.db).records;
    await service.ensureContact(contactSeedInput('stopped',' Seed+Case@CUSTOMER.TEST ','do_not_contact'));
    const proofs=(await f.db.prepare("SELECT * FROM audit_entries WHERE action='contact.suppressed'").all()).results;
    assert.equal(proofs.length,1);
    assert.match(String(proofs[0].entity_id),/^[a-f0-9]{32}:[a-f0-9]{64}$/);
    assert.equal(proofs[0].actor_id,null);assert.equal(proofs[0].details_json,'{}');
    const contexts=(await f.db.prepare('SELECT * FROM privacy_matching_contexts').all()).results;
    assert.equal(contexts.length,1);
    await service.ensureContact(contactSeedInput('stopped','seed+case@customer.test'));
    await service.ensureContact(contactSeedInput('conflicting','SEED+CASE@CUSTOMER.TEST'));
    assert.equal((await f.records.detail('contact','stopped')).record.contactability,'do_not_contact');
    assert.equal(await f.db.prepare("SELECT id FROM contacts WHERE id='conflicting'").first(),null);
    assert.deepEqual((await f.db.prepare("SELECT * FROM audit_entries WHERE action='contact.suppressed'").all()).results,proofs);
    await new TestDataRepository(f.db).remove('contact','stopped',f.actor);
    const archive=await new TestDataRepository(f.db).export();
    assert.ok(!JSON.stringify(archive).includes('seed+case@customer.test'));
    await service.ensureContact(contactSeedInput('recreated',' SEED+CASE@CUSTOMER.TEST '));
    assert.equal((await f.records.detail('contact','recreated')).record.contactability,'do_not_contact');
    assert.deepEqual((await f.db.prepare('SELECT * FROM privacy_matching_contexts').all()).results,contexts);
    for(const state of ['contactable','do_not_contact'] as const) {
      await service.ensureContact(contactSeedInput(`null-${state}`,null,state));
      assert.equal((await f.records.detail('contact',`null-${state}`)).record.contactability,state);
    }
    await service.ensureContact(contactSeedInput('normal'));
    assert.equal((await f.records.detail('contact','normal')).record.contactability,'contactable');
    assert.equal((await f.db.prepare("SELECT count(*) n FROM audit_entries WHERE action='contact.suppressed'").first())!.n,1);
    assert.deepEqual((await f.db.prepare('PRAGMA foreign_key_check').all()).results,[]);
  } finally { await f.dispose(); }
});

test('RECORD-012 modern seed resolves proof state in its atomic write and aborts when a new matching context arrives after hashing',async()=>{
  const f=await launchFixture();
  try {
    const email='racing@customer.test',tokens=await suppressionHashes(f.db,email);
    const stopped=beforeSeedBatch(f.db,async()=>{await f.db.batch(tokens.map(token=>suppressionProof(f.db,token)));});
    await createDependencies(stopped).records.ensureContact(contactSeedInput('atomic-stop',email));
    assert.equal((await f.records.detail('contact','atomic-stop')).record.contactability,'do_not_contact');
    await f.db.prepare("CREATE TRIGGER ignore_control_sentinel BEFORE INSERT ON runtime_controls WHEN NEW.name='suppression_context_check' BEGIN SELECT RAISE(IGNORE); END").run();
    for(const state of ['contactable','do_not_contact'] as const) {
      const id=`late-context-${state}`,address=`${id}@customer.test`;
      const db=beforeSeedBatch(f.db,async()=>{
        await f.db.prepare('INSERT INTO privacy_matching_contexts VALUES(lower(hex(randomblob(16))),lower(hex(randomblob(32))))').run();
        await f.db.batch((await suppressionHashes(f.db,address)).map(token=>suppressionProof(f.db,token)));
      });
      let proofsBefore=0;
      // The intercepted writer must not commit either its contact or any extra proof.
      const checked=beforeSeedBatch(db,async()=>{proofsBefore=Number((await f.db.prepare("SELECT count(*) n FROM audit_entries WHERE action='contact.suppressed'").first())!.n);});
      await assert.rejects(()=>createDependencies(checked).records.ensureContact(contactSeedInput(id,address,state)),/malformed JSON/);
      assert.equal(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(id).first(),null);
      const matching=await suppressionHashes(f.db,address);
      assert.equal(Number((await f.db.prepare("SELECT count(*) n FROM audit_entries WHERE action='contact.suppressed'").first())!.n),proofsBefore+matching.length);
      await createDependencies(f.db).records.ensureContact(contactSeedInput(id,address));
      assert.equal((await f.records.detail('contact',id)).record.contactability,'do_not_contact');
    }
    assert.ok(await f.db.prepare(`SELECT 1 WHERE ${suppressionPredicate(tokens)}`).first());
  } finally { await f.dispose(); }
});

test('RECORD-012 modern seed archive guards and persistence errors propagate without partial contact or proof writes',async()=>{
  const f=await launchFixture();
  try {
    const service=createDependencies(f.db).records;
    await service.ensureContact(contactSeedInput('initialized'));
    await f.db.prepare("INSERT INTO runtime_controls VALUES('archive_import','seed-test')").run();
    await assert.rejects(()=>service.ensureContact(contactSeedInput('archive-blocked',undefined,'do_not_contact')),/Archive restoration is in progress/);
    assert.equal(await f.db.prepare("SELECT id FROM contacts WHERE id='archive-blocked'").first(),null);
    assert.equal((await f.db.prepare("SELECT count(*) n FROM audit_entries WHERE action='contact.suppressed'").first())!.n,0);
    await f.db.prepare("DELETE FROM runtime_controls WHERE name='archive_import'").run();
    await f.db.prepare("CREATE TRIGGER seed_storage_failure BEFORE INSERT ON contacts BEGIN SELECT RAISE(ABORT,'Seed storage failure'); END").run();
    await assert.rejects(()=>service.ensureContact(contactSeedInput('storage-blocked',undefined,'do_not_contact')),/Seed storage failure/);
    assert.equal(await f.db.prepare("SELECT id FROM contacts WHERE id='storage-blocked'").first(),null);
    assert.equal((await f.db.prepare("SELECT count(*) n FROM audit_entries WHERE action='contact.suppressed'").first())!.n,0);
  } finally { await f.dispose(); }
});
