-- One reviewed Zoom occurrence per signal. Credentials stay sealed in signal_sources.
CREATE TABLE zoom_meetings (
 signal_id TEXT PRIMARY KEY REFERENCES signals(id) ON DELETE CASCADE,
 meeting_id TEXT NOT NULL,
 meeting_uuid TEXT NOT NULL UNIQUE,
 opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
 join_url TEXT NOT NULL,
 host_id TEXT NOT NULL,
 duration INTEGER NOT NULL,
 state TEXT NOT NULL CHECK(state IN('scheduled','completed','cancelled')),
 recording TEXT NOT NULL,
 attendance_json TEXT NOT NULL DEFAULT '[]',
 attendance_state TEXT NOT NULL DEFAULT 'not-read',
 completed_at TEXT,
 completion_entry_id TEXT REFERENCES timeline_entries(id) ON DELETE SET NULL,
 completion_digest TEXT,
 completion_timestamp TEXT,
 cancelled_at TEXT,
 last_event_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE zoom_deliveries (
 digest TEXT PRIMARY KEY,
 received_at TEXT NOT NULL
);
CREATE TABLE zoom_plan_actions (
 signal_id TEXT NOT NULL REFERENCES zoom_meetings(signal_id) ON DELETE CASCADE,
 handoff_id TEXT NOT NULL REFERENCES handoff_tasks(id) ON DELETE CASCADE,
 PRIMARY KEY(signal_id,handoff_id)
);
-- A cancellation that arrives while a reviewed handoff is saved still withdraws it.
CREATE TRIGGER zoom_plan_action_cancelled AFTER INSERT ON zoom_plan_actions
WHEN EXISTS(SELECT 1 FROM zoom_meetings WHERE signal_id=NEW.signal_id AND state='cancelled')
BEGIN
 UPDATE handoff_tasks SET status='cancelled',revision=lower(hex(randomblob(16))),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.handoff_id AND status='open';
END;
