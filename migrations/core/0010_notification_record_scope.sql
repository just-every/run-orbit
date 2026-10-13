-- Scope responsibility to the opportunity and use its existing composite index.
-- An unqualified record_id lookup scanned every timeline link during bulk timers.

DROP TRIGGER notify_queue_entry;
CREATE TRIGGER notify_queue_entry AFTER UPDATE OF queue_state ON opportunities
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') AND NEW.queue_state='now' AND OLD.queue_state!='now' AND NEW.lifecycle='open'
BEGIN
 INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
 SELECT lower(hex(randomblob(16))),p.id,NEW.id,'now:'||NEW.id||':'||NEW.updated_at,'opportunity.now',COALESCE(NEW.queue_reason,'Action needed'),NEW.updated_at
 FROM operators p WHERE p.status='active' AND
 (p.id=COALESCE(NEW.owner_id,(SELECT t.actor_id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='opportunity' AND r.record_id=NEW.id AND t.actor_type='operator' ORDER BY t.recorded_at DESC,t.id DESC LIMIT 1))
 OR COALESCE(NEW.owner_id,(SELECT t.actor_id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='opportunity' AND r.record_id=NEW.id AND t.actor_type='operator' ORDER BY t.recorded_at DESC,t.id DESC LIMIT 1)) IS NULL);
END;

DROP TRIGGER notify_message_state;
CREATE TRIGGER notify_message_state AFTER UPDATE OF state ON outbound_messages
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') AND NEW.state!=OLD.state AND NEW.state IN ('accepted','failed','bounced','delivery-unknown')
BEGIN
 INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
 SELECT lower(hex(randomblob(16))),p.id,NEW.opportunity_id,'message:'||NEW.id||':'||NEW.state,'message.'||NEW.state,'Message '||NEW.state,NEW.updated_at
 FROM operators p JOIN opportunities o ON o.id=NEW.opportunity_id WHERE p.status='active' AND p.id=COALESCE(o.owner_id,(SELECT t.actor_id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='opportunity' AND r.record_id=o.id AND t.actor_type='operator' ORDER BY t.recorded_at DESC,t.id DESC LIMIT 1),NEW.operator_id);
END;

DROP TRIGGER notify_reply;
CREATE TRIGGER notify_reply AFTER INSERT ON signal_links
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') AND NEW.record_type='opportunity' AND EXISTS(SELECT 1 FROM signals WHERE id=NEW.signal_id AND type='email.replied')
BEGIN
 INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
 SELECT lower(hex(randomblob(16))),p.id,NEW.record_id,'reply:'||NEW.signal_id,'customer.reply','Customer reply received',NEW.linked_at
 FROM operators p JOIN opportunities o ON o.id=NEW.record_id WHERE p.status='active' AND
 (p.id=COALESCE(o.owner_id,(SELECT t.actor_id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='opportunity' AND r.record_id=o.id AND t.actor_type='operator' ORDER BY t.recorded_at DESC,t.id DESC LIMIT 1))
 OR COALESCE(o.owner_id,(SELECT t.actor_id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='opportunity' AND r.record_id=o.id AND t.actor_type='operator' ORDER BY t.recorded_at DESC,t.id DESC LIMIT 1)) IS NULL);
END;
