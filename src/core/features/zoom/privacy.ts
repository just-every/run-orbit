import {identityMatch,identityPatterns} from '../records/erasure-identity';
/** Attendance that was ambiguous at completion must still be found when that address is later erased. */
export function zoomContactErasure(db:D1Database,contactId:string,identities:string[]){
 return identities.map(email=>db.prepare(`INSERT OR IGNORE INTO record_erasure_signals SELECT ?,signal_id FROM zoom_meetings WHERE ${identityMatch('attendance_json')}`).bind(contactId,...identityPatterns(email)));
}

/** Retain only anonymous capture matching keys, including meetings erased before their scheduled start. */
export function zoomEvidenceErasure(db:D1Database,contactId:string){
 return db.prepare(`INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at)
 SELECT lower(hex(randomblob(16))),NULL,'capture.erased_item','capture_privacy',p.value,'{}',strftime('%Y-%m-%dT%H:%M:%fZ','now')
 FROM signals s JOIN zoom_meetings z ON z.signal_id=s.id,json_each(s.payload_json,'$.data.capturePrivacyKeys') p
 WHERE s.id IN(SELECT signal_id FROM record_erasure_signals WHERE contact_id=?) GROUP BY p.value`).bind(contactId);
}
