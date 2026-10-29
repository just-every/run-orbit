-- Personal consent is bound to one explicit identity mapping and installation.
CREATE TABLE slack_personal_preferences(
 operator_id TEXT PRIMARY KEY REFERENCES operators(id) ON DELETE CASCADE,
 enabled INTEGER NOT NULL DEFAULT 0,
 revision TEXT NOT NULL,
 slack_user_id TEXT NOT NULL,
 team_id TEXT NOT NULL,
 enterprise_id TEXT NOT NULL,
 app_id TEXT NOT NULL,
 policy_epoch INTEGER NOT NULL,
 mapping_confirmed_at TEXT NOT NULL,
 installation_epoch TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE slack_personal_notices(
 id TEXT PRIMARY KEY,
 notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
 operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
 event_key TEXT NOT NULL,
 preference_revision TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'queued',
 channel_id TEXT,
 message_ts TEXT,
 error TEXT,
 retry_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(operator_id,event_key)
);
CREATE INDEX slack_personal_pending ON slack_personal_notices(state,created_at);
CREATE TRIGGER slack_personal_enqueue AFTER INSERT ON notifications
WHEN NEW.kind='record.mention' AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore')
BEGIN
 INSERT OR IGNORE INTO slack_personal_notices(id,notification_id,operator_id,event_key,preference_revision,created_at,updated_at)
 SELECT lower(hex(randomblob(16))),NEW.id,NEW.operator_id,NEW.event_key,p.revision,NEW.created_at,NEW.created_at
 FROM slack_personal_preferences p WHERE p.operator_id=NEW.operator_id AND p.enabled=1;
END;
CREATE TRIGGER slack_personal_entry_delete BEFORE DELETE ON timeline_entries
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 UPDATE slack_personal_notices SET state='withdrawn',error='Mention source deleted'
 WHERE event_key='mention:entry:'||OLD.id AND state IN('queued','rate-limited','failed');
END;
CREATE TRIGGER slack_personal_task_delete BEFORE DELETE ON sales_tasks
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 UPDATE slack_personal_notices SET state='withdrawn',error='Mention source deleted'
 WHERE event_key='mention:task:'||OLD.id AND state IN('queued','rate-limited','failed');
END;
CREATE TRIGGER slack_personal_handoff_delete BEFORE DELETE ON handoff_tasks
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 UPDATE slack_personal_notices SET state='withdrawn',error='Mention source deleted'
 WHERE event_key='mention:handoff:'||OLD.id AND state IN('queued','rate-limited','failed');
END;
