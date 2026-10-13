import {nativeAuthority,nativeMutation} from '../delegation/native-authority';
import {foldedImportContext} from './archive-import-context';
import type {ImportJob} from './archive-import-progress';

/** Only cleanup of durably terminal fold jobs may cross the former actor boundary. */
export async function recoverTerminalImports(db:D1Database,actor:string){
 const jobs=(await db.prepare("SELECT j.*,p.catalog_json AS recovery_catalog_json,p.catalog_hash AS recovery_catalog_hash FROM archive_jobs j JOIN archive_job_profiles p ON p.job_id=j.id JOIN archive_storage_reservations r ON r.job_id=j.id WHERE j.kind='import' AND j.state IN('complete','aborted') AND p.generation='orbit-fold-1' AND r.kind='import'").all<ImportJob&{recovery_catalog_json:string;recovery_catalog_hash:string}>()).results;
 if(!jobs.length)return;
 await nativeAuthority(db,actor);
 for(const job of jobs){
  // Every cleanup write checks both current native class and the exact durable
  // terminal job. No historical session, actor or capture grant is revived.
  const originals=new WeakMap<D1PreparedStatement,D1PreparedStatement>();
  const batch=async(statements:D1PreparedStatement[])=>{const guard=crypto.randomUUID(),results=await nativeMutation(db,actor,[
   db.prepare("INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM archive_jobs j JOIN archive_job_profiles p ON p.job_id=j.id WHERE j.id=? AND j.kind='import' AND j.state=? AND j.state IN('complete','aborted') AND j.progress_json=? AND j.manifest_json=? AND p.generation='orbit-fold-1' AND p.catalog_json=? AND p.catalog_hash=?) THEN 1 ELSE 0 END)").bind(guard,job.id,job.state,job.progress_json,job.manifest_json,job.recovery_catalog_json,job.recovery_catalog_hash),
   ...statements.map(statement=>originals.get(statement)??statement),db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(guard)
  ]);return results.slice(2,-2);};
  const statement=(prepared:D1PreparedStatement):D1PreparedStatement=>{const proxy=new Proxy(prepared,{get(target,key){if(key==='bind')return(...values:unknown[])=>statement(target.bind(...values));if(key==='run')return async()=>{const results=await batch([target]);return results[0];};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});originals.set(proxy,prepared);return proxy;};
  const guarded=new Proxy(db,{get(target,key){if(key==='batch')return batch;if(key==='prepare')return(sql:string)=>statement(target.prepare(sql));const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
  const context=await foldedImportContext(guarded,job);if(!context)throw Error('Terminal archive generation is unavailable');await context.cleanup(job);
 }
}
