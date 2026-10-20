-- INTEGRATE-005: additive storage; credentials never enter a portable archive.
CREATE TABLE slack_installation(id TEXT PRIMARY KEY,team_id TEXT NOT NULL,bot_user_id TEXT NOT NULL,state TEXT NOT NULL,error TEXT,origin TEXT NOT NULL,connected_at TEXT NOT NULL,retry_at TEXT);
CREATE TABLE slack_credentials(id TEXT PRIMARY KEY,ciphertext TEXT NOT NULL);
CREATE TABLE slack_channels(id TEXT PRIMARY KEY,name TEXT NOT NULL,events_json TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,last_error TEXT,retry_at TEXT);
CREATE TABLE slack_mappings(slack_user_id TEXT PRIMARY KEY,operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,revoked_at TEXT);
CREATE TABLE slack_notices(id TEXT PRIMARY KEY,event_key TEXT NOT NULL,event_kind TEXT NOT NULL,channel_id TEXT NOT NULL REFERENCES slack_channels(id),record_type TEXT NOT NULL,record_id TEXT,source_id TEXT,state TEXT NOT NULL DEFAULT 'queued',content_json TEXT,stage_from TEXT,stage_to TEXT,due_at TEXT,message_ts TEXT,error TEXT,retry_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,acknowledged_by TEXT REFERENCES operators(id) ON DELETE SET NULL,acknowledged_at TEXT,UNIQUE(event_key,channel_id));
CREATE INDEX slack_notices_channel_state ON slack_notices(channel_id,state);
CREATE INDEX slack_notices_pending ON slack_notices(state,retry_at,created_at);
CREATE TABLE slack_actions(id TEXT PRIMARY KEY,notice_id TEXT NOT NULL REFERENCES slack_notices(id),slack_user_id TEXT NOT NULL,operator_id TEXT REFERENCES operators(id) ON DELETE SET NULL,action TEXT NOT NULL,task_id TEXT,created_at TEXT NOT NULL);

-- Link insertion is in the same transaction as the real sales event. Never copy its free text.
CREATE TRIGGER slack_sales_event AFTER INSERT ON timeline_entry_records
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN ('restore','archive_import'))
BEGIN
 INSERT OR IGNORE INTO slack_notices(id,event_key,event_kind,channel_id,record_type,record_id,source_id,stage_from,stage_to,due_at,created_at,updated_at)
 SELECT lower(hex(randomblob(16))),e.id,
 CASE WHEN e.kind='stage.changed' THEN 'stage' WHEN (e.kind='lifecycle.changed' AND json_extract(e.payload_json,'$.state')='won') THEN 'won' ELSE 'handoff' END,
 c.id,NEW.record_type,NEW.record_id,e.id,json_extract(e.payload_json,'$.previousStageName'),json_extract(e.payload_json,'$.currentStageName'),json_extract(e.payload_json,'$.dueAt'),e.recorded_at,e.recorded_at
 FROM timeline_entries e CROSS JOIN slack_channels c
 WHERE e.id=NEW.timeline_entry_id AND c.enabled=1
 AND ((e.kind='lifecycle.changed' AND json_extract(e.payload_json,'$.state')='won') OR (e.kind='handoff.updated' AND json_extract(e.payload_json,'$.sourceClientId') IS NULL) OR e.kind IN ('stage.changed','manual.call','manual.meeting','handoff.accepted') OR (e.kind='signal.recorded' AND EXISTS(SELECT 1 FROM signals s WHERE s.id=json_extract(e.payload_json,'$.signalId') AND s.type IN ('meeting.booked','meeting.cancelled'))))
 AND EXISTS(SELECT 1 FROM slack_installation)
 AND EXISTS(SELECT 1 FROM json_each(c.events_json) WHERE value=CASE WHEN e.kind='stage.changed' THEN 'stage' WHEN (e.kind='lifecycle.changed' AND json_extract(e.payload_json,'$.state')='won') THEN 'won' ELSE 'handoff' END);
END;

CREATE TRIGGER slack_erase_contact BEFORE DELETE ON contacts WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 UPDATE slack_notices SET content_json=NULL,stage_from=NULL,stage_to=NULL,record_id=NULL,source_id=NULL,state='redacted',error='Underlying record erased',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE (record_type='contact' AND record_id=OLD.id) OR (record_type='opportunity' AND record_id IN(SELECT opportunity_id FROM opportunity_contacts WHERE contact_id=OLD.id));
END;
CREATE TRIGGER slack_erase_deal BEFORE DELETE ON opportunities WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 UPDATE slack_notices SET content_json=NULL,stage_from=NULL,stage_to=NULL,record_id=NULL,source_id=NULL,state='redacted',error='Underlying record erased',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE record_type='opportunity' AND record_id=OLD.id;
END;
CREATE TRIGGER slack_erase_company BEFORE DELETE ON companies WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 UPDATE slack_notices SET content_json=NULL,stage_from=NULL,stage_to=NULL,record_id=NULL,source_id=NULL,state='redacted',error='Underlying record erased',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE (record_type='company' AND record_id=OLD.id) OR (record_type='opportunity' AND record_id IN(SELECT id FROM opportunities WHERE company_id=OLD.id));
END;
