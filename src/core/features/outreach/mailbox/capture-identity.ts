/** A provider Sent copy of Orbit's own message is never a customer reply. */
export async function capturedOwnMailboxMessage(db:D1Database,sourceId:string,messageId:string,sender:string){
 return Boolean(await db.prepare(`SELECT 1 FROM outbound_messages WHERE mailbox_source_id=? AND message_id=? AND mailbox_address=? UNION ALL SELECT 1 FROM record_mail_outbound_messages WHERE mailbox_source_id=? AND message_id=? AND mailbox_address=? LIMIT 1`).bind(sourceId,messageId,sender,sourceId,messageId,sender).first());
}
