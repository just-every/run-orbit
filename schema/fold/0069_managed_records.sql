-- Leads and administrator-defined object types have their own native source.
-- graph_records remains a read projection; its existing FTS triggers index it.
CREATE TABLE managed_record_types (
 name TEXT PRIMARY KEY,
 label TEXT NOT NULL,
 fields_json TEXT NOT NULL CHECK(json_valid(fields_json) AND json_type(fields_json)='object'),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE managed_records (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL REFERENCES managed_record_types(name),
 owner_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
 fields_json TEXT NOT NULL CHECK(json_valid(fields_json) AND json_type(fields_json)='object'),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX managed_records_kind ON managed_records(kind,id);
CREATE INDEX managed_records_owner ON managed_records(owner_id,kind,id);
INSERT INTO managed_record_types(name,label,fields_json,version,created_at,updated_at) VALUES
 ('lead','Leads','{"name":{"label":"Record name","type":"text","required":true,"sensitivity":"public"},"email":{"label":"Email","type":"text","required":false,"sensitivity":"public"},"phone":{"label":"Phone","type":"text","required":false,"sensitivity":"public"},"description":{"label":"Description","type":"text","required":false,"sensitivity":"public"}}',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE TRIGGER managed_types_insert AFTER INSERT ON managed_record_types
 WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN
 INSERT INTO schema_types(workspace_id,name,fields_json,version) VALUES('workspace',NEW.name,NEW.fields_json,NEW.version);
 UPDATE access_workspaces SET policy_epoch=policy_epoch+1;
END;
CREATE TRIGGER managed_types_update AFTER UPDATE ON managed_record_types
 WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN
 INSERT INTO schema_types(workspace_id,name,fields_json,version) VALUES('workspace',NEW.name,NEW.fields_json,NEW.version)
 ON CONFLICT(workspace_id,name) DO UPDATE SET fields_json=excluded.fields_json,version=excluded.version;
 UPDATE access_workspaces SET policy_epoch=policy_epoch+1;
END;
CREATE TRIGGER managed_records_insert AFTER INSERT ON managed_records
 WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN
 INSERT INTO graph_records(id,tenant_id,workspace_id,kind,fields_json,revision,data_epoch,visibility,owner_id)
 VALUES(NEW.id,'orbit','workspace',NEW.kind,json_set(NEW.fields_json,'$.id',NEW.id,'$.owner_id',NEW.owner_id,'$.created_at',NEW.created_at,'$.updated_at',NEW.updated_at),NEW.revision,NEW.revision,'workspace',NEW.owner_id);
END;
CREATE TRIGGER managed_records_update AFTER UPDATE ON managed_records
 WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN
 INSERT INTO graph_records(id,tenant_id,workspace_id,kind,fields_json,revision,data_epoch,visibility,owner_id)
 VALUES(NEW.id,'orbit','workspace',NEW.kind,json_set(NEW.fields_json,'$.id',NEW.id,'$.owner_id',NEW.owner_id,'$.created_at',NEW.created_at,'$.updated_at',NEW.updated_at),NEW.revision,NEW.revision,'workspace',NEW.owner_id)
 ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,owner_id=excluded.owner_id,revision=graph_records.revision+1,data_epoch=graph_records.data_epoch+1;
END;
CREATE TRIGGER managed_records_delete AFTER DELETE ON managed_records
 WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN
 DELETE FROM graph_records WHERE workspace_id='workspace' AND kind=OLD.kind AND id=OLD.id;
 DELETE FROM sales_record_shares WHERE kind=OLD.kind AND record_id=OLD.id;
 DELETE FROM access_grants WHERE workspace_id='workspace' AND resource_type=OLD.kind AND resource_id=OLD.id;
 UPDATE audit_entries SET entity_id='erased',details_json='{}' WHERE (entity_type=OLD.kind AND entity_id=OLD.id) OR instr(details_json,OLD.id)>0;
END;
-- A graph erasure must not leave a second copy in native source storage.
CREATE TRIGGER managed_graph_delete AFTER DELETE ON graph_records
 WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) AND EXISTS(SELECT 1 FROM managed_records WHERE kind=OLD.kind AND id=OLD.id) BEGIN
 DELETE FROM managed_records WHERE kind=OLD.kind AND id=OLD.id;
END;
