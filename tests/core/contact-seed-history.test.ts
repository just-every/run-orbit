import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {test} from 'node:test';
import {createDependencies} from '../../src/core/app/dependencies';
import {beforeSeedBatch, contactSeedDatabase, contactSeedInput} from '../support/contact-seed-schema';

const migrations = readdirSync('migrations/core').filter(file => file.endsWith('.sql')).sort();
const ledgerDDL = 'CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)';
type Fixture = ReturnType<typeof contactSeedDatabase>;
function ledger(f: Fixture, count: number) {
  f.sql.exec(ledgerDDL);
  for (const name of migrations.slice(0, count)) f.sql.prepare('INSERT INTO d1_migrations(name) VALUES(?)').run(name);
}
const domainSchema = `SELECT type,name,sql FROM sqlite_schema WHERE sql IS NOT NULL
  AND substr(name,1,7)<>'sqlite_' AND tbl_name<>'d1_migrations' ORDER BY type,name`;
function restoreFour(f: Fixture, original: Array<Record<string, any>>) {
  const current = f.sql.prepare(domainSchema).all();
  f.sql.exec('PRAGMA foreign_keys=OFF');
  try {
    for (const row of current.filter(row => row.type !== 'table')) f.sql.exec(`DROP ${row.type} "${row.name}"`);
    // Dropping an FTS virtual table also drops its shadow tables.
    for (const row of current.filter(row => row.type === 'table')) f.sql.exec(`DROP TABLE IF EXISTS "${row.name}"`);
    for (const row of [...original.filter(row => row.type === 'table'), ...original.filter(row => row.type !== 'table')]) f.sql.exec(row.sql);
  } finally { f.sql.exec('PRAGMA foreign_keys=ON'); }
  assert.deepEqual(f.sql.prepare(domainSchema).all(), original);
}
function prependWrite(db: D1Database): D1Database {
  return new Proxy(db, {get(target, key) {
    if (key === 'batch') return (statements: D1PreparedStatement[]) => target.batch([
      target.prepare("INSERT INTO companies(id,name,created_at,updated_at) VALUES('preceding','Atomic predecessor','now','now')"),
      ...statements
    ]);
    const value = (target as any)[key];
    return typeof value === 'function' ? value.bind(target) : value;
  }});
}

test('BASE-OPS-002 previous-four seed requires physical recognition with absent, empty or consistent canonical history and preserves every ledger byte', async () => {
  for (const count of [null, 0, 4]) {
    const f = contactSeedDatabase(4);
    try {
      if (count !== null) ledger(f, count);
      const schema = f.sql.prepare('SELECT * FROM sqlite_schema ORDER BY name').all();
      const before = count === null ? null : f.sql.prepare('SELECT * FROM d1_migrations').all();
      const service = createDependencies(f.db).records;
      for (const [id, email] of [['mailbox', ' Distinct+Ledger@CUSTOMER.TEST '], ['unkeyed', null]]) {
        await service.ensureContact(contactSeedInput(id!, email, 'do_not_contact'));
        await service.ensureContact(contactSeedInput(id!, email));
      }
      assert.deepEqual(f.sql.prepare('SELECT id,email,contactability FROM contacts ORDER BY id').all().map(row => ({...row})), [
        {id: 'mailbox', email: 'distinct+ledger@customer.test', contactability: 'do_not_contact'},
        {id: 'unkeyed', email: null, contactability: 'do_not_contact'}
      ]);
      assert.equal(f.sql.prepare('SELECT count(*) n FROM audit_entries').get()!.n, 0);
      assert.deepEqual(f.sql.prepare('SELECT * FROM sqlite_schema ORDER BY name').all(), schema);
      if (before) assert.deepEqual(f.sql.prepare('SELECT * FROM d1_migrations').all(), before);
      assert.deepEqual(f.sql.prepare('PRAGMA foreign_key_check').all(), []);
    } finally { f.close(); }
  }
});

test('RECORD-012 physical previous-four DDL cannot override newer, partial, unknown, contradictory or unreadable available history', async () => {
  const corruptions = [
    (f: Fixture) => ledger(f, 15),
    (f: Fixture) => ledger(f, 3),
    (f: Fixture) => { ledger(f, 4); f.sql.exec("UPDATE d1_migrations SET name='0004_other_schema.sql' WHERE id=4"); },
    (f: Fixture) => { ledger(f, 4); f.sql.exec("INSERT INTO d1_migrations(name) VALUES('9999_unrecognized.sql')"); },
    (f: Fixture) => { ledger(f, 4); f.sql.exec('UPDATE d1_migrations SET id=20 WHERE id=4'); },
    (f: Fixture) => f.sql.exec('CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY, wrong_name TEXT)'),
    (f: Fixture) => f.sql.exec('CREATE VIEW d1_migrations AS SELECT * FROM unavailable_history'),
    (f: Fixture) => { ledger(f, 4); f.sql.exec("UPDATE d1_migrations SET applied_at='' WHERE id=2"); }
  ];
  for (const corrupt of corruptions) {
    const f = contactSeedDatabase(4);
    try {
      corrupt(f);
      const schema = f.sql.prepare('SELECT * FROM sqlite_schema ORDER BY name').all();
      for (const email of ['history@customer.test', null]) {
        await assert.rejects(() => createDependencies(f.db).records.ensureContact(contactSeedInput('rejected', email, 'do_not_contact')));
      }
      assert.equal(f.sql.prepare('SELECT count(*) n FROM contacts').get()!.n, 0);
      assert.equal(f.sql.prepare('SELECT count(*) n FROM audit_entries').get()!.n, 0);
      assert.deepEqual(f.sql.prepare('SELECT * FROM sqlite_schema ORDER BY name').all(), schema);
    } finally { f.close(); }
  }
});

test('BASE-OPS-002 canonical migration names alone cannot authorize damaged or unsupported physical schemas', async () => {
  for (const prefix of [3, 4, 5, 13]) {
    const f = contactSeedDatabase(prefix);
    try {
      ledger(f, 4);
      if (prefix === 4) f.sql.exec('DROP INDEX contacts_company_id_idx');
      await assert.rejects(() => createDependencies(f.db).records.ensureContact(contactSeedInput('names-only', null)), /Unsupported contact seed schema/);
      assert.equal(f.sql.prepare('SELECT count(*) n FROM contacts').get()!.n, 0);
    } finally { f.close(); }
  }
});

test('BASE-OPS-002 ledger changes invalidate an old atomic seed batch and roll back preceding writes with identical domain DDL', async () => {
  for (const initial of [null, 0, 4]) {
    const f = contactSeedDatabase(4);
    try {
      if (initial !== null) ledger(f, initial);
      const schema = f.sql.prepare(domainSchema).all();
      const db = beforeSeedBatch(prependWrite(f.db), async () => {
        if (initial === null) ledger(f, 0);
        else f.sql.prepare('INSERT INTO d1_migrations(name) VALUES(?)').run(migrations[initial]);
      });
      await assert.rejects(() => createDependencies(db).records.ensureContact(contactSeedInput('stale-ledger', undefined, 'do_not_contact')), /malformed JSON/);
      assert.equal(f.sql.prepare('SELECT count(*) n FROM contacts').get()!.n, 0);
      assert.equal(f.sql.prepare('SELECT count(*) n FROM companies').get()!.n, 0);
      assert.deepEqual(f.sql.prepare(domainSchema).all(), schema);
    } finally { f.close(); }
  }
});

test('RECORD-012 applied migration advancement followed by exact old DDL restoration rejects the prepared seed and its earlier batch writes', async () => {
  const f = contactSeedDatabase(4);
  try {
    ledger(f, 4);
    const schema = f.sql.prepare(domainSchema).all();
    const db = beforeSeedBatch(prependWrite(f.db), async () => {
      f.migrate(4);
      for (const name of migrations.slice(4)) f.sql.prepare('INSERT INTO d1_migrations(name) VALUES(?)').run(name);
      restoreFour(f, schema);
    });
    await assert.rejects(() => createDependencies(db).records.ensureContact(contactSeedInput('restored-race', null, 'do_not_contact')), /malformed JSON/);
    assert.equal(f.sql.prepare('SELECT count(*) n FROM companies').get()!.n, 0);
    assert.equal(f.sql.prepare('SELECT count(*) n FROM contacts').get()!.n, 0);
    assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_migrations').get()!.n, migrations.length);
  } finally { f.close(); }
});

test('RECORD-012 a long-lived seed service rereads history after successful old writes and uses keyed suppression after a real schema upgrade', async () => {
  const f = contactSeedDatabase(4);
  try {
    ledger(f, 4);
    const service = createDependencies(f.db).records;
    await service.ensureContact(contactSeedInput('old'));
    f.sql.prepare('INSERT INTO d1_migrations(name) VALUES(?)').run(migrations[4]);
    await assert.rejects(() => service.ensureContact(contactSeedInput('contradiction')), /migration history/);
    f.migrate(4);
    for (const name of migrations.slice(5)) f.sql.prepare('INSERT INTO d1_migrations(name) VALUES(?)').run(name);
    await service.ensureContact(contactSeedInput('modern', undefined, 'do_not_contact'));
    const proofs = f.sql.prepare("SELECT entity_id,actor_id,details_json FROM audit_entries WHERE action='contact.suppressed'").all();
    assert.equal(proofs.length, 1);
    assert.match(String(proofs[0].entity_id), /^[a-f0-9]{32}:[a-f0-9]{64}$/);
    assert.equal(proofs[0].actor_id, null);
    assert.equal(proofs[0].details_json, '{}');
    assert.equal(f.sql.prepare("SELECT count(*) n FROM contacts WHERE id='contradiction'").get()!.n, 0);
  } finally { f.close(); }
});
