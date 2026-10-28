import {nativeId} from './source';
import {fullOwnerSql} from './owners';
import type {D1Sql} from '../../../modules/import-kit/d1/index';
/** A terminal import contributes only its own unreversed assignment effects, never reused effects. */
export function importOwnerNotice(jobId:string,actorId:string,authority:D1Sql){
 return {sql:`INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
 SELECT ?||'-'||receiver.id,receiver.id,NULL,'import-ownership:'||?||':'||receiver.id,'record.assigned',
 'Assigned by import ('||assigner.display_name||'): '||group_concat(json_extract(marker.original_json,'$.attribution.recordName')||' (previous owner: '||COALESCE((SELECT display_name FROM operators WHERE id=json_extract(marker.original_json,'$.attribution.previousOwnerId')),'Unassigned')||')','; '),?
 FROM ik_provenance p JOIN crm_import_targets marker ON marker.kind='owner' AND marker.id=p.target_id
 JOIN record_ownership x ON x.record_type=json_extract(marker.original_json,'$.row.record_type') AND x.record_id=json_extract(marker.original_json,'$.row.record_id')
 JOIN (${fullOwnerSql}) receiver ON receiver.id=x.owner_id JOIN operators assigner ON assigner.id=?
 WHERE p.job_id=? AND p.target_kind='owner' AND p.reversed=0 AND receiver.id<>? AND marker.revision=json_extract(p.record_json,'$.appliedRevision')
 AND EXISTS(SELECT 1 FROM ik_jobs WHERE id=? AND state='completed') AND (${authority.sql})
 GROUP BY receiver.id`,params:[nativeId('import-owner','notice',jobId),jobId,new Date().toISOString(),actorId,jobId,actorId,jobId,...authority.params??[]]};
}
