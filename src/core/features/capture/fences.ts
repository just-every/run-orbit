import type {CaptureSource} from './intake';
export function captureFences(db:D1Database,source:CaptureSource){return [
 ...(source.lease?[db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'capture_lease_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM capture_locks WHERE source_id=? AND lease=? AND expires_at>?)").bind(source.id,source.lease,Date.now())]:[]),
 db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'capture_source_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM capture_sources c JOIN signal_sources s ON s.id=c.id WHERE c.id=? AND c.state<>'disconnected' AND c.connection_id IS ? AND s.type='capture' AND s.enabled=1)").bind(source.id,source.connection_id),
];}
