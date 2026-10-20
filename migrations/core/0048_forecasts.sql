-- Reviewed configuration is append-only. No default stage probability is treated as reviewed.
CREATE TABLE forecast_revisions (
 id TEXT PRIMARY KEY,
 workspace_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN('stage','deal','quota')),
 target_key TEXT NOT NULL,
 subject_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0),
 body_json TEXT NOT NULL CHECK(json_valid(body_json)),
 actor_id TEXT NOT NULL,
 reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 2000),
 reviewed_at TEXT NOT NULL,
 UNIQUE(workspace_id,kind,target_key,revision)
);
CREATE INDEX forecast_revisions_current ON forecast_revisions(workspace_id,kind,target_key,revision DESC);
CREATE TRIGGER forecast_revisions_immutable BEFORE UPDATE ON forecast_revisions BEGIN SELECT RAISE(ABORT,'FORECAST_IMMUTABLE'); END;
CREATE TABLE forecast_snapshots (
 id TEXT PRIMARY KEY,
 workspace_id TEXT NOT NULL,
 from_date TEXT NOT NULL,
 through_date TEXT NOT NULL,
 as_of TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 review_hash TEXT NOT NULL,
 body_json TEXT NOT NULL CHECK(json_valid(body_json))
);
CREATE INDEX forecast_snapshots_history ON forecast_snapshots(workspace_id,as_of DESC,id);
CREATE TRIGGER forecast_snapshots_immutable BEFORE UPDATE ON forecast_snapshots BEGIN SELECT RAISE(ABORT,'FORECAST_IMMUTABLE'); END;
-- Kept outside the body so erasure deletes an affected snapshot in full.
CREATE TABLE forecast_snapshot_records (
 snapshot_id TEXT NOT NULL REFERENCES forecast_snapshots(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN('opportunity','company','contact','operator')),
 record_id TEXT NOT NULL,
 PRIMARY KEY(snapshot_id,kind,record_id)
);
CREATE INDEX forecast_snapshot_records_record ON forecast_snapshot_records(kind,record_id,snapshot_id);
CREATE TRIGGER forecast_snapshot_records_immutable BEFORE UPDATE ON forecast_snapshot_records BEGIN SELECT RAISE(ABORT,'FORECAST_IMMUTABLE'); END;
-- A transactionally maintained source clock guards native edits, additions and deletions.
-- Snapshot creation compares it in the same batch that inserts the immutable body.
CREATE TABLE forecast_source_clock (id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL);
INSERT INTO forecast_source_clock VALUES(1,1);
CREATE TRIGGER forecast_clock_opportunities_insert AFTER INSERT ON opportunities WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_opportunities_update AFTER UPDATE ON opportunities WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_opportunities_delete AFTER DELETE ON opportunities WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_opportunity_contacts_insert AFTER INSERT ON opportunity_contacts WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_opportunity_contacts_update AFTER UPDATE ON opportunity_contacts WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_opportunity_contacts_delete AFTER DELETE ON opportunity_contacts WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_pipeline_stages_insert AFTER INSERT ON pipeline_stages WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_pipeline_stages_update AFTER UPDATE ON pipeline_stages WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_pipeline_stages_delete AFTER DELETE ON pipeline_stages WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_pipeline_stage_rules_insert AFTER INSERT ON pipeline_stage_rules WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_pipeline_stage_rules_update AFTER UPDATE ON pipeline_stage_rules WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_pipeline_stage_rules_delete AFTER DELETE ON pipeline_stage_rules WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_operators_insert AFTER INSERT ON operators WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_operators_update AFTER UPDATE ON operators WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_operators_delete AFTER DELETE ON operators WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_workspace_settings_insert AFTER INSERT ON workspace_settings WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_workspace_settings_update AFTER UPDATE ON workspace_settings WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_workspace_settings_delete AFTER DELETE ON workspace_settings WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_forecast_revisions_insert AFTER INSERT ON forecast_revisions WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_forecast_revisions_update AFTER UPDATE ON forecast_revisions WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_clock_forecast_revisions_delete AFTER DELETE ON forecast_revisions WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE forecast_source_clock SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER forecast_revisions_archive_insert BEFORE INSERT ON forecast_revisions WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying') BEGIN SELECT RAISE(ABORT,'ARCHIVE_IMPORT_ACTIVE'); END;
CREATE TRIGGER forecast_revisions_archive_delete BEFORE DELETE ON forecast_revisions WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying') BEGIN SELECT RAISE(ABORT,'ARCHIVE_IMPORT_ACTIVE'); END;
CREATE TRIGGER forecast_snapshots_archive_insert BEFORE INSERT ON forecast_snapshots WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying') BEGIN SELECT RAISE(ABORT,'ARCHIVE_IMPORT_ACTIVE'); END;
CREATE TRIGGER forecast_snapshots_archive_delete BEFORE DELETE ON forecast_snapshots WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying') BEGIN SELECT RAISE(ABORT,'ARCHIVE_IMPORT_ACTIVE'); END;
CREATE TRIGGER forecast_snapshot_records_archive_insert BEFORE INSERT ON forecast_snapshot_records WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying') BEGIN SELECT RAISE(ABORT,'ARCHIVE_IMPORT_ACTIVE'); END;
CREATE TRIGGER forecast_snapshot_records_archive_delete BEFORE DELETE ON forecast_snapshot_records WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying') BEGIN SELECT RAISE(ABORT,'ARCHIVE_IMPORT_ACTIVE'); END;
