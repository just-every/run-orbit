export interface ReplyMessage {id:string;record_mail:number;opportunity_id:string|null;contact_id:string;operator_id:string;history_opportunity_id:string|null;email:string|null}
/** Known references must agree on deal context; deal-less mail must also agree on its contact. */
export async function matchingReplyMessages(db:D1Database,sender:string,references:string){
 const ids=[...new Set(references.match(/<[^<>\r\n]+>/g)??[])];if(!ids.length)return [];
 const rows=await db.prepare(`SELECT m.id,0 AS record_mail,m.opportunity_id,m.contact_id,m.operator_id,NULL AS history_opportunity_id,lower(trim(c.email)) AS email FROM outbound_messages m LEFT JOIN contacts c ON c.id=m.contact_id WHERE m.message_id IN(SELECT value FROM json_each(?1))
 UNION ALL SELECT m.id,1 AS record_mail,m.opportunity_id,m.contact_id,m.operator_id,x.history_opportunity_id,lower(trim(c.email)) AS email FROM record_mail_outbound_messages m LEFT JOIN contacts c ON c.id=m.contact_id LEFT JOIN record_mail_context x ON x.draft_id=m.draft_id WHERE m.message_id IN(SELECT value FROM json_each(?1))`).bind(JSON.stringify(ids)).all<ReplyMessage>();
 if(new Set(rows.results.map(row=>JSON.stringify([row.opportunity_id,row.history_opportunity_id,...(row.opportunity_id===null?[row.contact_id]:[])]))).size!==1)return [];
 return rows.results.filter(row=>row.email===sender.trim().toLowerCase());
}
