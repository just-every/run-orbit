import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture} from './fixture';
import {foldInstalledCatalog,foldSchemaHash} from '../../src/core/features/records/archive-fold-catalog';
import {foldExportProfile} from '../../src/core/features/records/archive-fold-profile';
import {archiveSchemaFence} from '../../src/core/features/records/archive-schema-fence';
import {ArchiveImportRepository} from '../../src/core/features/records/archive-import';

test('complete view and INSTEAD OF trigger definitions bind the archive generation and its atomic write fence',async()=>{const f=await fixture();try{
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
