/** Called by the Records merge transaction before retiring a contact. Approved bytes are immutable. */
export function recordMailContactMerge(db:D1Database,retiredId:string,survivorId:string,at:string){
 return [
  db.prepare("UPDATE record_mail_outbound_messages SET state='cancelled',failure='Contact merged; review a new draft',updated_at=? WHERE contact_id IN(?,?) AND state IN('draft','scheduled','queued')").bind(at,retiredId,survivorId),
  db.prepare("UPDATE record_mail_drafts SET is_stale=1,stale_reason='Contact merged',updated_at=? WHERE recipient_contact_id IN(?,?)").bind(at,retiredId,survivorId),
  db.prepare('UPDATE record_mail_drafts SET recipient_contact_id=? WHERE recipient_contact_id=?').bind(survivorId,retiredId),
  db.prepare('UPDATE record_mail_outbound_messages SET contact_id=? WHERE contact_id=?').bind(survivorId,retiredId),
  db.prepare('UPDATE record_mail_outbound_opt_out_capabilities SET contact_id=? WHERE contact_id=?').bind(survivorId,retiredId),
  db.prepare('UPDATE record_mail_obligations SET contact_id=? WHERE contact_id=?').bind(survivorId,retiredId),
  db.prepare("UPDATE record_mail_context SET origin_id=? WHERE origin_type='contact' AND origin_id=?").bind(survivorId,retiredId)
 ];
}
/** Notifications contain customer names and must disappear before their message rows cascade. */
export function recordMailContactErasure(db:D1Database,contactId:string){
 return [
  db.prepare("DELETE FROM notifications WHERE event_key IN(SELECT 'record-mail:'||m.id||':'||n.state FROM record_mail_outbound_messages m CROSS JOIN (SELECT 'accepted' AS state UNION ALL SELECT 'failed' UNION ALL SELECT 'bounced' UNION ALL SELECT 'delivery-unknown' UNION ALL SELECT 'reconciling') n WHERE m.contact_id=?)").bind(contactId),
  db.prepare("DELETE FROM notifications WHERE event_key IN(SELECT 'reply:'||signal_id FROM signal_links WHERE record_type='contact' AND record_id=?)").bind(contactId)
 ];
}
/** Removing an origin keeps the recipient's accepted history and withdraws all send authority. */
export function recordMailRecordErasure(db:D1Database,kind:'company'|'opportunity',id:string){
 const affected=kind==='opportunity'?"SELECT id FROM record_mail_drafts WHERE opportunity_id=? OR id IN(SELECT draft_id FROM record_mail_context WHERE origin_type='opportunity' AND origin_id=?)":"SELECT draft_id FROM record_mail_context WHERE origin_type='company' AND origin_id=?",ids=kind==='opportunity'?[id,id]:[id],at=new Date().toISOString();
 const statements=[
  db.prepare(`UPDATE record_mail_outbound_messages SET state='cancelled',failure='Origin record removed; review a new draft',updated_at=? WHERE draft_id IN(${affected}) AND state IN('draft','scheduled','queued')`).bind(at,...ids),
  db.prepare(`UPDATE record_mail_drafts SET is_stale=1,stale_reason='Origin record removed',updated_at=? WHERE id IN(${affected})`).bind(at,...ids),
  db.prepare("UPDATE record_mail_context SET origin_type='contact',origin_id=(SELECT recipient_contact_id FROM record_mail_drafts WHERE id=draft_id),history_opportunity_id=NULL WHERE origin_type=? AND origin_id=?").bind(kind,id)
 ];
 if(kind==='opportunity')statements.push(db.prepare('UPDATE record_mail_outbound_messages SET opportunity_id=NULL WHERE opportunity_id=?').bind(id),db.prepare('UPDATE record_mail_drafts SET opportunity_id=NULL,recommendation_id=NULL WHERE opportunity_id=?').bind(id));
 return statements;
}
