import {salesCanRead} from './record-access';
import {deny} from '../access/errors';
export async function salesEntryAuthority(db:D1Database,operatorId:string,path:string){
 const entry=/^\/api\/v1\/entries\/visibility\/(entry|task|handoff)\/([A-Za-z0-9_-]+)$/.exec(path);if(!entry)return false;
 const sql=entry[1]==='entry'?'SELECT record_type AS kind,record_id AS id FROM timeline_entry_records WHERE timeline_entry_id=?':entry[1]==='task'?'SELECT record_type AS kind,COALESCE(contact_id,company_id,opportunity_id) AS id FROM sales_tasks WHERE id=?':"SELECT 'opportunity' AS kind,opportunity_id AS id FROM handoff_tasks WHERE id=?";
 const records=(await db.prepare(sql).bind(entry[2]).all<{kind:string;id:string}>()).results;if(!records.length)deny('Entry is unavailable.');
 for(const record of records)if(!await salesCanRead(db,operatorId,record.kind,record.id,['notes']))deny('Entry notes are outside your sales access.');return true;
}
