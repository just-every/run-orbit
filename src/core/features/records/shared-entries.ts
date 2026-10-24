import { isFullOperator } from '../access/identity-class';
import { readsEntries } from '../access/grant-entries';
import type { RecordKind } from './shared';
/** One internal entry as Shared records shows it, read-only: no attendees, no plan fields, no other record's entries. */
export interface SharedEntry {source:'entry'|'task'|'handoff';id:string;kind:string;title:string|null;text:string;durationMinutes:number|null;author:string|null;at:string}
/** RECORD-017: a record's notes, logged calls and meetings, task notes and handoffs, for someone whose live grant on
 * this record includes them (ct, 19 October). `included` is false, with no entries, for anyone else. */
export async function sharedEntries(db:D1Database,operatorId:string,kind:RecordKind,recordId:string):Promise<{included:boolean;entries:SharedEntry[]}>{
 if(!await isFullOperator(db,operatorId)&&!await readsEntries(db,operatorId,kind,recordId))return {included:false,entries:[]};
 const full=await isFullOperator(db,operatorId),privacy=(source:string,alias:string)=>full?'':` AND NOT EXISTS(SELECT 1 FROM entry_privacy p WHERE p.source='${source}' AND p.entry_id=${alias}.id)`;
 const column={contact:'contact_id',company:'company_id',opportunity:'opportunity_id'}[kind];
 const rows=await db.prepare(`SELECT 'entry' AS source,t.id AS id,t.kind AS kind,NULL AS title,json_extract(t.payload_json,'$.text') AS text,json_extract(t.payload_json,'$.durationMinutes') AS durationMinutes,a.display_name AS author,t.occurred_at AS at FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id LEFT JOIN operators a ON a.id=t.actor_id WHERE r.record_type=? AND r.record_id=? AND t.kind IN('manual.note','manual.call','manual.meeting')${privacy('entry','t')}
 UNION ALL SELECT 'task',s.id,'task',s.title,s.notes,NULL,a.display_name,s.updated_at FROM sales_tasks s LEFT JOIN operators a ON a.id=s.updated_by WHERE s.record_type=? AND s.${column}=? AND s.notes<>''${privacy('task','s')}
 UNION ALL SELECT 'handoff',h.id,'handoff',h.title,h.description,NULL,a.display_name,h.updated_at FROM handoff_tasks h LEFT JOIN operators a ON a.id=h.actor_id WHERE ?='opportunity' AND h.opportunity_id=?${privacy('handoff','h')}
 ORDER BY at DESC,id DESC LIMIT 200`).bind(kind,recordId,kind,recordId,kind,recordId).all<SharedEntry>();
 return {included:true,entries:rows.results};
}
