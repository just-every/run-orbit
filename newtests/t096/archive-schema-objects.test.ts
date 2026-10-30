import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture} from './fixture';
import {foldInstalledCatalog,foldSchemaHash} from '../../src/core/features/records/archive-fold-catalog';
import {foldExportProfile} from '../../src/core/features/records/archive-fold-profile';
import {archiveSchemaFence} from '../../src/core/features/records/archive-schema-fence';
import {ArchiveImportRepository} from '../../src/core/features/records/archive-import';

test('complete view and INSTEAD OF trigger definitions bind the archive generation and its atomic write fence',async()=>{const f=await fixture();try{
 await f.db.prepare("CREATE TABLE owner_column_data(id INTEGER PRIMARY KEY,value TEXT NOT NULL DEFAULT 'kept',amount REAL DEFAULT 2.5)").run();
 const columns=await foldInstalledCatalog(f.db),owner=columns.find(table=>table.name==='owner_column_data')!;
 // Older catalogs may omit SQL objects; ordered column metadata still guards writes.
 delete (owner as {objects?:unknown}).objects;
 await f.db.batch([...archiveSchemaFence(f.db,columns),f.db.prepare('INSERT INTO owner_column_data(id) VALUES(1)')]);
 assert.deepEqual(await f.db.prepare('SELECT value,amount FROM owner_column_data').first(),{value:'kept',amount:2.5});
 await f.db.prepare('DELETE FROM owner_column_data').run();
 for(const drift of ['order','missing','extra','type','nullability','key','default'] as const){
  const changed=structuredClone(columns),table=changed.find(table=>table.name===owner.name)!;
  if(drift==='order')table.columns.reverse();
  else if(drift==='missing')table.columns.pop();
  else if(drift==='extra')table.columns.push({...table.columns[0]!,name:'absent_column'});
  else if(drift==='type')table.columns[2]!.type='INTEGER';
  else if(drift==='nullability')table.columns[1]!.notnull=0;
  else if(drift==='key')table.columns[0]!.pk=0;
  else table.columns[1]!.dflt_value=null;
  await assert.rejects(f.db.batch([...archiveSchemaFence(f.db,changed),f.db.prepare('INSERT INTO owner_column_data(id) VALUES(1)')]),drift);
  assert.equal(await f.db.prepare('SELECT count(*) n FROM owner_column_data').first('n'),0,drift);
 }
 await f.db.prepare('CREATE TABLE owner_view_data(id TEXT PRIMARY KEY,value TEXT)').run();
 await f.db.prepare('CREATE VIEW owner_visible AS SELECT id,value FROM owner_view_data').run();
 await f.db.prepare('CREATE TRIGGER owner_visible_update INSTEAD OF UPDATE ON owner_visible BEGIN UPDATE owner_view_data SET value=NEW.value WHERE id=OLD.id; END').run();
 for(const drift of ['trigger','view']){
  const catalog=await foldInstalledCatalog(f.db),hash=await foldSchemaHash(catalog),manifest=await foldExportProfile.manifest(f.db,catalog,new Date().toISOString());
  if(drift==='trigger'){await f.db.prepare('DROP TRIGGER owner_visible_update').run();await f.db.prepare('CREATE TRIGGER owner_visible_update INSTEAD OF UPDATE ON owner_visible BEGIN UPDATE owner_view_data SET value=upper(NEW.value) WHERE id=OLD.id; END').run();}
  else{await f.db.prepare('DROP VIEW owner_visible').run();await f.db.prepare('CREATE VIEW owner_visible AS SELECT id,value FROM owner_view_data WHERE value IS NOT NULL').run();}
  assert.notEqual(await foldSchemaHash(await foldInstalledCatalog(f.db)),hash);
  await assert.rejects(f.db.batch([...archiveSchemaFence(f.db,catalog),f.db.prepare("INSERT INTO owner_view_data VALUES('must-not-commit','blocked')")]));
  assert.equal(await f.db.prepare('SELECT count(*) n FROM owner_view_data').first('n'),0);
  await assert.rejects(new ArchiveImportRepository(f.db,true).create(manifest,f.operator.operatorId));
  assert.equal(await f.db.prepare('SELECT count(*) n FROM archive_jobs').first('n'),0);assert.equal(await f.db.prepare('SELECT count(*) n FROM archive_storage_reservations').first('n'),0);
 }
 }finally{await f.close();}});
