import {createId} from '../../shared/ids';
/** Only identity and hashes are retained. Never retain a conflicting payload or apply its effects. */
export function providerConflictStatements(db:D1Database,eventId:string,acceptedHash:string,rejectedHash:string,source:'sendgrid-events'|'sendgrid-replies'='sendgrid-events'){
 const at=new Date().toISOString();
 return [
  db.prepare("INSERT OR IGNORE INTO signal_sources(id,name,type,enabled,created_at,updated_at) VALUES(?,?,'mail_provider',1,?,?)").bind(source,source==='sendgrid-events'?'SendGrid delivery events':'SendGrid authenticated replies',at,at),
  db.prepare('INSERT OR IGNORE INTO mail_provider_conflicts(event_id,accepted_hash,rejected_hash,created_at) VALUES(?,?,?,?)').bind(eventId,acceptedHash,rejectedHash,at),
  db.prepare("INSERT INTO source_event_errors(id,source_id,source_event_id,reason,created_at) SELECT ?,?,?,'Provider event identity has conflicting payload',? WHERE changes()>0").bind(createId(),source,eventId,at),
  db.prepare("UPDATE signal_sources SET last_error='Provider event identity has conflicting payload',rejected_count=rejected_count+1,updated_at=? WHERE id=? AND changes()>0").bind(at,source)
 ];
}

export async function recordProviderConflict(db:D1Database,eventId:string,acceptedHash:string,rejectedHash:string,source:'sendgrid-events'|'sendgrid-replies'='sendgrid-events'){
 await db.batch(providerConflictStatements(db,eventId,acceptedHash,rejectedHash,source));
}
