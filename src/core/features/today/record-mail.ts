import type {RawLine} from './signal-lines';
/** Only this sender owns the contact-level promise, independently of record ownership. */
export async function recordMailPromises(db:D1Database,operatorId:string,now:Date,limit:number):Promise<RawLine[]>{
 const rows=(await db.prepare(`SELECT m.draft_id,o.message_id,o.contact_id,o.due_at,m.subject,c.company_id FROM record_mail_obligations o
 JOIN record_mail_outbound_messages m ON m.id=o.message_id JOIN contacts c ON c.id=o.contact_id
 WHERE o.owner_id=? AND o.closed_at IS NULL AND o.due_at<? ORDER BY o.due_at LIMIT ?`).bind(operatorId,now.toISOString(),limit).all<{draft_id:string;message_id:string;contact_id:string;due_at:string;subject:string;company_id:string|null}>()).results;
 return rows.map((row):RawLine=>({id:`record-mail-due:${row.message_id}`,kind:'next-action-due',group:'promise',signalType:null,confidence:null,title:row.subject,detail:'Awaiting customer response beyond the workspace working-day interval',occurredAt:row.due_at,dueAt:row.due_at,evidence:{type:'draft',id:row.draft_id},records:[{type:'contact',id:row.contact_id},...(row.company_id?[{type:'company' as const,id:row.company_id}]:[])],planHref:null,link:{fixed:`/app/contacts/${row.contact_id}#record-mail`}}));
}
