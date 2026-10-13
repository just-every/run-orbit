CREATE TABLE mail_provider_conflicts (
 event_id TEXT NOT NULL REFERENCES mail_provider_events(id),
 accepted_hash TEXT NOT NULL,
 rejected_hash TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(event_id,rejected_hash)
);
CREATE TRIGGER archive_guard_mail_provider_conflicts_insert BEFORE INSERT ON mail_provider_conflicts
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_mail_provider_conflicts_delete BEFORE DELETE ON mail_provider_conflicts
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_mail_provider_conflicts_update BEFORE UPDATE ON mail_provider_conflicts
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
