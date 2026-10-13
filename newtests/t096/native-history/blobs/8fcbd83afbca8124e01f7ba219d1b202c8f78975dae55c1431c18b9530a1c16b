CREATE TABLE runtime_controls (name TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE notifications (
 id TEXT PRIMARY KEY, operator_id TEXT NOT NULL REFERENCES operators(id), opportunity_id TEXT,
 event_key TEXT NOT NULL, kind TEXT NOT NULL, message TEXT NOT NULL,
 created_at TEXT NOT NULL, read_at TEXT, UNIQUE(operator_id,event_key)
);
CREATE INDEX notifications_unread ON notifications(operator_id,read_at,created_at);
CREATE TRIGGER notify_queue_entry AFTER UPDATE OF queue_state ON opportunities
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') AND NEW.queue_state='now' AND OLD.queue_state!='now' AND NEW.lifecycle='open'
BEGIN
 INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
 SELECT lower(hex(randomblob(16))),p.id,NEW.id,'now:'||NEW.id||':'||NEW.updated_at,'opportunity.now',COALESCE(NEW.queue_reason,'Action needed'),NEW.updated_at
 FROM operators p WHERE p.status='active' AND
 (p.id=COALESCE(NEW.owner_id,(SELECT t.actor_id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_id=NEW.id AND t.actor_type='operator' ORDER BY t.recorded_at DESC,t.id DESC LIMIT 1))
 OR COALESCE(NEW.owner_id,(SELECT t.actor_id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_id=NEW.id AND t.actor_type='operator' ORDER BY t.recorded_at DESC,t.id DESC LIMIT 1)) IS NULL);
END;
CREATE TRIGGER notify_message_state AFTER UPDATE OF state ON outbound_messages
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') AND NEW.state!=OLD.state AND NEW.state IN ('accepted','failed','bounced','delivery-unknown')
BEGIN
 INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
 SELECT lower(hex(randomblob(16))),p.id,NEW.opportunity_id,'message:'||NEW.id||':'||NEW.state,'message.'||NEW.state,'Message '||NEW.state,NEW.updated_at
 FROM operators p JOIN opportunities o ON o.id=NEW.opportunity_id WHERE p.status='active' AND p.id=COALESCE(o.owner_id,(SELECT t.actor_id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_id=o.id AND t.actor_type='operator' ORDER BY t.recorded_at DESC,t.id DESC LIMIT 1),NEW.operator_id);
END;
CREATE TABLE ai_calls (
 id TEXT PRIMARY KEY,operator_id TEXT NOT NULL,opportunity_id TEXT,
 provider TEXT NOT NULL,model TEXT NOT NULL,feature TEXT NOT NULL,
 input_tokens INTEGER NOT NULL DEFAULT 0,output_tokens INTEGER NOT NULL DEFAULT 0,cached_input_tokens INTEGER NOT NULL DEFAULT 0,
 estimated_cost REAL NOT NULL DEFAULT 0,duration_ms INTEGER NOT NULL,status TEXT NOT NULL,
 error TEXT,created_at TEXT NOT NULL
);
CREATE TABLE ai_previews (
 id TEXT PRIMARY KEY,operator_id TEXT NOT NULL,opportunity_id TEXT NOT NULL,
 recommendation_id TEXT NOT NULL,recipient_contact_id TEXT,feature TEXT NOT NULL,
 content_json TEXT NOT NULL,created_at TEXT NOT NULL,consumed_at TEXT
);
CREATE TRIGGER notify_reply AFTER INSERT ON signal_links
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') AND NEW.record_type='opportunity' AND EXISTS(SELECT 1 FROM signals WHERE id=NEW.signal_id AND type='email.replied')
BEGIN
 INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
 SELECT lower(hex(randomblob(16))),p.id,NEW.record_id,'reply:'||NEW.signal_id,'customer.reply','Customer reply received',NEW.linked_at
 FROM operators p JOIN opportunities o ON o.id=NEW.record_id WHERE p.status='active' AND
 (p.id=COALESCE(o.owner_id,(SELECT t.actor_id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_id=o.id AND t.actor_type='operator' ORDER BY t.recorded_at DESC,t.id DESC LIMIT 1))
 OR COALESCE(o.owner_id,(SELECT t.actor_id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_id=o.id AND t.actor_type='operator' ORDER BY t.recorded_at DESC,t.id DESC LIMIT 1)) IS NULL);
END;
CREATE TABLE public_rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TRIGGER notify_initial_queue AFTER INSERT ON opportunities
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') AND NEW.queue_state='now' AND NEW.lifecycle='open'
BEGIN
 INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
 SELECT lower(hex(randomblob(16))),p.id,NEW.id,'now:'||NEW.id||':'||NEW.updated_at,'opportunity.now',COALESCE(NEW.queue_reason,'Action needed'),NEW.updated_at
 FROM operators p WHERE p.status='active' AND (NEW.owner_id IS NULL OR p.id=NEW.owner_id);
END;
CREATE TRIGGER audit_notification_creation AFTER INSERT ON notifications
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore')
BEGIN
 INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at)
 VALUES(lower(hex(randomblob(16))),NULL,'notification.created','notification',NEW.id,json_object('feature','notifications','kind',NEW.kind),NEW.created_at);
END;
