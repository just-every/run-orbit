-- Keep pipeline_stages' five-column shape for installed integrations and archives.
CREATE TABLE pipelines (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
 is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN(0,1)),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX pipelines_default ON pipelines(is_default) WHERE is_default=1;
CREATE UNIQUE INDEX pipelines_name ON pipelines(lower(trim(name)));
CREATE TABLE pipeline_stage_rules (
 stage_id TEXT PRIMARY KEY REFERENCES pipeline_stages(id) ON DELETE CASCADE,
 pipeline_id TEXT NOT NULL REFERENCES pipelines(id) ON DELETE RESTRICT,
 probability REAL NOT NULL DEFAULT 0 CHECK(probability BETWEEN 0 AND 100),
 required_fields_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(required_fields_json) AND json_type(required_fields_json)='array'),
 stale_interval_days INTEGER CHECK(stale_interval_days IS NULL OR (typeof(stale_interval_days)='integer' AND stale_interval_days BETWEEN 1 AND 365))
);
CREATE INDEX pipeline_stage_rules_pipeline ON pipeline_stage_rules(pipeline_id,stage_id);
INSERT INTO pipelines VALUES('00000000000000000000000001','Sales pipeline',1,1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
INSERT INTO pipeline_stage_rules(stage_id,pipeline_id) SELECT id,'00000000000000000000000001' FROM pipeline_stages;

-- Legacy stage creators still belong to the installation's default pipeline.
-- Restore loads sidecar rows explicitly; finish attaches pre-pipeline archives.
CREATE TRIGGER pipeline_stage_default AFTER INSERT ON pipeline_stages
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore')
BEGIN
 INSERT INTO pipeline_stage_rules(stage_id,pipeline_id) SELECT NEW.id,id FROM pipelines WHERE is_default=1;
END;
CREATE TRIGGER pipeline_restore_stage_rules AFTER DELETE ON runtime_controls
WHEN OLD.name='restore'
BEGIN
 INSERT INTO pipelines(id,name,is_default,created_at,updated_at)
 SELECT '00000000000000000000000001','Sales pipeline',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE NOT EXISTS(SELECT 1 FROM pipelines);
 INSERT INTO pipeline_stage_rules(stage_id,pipeline_id)
 SELECT s.id,p.id FROM pipeline_stages s CROSS JOIN pipelines p WHERE p.is_default=1 AND NOT EXISTS(SELECT 1 FROM pipeline_stage_rules r WHERE r.stage_id=s.id);
END;
CREATE TRIGGER pipeline_stage_occupied BEFORE DELETE ON pipeline_stages
WHEN EXISTS(SELECT 1 FROM opportunities WHERE stage_id=OLD.id)
BEGIN SELECT RAISE(ABORT,'PIPELINE_STAGE_OCCUPIED'); END;
CREATE TRIGGER pipeline_occupied BEFORE DELETE ON pipelines
WHEN EXISTS(SELECT 1 FROM opportunities o JOIN pipeline_stage_rules r ON r.stage_id=o.stage_id WHERE r.pipeline_id=OLD.id)
BEGIN SELECT RAISE(ABORT,'PIPELINE_OCCUPIED'); END;
CREATE TRIGGER pipeline_stage_membership_occupied BEFORE UPDATE OF pipeline_id ON pipeline_stage_rules
WHEN NEW.pipeline_id<>OLD.pipeline_id AND EXISTS(SELECT 1 FROM opportunities WHERE stage_id=OLD.stage_id)
BEGIN SELECT RAISE(ABORT,'PIPELINE_STAGE_OCCUPIED'); END;

CREATE TRIGGER pipelines_archive_insert BEFORE INSERT ON pipelines WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying') BEGIN SELECT RAISE(ABORT,'ARCHIVE_IMPORT_ACTIVE'); END;
CREATE TRIGGER pipelines_archive_update BEFORE UPDATE ON pipelines WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying') BEGIN SELECT RAISE(ABORT,'ARCHIVE_IMPORT_ACTIVE'); END;
CREATE TRIGGER pipelines_archive_delete BEFORE DELETE ON pipelines WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying') BEGIN SELECT RAISE(ABORT,'ARCHIVE_IMPORT_ACTIVE'); END;
CREATE TRIGGER pipeline_rules_archive_insert BEFORE INSERT ON pipeline_stage_rules WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying') BEGIN SELECT RAISE(ABORT,'ARCHIVE_IMPORT_ACTIVE'); END;
CREATE TRIGGER pipeline_rules_archive_update BEFORE UPDATE ON pipeline_stage_rules WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying') BEGIN SELECT RAISE(ABORT,'ARCHIVE_IMPORT_ACTIVE'); END;
CREATE TRIGGER pipeline_rules_archive_delete BEFORE DELETE ON pipeline_stage_rules WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying') BEGIN SELECT RAISE(ABORT,'ARCHIVE_IMPORT_ACTIVE'); END;
