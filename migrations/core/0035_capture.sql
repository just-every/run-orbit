-- Mail and calendar capture (capture.source.v1). Every source is also a signal
-- source, so its captured items become ordinary signals. Captured evidence,
-- proposals and source state travel in archives; credentials never do.
CREATE TABLE capture_sources (
 id TEXT PRIMARY KEY REFERENCES signal_sources(id),
 adapter TEXT NOT NULL,
 name TEXT NOT NULL,
 scope_json TEXT NOT NULL,
 state TEXT NOT NULL CHECK (state IN ('connected','syncing','error','disconnected')),
 cursor TEXT,
 connection_id TEXT,
 last_success_at TEXT,
 last_error TEXT,
 last_error_at TEXT,
 captured_count INTEGER NOT NULL DEFAULT 0,
 skipped_count INTEGER NOT NULL DEFAULT 0,
 connected_at TEXT,
 disconnected_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE capture_credentials (
 source_id TEXT PRIMARY KEY REFERENCES capture_sources(id) ON DELETE CASCADE,
 ciphertext TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE capture_items (
 id TEXT PRIMARY KEY,
 source_id TEXT NOT NULL REFERENCES capture_sources(id),
 signal_id TEXT NOT NULL UNIQUE REFERENCES signals(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK (kind IN ('message','event')),
 headers TEXT NOT NULL,
 body TEXT NOT NULL,
 captured_at TEXT NOT NULL
);
CREATE TABLE capture_proposals (
 id TEXT PRIMARY KEY,
 proposal_key TEXT NOT NULL UNIQUE,
 signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK (kind IN ('link_signal','create_contact','set_field','next_action','do_not_contact')),
 record_type TEXT CHECK (record_type IN ('contact','company','opportunity')),
 record_id TEXT,
 field TEXT,
 current_value TEXT,
 proposed_value TEXT,
 details_json TEXT NOT NULL,
 status TEXT NOT NULL CHECK (status IN ('pending','accepted','declined')),
 decided_by TEXT,
 decided_at TEXT,
 decided_value TEXT,
 created_at TEXT NOT NULL
);
CREATE INDEX capture_proposals_status ON capture_proposals(status,created_at);
CREATE INDEX capture_proposals_record ON capture_proposals(record_type,record_id);
CREATE TRIGGER archive_guard_capture_sources_insert BEFORE INSERT ON capture_sources
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_capture_sources_update BEFORE UPDATE ON capture_sources
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_capture_sources_delete BEFORE DELETE ON capture_sources
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_capture_items_insert BEFORE INSERT ON capture_items
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_capture_items_update BEFORE UPDATE ON capture_items
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_capture_items_delete BEFORE DELETE ON capture_items
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_capture_proposals_insert BEFORE INSERT ON capture_proposals
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_capture_proposals_update BEFORE UPDATE ON capture_proposals
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_capture_proposals_delete BEFORE DELETE ON capture_proposals
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
