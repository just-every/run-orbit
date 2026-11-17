import type {RawLine} from './signal-lines';
import type {RecordRef} from './types';

/** An open sales task past its due time is an overdue promise on the records it names (BRIEF-002). */
export async function taskPromises(db:D1Database,now:Date,limit:number):Promise<RawLine[]>{
 const rows=(await db.prepare("SELECT id,title,due_at AS dueAt,contact_id AS contactId,company_id AS companyId,opportunity_id AS opportunityId FROM sales_tasks WHERE status='open' AND due_at<? ORDER BY due_at LIMIT ?").bind(now.toISOString(),limit).all<{id:string;title:string;dueAt:string;contactId:string|null;companyId:string|null;opportunityId:string|null}>()).results;
 return rows.map((row):RawLine=>{
  const records:RecordRef[]=[...(row.opportunityId?[{type:'opportunity' as const,id:row.opportunityId}]:[]),...(row.contactId?[{type:'contact' as const,id:row.contactId}]:[]),...(row.companyId?[{type:'company' as const,id:row.companyId}]:[])];
  return {id:`task-due:${row.id}`,kind:'next-action-due',group:'promise',signalType:null,confidence:null,title:row.title,detail:'Sales task past its due time',occurredAt:row.dueAt,dueAt:row.dueAt,evidence:{type:'task',id:row.id},records,planHref:null,link:{fixed:`/app/tasks/${row.id}`}};
 });
}
