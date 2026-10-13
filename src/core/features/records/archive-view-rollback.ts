import {nativeActorPredicate} from '../delegation/authority';
import {archiveSchemaFence} from './archive-schema-fence';
import {archiveStorageFence} from './archive-storage-budget';
import {archiveSchemaObjects,catalogSchemaObjects,type SchemaObjectTable} from './archive-schema-objects';
import {quoteIdentifier} from './archive-stage-layout';
import type {ArchiveTable} from './archive-schema';
import type {ImportJob} from './archive-import-progress';
import {RecordError} from './shared';

/** Restore only the locally captured target view preimage at explicit rollback. */
export async function prepareViewRollback(db:D1Database,job:ImportJob,catalog:ArchiveTable[],profile:{catalog_json:string;catalog_hash:string}){
 const expected=catalogSchemaObjects(catalog);if(!expected)throw new RecordError(409,'The target view preimage is unavailable.');
 const current=await archiveSchemaObjects(db),changed=JSON.stringify(current)!==JSON.stringify(expected),guard=crypto.randomUUID();
 // The current view inventory is fenced before changing it, while every base
 // table, index and table-trigger must still match the durable target preimage.
 const currentCatalog=catalog.map(table=>({...table,schemaObjects:undefined})) as SchemaObjectTable[];currentCatalog[0]!.schemaObjects=current;
 const before=[...archiveSchemaFence(db,currentCatalog),...await archiveStorageFence(db,job.id),
  db.prepare(`INSERT INTO access_write_guards VALUES(?,CASE WHEN ${nativeActorPredicate} AND EXISTS(SELECT 1 FROM archive_jobs j JOIN archive_job_profiles p ON p.job_id=j.id WHERE j.id=? AND j.kind='import' AND j.state='restoring' AND j.actor_id=? AND j.progress_json=? AND j.manifest_json=? AND p.generation='orbit-fold-1' AND p.catalog_hash=? AND p.catalog_json=?) AND EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import' AND value=?) THEN 1 ELSE 0 END)`).bind(guard,job.actor_id,job.id,job.actor_id,job.progress_json,job.manifest_json,profile.catalog_hash,profile.catalog_json,job.id),
  db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(guard)
 ];
 const statements=changed?[
  ...current.filter(object=>object.type==='trigger').map(object=>db.prepare(`DROP TRIGGER ${quoteIdentifier(object.name)}`)),
  ...current.filter(object=>object.type==='view').map(object=>db.prepare(`DROP VIEW ${quoteIdentifier(object.name)}`)),
  ...expected.filter(object=>object.type==='view').map(object=>db.prepare(object.sql)),
  ...expected.filter(object=>object.type==='trigger').map(object=>db.prepare(object.sql)),
 ]:[];
 // save() appends the original strict full schema fence in this same batch,
 // and every subsequent rollback step retains it. No archive-supplied DDL runs.
 return{before,statements};
}
