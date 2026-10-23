-- Native sales ownership is independent of the graph privacy principal and deal owners.
ALTER TABLE contacts ADD COLUMN owner_id TEXT REFERENCES operators(id) ON DELETE SET NULL;
ALTER TABLE companies ADD COLUMN owner_id TEXT REFERENCES operators(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN owner_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE companies ADD COLUMN owner_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE opportunities ADD COLUMN owner_revision INTEGER NOT NULL DEFAULT 0;
CREATE INDEX contacts_owner_id ON contacts(owner_id);
CREATE INDEX companies_owner_id ON companies(owner_id);
-- Installation-local authority and reviewed snapshots never travel in archives.
CREATE TABLE record_owner_reviews(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,session_id TEXT,kind TEXT NOT NULL,owner_id TEXT,owner_name TEXT,items_json TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL);
CREATE TABLE record_owner_batches(id TEXT PRIMARY KEY,review_id TEXT NOT NULL UNIQUE,actor_id TEXT NOT NULL,kind TEXT NOT NULL,owner_id TEXT,owner_name TEXT,created_at TEXT NOT NULL,result_json TEXT,undone_at TEXT,undo_json TEXT);
CREATE TABLE record_owner_batch_items(batch_id TEXT NOT NULL REFERENCES record_owner_batches(id) ON DELETE CASCADE,record_id TEXT NOT NULL,name TEXT NOT NULL,previous_owner_id TEXT,previous_owner_name TEXT,applied_revision INTEGER NOT NULL,changed INTEGER NOT NULL DEFAULT 1,undone INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(batch_id,record_id));
CREATE TABLE record_owner_notification_links(notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,kind TEXT NOT NULL,record_id TEXT NOT NULL,name TEXT NOT NULL,previous_owner_id TEXT,previous_owner_name TEXT,actor_id TEXT NOT NULL,href TEXT NOT NULL,PRIMARY KEY(notification_id,kind,record_id));
CREATE TRIGGER record_owner_contacts_revision AFTER UPDATE OF owner_id ON contacts WHEN OLD.owner_id IS NOT NEW.owner_id AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 UPDATE contacts SET owner_revision=OLD.owner_revision+1 WHERE id=NEW.id;
END;
CREATE TRIGGER record_owner_contacts_erasure BEFORE DELETE ON contacts BEGIN
 DELETE FROM notifications WHERE id IN(SELECT notification_id FROM record_owner_notification_links WHERE kind='contact' AND record_id=OLD.id);
 DELETE FROM record_owner_reviews WHERE kind='contact' AND EXISTS(SELECT 1 FROM json_each(items_json) WHERE json_extract(value,'$.id')=OLD.id);
 UPDATE record_owner_batches SET result_json=NULL,undo_json=NULL WHERE kind='contact' AND (id IN(SELECT batch_id FROM record_owner_batch_items WHERE record_id=OLD.id) OR EXISTS(SELECT 1 FROM json_each(result_json,'$.failures') WHERE json_extract(value,'$.id')=OLD.id));
 DELETE FROM record_owner_batch_items WHERE record_id=OLD.id AND batch_id IN(SELECT id FROM record_owner_batches WHERE kind='contact');
END;
CREATE TRIGGER record_owner_companies_revision AFTER UPDATE OF owner_id ON companies WHEN OLD.owner_id IS NOT NEW.owner_id AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 UPDATE companies SET owner_revision=OLD.owner_revision+1 WHERE id=NEW.id;
END;
CREATE TRIGGER record_owner_companies_erasure BEFORE DELETE ON companies BEGIN
 DELETE FROM notifications WHERE id IN(SELECT notification_id FROM record_owner_notification_links WHERE kind='company' AND record_id=OLD.id);
 DELETE FROM record_owner_reviews WHERE kind='company' AND EXISTS(SELECT 1 FROM json_each(items_json) WHERE json_extract(value,'$.id')=OLD.id);
 UPDATE record_owner_batches SET result_json=NULL,undo_json=NULL WHERE kind='company' AND (id IN(SELECT batch_id FROM record_owner_batch_items WHERE record_id=OLD.id) OR EXISTS(SELECT 1 FROM json_each(result_json,'$.failures') WHERE json_extract(value,'$.id')=OLD.id));
 DELETE FROM record_owner_batch_items WHERE record_id=OLD.id AND batch_id IN(SELECT id FROM record_owner_batches WHERE kind='company');
END;
CREATE TRIGGER record_owner_opportunities_revision AFTER UPDATE OF owner_id ON opportunities WHEN OLD.owner_id IS NOT NEW.owner_id AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 UPDATE opportunities SET owner_revision=OLD.owner_revision+1 WHERE id=NEW.id;
END;
CREATE TRIGGER record_owner_opportunities_erasure BEFORE DELETE ON opportunities BEGIN
 DELETE FROM notifications WHERE id IN(SELECT notification_id FROM record_owner_notification_links WHERE kind='opportunity' AND record_id=OLD.id);
 DELETE FROM record_owner_reviews WHERE kind='opportunity' AND EXISTS(SELECT 1 FROM json_each(items_json) WHERE json_extract(value,'$.id')=OLD.id);
 UPDATE record_owner_batches SET result_json=NULL,undo_json=NULL WHERE kind='opportunity' AND (id IN(SELECT batch_id FROM record_owner_batch_items WHERE record_id=OLD.id) OR EXISTS(SELECT 1 FROM json_each(result_json,'$.failures') WHERE json_extract(value,'$.id')=OLD.id));
 DELETE FROM record_owner_batch_items WHERE record_id=OLD.id AND batch_id IN(SELECT id FROM record_owner_batches WHERE kind='opportunity');
END;
DROP TRIGGER fold_graph_companies_insert;
CREATE TRIGGER fold_graph_companies_insert AFTER INSERT ON companies WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
INSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','company',json_set(json_object('id',NEW.id,'name',NEW.name,'primary_domain',NEW.primary_domain,'primary_domain_key',NEW.primary_domain_key,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'custom_fields_json',NEW.custom_fields_json),'$.owner_id',NEW.owner_id,'$.owner_revision',NEW.owner_revision),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;
UPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';
END;
DROP TRIGGER fold_graph_companies_update;
CREATE TRIGGER fold_graph_companies_update AFTER UPDATE ON companies WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
INSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','company',json_set(json_object('id',NEW.id,'name',NEW.name,'primary_domain',NEW.primary_domain,'primary_domain_key',NEW.primary_domain_key,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'custom_fields_json',NEW.custom_fields_json),'$.owner_id',NEW.owner_id,'$.owner_revision',NEW.owner_revision),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;
UPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';
END;
DROP TRIGGER fold_graph_contacts_insert;
CREATE TRIGGER fold_graph_contacts_insert AFTER INSERT ON contacts WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
INSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','contact',json_set(json_object('id',NEW.id,'company_id',NEW.company_id,'name',NEW.name,'email',NEW.email,'email_key',NEW.email_key,'phone',NEW.phone,'job_title',NEW.job_title,'timezone',NEW.timezone,'contactability',NEW.contactability,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'custom_fields_json',NEW.custom_fields_json,'contactability_revision',NEW.contactability_revision),'$.owner_id',NEW.owner_id,'$.owner_revision',NEW.owner_revision),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;
UPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';
END;
DROP TRIGGER fold_graph_contacts_update;
CREATE TRIGGER fold_graph_contacts_update AFTER UPDATE ON contacts WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
INSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','contact',json_set(json_object('id',NEW.id,'company_id',NEW.company_id,'name',NEW.name,'email',NEW.email,'email_key',NEW.email_key,'phone',NEW.phone,'job_title',NEW.job_title,'timezone',NEW.timezone,'contactability',NEW.contactability,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'custom_fields_json',NEW.custom_fields_json,'contactability_revision',NEW.contactability_revision),'$.owner_id',NEW.owner_id,'$.owner_revision',NEW.owner_revision),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;
UPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';
END;
DROP TRIGGER fold_restore_projection_release;
CREATE TRIGGER fold_restore_projection_release AFTER DELETE ON runtime_controls WHEN OLD.name='restore' BEGIN
 INSERT INTO graph_records SELECT id,'orbit','workspace','company',json_set(json_object('id',id,'name',name,'primary_domain',primary_domain,'primary_domain_key',primary_domain_key,'created_at',created_at,'updated_at',updated_at,'custom_fields_json',custom_fields_json),'$.owner_id',owner_id,'$.owner_revision',owner_revision),1,1,'workspace',NULL,NULL,NULL FROM companies WHERE true ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1 WHERE graph_records.fields_json<>excluded.fields_json;
 INSERT INTO graph_records SELECT id,'orbit','workspace','contact',json_set(json_object('id',id,'company_id',company_id,'name',name,'email',email,'email_key',email_key,'phone',phone,'job_title',job_title,'timezone',timezone,'contactability',contactability,'created_at',created_at,'updated_at',updated_at,'custom_fields_json',custom_fields_json,'contactability_revision',contactability_revision),'$.owner_id',owner_id,'$.owner_revision',owner_revision),1,1,'workspace',NULL,NULL,NULL FROM contacts WHERE true ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1 WHERE graph_records.fields_json<>excluded.fields_json;
 INSERT INTO graph_records SELECT id,'orbit','workspace','opportunity',json_set(json_set('{}','$.id',id,'$.title',title,'$.lifecycle',lifecycle,'$.stage_id',stage_id,'$.owner_id',owner_id,'$.company_id',company_id,'$.value_cents',value_cents,'$.expected_close_at',expected_close_at,'$.score',score,'$.band',band,'$.queue_state',queue_state,'$.queue_reason',queue_reason,'$.last_contributing_signal_at',last_contributing_signal_at,'$.created_at',created_at,'$.updated_at',updated_at),'$.next_due_at',next_due_at,'$.custom_fields_json',custom_fields_json,'$.closed_at',closed_at,'$.closed_by',closed_by,'$.close_reason',close_reason),1,1,'workspace',NULL,NULL,NULL FROM opportunities WHERE true ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1 WHERE graph_records.fields_json<>excluded.fields_json;
END;
UPDATE graph_records SET fields_json=json_set(fields_json,'$.owner_id',(SELECT owner_id FROM contacts WHERE id=graph_records.id),'$.owner_revision',(SELECT owner_revision FROM contacts WHERE id=graph_records.id)) WHERE kind='contact';
UPDATE graph_records SET fields_json=json_set(fields_json,'$.owner_id',(SELECT owner_id FROM companies WHERE id=graph_records.id),'$.owner_revision',(SELECT owner_revision FROM companies WHERE id=graph_records.id)) WHERE kind='company';
-- Reviewed authority is installation-local and is revoked by a restore.
CREATE TRIGGER record_owner_restore_local AFTER DELETE ON runtime_controls WHEN OLD.name='restore' BEGIN
 DELETE FROM record_owner_reviews;
 DELETE FROM record_owner_batches;
END;
