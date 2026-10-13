-- A stopped schedule is no longer a reason to wait in NEXT, regardless of which
-- authenticated record command or verified provider event stopped it.
CREATE TRIGGER stopped_schedule_queue AFTER UPDATE OF state ON outbound_messages
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore')
 AND OLD.state='scheduled' AND NEW.state IN('cancelled','failed','draft')
 AND EXISTS(SELECT 1 FROM opportunities WHERE id=NEW.opportunity_id AND lifecycle='open')
BEGIN
 UPDATE opportunities SET queue_state='now',queue_reason=COALESCE(NEW.failure,'Scheduled outreach stopped'),next_due_at=NULL,updated_at=NEW.updated_at WHERE id=NEW.opportunity_id AND lifecycle='open';
 INSERT OR IGNORE INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json)
 VALUES('schedule-stop:'||NEW.id||':'||NEW.state,'message.schedule_stopped',NEW.updated_at,NEW.updated_at,'feature',NULL,'outreach',json_object('messageId',NEW.id,'state',NEW.state,'reason',NEW.failure));
 INSERT OR IGNORE INTO timeline_entry_records(timeline_entry_id,record_type,record_id)
 VALUES('schedule-stop:'||NEW.id||':'||NEW.state,'opportunity',NEW.opportunity_id);
 INSERT OR IGNORE INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at)
 VALUES('schedule-stop:'||NEW.id||':'||NEW.state,NULL,'outreach.schedule_stopped','outbound_message',NEW.id,json_object('feature','outreach','state',NEW.state),NEW.updated_at);
END;
