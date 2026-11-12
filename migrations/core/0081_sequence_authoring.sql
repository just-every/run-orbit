-- Authoring only: no enrollments, schedules, recipients or dispatch authority.
CREATE TABLE sequences (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES operators(id),
 visibility TEXT NOT NULL CHECK(visibility IN('private','workspace')),
 version INTEGER NOT NULL CHECK(version>0),
 source_id TEXT,
 source_version INTEGER,
 created_at TEXT NOT NULL,
 CHECK((source_id IS NULL AND source_version IS NULL) OR (source_id IS NOT NULL AND source_version IS NOT NULL AND source_version>0))
);
CREATE INDEX sequences_owner_visibility ON sequences(owner_id,visibility);
CREATE TABLE sequence_versions (
 sequence_id TEXT NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
 version INTEGER NOT NULL CHECK(version>0),
 name TEXT NOT NULL,
 steps_json TEXT NOT NULL CHECK(json_valid(steps_json)),
 calendar_json TEXT NOT NULL CHECK(json_valid(calendar_json)),
 created_at TEXT NOT NULL,
 created_by TEXT NOT NULL REFERENCES operators(id),
 PRIMARY KEY(sequence_id,version)
);
CREATE TRIGGER sequence_versions_immutable BEFORE UPDATE ON sequence_versions
BEGIN SELECT RAISE(ABORT,'Sequence versions are immutable'); END;
