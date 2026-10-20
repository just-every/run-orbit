import {identityMatch,identityPatterns} from '../records/erasure-identity';

/** Immutable forecasts are withdrawn in full, never rewritten after erasure. Run in the native erasure batch before removing source links. */
export function forecastErasureStatements(db:D1Database,kind:'contact'|'company'|'opportunity'|'operator',id:string,identities:string[]=[]):D1PreparedStatement[]{
 const related=kind==='opportunity'?{sql:'SELECT id FROM opportunities WHERE id=?',bindings:[id]}:
  kind==='contact'?{sql:'SELECT opportunity_id FROM opportunity_contacts WHERE contact_id=?',bindings:[id]}:
  kind==='company'?{sql:'SELECT id FROM opportunities WHERE company_id=? UNION SELECT opportunity_id FROM opportunity_contacts WHERE contact_id IN(SELECT id FROM contacts WHERE company_id=?)',bindings:[id,id]}:
  {sql:'SELECT id FROM opportunities WHERE owner_id=?',bindings:[id]};
 const statements=[
  db.prepare(`DELETE FROM forecast_snapshots WHERE id IN(SELECT snapshot_id FROM forecast_snapshot_records WHERE (kind=? AND record_id=?) OR (kind='opportunity' AND record_id IN(${related.sql})))${kind==='operator'?' OR actor_id=?':''}`).bind(kind,id,...related.bindings,...(kind==='operator'?[id]:[])),
  db.prepare(`DELETE FROM forecast_revisions WHERE (workspace_id,kind,target_key) IN(SELECT workspace_id,kind,target_key FROM forecast_revisions WHERE (kind='deal' AND subject_id IN(${related.sql}))${kind==='operator'?' OR actor_id=? OR (kind=\'quota\' AND subject_id=?)':''})`).bind(...related.bindings,...(kind==='operator'?[id,id]:[]))
 ];
 // Include identifiers in free-text reasons/labels and nested native fields as well as mailbox aliases.
 for(const identity of new Set([id,...identities].filter(Boolean))){const patterns=identityPatterns(identity);statements.push(
  db.prepare(`DELETE FROM forecast_snapshots WHERE ${identityMatch('body_json')}`).bind(...patterns),
  // Delete the stream so removing its latest review cannot silently resurrect an older configuration.
  db.prepare(`DELETE FROM forecast_revisions WHERE (workspace_id,kind,target_key) IN(SELECT workspace_id,kind,target_key FROM forecast_revisions WHERE ${identityMatch('body_json')} OR ${identityMatch('reason')})`).bind(...patterns,...patterns)
 );}
 return statements;
}
