-- A reviewed form's explicit rotation list is saved in its content revision.
-- Only its cursor survives submissions; no customer data or public authority.
CREATE TABLE form_assignment_rotation (
 form_id TEXT PRIMARY KEY REFERENCES content_entities(id) ON DELETE CASCADE,
 last_operator_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
 revision INTEGER NOT NULL CHECK(revision>0),
 updated_at TEXT NOT NULL
);
CREATE TRIGGER archive_guard_form_rotation_insert BEFORE INSERT ON form_assignment_rotation
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_form_rotation_update BEFORE UPDATE ON form_assignment_rotation
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_form_rotation_delete BEFORE DELETE ON form_assignment_rotation
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
