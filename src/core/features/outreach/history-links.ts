/** Show the same immutable mail evidence on its deal and known account/contact. */
export function mailHistoryLinks(db:D1Database,timelineId:string,opportunityId:string,contactIds:(string|null)[]){
 return [
  ...contactIds.filter((id):id is string=>id!==null).map(id=>db.prepare("INSERT OR IGNORE INTO timeline_entry_records VALUES(?,'contact',?)").bind(timelineId,id)),
  db.prepare("INSERT OR IGNORE INTO timeline_entry_records SELECT ?,'company',company_id FROM opportunities WHERE id=? AND company_id IS NOT NULL").bind(timelineId,opportunityId),
 ];
}

/** Only a winning settlement can associate its provider-acceptance receipt. */
export function acceptedHistoryLinks(db:D1Database,messageId:string,settlementId:string){
 const entries="FROM outbound_messages m JOIN timeline_entry_records r ON r.record_type='opportunity' AND r.record_id=m.opportunity_id JOIN timeline_entries t ON t.id=r.timeline_entry_id JOIN opportunities o ON o.id=m.opportunity_id WHERE t.kind='message.accepted' AND json_extract(t.payload_json,'$.messageId')=m.id AND m.id=? AND m.settlement_id=?";
 return [
  db.prepare(`INSERT OR IGNORE INTO timeline_entry_records SELECT t.id,'contact',m.contact_id ${entries} AND m.contact_id IS NOT NULL`).bind(messageId,settlementId),
  db.prepare(`INSERT OR IGNORE INTO timeline_entry_records SELECT t.id,'company',o.company_id ${entries} AND o.company_id IS NOT NULL`).bind(messageId,settlementId),
 ];
}
