ALTER TABLE contacts ADD COLUMN custom_fields_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE companies ADD COLUMN custom_fields_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE opportunities ADD COLUMN custom_fields_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE opportunities ADD COLUMN closed_at TEXT;
ALTER TABLE opportunities ADD COLUMN closed_by TEXT REFERENCES operators(id);
ALTER TABLE opportunities ADD COLUMN close_reason TEXT;
CREATE TABLE record_aliases (
 record_type TEXT NOT NULL CHECK(record_type IN ('contact','company')),
 identity_key TEXT NOT NULL,
 survivor_id TEXT NOT NULL,
 retired_id TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(record_type,identity_key)
);
CREATE TABLE record_mutation_jobs (
 opportunity_id TEXT PRIMARY KEY REFERENCES opportunities(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL,
 reason TEXT NOT NULL,
 requested_at TEXT NOT NULL
);
CREATE INDEX contacts_name_company ON contacts(lower(name),company_id);
CREATE INDEX companies_name ON companies(lower(name));

-- Migrate the original workspace weekday spelling to the setup/settings schema.
UPDATE workspace_settings SET working_hours_json=json_remove(json_set(working_hours_json,'$.days',json_extract(working_hours_json,'$.weekdays')),'$.weekdays') WHERE json_type(working_hours_json,'$.days') IS NULL AND json_type(working_hours_json,'$.weekdays')='array';

-- Search indexes retain only derived text; domain exports rebuild them through triggers.
CREATE VIRTUAL TABLE record_search USING fts5(record_type UNINDEXED,record_id UNINDEXED,body,tokenize='unicode61');
CREATE VIRTUAL TABLE timeline_search USING fts5(entry_id UNINDEXED,body,tokenize='unicode61');
INSERT INTO record_search SELECT 'contact',id,COALESCE(name,'')||' '||COALESCE(email,'') FROM contacts;
INSERT INTO record_search SELECT 'company',id,name||' '||COALESCE(primary_domain,'') FROM companies;
INSERT INTO record_search SELECT 'opportunity',id,title FROM opportunities;
INSERT INTO timeline_search(rowid,entry_id,body) SELECT rowid,id,payload_json FROM timeline_entries;
CREATE TRIGGER search_contact_insert AFTER INSERT ON contacts BEGIN INSERT INTO record_search VALUES('contact',NEW.id,COALESCE(NEW.name,'')||' '||COALESCE(NEW.email,'')); END;
CREATE TRIGGER search_contact_update AFTER UPDATE OF name,email ON contacts BEGIN DELETE FROM record_search WHERE record_type='contact' AND record_id=OLD.id; INSERT INTO record_search VALUES('contact',NEW.id,COALESCE(NEW.name,'')||' '||COALESCE(NEW.email,'')); END;
CREATE TRIGGER search_contact_delete AFTER DELETE ON contacts BEGIN DELETE FROM record_search WHERE record_type='contact' AND record_id=OLD.id; END;
CREATE TRIGGER search_company_insert AFTER INSERT ON companies BEGIN INSERT INTO record_search VALUES('company',NEW.id,NEW.name||' '||COALESCE(NEW.primary_domain,'')); END;
CREATE TRIGGER search_company_update AFTER UPDATE OF name,primary_domain ON companies BEGIN DELETE FROM record_search WHERE record_type='company' AND record_id=OLD.id; INSERT INTO record_search VALUES('company',NEW.id,NEW.name||' '||COALESCE(NEW.primary_domain,'')); END;
CREATE TRIGGER search_company_delete AFTER DELETE ON companies BEGIN DELETE FROM record_search WHERE record_type='company' AND record_id=OLD.id; END;
CREATE TRIGGER search_opportunity_insert AFTER INSERT ON opportunities BEGIN INSERT INTO record_search VALUES('opportunity',NEW.id,NEW.title); END;
CREATE TRIGGER search_opportunity_update AFTER UPDATE OF title ON opportunities BEGIN DELETE FROM record_search WHERE record_type='opportunity' AND record_id=OLD.id; INSERT INTO record_search VALUES('opportunity',NEW.id,NEW.title); END;
CREATE TRIGGER search_opportunity_delete AFTER DELETE ON opportunities BEGIN DELETE FROM record_search WHERE record_type='opportunity' AND record_id=OLD.id; END;
CREATE TRIGGER search_timeline_insert AFTER INSERT ON timeline_entries BEGIN INSERT INTO timeline_search(rowid,entry_id,body) VALUES(NEW.rowid,NEW.id,NEW.payload_json); END;
CREATE TRIGGER search_timeline_update AFTER UPDATE OF payload_json ON timeline_entries BEGIN DELETE FROM timeline_search WHERE rowid=OLD.rowid; INSERT INTO timeline_search(rowid,entry_id,body) VALUES(NEW.rowid,NEW.id,NEW.payload_json); END;
CREATE TRIGGER search_timeline_delete AFTER DELETE ON timeline_entries BEGIN DELETE FROM timeline_search WHERE rowid=OLD.rowid; END;

CREATE INDEX contacts_recent ON contacts(updated_at DESC,id);
CREATE INDEX companies_recent ON companies(updated_at DESC,id);
CREATE INDEX opportunities_recent ON opportunities(updated_at DESC,id);
CREATE TABLE record_merge_claims(record_type TEXT NOT NULL,retired_id TEXT NOT NULL,survivor_id TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(record_type,retired_id));
CREATE TRIGGER contact_alias_insert BEFORE INSERT ON contacts WHEN NEW.email_key IS NOT NULL BEGIN SELECT RAISE(ABORT,'RECORD_IDENTITY_CONFLICT') WHERE EXISTS(SELECT 1 FROM record_aliases WHERE record_type='contact' AND identity_key=NEW.email_key AND survivor_id<>NEW.id); END;
CREATE TRIGGER contact_alias_update BEFORE UPDATE OF email_key ON contacts WHEN NEW.email_key IS NOT NULL BEGIN SELECT RAISE(ABORT,'RECORD_IDENTITY_CONFLICT') WHERE EXISTS(SELECT 1 FROM record_aliases WHERE record_type='contact' AND identity_key=NEW.email_key AND survivor_id<>NEW.id); END;
CREATE TRIGGER company_alias_insert BEFORE INSERT ON companies WHEN NEW.primary_domain_key IS NOT NULL BEGIN SELECT RAISE(ABORT,'RECORD_IDENTITY_CONFLICT') WHERE EXISTS(SELECT 1 FROM record_aliases WHERE record_type='company' AND identity_key=NEW.primary_domain_key AND survivor_id<>NEW.id); END;
CREATE TRIGGER company_alias_update BEFORE UPDATE OF primary_domain_key ON companies WHEN NEW.primary_domain_key IS NOT NULL BEGIN SELECT RAISE(ABORT,'RECORD_IDENTITY_CONFLICT') WHERE EXISTS(SELECT 1 FROM record_aliases WHERE record_type='company' AND identity_key=NEW.primary_domain_key AND survivor_id<>NEW.id); END;
CREATE TABLE record_erasure_signals(contact_id TEXT NOT NULL,signal_id TEXT NOT NULL,PRIMARY KEY(contact_id,signal_id));
