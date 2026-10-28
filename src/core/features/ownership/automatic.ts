import {createId} from '../../shared/ids';
import type {OwnershipKind} from './types';

/** The selection returns record_id, record_name and owner_id. Its before image is
 * captured in the same batch as the owner write, history and grouped notice. */
export function automaticOwnership(db:D1Database,kind:OwnershipKind,selection:string,values:unknown[],actor:string,reason:string,operation=createId()){
 const at=new Date().toISOString(),prefix=`owner-change:${operation}:`,table=kind==='contact'?'contacts':'companies';
 return [
  db.prepare(`INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json)
   SELECT ?||q.record_id,'owner.changed',?,?,'operator',?,'records',json_object('operation',?,'reason',?,'recordName',COALESCE(q.record_name,'Unnamed record'),'previous',x.owner_id,'previousOwnerName',old.display_name,'current',q.owner_id,'currentOwnerName',receiver.display_name)
   FROM (${selection}) q LEFT JOIN record_ownership x ON x.record_type=? AND x.record_id=q.record_id
   LEFT JOIN operators old ON old.id=x.owner_id LEFT JOIN operators receiver ON receiver.id=q.owner_id
   WHERE x.owner_id IS NOT q.owner_id AND (q.owner_id IS NULL OR (receiver.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=receiver.id)))
   AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))`).bind(prefix,at,at,actor,operation,reason,...values,kind),
  db.prepare(`INSERT INTO timeline_entry_records SELECT id,?,substr(id,length(?)+1) FROM timeline_entries WHERE id LIKE ?`).bind(kind,prefix,prefix+'%'),
  db.prepare(`INSERT INTO record_ownership(record_type,record_id,owner_id,revision,updated_at)
   SELECT ?,r.record_id,json_extract(t.payload_json,'$.current'),1,? FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id
   JOIN ${table} n ON n.id=r.record_id WHERE t.id LIKE ?
   ON CONFLICT(record_type,record_id) DO UPDATE SET owner_id=excluded.owner_id,revision=record_ownership.revision+1,updated_at=excluded.updated_at`).bind(kind,at,prefix+'%'),
  db.prepare(`INSERT INTO record_ownership_history(id,record_type,record_id,previous_owner_id,owner_id,actor_id,batch_id,action,revision,occurred_at)
   SELECT t.id,?,r.record_id,json_extract(t.payload_json,'$.previous'),x.owner_id,?,NULL,'assigned',x.revision,?
   FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id JOIN record_ownership x ON x.record_type=r.record_type AND x.record_id=r.record_id WHERE t.id LIKE ?`).bind(kind,actor,at,prefix+'%'),
  db.prepare(`INSERT INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
   SELECT lower(hex(randomblob(16))),receiver.id,NULL,?||receiver.id,'record.assigned','Assigned by '||a.display_name||' ('||?||'): '||group_concat(json_extract(t.payload_json,'$.recordName')||' (previous owner: '||COALESCE(json_extract(t.payload_json,'$.previousOwnerName'),'Unassigned')||')','; '),?
   FROM timeline_entries t JOIN operators receiver ON receiver.id=json_extract(t.payload_json,'$.current') JOIN operators a ON a.id=?
   WHERE t.id LIKE ? AND receiver.id<>? GROUP BY receiver.id`).bind(prefix,reason,at,actor,prefix+'%',actor)
 ];
}

/** Company rules apply only to the primary company, never secondary associations. */
export function companyOwnerRule(db:D1Database,actor:string,scope:{companyId?:string;contactId?:string;batchId?:string;undo?:boolean}){
 const condition=scope.contactId?'c.id=?':'c.company_id=?',id=scope.contactId??scope.companyId!;
 return automaticOwnership(db,'contact',`SELECT c.id AS record_id,c.name AS record_name,company.owner_id FROM contacts c
  LEFT JOIN record_ownership company ON company.record_type='company' AND company.record_id=c.company_id
  LEFT JOIN record_ownership own ON own.record_type='contact' AND own.record_id=c.id
  WHERE ${condition} AND c.company_id IS NOT NULL ${scope.batchId?`AND EXISTS(SELECT 1 FROM ownership_batch_items WHERE batch_id=? AND record_id=c.company_id AND ${scope.undo?'undone':'applied'}=1 AND failure IS NULL)`:''}
  AND (COALESCE((SELECT json_extract(value,'$.company') FROM runtime_controls WHERE name='ownership_rules'),'off')='always'
   OR ((SELECT json_extract(value,'$.company') FROM runtime_controls WHERE name='ownership_rules')='unowned' AND own.owner_id IS NULL AND company.owner_id IS NOT NULL))`,[id,...(scope.batchId?[scope.batchId]:[])],actor,'Company-to-contact owner rule');
}

/** Runs only after this exact provider settlement wins, on both native mail stores. */
export function firstEmailOwnerRule(db:D1Database,contactId:string,actor:string,settlementId:string){
 return automaticOwnership(db,'contact',`SELECT c.id AS record_id,c.name AS record_name,? AS owner_id FROM contacts c
  WHERE c.id=? AND NOT EXISTS(SELECT 1 FROM record_ownership x WHERE x.record_type='contact' AND x.record_id=c.id AND x.owner_id IS NOT NULL)
  AND (SELECT json_extract(value,'$.firstEmail') FROM runtime_controls WHERE name='ownership_rules')=1
  AND EXISTS(SELECT 1 FROM outbound_messages WHERE settlement_id=?)`,[actor,contactId,settlementId],actor,'First one-to-one email rule');
}

export async function assignmentRuleEnabled(db:D1Database,rule:'company'|'firstEmail'){
 const value=await db.prepare("SELECT value FROM runtime_controls WHERE name='ownership_rules'").first<string>('value');
 if(!value)return false;const rules=JSON.parse(value);return rule==='company'?rules.company!=='off':rules.firstEmail===true;
}
