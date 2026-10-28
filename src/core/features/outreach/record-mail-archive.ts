import type {ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';

import {recordMailArchiveTables} from '../../shared/archive-lineage';
export {recordMailArchiveTables};
const additions=new Set<string>([
 ...recordMailArchiveTables,'outbound_delivery_budget',
 'record_mail_outbound_due','record_mail_outbound_contact','record_mail_obligation_due',
 'record_mail_stop_contact','record_mail_setting_changed','record_mail_setting_created',
 'record_mail_signal_stop','record_mail_later_native_send','record_mail_notify_state',
 'record_mail_stop_deal','record_mail_contact_context','record_mail_company_context',
 'record_mail_evidence_context','record_mail_claim_identity','native_mail_claim_identity',
 'record_mail_draft_identity','native_mail_draft_identity','record_mail_promise_owner','record_mail_promise_owner_index','record_ai_contact_erased','record_ai_operator_changed'
]);
/** The exact catalog before 0056, including its changes to existing table metadata. */
export function preRecordMailCatalog(catalog:ArchiveTable[]):ArchiveTable[]{
 return catalog.filter(table=>!additions.has(table.name)).map(table=>{
  const {objects,schemaObjects}=table as FoldArchiveTable;
  return {...table,
   ...(objects?{objects:objects.filter(object=>!additions.has(object.name))}:{}),
   ...(schemaObjects?{schemaObjects:schemaObjects.filter(object=>!additions.has(object.name))}:{})
  };
 });
}
/** Run under the existing archive-import guard before releasing restored state. */
export function restoreRecordMailStatements(db:D1Database,at:string){
 return [
  db.prepare("UPDATE record_mail_obligations SET owner_id=operator_id,owner_recorded_at=opened_at WHERE owner_recorded_at IS NULL"),
  db.prepare("UPDATE record_mail_outbound_messages SET state='cancelled',failure='Archive restored; review and approve again before sending',updated_at=? WHERE state IN('draft','scheduled','queued')").bind(at),
  db.prepare("UPDATE record_mail_drafts SET is_stale=1,stale_reason='Archive restored; review before sending',updated_at=?").bind(at)
 ];
}
