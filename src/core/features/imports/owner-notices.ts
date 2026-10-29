import type {D1Sql} from '../../../modules/import-kit/d1/index';

/** A completed import has one durable receiving-user notice, including both record kinds. */
export function importOwnerNotice(db:D1Database,jobId:string,actor:string,authority:D1Sql){
 return db.prepare(`INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
 SELECT lower(hex(randomblob(16))),receiver.id,NULL,'import-ownership:'||j.id||':'||receiver.id,'record.assigned',
 'CSV import by '||assigner.display_name||': '||(SELECT group_concat(description,'; ') FROM (
 SELECT CASE p.target_kind WHEN 'contact-owner' THEN COALESCE(NULLIF(c.name,''),c.email,'Contact') ELSE co.name END||' (previous owner: '||COALESCE(json_extract(t.original_json,'$.history.previousOwnerName'),'Unassigned')||')' AS description
 FROM ik_provenance p JOIN crm_import_targets t ON t.kind=p.target_kind AND t.id=p.target_id
 LEFT JOIN contacts c ON p.target_kind='contact-owner' AND c.id=p.target_id LEFT JOIN companies co ON p.target_kind='company-owner' AND co.id=p.target_id
 JOIN record_ownership x ON x.record_type=CASE p.target_kind WHEN 'contact-owner' THEN 'contact' ELSE 'company' END AND x.record_id=p.target_id
 WHERE p.job_id=j.id AND p.reversed=0 AND p.target_kind IN('contact-owner','company-owner') AND x.owner_id=receiver.id AND json_extract(t.original_json,'$.history.actor')=assigner.id ORDER BY p.ordinal,p.effect_ordinal)),?
 FROM ik_jobs j JOIN operators assigner ON assigner.id=? JOIN operators receiver ON receiver.status='active' AND receiver.id<>assigner.id
 WHERE j.id=? AND j.state='completed' AND EXISTS(SELECT 1 FROM access_memberships m WHERE m.operator_id=receiver.id AND m.workspace_id='workspace' AND m.status='active' AND m.role='legacy_operator') AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=receiver.id)
 AND EXISTS(SELECT 1 FROM ik_provenance p JOIN record_ownership x ON x.record_id=p.target_id AND x.record_type=CASE p.target_kind WHEN 'contact-owner' THEN 'contact' ELSE 'company' END WHERE p.job_id=j.id AND p.reversed=0 AND p.target_kind IN('contact-owner','company-owner') AND x.owner_id=receiver.id)
 AND (${authority.sql})`).bind(new Date().toISOString(),actor,jobId,...authority.params??[]);
}
/** Erase a whole grouped notice when one of its records is erased. */
export function eraseImportOwnerNotices(db:D1Database,kind:string,id:string){return db.prepare("DELETE FROM notifications WHERE event_key IN(SELECT 'import-ownership:'||p.job_id||':'||json_extract(t.original_json,'$.row.owner_id') FROM ik_provenance p JOIN crm_import_targets t ON t.kind=p.target_kind AND t.id=p.target_id WHERE p.target_kind=? AND p.target_id=?)").bind(`${kind}-owner`,id);}
