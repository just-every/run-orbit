import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createDependencies} from '../../src/core/app/dependencies';
import {RecordsRepository} from '../../src/core/features/records/repository';
import {beforeSeedBatch,contactSeedDatabase,contactSeedInput} from '../support/contact-seed-schema';

test('BASE-OPS-002 canonical previous-four ordinary contact seeds normalize arbitrary inputs, retain DNC and obey conflicts and foreign keys without schema changes',async()=>{
  const f=contactSeedDatabase(4);
  try {
    const deps=createDependencies(f.db),schema=f.sql.prepare('SELECT * FROM sqlite_schema ORDER BY name').all();
    await deps.records.ensureCompany({id:'company',name:'Company',primaryDomain:null,primaryDomainKey:null});
    for(const [index,email] of ['  Varied+Tag@CUSTOMER.TEST ','Mixed.Case@other.test',null].entries()) {
      const id=`legacy-${index}`;
      await deps.records.ensureContact({...contactSeedInput(id,email,'do_not_contact'),companyId:'company'});
      await deps.records.ensureContact(contactSeedInput(id,email));
      const row=f.sql.prepare('SELECT * FROM contacts WHERE id=?').get(id)!;
      assert.equal(row.email,email?.trim().toLowerCase()??null);
      assert.equal(row.email_key,email?.trim().toLowerCase()??null);
      assert.equal(row.contactability,'do_not_contact');
      assert.equal(row.company_id,'company');
    }
    await deps.records.ensureContact(contactSeedInput('duplicate','VARIED+TAG@CUSTOMER.TEST'));
    assert.equal(f.sql.prepare('SELECT id FROM contacts WHERE id=?').get('duplicate'),undefined);
    await deps.records.ensureContact(contactSeedInput('ordinary'));
    assert.equal(f.sql.prepare("SELECT contactability FROM contacts WHERE id='ordinary'").get()!.contactability,'contactable');
    await assert.rejects(()=>deps.records.ensureContact({...contactSeedInput('bad-fk'),companyId:'absent'}),/FOREIGN KEY/);
    assert.deepEqual(f.sql.prepare('PRAGMA foreign_key_check').all(),[]);
    assert.deepEqual(f.sql.prepare('SELECT * FROM sqlite_schema ORDER BY name').all(),schema);
    assert.equal(f.sql.prepare('SELECT count(*) n FROM audit_entries').get()!.n,0);
    await assert.rejects(()=>new RecordsRepository(f.db).save('contact',{name:'Interactive modern CRUD',email:'modern@customer.test'},'actor'));
  } finally { f.close(); }
});

test('BASE-OPS-002 contact seeding rejects every unsupported prefix and damaged previous schema, including null mailboxes',async()=>{
  for(const prefix of [0,1,2,3,5,6,7,8,9,10,11,12,13]) {
    const f=contactSeedDatabase(prefix);
    try {
      for(const email of ['prefix@customer.test',null]) await assert.rejects(()=>createDependencies(f.db).records.ensureContact(contactSeedInput('unsupported',email)),/Unsupported contact seed schema/);
      if(prefix) assert.equal(f.sql.prepare('SELECT count(*) n FROM contacts').get()!.n,0);
    } finally { f.close(); }
  }
  const f=contactSeedDatabase(4);
  try {
    f.sql.exec('DROP TRIGGER bootstrap_fresh_workspace');
    await assert.rejects(()=>createDependencies(f.db).records.ensureContact(contactSeedInput('damaged')),/Unsupported contact seed schema/);
    assert.equal(f.sql.prepare('SELECT count(*) n FROM contacts').get()!.n,0);
  } finally { f.close(); }
});

test('BASE-OPS-002 previous-four generation is neither cached across migration nor accepted by a stale atomic writer',async()=>{
  const f=contactSeedDatabase(4);
  try {
    const service=createDependencies(f.db).records;
    await service.ensureContact(contactSeedInput('before'));
    const raced=createDependencies(beforeSeedBatch(f.db,async()=>{f.migrate(4);})).records;
    await assert.rejects(()=>raced.ensureContact(contactSeedInput('stale')),/malformed JSON/);
    assert.equal(f.sql.prepare("SELECT id FROM contacts WHERE id='stale'").get(),undefined);
    await service.ensureContact(contactSeedInput('after',undefined,'do_not_contact'));
    assert.equal(f.sql.prepare("SELECT count(*) n FROM audit_entries WHERE action='contact.suppressed'").get()!.n,1);
    assert.equal(f.sql.prepare('SELECT count(*) n FROM privacy_matching_contexts').get()!.n,1);
  } finally { f.close(); }
});

test('RECORD-012 missing or corrupt modern seed prerequisites fail closed for keyed and null mailboxes',async()=>{
  const corruptions=[
    'DROP TABLE privacy_matching_contexts',
    'DROP TABLE runtime_controls',
    'ALTER TABLE runtime_controls RENAME TO broken_controls; CREATE TABLE runtime_controls(name TEXT PRIMARY KEY,value TEXT)',
    'DROP TRIGGER archive_guard_contacts_insert',
    'DROP TRIGGER archive_guard_audit_entries_insert',
    'DROP TRIGGER archive_guard_privacy_matching_contexts_insert',
    'DROP TRIGGER archive_guard_contacts_insert; CREATE TRIGGER archive_guard_contacts_insert BEFORE INSERT ON contacts BEGIN SELECT 1; END',
    "PRAGMA ignore_check_constraints=ON; INSERT INTO privacy_matching_contexts VALUES('invalid','invalid')"
  ];
  for(const corruption of corruptions) {
    const f=contactSeedDatabase(15);
    try {
      f.sql.exec(corruption);
      for(const email of ['modern@customer.test',null]) await assert.rejects(()=>createDependencies(f.db).records.ensureContact(contactSeedInput('invalid',email)));
      assert.equal(f.sql.prepare('SELECT count(*) n FROM contacts').get()!.n,0);
      assert.equal(f.sql.prepare("SELECT count(*) n FROM audit_entries WHERE action='contact.suppressed'").get()!.n,0);
    } finally { f.close(); }
  }
});
