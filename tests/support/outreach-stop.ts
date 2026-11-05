/** Capture durable stop effects, including identities and timestamps rather than counts alone. */
export async function outreachStopInventory(db:D1Database){
 const tables=['signals','signal_links','timeline_entries','timeline_entry_records','evaluations','evaluation_contributions','recommendations','recommendation_evidence','notifications','drafts','outbound_messages','mail_provider_events','audit_entries','opportunities','contacts'] as const;
 const rows=await db.batch(tables.map(table=>db.prepare(`SELECT * FROM ${table} ORDER BY rowid`)));
 return Object.fromEntries(tables.map((table,index)=>[table,rows[index]!.results]));
}
export async function scheduleStopHistory(db:D1Database,messageId:string){
 return (await db.prepare("SELECT * FROM timeline_entries WHERE kind='message.schedule_stopped' AND json_extract(payload_json,'$.messageId')=? ORDER BY id").bind(messageId).all<{id:string;payload_json:string}>()).results;
}
