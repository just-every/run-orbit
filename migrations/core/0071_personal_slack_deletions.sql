-- Keep the original provider identity independently of mutable personal consent.
CREATE TABLE slack_personal_receipts(
 notice_id TEXT PRIMARY KEY REFERENCES slack_personal_notices(id) ON DELETE CASCADE,
 team_id TEXT NOT NULL,app_id TEXT NOT NULL,channel_id TEXT NOT NULL,message_ts TEXT NOT NULL
);
CREATE TABLE slack_personal_deletions(
 notice_id TEXT PRIMARY KEY,operator_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
 team_id TEXT NOT NULL,app_id TEXT NOT NULL,channel_id TEXT NOT NULL,message_ts TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'queued',error TEXT,retry_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE INDEX slack_personal_deletions_pending ON slack_personal_deletions(state,retry_at);
-- Historical identity is recoverable only while the original consent still matches.
INSERT INTO slack_personal_receipts
 SELECT n.id,p.team_id,p.app_id,n.channel_id,n.message_ts FROM slack_personal_notices n
 JOIN slack_personal_preferences p ON p.operator_id=n.operator_id AND p.revision=n.preference_revision
 WHERE n.message_ts IS NOT NULL AND n.channel_id IS NOT NULL;
CREATE TRIGGER slack_personal_receipt_delete BEFORE DELETE ON slack_personal_notices
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 INSERT OR IGNORE INTO slack_personal_deletions(notice_id,operator_id,team_id,app_id,channel_id,message_ts,created_at,updated_at)
 SELECT r.notice_id,OLD.operator_id,r.team_id,r.app_id,r.channel_id,r.message_ts,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')
 FROM slack_personal_receipts r WHERE r.notice_id=OLD.id;
END;
CREATE TRIGGER slack_personal_retract_entry BEFORE DELETE ON timeline_entries
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 INSERT OR IGNORE INTO slack_personal_deletions(notice_id,operator_id,team_id,app_id,channel_id,message_ts,created_at,updated_at)
 SELECT r.notice_id,n.operator_id,r.team_id,r.app_id,r.channel_id,r.message_ts,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')
 FROM slack_personal_receipts r JOIN slack_personal_notices n ON n.id=r.notice_id WHERE n.event_key='mention:entry:'||OLD.id;
 UPDATE slack_personal_notices SET state='redacted',error='Source deleted; provider deletion requested'
 WHERE event_key='mention:entry:'||OLD.id AND message_ts IS NOT NULL;
END;
CREATE TRIGGER slack_personal_retract_task BEFORE DELETE ON sales_tasks
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 INSERT OR IGNORE INTO slack_personal_deletions(notice_id,operator_id,team_id,app_id,channel_id,message_ts,created_at,updated_at)
 SELECT r.notice_id,n.operator_id,r.team_id,r.app_id,r.channel_id,r.message_ts,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')
 FROM slack_personal_receipts r JOIN slack_personal_notices n ON n.id=r.notice_id WHERE n.event_key='mention:task:'||OLD.id;
 UPDATE slack_personal_notices SET state='redacted',error='Source deleted; provider deletion requested'
 WHERE event_key='mention:task:'||OLD.id AND message_ts IS NOT NULL;
END;
CREATE TRIGGER slack_personal_retract_handoff BEFORE DELETE ON handoff_tasks
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 INSERT OR IGNORE INTO slack_personal_deletions(notice_id,operator_id,team_id,app_id,channel_id,message_ts,created_at,updated_at)
 SELECT r.notice_id,n.operator_id,r.team_id,r.app_id,r.channel_id,r.message_ts,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')
 FROM slack_personal_receipts r JOIN slack_personal_notices n ON n.id=r.notice_id WHERE n.event_key='mention:handoff:'||OLD.id;
 UPDATE slack_personal_notices SET state='redacted',error='Source deleted; provider deletion requested'
 WHERE event_key='mention:handoff:'||OLD.id AND message_ts IS NOT NULL;
END;
