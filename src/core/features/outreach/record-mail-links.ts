import {isRecordMailDatabase} from './record-mail-storage';
/** Reuse the same activity id across records, without copying its saved content. */
export function draftRecordLinks(db:D1Database,draftId:string,entryId:string){
 const guard='EXISTS(SELECT 1 FROM timeline_entries WHERE id=?)';
 return [
  db.prepare(`INSERT OR IGNORE INTO timeline_entry_records SELECT ?,'contact',recipient_contact_id FROM drafts WHERE id=? AND recipient_contact_id IS NOT NULL AND ${guard}`).bind(entryId,draftId,entryId),
  db.prepare(`INSERT OR IGNORE INTO timeline_entry_records SELECT ?,'company',c.company_id FROM drafts d JOIN contacts c ON c.id=d.recipient_contact_id WHERE d.id=? AND c.company_id IS NOT NULL AND ${guard}`).bind(entryId,draftId,entryId),
  ...(isRecordMailDatabase(db)?[db.prepare(`INSERT OR IGNORE INTO timeline_entry_records SELECT ?,'opportunity',history_opportunity_id FROM record_mail_context WHERE draft_id=? AND history_opportunity_id IS NOT NULL AND ${guard}`).bind(entryId,draftId,entryId)]:[])
 ];
}
