import {legacyOwnershipSignature} from './legacy-schema';
import {RecordError} from '../records/shared';
/** Recognize only Orbit's withdrawn native-0042 signature, or its later sidecar.
 * No ALTER/DROP and no native write: owner-authored columns retain their bytes.
 * Existing timeline and legacy batch history stay where they were recorded. */
export async function reconcileLegacyOwnership(db:D1Database){
 if(await db.prepare("SELECT 1 FROM ownership_reconciliations WHERE source='legacy-0042'").first())return;
 const names=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN('record_owner_reviews','record_owner_batches','record_owner_batch_items','record_owners')").all<{name:string}>()).results.map(row=>row.name);
 const tables=['contacts','companies'] as const,columns=await Promise.all(tables.map(table=>db.prepare(`PRAGMA table_info(${table})`).all<{name:string;type:string}>()));
 const recognized=names.includes('record_owner_reviews')&&names.includes('record_owner_batches')&&names.includes('record_owner_batch_items');
 const signature=await legacyOwnershipSignature(db);
 const native=recognized&&signature.native&&columns.every(result=>result.results.some(c=>c.name==='owner_id'&&c.type==='TEXT')&&result.results.some(c=>c.name==='owner_revision'&&c.type==='INTEGER'));
 const sidecar=recognized&&signature.sidecar&&names.includes('record_owners')&&(await db.prepare('PRAGMA table_info(record_owners)').all<{name:string}>()).results.map(c=>c.name).join(',')==='record_type,record_id,owner_id,owner_revision';
 const now=new Date().toISOString(),statements:D1PreparedStatement[]=[];
 // A second concurrent reconciliation observes the receipt inside the transaction.
 const unseen="NOT EXISTS(SELECT 1 FROM ownership_reconciliations WHERE source='legacy-0042')";
 for(const [index,table]of tables.entries()){
  const kind=index?'company':'contact';
  if(sidecar)statements.push(db.prepare(`INSERT OR IGNORE INTO record_ownership SELECT ?,r.record_id,r.owner_id,MAX(1,r.owner_revision),? FROM record_owners r JOIN ${table} n ON n.id=r.record_id WHERE r.record_type=? AND ${unseen}`).bind(kind,now,kind));
  else if(native)statements.push(db.prepare(`INSERT OR IGNORE INTO record_ownership SELECT ?,id,owner_id,MAX(1,owner_revision),? FROM ${table} WHERE ${unseen}`).bind(kind,now));
 }

 statements.push(db.prepare(`INSERT INTO ownership_reconciliations SELECT 'legacy-0042',? WHERE ${unseen}`).bind(now));
 // An archive transfer is not authority to reconcile or resume previous reviews.
 if(await db.prepare("SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')").first())throw new RecordError(409,'Finish the archive restore before reviewing ownership.');
 await db.batch([db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'ownership_reconcile',CASE WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) THEN 'valid' ELSE NULL END`),...statements,db.prepare("DELETE FROM runtime_controls WHERE name='ownership_reconcile'")]);
}
