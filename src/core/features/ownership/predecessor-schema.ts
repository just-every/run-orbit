// Exact installed objects before migration 0042; retained archive hash lineage.
export const ownershipPredecessorObjects=[
 {
  "type": "table",
  "name": "companies",
  "sql": "CREATE TABLE companies (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  primary_domain TEXT,\n  primary_domain_key TEXT UNIQUE,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n, custom_fields_json TEXT NOT NULL DEFAULT '{}')"
 },
 {
  "type": "table",
  "name": "contacts",
  "sql": "CREATE TABLE contacts (\n  id TEXT PRIMARY KEY,\n  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,\n  name TEXT,\n  email TEXT,\n  email_key TEXT UNIQUE,\n  phone TEXT,\n  job_title TEXT,\n  timezone TEXT,\n  contactability TEXT NOT NULL CHECK (contactability IN ('contactable', 'do_not_contact')),\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n, custom_fields_json TEXT NOT NULL DEFAULT '{}', contactability_revision INTEGER NOT NULL DEFAULT 0)"
 },
 {
  "type": "table",
  "name": "opportunities",
  "sql": "CREATE TABLE opportunities (\n  id TEXT PRIMARY KEY,\n  title TEXT NOT NULL,\n  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('open', 'won', 'lost')),\n  stage_id TEXT NOT NULL REFERENCES pipeline_stages(id),\n  owner_id TEXT REFERENCES operators(id) ON DELETE SET NULL,\n  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,\n  value_cents INTEGER NOT NULL,\n  expected_close_at TEXT,\n  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),\n  band TEXT NOT NULL CHECK (band IN ('low', 'medium', 'high')),\n  queue_state TEXT NOT NULL CHECK (queue_state IN ('now', 'next', 'none')),\n  queue_reason TEXT,\n  last_contributing_signal_at TEXT,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n, next_due_at TEXT, custom_fields_json TEXT NOT NULL DEFAULT '{}', closed_at TEXT, closed_by TEXT REFERENCES operators(id), close_reason TEXT)"
 },
 {
  "type": "trigger",
  "name": "fold_graph_companies_insert",
  "sql": "CREATE TRIGGER fold_graph_companies_insert AFTER INSERT ON companies WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN\nINSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','company',json_object('id',NEW.id,'name',NEW.name,'primary_domain',NEW.primary_domain,'primary_domain_key',NEW.primary_domain_key,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'custom_fields_json',NEW.custom_fields_json),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;\nUPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';\nEND"
 },
 {
  "type": "trigger",
  "name": "fold_graph_companies_update",
  "sql": "CREATE TRIGGER fold_graph_companies_update AFTER UPDATE ON companies WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN\nINSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','company',json_object('id',NEW.id,'name',NEW.name,'primary_domain',NEW.primary_domain,'primary_domain_key',NEW.primary_domain_key,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'custom_fields_json',NEW.custom_fields_json),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;\nUPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';\nEND"
 },
 {
  "type": "trigger",
  "name": "fold_graph_contacts_insert",
  "sql": "CREATE TRIGGER fold_graph_contacts_insert AFTER INSERT ON contacts WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN\nINSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','contact',json_object('id',NEW.id,'company_id',NEW.company_id,'name',NEW.name,'email',NEW.email,'email_key',NEW.email_key,'phone',NEW.phone,'job_title',NEW.job_title,'timezone',NEW.timezone,'contactability',NEW.contactability,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'custom_fields_json',NEW.custom_fields_json,'contactability_revision',NEW.contactability_revision),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;\nUPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';\nEND"
 },
 {
  "type": "trigger",
  "name": "fold_graph_contacts_update",
  "sql": "CREATE TRIGGER fold_graph_contacts_update AFTER UPDATE ON contacts WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN\nINSERT INTO graph_records VALUES(NEW.id,'orbit','workspace','contact',json_object('id',NEW.id,'company_id',NEW.company_id,'name',NEW.name,'email',NEW.email,'email_key',NEW.email_key,'phone',NEW.phone,'job_title',NEW.job_title,'timezone',NEW.timezone,'contactability',NEW.contactability,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'custom_fields_json',NEW.custom_fields_json,'contactability_revision',NEW.contactability_revision),1,1,'workspace',NULL,NULL,NULL) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1;\nUPDATE graph_workspace_epochs SET epoch=epoch+1 WHERE workspace_id='workspace';\nEND"
 },
 {
  "type": "trigger",
  "name": "fold_restore_projection_release",
  "sql": "CREATE TRIGGER fold_restore_projection_release AFTER DELETE ON runtime_controls WHEN OLD.name='restore' BEGIN\n INSERT INTO graph_records SELECT id,'orbit','workspace','company',json_object('id',id,'name',name,'primary_domain',primary_domain,'primary_domain_key',primary_domain_key,'created_at',created_at,'updated_at',updated_at,'custom_fields_json',custom_fields_json),1,1,'workspace',NULL,NULL,NULL FROM companies WHERE true ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1 WHERE graph_records.fields_json<>excluded.fields_json;\n INSERT INTO graph_records SELECT id,'orbit','workspace','contact',json_object('id',id,'company_id',company_id,'name',name,'email',email,'email_key',email_key,'phone',phone,'job_title',job_title,'timezone',timezone,'contactability',contactability,'created_at',created_at,'updated_at',updated_at,'custom_fields_json',custom_fields_json,'contactability_revision',contactability_revision),1,1,'workspace',NULL,NULL,NULL FROM contacts WHERE true ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1 WHERE graph_records.fields_json<>excluded.fields_json;\n INSERT INTO graph_records SELECT id,'orbit','workspace','opportunity',json_set(json_set('{}','$.id',id,'$.title',title,'$.lifecycle',lifecycle,'$.stage_id',stage_id,'$.owner_id',owner_id,'$.company_id',company_id,'$.value_cents',value_cents,'$.expected_close_at',expected_close_at,'$.score',score,'$.band',band,'$.queue_state',queue_state,'$.queue_reason',queue_reason,'$.last_contributing_signal_at',last_contributing_signal_at,'$.created_at',created_at,'$.updated_at',updated_at),'$.next_due_at',next_due_at,'$.custom_fields_json',custom_fields_json,'$.closed_at',closed_at,'$.closed_by',closed_by,'$.close_reason',close_reason),1,1,'workspace',NULL,NULL,NULL FROM opportunities WHERE true ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,revision=revision+1,data_epoch=data_epoch+1 WHERE graph_records.fields_json<>excluded.fields_json;\nEND"
 }
] as const;
