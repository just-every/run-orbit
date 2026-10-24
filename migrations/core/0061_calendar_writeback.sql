CREATE TABLE calendar_writebacks (
 id TEXT PRIMARY KEY NOT NULL,
 source_id TEXT NOT NULL REFERENCES capture_sources(id) ON DELETE CASCADE,
 connection_id TEXT NOT NULL,
 calendar_id TEXT NOT NULL,
 provider_event_id TEXT,
 record_type TEXT NOT NULL CHECK(record_type IN('contact','opportunity')),
 record_id TEXT NOT NULL,
 contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
 entry_id TEXT REFERENCES timeline_entries(id) ON DELETE CASCADE,
 state TEXT NOT NULL CHECK(state IN('attempted','written','cancelled','conflict','uncertain')),
 payload_json TEXT NOT NULL,
 etag TEXT,
 error TEXT,
 updated_at TEXT NOT NULL
);
CREATE INDEX calendar_writebacks_record ON calendar_writebacks(record_type,record_id);
-- Single-use command custody has no provider credentials or invitation content.
CREATE TABLE calendar_writeback_attempts (id TEXT PRIMARY KEY NOT NULL,writeback_id TEXT NOT NULL,created_at TEXT NOT NULL);
