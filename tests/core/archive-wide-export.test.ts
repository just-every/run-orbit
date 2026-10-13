import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {ArchiveExportRepository} from '../../src/core/features/records/archive-export';
import {ARCHIVE_PART_BYTES, ARCHIVE_PART_ROWS, type ArchiveManifest, type ArchivePart} from '../../src/core/features/records/archive-schema';

type Row = Record<string, string | number | null>;
type Size = {position: number; bytes: number};
type OwnerTable = {name: string; columns: string[]; rows: Row[]; sizes: Size[]};

async function ownerTable(db: D1Database, width: number): Promise<OwnerTable> {
 const name = `owner_width_${width}`, columns = Array.from({length: width}, (_, i) => `field_${i}`);
 const types = ['INTEGER', 'TEXT', 'TEXT', 'TEXT', 'REAL', 'INTEGER', 'TEXT'];
 await db.prepare(`CREATE TABLE ${name}(${columns.map((column, i) => `${column} ${width === 1 ? 'TEXT' : types[i % 7]}`).join(',')})`).run();
 const rows: Row[] = [];
 if (width === 1) {
  // A real row-count split independently exercises the unchanged 1000-row cap.
  for (let i = 0; i < 1001; i++) rows.push({field_0: [null, '', '雪🙂é', `row${i}`][i % 4]!});
  await db.prepare(`WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM n WHERE i<1000)
   INSERT INTO ${name} SELECT CASE i%4 WHEN 0 THEN NULL WHEN 1 THEN '' WHEN 2 THEN '雪🙂é' ELSE 'row'||i END FROM n`).run();
 } else {
  // Spread payload across the row: sizing must include every column, with enough
  // real UTF-8 bytes to split five rows naturally into groups of three and two.
  for (let i = 0; i < 5; i++) {
   const row: Row = {};
   for (let c = 0; c < width; c++) row[columns[c]!] = [i * 100 + c, null, '', `第${i}-${c} café🙂`, i + c + 0.125,
    (i % 2 ? -1 : 1) * (Number.MAX_SAFE_INTEGER - c), `${i}:${c}:` + '🙂é'.repeat(2000)][c % 7]!;
   rows.push(row);
   await db.prepare(`INSERT INTO ${name} VALUES(${columns.map(() => '?').join(',')})`).bind(...Object.values(row)).run();
  }
 }
 assert.deepEqual((await db.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all<Row>()).results, rows);
 // Independent numeric oracle: D1 returns each cell's byte length separately;
 // JavaScript adds them. No wide SQL sum or JSON-size approximation is reused.
 const lengths = (await db.prepare(`SELECT ${columns.map(c => `length(CAST(${c} AS BLOB)) AS ${c}`).join(',')} FROM ${name} ORDER BY rowid`).all<Record<string, number | null>>()).results;
 const sizes = lengths.map((row, i) => ({position: i + 1, bytes: Object.values(row).reduce<number>((n, value) => n + (value ?? 0), 0)}));
 return {name, columns, rows, sizes};
}

function observeSizes(db: D1Database, tables: OwnerTable[]) {
 const calls: {table: OwnerTable; sql: string; cursor: number; limit: number; sizes: Size[]}[] = [];
 return {calls, db: {prepare(sql: string) {
  const table = tables.find(t => sql.startsWith('SELECT rowid AS position,') && sql.includes(`_${t.name} WHERE rowid>?`));
  const real = db.prepare(sql);
  if (!table) return real;
  return {bind(cursor: number, limit: number) {
   const bound = real.bind(cursor, limit);
   return {async all() {
    const result = await bound.all<Size>();
    calls.push({table, sql, cursor, limit, sizes: result.results});
    return result;
   }};
  }} as D1PreparedStatement;
 }, batch: db.batch.bind(db)} as D1Database};
}

test('DATA-001 real D1 exports 1, 99 and 100 columns with exact typed bytes, bounded row groups and complete checksummed streams', async t => {
 const fixture = await isolatedDatabase();
 try {
  await fixture.db.prepare("INSERT INTO operators(id,email,display_name,status,setup_owner,created_at,updated_at) VALUES('wide_actor','wide@example.test','Wide owner','active',1,'2026-10-09','2026-10-09')").run();
  const tables: OwnerTable[] = [];
  for (const width of [1, 99, 100]) tables.push(await ownerTable(fixture.db, width));
  const observed = observeSizes(fixture.db, tables), exporter = new ArchiveExportRepository(observed.db);
  let status = await exporter.create('wide_actor');
  assert.equal(status.state, 'preparing');
  assert.equal((await fixture.db.prepare('SELECT state FROM archive_jobs WHERE id=?').bind(status.id).first<{state: string}>())!.state, 'snapshotting');
  // Snapshot values and row sizing must survive a subsequent live mutation.
  for (const table of tables) await fixture.db.prepare(`DELETE FROM ${table.name} WHERE rowid=1`).run();
  for (let step = 0; step < 100 && status.state !== 'ready'; step++) status = await exporter.advance(status.id, 'wide_actor');
  assert.equal(status.state, 'ready');
  const response = await exporter.download(status.id, 'wide_actor');
  assert.equal(response.headers.get('Content-Type'), 'application/json; charset=utf-8');
  const document = JSON.parse(await response.text()) as {format: string; version: number; manifest: ArchiveManifest; parts: ArchivePart[]};
  assert.equal(response.bodyUsed, true);
  assert.equal(document.format, 'orbit-export');
  assert.equal(document.version, 2);
  assert.equal(document.manifest.parts, document.parts.length);
  assert.equal(document.manifest.rows, document.parts.reduce((n, part) => n + part.records.length, 0));
  for (const [index, part] of document.parts.entries()) {
   assert.equal(part.index, index);
   assert.equal(part.sha256, createHash('sha256').update(JSON.stringify(part.records)).digest('hex'));
   assert.ok(part.records.length > 0 && part.records.length <= ARCHIVE_PART_ROWS);
   assert.ok(Buffer.byteLength(JSON.stringify(part)) <= ARCHIVE_PART_BYTES);
  }
  for (const table of tables) {
   assert.deepEqual(document.manifest.tables.find(t => t.name === table.name), {name: table.name, columns: table.columns, rows: table.rows.length});
   const parts = document.parts.filter(part => part.records.some(record => record.table === table.name));
   assert.deepEqual(parts.map(part => part.records.length), table.columns.length === 1 ? [1000, 1] : [3, 2]);
   assert.deepEqual(parts.flatMap(part => part.records), table.rows.map((row, index) => ({table: table.name, index, row})));
   for (const record of parts.flatMap(part => part.records)) assert.deepEqual(Object.keys(record.row), table.columns);
   for (const part of parts) {
    const bytes = part.records.reduce((n, record) => n + table.sizes[record.index]!.bytes + table.name.length + 100, 0);
    assert.ok(bytes <= 524288, 'Natural byte groups stay bounded');
   }
   const calls = observed.calls.filter(call => call.table === table);
   assert.equal(calls.length, parts.length);
   for (const call of calls) {
    assert.equal(call.limit, ARCHIVE_PART_ROWS);
    assert.deepEqual(call.sizes, table.sizes.slice(call.cursor, call.cursor + ARCHIVE_PART_ROWS));
    assert.ok(call.sizes.every(row => typeof row.bytes === 'number' && Number.isSafeInteger(row.bytes)));
    // New snapshots use positional aliases; the manifest and emitted records
    // still retain every original owner column name and byte checked above.
    assert.deepEqual([...call.sql.matchAll(/COALESCE\(length\(CAST\((c_\d+) AS BLOB\)\),0\)/g)].map(match => match[1]), table.columns.map((_,index)=>`c_${index}`));
   }
   t.diagnostic(`${table.columns.length} columns: ${table.rows.length} exact rows, groups ${parts.map(part => part.records.length).join('+')}, numeric D1 byte totals and SHA-256 verified`);
  }
 } finally {await fixture.dispose();}
});
