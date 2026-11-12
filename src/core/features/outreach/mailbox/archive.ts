import type {ArchivePart,ArchiveTable} from '../../records/archive-schema';
import type {FoldArchiveTable} from '../../records/archive-fold-catalog';
const additions=['mailbox_source_id','mailbox_connection_id','mailbox_address','mailbox_provider','provider_thread_id','mailbox_submission_claimed'];
/** Reconstruct the exact preceding native schema without hiding owner additions. */
export function preMailboxCatalog(catalog:ArchiveTable[]):ArchiveTable[]{
 return catalog.map(table=>{
  const {objects,schemaObjects}=table as FoldArchiveTable,history=['outbound_messages','record_mail_outbound_messages'].includes(table.name);
  return {...table,...(schemaObjects?{schemaObjects:schemaObjects.filter(object=>object.name!=='outbound_installation_delivery_budget')}:{}),...(history?{columns:table.columns.filter(column=>!additions.includes(column.name)),...(objects?{objects:objects.map(object=>object.type==='table'&&object.sql?{...object,sql:object.sql.replace(/, mailbox_(?:source_id|connection_id|address|provider) TEXT/gi,'').replace(/, provider_thread_id TEXT/gi,'').replace(/, mailbox_submission_claimed INTEGER NOT NULL DEFAULT 0/gi,'')}:object)}:{})}:{})};
 });
}
/** Apply migration defaults only after the original archive row passes validation. */
export function upgradeMailboxArchiveRecord(record:ArchivePart['records'][number]){
 if(!['outbound_messages','record_mail_outbound_messages'].includes(record.table))return record;
 return {...record,row:{mailbox_source_id:null,mailbox_connection_id:null,mailbox_address:null,mailbox_provider:null,provider_thread_id:null,mailbox_submission_claimed:0,...record.row}};
}
