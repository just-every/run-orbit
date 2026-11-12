/** An erased sender's mailbox authority and personal address cannot survive as history. */
export function mailboxOperatorErasure(db:D1Database,id:string){
 return [
  db.prepare('DELETE FROM capture_credentials WHERE source_id IN(SELECT source_id FROM mailbox_send_authorizations WHERE operator_id=?)').bind(id),
  db.prepare('DELETE FROM capture_oauth WHERE operator_id=?').bind(id),
  db.prepare("UPDATE capture_sources SET state='disconnected',connection_id=NULL,cursor=NULL WHERE id IN(SELECT source_id FROM mailbox_send_authorizations WHERE operator_id=?)").bind(id),
  db.prepare('DELETE FROM mailbox_send_authorizations WHERE operator_id=?').bind(id),
  ...['outbound_messages','record_mail_outbound_messages'].map(table=>db.prepare(`UPDATE ${table} SET mailbox_address=NULL WHERE operator_id=?`).bind(id))
 ];
}
