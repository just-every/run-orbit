CREATE TABLE workflow_versions (
 workflow_id TEXT NOT NULL,version INTEGER NOT NULL,name TEXT NOT NULL,definition_json TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft',created_by TEXT NOT NULL,created_at TEXT NOT NULL,
 activated_by TEXT,activated_at TEXT,authority_version INTEGER,preview_id TEXT,preview_json TEXT,
 PRIMARY KEY(workflow_id,version)
);
CREATE TABLE workflow_events (id TEXT PRIMARY KEY,kind TEXT NOT NULL,record_type TEXT NOT NULL,record_id TEXT NOT NULL,occurred_at TEXT NOT NULL,evidence TEXT NOT NULL,chain_json TEXT NOT NULL DEFAULT '[]');
CREATE TABLE workflow_event_snapshots(event_id TEXT NOT NULL REFERENCES workflow_events(id) ON DELETE CASCADE,record_type TEXT NOT NULL,record_id TEXT NOT NULL,values_json TEXT NOT NULL,PRIMARY KEY(event_id,record_type,record_id));
CREATE TABLE workflow_runs (
 id TEXT PRIMARY KEY,workflow_id TEXT NOT NULL,version INTEGER NOT NULL,event_id TEXT NOT NULL,
 record_type TEXT NOT NULL,record_id TEXT NOT NULL,owner_id TEXT NOT NULL,status TEXT NOT NULL,
 reason TEXT,due_at TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
 plan_json TEXT NOT NULL,outcome_json TEXT NOT NULL DEFAULT '[]',chain_json TEXT NOT NULL DEFAULT '[]',
 UNIQUE(workflow_id,version,event_id)
);
CREATE TABLE workflow_steps (run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,ordinal INTEGER NOT NULL,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,result_json TEXT,PRIMARY KEY(run_id,ordinal));
CREATE TABLE workflow_approvals (id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,record_id TEXT NOT NULL,approver_id TEXT NOT NULL,plan_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL,decided_at TEXT,decided_by TEXT);
CREATE TABLE workflow_field_policies (record_type TEXT NOT NULL,field TEXT NOT NULL,needs_approval INTEGER NOT NULL,PRIMARY KEY(record_type,field));
CREATE TABLE workflow_record_writes (id TEXT PRIMARY KEY,workflow_id TEXT,version INTEGER,event_id TEXT,run_id TEXT,record_id TEXT,record_type TEXT,field TEXT,before_json TEXT,after_json TEXT,actor_id TEXT,occurred_at TEXT,evidence TEXT,workflow_name TEXT,plan_json TEXT,undone_at TEXT,undo_actor_id TEXT);
CREATE TABLE workflow_rotation (workflow_id TEXT NOT NULL,action_index INTEGER NOT NULL,cursor INTEGER NOT NULL,PRIMARY KEY(workflow_id,action_index));
CREATE INDEX workflow_due ON workflow_runs(status,due_at);
CREATE INDEX workflow_event_record ON workflow_events(record_type,record_id,occurred_at);
CREATE INDEX workflow_writes_run ON workflow_record_writes(run_id);
CREATE TRIGGER workflow_restore_pause AFTER INSERT ON runtime_controls WHEN NEW.name='archive_import' BEGIN
 UPDATE workflow_versions SET status='paused' WHERE status='active';
 UPDATE workflow_runs SET status='stopped',reason='Restore requires fresh activation',plan_json='[]' WHERE status NOT IN('completed','undone');
 UPDATE workflow_approvals SET status='expired',plan_json='{}' WHERE status='pending';
END;
CREATE TRIGGER workflow_contacts_insert AFTER INSERT ON contacts BEGIN
 INSERT INTO workflow_events(id,kind,record_type,record_id,occurred_at,evidence,chain_json)
 VALUES(lower(hex(randomblob(16))),'record_created','contact',NEW.id,NEW.updated_at,'Record insert',COALESCE((SELECT value FROM runtime_controls WHERE name='workflow_chain'),'[]'));
END;
CREATE TRIGGER workflow_contacts_update AFTER UPDATE ON contacts WHEN OLD.name IS NOT NEW.name OR OLD.email IS NOT NEW.email OR OLD.phone IS NOT NEW.phone OR OLD.job_title IS NOT NEW.job_title OR OLD.timezone IS NOT NEW.timezone OR OLD.company_id IS NOT NEW.company_id OR OLD.contactability IS NOT NEW.contactability OR OLD.custom_fields_json IS NOT NEW.custom_fields_json BEGIN
 INSERT INTO workflow_events(id,kind,record_type,record_id,occurred_at,evidence,chain_json)
 VALUES(lower(hex(randomblob(16))),'record_changed','contact',NEW.id,NEW.updated_at,'Record update',COALESCE((SELECT value FROM runtime_controls WHERE name='workflow_chain'),'[]'));
END;
CREATE TRIGGER workflow_contacts_erasure AFTER DELETE ON contacts BEGIN
 DELETE FROM workflow_runs WHERE record_id=OLD.id OR EXISTS(SELECT 1 FROM json_tree(plan_json) WHERE value=OLD.id);
 DELETE FROM workflow_record_writes WHERE record_id=OLD.id OR EXISTS(SELECT 1 FROM json_tree(plan_json) WHERE value=OLD.id);
 DELETE FROM workflow_events WHERE record_type='contact' AND record_id=OLD.id;
 DELETE FROM workflow_event_snapshots WHERE record_type='contact' AND record_id=OLD.id;
END;
CREATE TRIGGER workflow_companies_insert AFTER INSERT ON companies BEGIN
 INSERT INTO workflow_events(id,kind,record_type,record_id,occurred_at,evidence,chain_json)
 VALUES(lower(hex(randomblob(16))),'record_created','company',NEW.id,NEW.updated_at,'Record insert',COALESCE((SELECT value FROM runtime_controls WHERE name='workflow_chain'),'[]'));
END;
CREATE TRIGGER workflow_companies_update AFTER UPDATE ON companies WHEN OLD.name IS NOT NEW.name OR OLD.primary_domain IS NOT NEW.primary_domain OR OLD.custom_fields_json IS NOT NEW.custom_fields_json BEGIN
 INSERT INTO workflow_events(id,kind,record_type,record_id,occurred_at,evidence,chain_json)
 VALUES(lower(hex(randomblob(16))),'record_changed','company',NEW.id,NEW.updated_at,'Record update',COALESCE((SELECT value FROM runtime_controls WHERE name='workflow_chain'),'[]'));
END;
CREATE TRIGGER workflow_companies_erasure AFTER DELETE ON companies BEGIN
 DELETE FROM workflow_runs WHERE record_id=OLD.id OR EXISTS(SELECT 1 FROM json_tree(plan_json) WHERE value=OLD.id);
 DELETE FROM workflow_record_writes WHERE record_id=OLD.id OR EXISTS(SELECT 1 FROM json_tree(plan_json) WHERE value=OLD.id);
 DELETE FROM workflow_events WHERE record_type='company' AND record_id=OLD.id;
 DELETE FROM workflow_event_snapshots WHERE record_type='company' AND record_id=OLD.id;
END;
CREATE TRIGGER workflow_opportunities_insert AFTER INSERT ON opportunities BEGIN
 INSERT INTO workflow_events(id,kind,record_type,record_id,occurred_at,evidence,chain_json)
 VALUES(lower(hex(randomblob(16))),'record_created','opportunity',NEW.id,NEW.updated_at,'Record insert',COALESCE((SELECT value FROM runtime_controls WHERE name='workflow_chain'),'[]'));
END;
CREATE TRIGGER workflow_opportunities_update AFTER UPDATE ON opportunities WHEN OLD.title IS NOT NEW.title OR OLD.stage_id IS NOT NEW.stage_id OR OLD.owner_id IS NOT NEW.owner_id OR OLD.company_id IS NOT NEW.company_id OR OLD.value_cents IS NOT NEW.value_cents OR OLD.expected_close_at IS NOT NEW.expected_close_at OR OLD.lifecycle IS NOT NEW.lifecycle OR OLD.custom_fields_json IS NOT NEW.custom_fields_json BEGIN
 INSERT INTO workflow_events(id,kind,record_type,record_id,occurred_at,evidence,chain_json)
 VALUES(lower(hex(randomblob(16))),'record_changed','opportunity',NEW.id,NEW.updated_at,'Record update',COALESCE((SELECT value FROM runtime_controls WHERE name='workflow_chain'),'[]'));
END;
CREATE TRIGGER workflow_opportunities_erasure AFTER DELETE ON opportunities BEGIN
 DELETE FROM workflow_runs WHERE record_id=OLD.id OR EXISTS(SELECT 1 FROM json_tree(plan_json) WHERE value=OLD.id);
 DELETE FROM workflow_record_writes WHERE record_id=OLD.id OR EXISTS(SELECT 1 FROM json_tree(plan_json) WHERE value=OLD.id);
 DELETE FROM workflow_events WHERE record_type='opportunity' AND record_id=OLD.id;
 DELETE FROM workflow_event_snapshots WHERE record_type='opportunity' AND record_id=OLD.id;
END;
CREATE TRIGGER workflow_activity AFTER INSERT ON timeline_entry_records WHEN EXISTS(SELECT 1 FROM timeline_entries WHERE id=NEW.timeline_entry_id AND kind IN('manual.note','manual.call','manual.meeting','note.created','call.logged','meeting.logged')) BEGIN
 INSERT OR IGNORE INTO workflow_events(id,kind,record_type,record_id,occurred_at,evidence)
 SELECT NEW.timeline_entry_id||':'||NEW.record_id,'activity_logged',NEW.record_type,NEW.record_id,occurred_at,'Activity '||kind FROM timeline_entries WHERE id=NEW.timeline_entry_id;
END;
CREATE TRIGGER workflow_form AFTER INSERT ON marketing_form_submissions WHEN NEW.contact_id IS NOT NULL BEGIN
 INSERT OR IGNORE INTO workflow_events(id,kind,record_type,record_id,occurred_at,evidence) VALUES(NEW.id,'form_submitted','contact',NEW.contact_id,NEW.created_at,'Form submission');
END;

CREATE TRIGGER workflow_snapshot_event AFTER INSERT ON workflow_events BEGIN
 INSERT OR IGNORE INTO workflow_event_snapshots SELECT NEW.id,'contact',c.id,json_object('id',c.id,'name',c.name,'email',c.email,'phone',c.phone,'job_title',c.job_title,'timezone',c.timezone,'company_id',c.company_id,'contactability',c.contactability,'custom_fields_json',c.custom_fields_json,'updated_at',c.updated_at) FROM contacts c WHERE NEW.record_type='contact' AND c.id=NEW.record_id;
 INSERT OR IGNORE INTO workflow_event_snapshots SELECT NEW.id,'contact',c.id,json_object('id',c.id,'name',c.name,'email',c.email,'phone',c.phone,'job_title',c.job_title,'timezone',c.timezone,'company_id',c.company_id,'contactability',c.contactability,'custom_fields_json',c.custom_fields_json,'updated_at',c.updated_at) FROM contacts c WHERE NEW.record_type='company' AND c.company_id=NEW.record_id;
 INSERT OR IGNORE INTO workflow_event_snapshots SELECT NEW.id,'contact',c.id,json_object('id',c.id,'name',c.name,'email',c.email,'phone',c.phone,'job_title',c.job_title,'timezone',c.timezone,'company_id',c.company_id,'contactability',c.contactability,'custom_fields_json',c.custom_fields_json,'updated_at',c.updated_at) FROM contacts c WHERE NEW.record_type='company' AND c.id IN(SELECT contact_id FROM contact_company_relationships WHERE company_id=NEW.record_id);
 INSERT OR IGNORE INTO workflow_event_snapshots SELECT NEW.id,'contact',c.id,json_object('id',c.id,'name',c.name,'email',c.email,'phone',c.phone,'job_title',c.job_title,'timezone',c.timezone,'company_id',c.company_id,'contactability',c.contactability,'custom_fields_json',c.custom_fields_json,'updated_at',c.updated_at) FROM contacts c WHERE NEW.record_type='opportunity' AND c.id IN(SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=NEW.record_id);
 INSERT OR IGNORE INTO workflow_event_snapshots SELECT NEW.id,'company',c.id,json_object('id',c.id,'name',c.name,'primary_domain',c.primary_domain,'custom_fields_json',c.custom_fields_json,'updated_at',c.updated_at) FROM companies c WHERE NEW.record_type='company' AND c.id=NEW.record_id;
 INSERT OR IGNORE INTO workflow_event_snapshots SELECT NEW.id,'company',c.id,json_object('id',c.id,'name',c.name,'primary_domain',c.primary_domain,'custom_fields_json',c.custom_fields_json,'updated_at',c.updated_at) FROM companies c WHERE NEW.record_type='contact' AND c.id=(SELECT company_id FROM contacts WHERE id=NEW.record_id);
 INSERT OR IGNORE INTO workflow_event_snapshots SELECT NEW.id,'company',c.id,json_object('id',c.id,'name',c.name,'primary_domain',c.primary_domain,'custom_fields_json',c.custom_fields_json,'updated_at',c.updated_at) FROM companies c WHERE NEW.record_type='opportunity' AND c.id=(SELECT company_id FROM opportunities WHERE id=NEW.record_id);
 INSERT OR IGNORE INTO workflow_event_snapshots SELECT NEW.id,'opportunity',c.id,json_object('id',c.id,'title',c.title,'stage_id',c.stage_id,'owner_id',c.owner_id,'company_id',c.company_id,'value_cents',c.value_cents,'expected_close_at',c.expected_close_at,'lifecycle',c.lifecycle,'custom_fields_json',c.custom_fields_json,'updated_at',c.updated_at) FROM opportunities c WHERE NEW.record_type='opportunity' AND c.id=NEW.record_id;
 INSERT OR IGNORE INTO workflow_event_snapshots SELECT NEW.id,'opportunity',c.id,json_object('id',c.id,'title',c.title,'stage_id',c.stage_id,'owner_id',c.owner_id,'company_id',c.company_id,'value_cents',c.value_cents,'expected_close_at',c.expected_close_at,'lifecycle',c.lifecycle,'custom_fields_json',c.custom_fields_json,'updated_at',c.updated_at) FROM opportunities c WHERE NEW.record_type='company' AND c.company_id=NEW.record_id;
 INSERT OR IGNORE INTO workflow_event_snapshots SELECT NEW.id,'opportunity',c.id,json_object('id',c.id,'title',c.title,'stage_id',c.stage_id,'owner_id',c.owner_id,'company_id',c.company_id,'value_cents',c.value_cents,'expected_close_at',c.expected_close_at,'lifecycle',c.lifecycle,'custom_fields_json',c.custom_fields_json,'updated_at',c.updated_at) FROM opportunities c WHERE NEW.record_type='contact' AND c.id IN(SELECT opportunity_id FROM opportunity_contacts WHERE contact_id=NEW.record_id);
END;
CREATE TRIGGER workflow_snapshot_association AFTER INSERT ON opportunity_contacts BEGIN
 INSERT OR IGNORE INTO workflow_event_snapshots SELECT e.id,'contact',c.id,json_object('id',c.id,'name',c.name,'email',c.email,'phone',c.phone,'job_title',c.job_title,'timezone',c.timezone,'company_id',c.company_id,'contactability',c.contactability,'custom_fields_json',c.custom_fields_json,'updated_at',c.updated_at) FROM workflow_events e JOIN contacts c ON c.id=NEW.contact_id WHERE e.record_type='opportunity' AND e.record_id=NEW.opportunity_id AND e.id=(SELECT id FROM workflow_events WHERE record_type='opportunity' AND record_id=NEW.opportunity_id ORDER BY rowid DESC LIMIT 1);
END;
