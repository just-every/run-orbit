-- A read projection of the native CRM, never a second writable CRM or account model.
CREATE TABLE graph_records(id TEXT NOT NULL,tenant_id TEXT NOT NULL,workspace_id TEXT NOT NULL,kind TEXT NOT NULL,fields_json TEXT NOT NULL,revision INTEGER NOT NULL,data_epoch INTEGER NOT NULL,visibility TEXT NOT NULL DEFAULT 'workspace',owner_id TEXT,team_id TEXT,retired_into_id TEXT,PRIMARY KEY(workspace_id,kind,id));
CREATE INDEX fold_graph_population ON graph_records(workspace_id,kind,id);
CREATE TABLE graph_workspace_epochs(workspace_id TEXT PRIMARY KEY,epoch INTEGER NOT NULL);
INSERT INTO graph_workspace_epochs VALUES('workspace',1);
CREATE TABLE schema_types(workspace_id TEXT NOT NULL,name TEXT NOT NULL,fields_json TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(workspace_id,name));
-- Index the source row identity in an ordinary content table. Deleting an
-- updated record's fields must not scan every document in the FTS index.
CREATE TABLE record_search_values(id INTEGER PRIMARY KEY,record_id TEXT NOT NULL,record_kind TEXT NOT NULL,workspace_id TEXT NOT NULL,field_name TEXT NOT NULL,body TEXT NOT NULL);
CREATE INDEX fold_search_record ON record_search_values(workspace_id,record_kind,record_id);
CREATE VIRTUAL TABLE record_search_fields USING fts5(record_id UNINDEXED,record_kind UNINDEXED,workspace_id UNINDEXED,field_name UNINDEXED,body,content='record_search_values',content_rowid='id');
CREATE TRIGGER fold_search_values_insert AFTER INSERT ON record_search_values BEGIN
INSERT INTO record_search_fields(rowid,record_id,record_kind,workspace_id,field_name,body) VALUES(NEW.id,NEW.record_id,NEW.record_kind,NEW.workspace_id,NEW.field_name,NEW.body);
END;
CREATE TRIGGER fold_search_values_delete AFTER DELETE ON record_search_values BEGIN
INSERT INTO record_search_fields(record_search_fields,rowid,record_id,record_kind,workspace_id,field_name,body) VALUES('delete',OLD.id,OLD.record_id,OLD.record_kind,OLD.workspace_id,OLD.field_name,OLD.body);
END;
CREATE TRIGGER fold_search_values_update AFTER UPDATE ON record_search_values BEGIN
INSERT INTO record_search_fields(record_search_fields,rowid,record_id,record_kind,workspace_id,field_name,body) VALUES('delete',OLD.id,OLD.record_id,OLD.record_kind,OLD.workspace_id,OLD.field_name,OLD.body);
INSERT INTO record_search_fields(rowid,record_id,record_kind,workspace_id,field_name,body) VALUES(NEW.id,NEW.record_id,NEW.record_kind,NEW.workspace_id,NEW.field_name,NEW.body);
END;
INSERT INTO graph_records SELECT id,'orbit','workspace','company',json_object('id',id,'name',name,'primary_domain',primary_domain,'primary_domain_key',primary_domain_key,'created_at',created_at,'updated_at',updated_at,'custom_fields_json',custom_fields_json),1,1,'workspace',NULL,NULL,NULL FROM companies;
CREATE TRIGGER fold_graph_companies_insert AFTER INSERT ON companies WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
INSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','company',json_object('id',NEW.id,'name',NEW.name,'primary_domain',NEW.primary_domain,'primary_domain_key',NEW.primary_domain_key,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'custom_fields_json',NEW.custom_fields_json),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;
UPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';
END;
CREATE TRIGGER fold_graph_companies_update AFTER UPDATE ON companies WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
INSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','company',json_object('id',NEW.id,'name',NEW.name,'primary_domain',NEW.primary_domain,'primary_domain_key',NEW.primary_domain_key,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'custom_fields_json',NEW.custom_fields_json),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;
UPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';
END;
CREATE TRIGGER fold_graph_companies_delete AFTER DELETE ON companies WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
DELETE FROM graph_records WHERE id=OLD.id AND kind='company';
UPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';
END;
INSERT INTO schema_types VALUES('workspace','company','{}',1);
INSERT INTO graph_records SELECT id,'orbit','workspace','contact',json_object('id',id,'company_id',company_id,'name',name,'email',email,'email_key',email_key,'phone',phone,'job_title',job_title,'timezone',timezone,'contactability',contactability,'created_at',created_at,'updated_at',updated_at,'custom_fields_json',custom_fields_json,'contactability_revision',contactability_revision),1,1,'workspace',NULL,NULL,NULL FROM contacts;
CREATE TRIGGER fold_graph_contacts_insert AFTER INSERT ON contacts WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
INSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','contact',json_object('id',NEW.id,'company_id',NEW.company_id,'name',NEW.name,'email',NEW.email,'email_key',NEW.email_key,'phone',NEW.phone,'job_title',NEW.job_title,'timezone',NEW.timezone,'contactability',NEW.contactability,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'custom_fields_json',NEW.custom_fields_json,'contactability_revision',NEW.contactability_revision),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;
UPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';
END;
CREATE TRIGGER fold_graph_contacts_update AFTER UPDATE ON contacts WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
INSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','contact',json_object('id',NEW.id,'company_id',NEW.company_id,'name',NEW.name,'email',NEW.email,'email_key',NEW.email_key,'phone',NEW.phone,'job_title',NEW.job_title,'timezone',NEW.timezone,'contactability',NEW.contactability,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'custom_fields_json',NEW.custom_fields_json,'contactability_revision',NEW.contactability_revision),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;
UPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';
END;
CREATE TRIGGER fold_graph_contacts_delete AFTER DELETE ON contacts WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
DELETE FROM graph_records WHERE id=OLD.id AND kind='contact';
UPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';
END;
INSERT INTO schema_types VALUES('workspace','contact','{}',1);
INSERT INTO graph_records SELECT id,'orbit','workspace','opportunity',json_set(json_set('{}','$.id',id,'$.title',title,'$.lifecycle',lifecycle,'$.stage_id',stage_id,'$.owner_id',owner_id,'$.company_id',company_id,'$.value_cents',value_cents,'$.expected_close_at',expected_close_at,'$.score',score,'$.band',band,'$.queue_state',queue_state,'$.queue_reason',queue_reason,'$.last_contributing_signal_at',last_contributing_signal_at,'$.created_at',created_at,'$.updated_at',updated_at),'$.next_due_at',next_due_at,'$.custom_fields_json',custom_fields_json,'$.closed_at',closed_at,'$.closed_by',closed_by,'$.close_reason',close_reason),1,1,'workspace',NULL,NULL,NULL FROM opportunities;
CREATE TRIGGER fold_graph_opportunities_insert AFTER INSERT ON opportunities WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
INSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','opportunity',json_set(json_set('{}','$.id',NEW.id,'$.title',NEW.title,'$.lifecycle',NEW.lifecycle,'$.stage_id',NEW.stage_id,'$.owner_id',NEW.owner_id,'$.company_id',NEW.company_id,'$.value_cents',NEW.value_cents,'$.expected_close_at',NEW.expected_close_at,'$.score',NEW.score,'$.band',NEW.band,'$.queue_state',NEW.queue_state,'$.queue_reason',NEW.queue_reason,'$.last_contributing_signal_at',NEW.last_contributing_signal_at,'$.created_at',NEW.created_at,'$.updated_at',NEW.updated_at),'$.next_due_at',NEW.next_due_at,'$.custom_fields_json',NEW.custom_fields_json,'$.closed_at',NEW.closed_at,'$.closed_by',NEW.closed_by,'$.close_reason',NEW.close_reason),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;
UPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';
END;
CREATE TRIGGER fold_graph_opportunities_update AFTER UPDATE ON opportunities WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
INSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','opportunity',json_set(json_set('{}','$.id',NEW.id,'$.title',NEW.title,'$.lifecycle',NEW.lifecycle,'$.stage_id',NEW.stage_id,'$.owner_id',NEW.owner_id,'$.company_id',NEW.company_id,'$.value_cents',NEW.value_cents,'$.expected_close_at',NEW.expected_close_at,'$.score',NEW.score,'$.band',NEW.band,'$.queue_state',NEW.queue_state,'$.queue_reason',NEW.queue_reason,'$.last_contributing_signal_at',NEW.last_contributing_signal_at,'$.created_at',NEW.created_at,'$.updated_at',NEW.updated_at),'$.next_due_at',NEW.next_due_at,'$.custom_fields_json',NEW.custom_fields_json,'$.closed_at',NEW.closed_at,'$.closed_by',NEW.closed_by,'$.close_reason',NEW.close_reason),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;
UPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';
END;
CREATE TRIGGER fold_graph_opportunities_delete AFTER DELETE ON opportunities WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
DELETE FROM graph_records WHERE id=OLD.id AND kind='opportunity';
UPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';
END;
INSERT INTO schema_types VALUES('workspace','opportunity','{}',1);
INSERT INTO record_search_values(record_id,record_kind,workspace_id,field_name,body) SELECT r.id,r.kind,r.workspace_id,f.key,CAST(f.value AS TEXT) FROM graph_records r,json_each(r.fields_json) f WHERE f.value IS NOT NULL;
CREATE TRIGGER fold_graph_search_insert AFTER INSERT ON graph_records BEGIN
INSERT INTO record_search_values(record_id,record_kind,workspace_id,field_name,body) SELECT NEW.id,NEW.kind,NEW.workspace_id,f.key,CAST(f.value AS TEXT) FROM json_each(NEW.fields_json) f WHERE f.value IS NOT NULL;
END;
CREATE TRIGGER fold_graph_search_update AFTER UPDATE ON graph_records BEGIN
DELETE FROM record_search_values WHERE workspace_id=OLD.workspace_id AND record_kind=OLD.kind AND record_id=OLD.id;
INSERT INTO record_search_values(record_id,record_kind,workspace_id,field_name,body) SELECT NEW.id,NEW.kind,NEW.workspace_id,f.key,CAST(f.value AS TEXT) FROM json_each(NEW.fields_json) f WHERE f.value IS NOT NULL;
END;
CREATE TRIGGER fold_graph_search_delete AFTER DELETE ON graph_records BEGIN
DELETE FROM record_search_values WHERE workspace_id=OLD.workspace_id AND record_kind=OLD.kind AND record_id=OLD.id;
END;
CREATE TRIGGER fold_graph_policy_graph_records_update AFTER UPDATE ON graph_records WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN UPDATE graph_workspace_epochs SET epoch=epoch+1; END;
CREATE TRIGGER fold_graph_policy_graph_records_delete AFTER DELETE ON graph_records WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN UPDATE graph_workspace_epochs SET epoch=epoch+1; END;
CREATE TRIGGER fold_graph_policy_schema_types_update AFTER UPDATE ON schema_types WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN UPDATE graph_workspace_epochs SET epoch=epoch+1; END;
CREATE TRIGGER fold_graph_policy_schema_types_delete AFTER DELETE ON schema_types WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN UPDATE graph_workspace_epochs SET epoch=epoch+1; END;
CREATE TRIGGER fold_graph_insert_epoch AFTER INSERT ON graph_records WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN UPDATE graph_workspace_epochs SET epoch=epoch+1;END;
CREATE TRIGGER fold_record_privacy_epoch AFTER UPDATE OF visibility,owner_id,team_id ON graph_records WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1;END;
CREATE TRIGGER fold_field_privacy_epoch AFTER UPDATE OF fields_json ON schema_types WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1;END;

-- Generated complete native projection at maintenance release.
CREATE TRIGGER fold_restore_projection_release AFTER DELETE ON runtime_controls WHEN OLD.name='restore' BEGIN
 INSERT INTO graph_records SELECT id,'orbit','workspace','company',json_object('id',id,'name',name,'primary_domain',primary_domain,'primary_domain_key',primary_domain_key,'created_at',created_at,'updated_at',updated_at,'custom_fields_json',custom_fields_json),1,1,'workspace',NULL,NULL,NULL FROM companies WHERE true ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1 WHERE graph_records.fields_json<>excluded.fields_json;
 INSERT INTO graph_records SELECT id,'orbit','workspace','contact',json_object('id',id,'company_id',company_id,'name',name,'email',email,'email_key',email_key,'phone',phone,'job_title',job_title,'timezone',timezone,'contactability',contactability,'created_at',created_at,'updated_at',updated_at,'custom_fields_json',custom_fields_json,'contactability_revision',contactability_revision),1,1,'workspace',NULL,NULL,NULL FROM contacts WHERE true ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1 WHERE graph_records.fields_json<>excluded.fields_json;
 INSERT INTO graph_records SELECT id,'orbit','workspace','opportunity',json_set(json_set('{}','$.id',id,'$.title',title,'$.lifecycle',lifecycle,'$.stage_id',stage_id,'$.owner_id',owner_id,'$.company_id',company_id,'$.value_cents',value_cents,'$.expected_close_at',expected_close_at,'$.score',score,'$.band',band,'$.queue_state',queue_state,'$.queue_reason',queue_reason,'$.last_contributing_signal_at',last_contributing_signal_at,'$.created_at',created_at,'$.updated_at',updated_at),'$.next_due_at',next_due_at,'$.custom_fields_json',custom_fields_json,'$.closed_at',closed_at,'$.closed_by',closed_by,'$.close_reason',close_reason),1,1,'workspace',NULL,NULL,NULL FROM opportunities WHERE true ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1 WHERE graph_records.fields_json<>excluded.fields_json;
END;
