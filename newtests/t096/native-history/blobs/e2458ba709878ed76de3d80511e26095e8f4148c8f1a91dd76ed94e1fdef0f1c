/** All known thread references must agree before the native sender can identify a recipient. */
export async function matchingReplyMessages(db:D1Database,sender:string,references:string){
 const ids=[...new Set(references.match(/<[^<>\r\n]+>/g)??[])];
 if(!ids.length)return [];
 // A single JSON parameter covers the entire bounded reply, including threads
 // longer than D1's bind-variable limit, without truncating ambiguity evidence.
 const rows=await db.prepare(`SELECT DISTINCT m.opportunity_id,m.contact_id,lower(trim(c.email)) AS email FROM outbound_messages m LEFT JOIN contacts c ON c.id=m.contact_id WHERE m.message_id IN(SELECT value FROM json_each(?))`).bind(JSON.stringify(ids)).all<{opportunity_id:string;contact_id:string;email:string|null}>();
 if(new Set(rows.results.map(row=>row.opportunity_id)).size!==1)return [];
 return rows.results.filter(row=>row.email===sender.trim().toLowerCase());
}
