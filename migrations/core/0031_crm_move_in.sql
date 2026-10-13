-- Import job authority and originals never move through a Records archive.
CREATE TABLE crm_import_reviews(id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, namespace TEXT NOT NULL, fingerprint TEXT NOT NULL, plan_json TEXT NOT NULL, created_at TEXT NOT NULL, job_id TEXT, safety_pending INTEGER NOT NULL DEFAULT 0);
CREATE TABLE crm_import_review_chunks(review_id TEXT NOT NULL REFERENCES crm_import_reviews(id) ON DELETE CASCADE,ordinal INTEGER NOT NULL,body TEXT NOT NULL,PRIMARY KEY(review_id,ordinal));
CREATE TABLE crm_import_targets(kind TEXT NOT NULL,id TEXT NOT NULL,revision TEXT NOT NULL,original_json TEXT NOT NULL,PRIMARY KEY(kind,id));
CREATE TABLE crm_import_stops(id TEXT PRIMARY KEY,revision TEXT NOT NULL,value_json TEXT NOT NULL);
CREATE TRIGGER crm_import_contact_gate BEFORE INSERT ON contacts
WHEN EXISTS(SELECT 1 FROM crm_import_reviews WHERE safety_pending=1)
BEGIN SELECT RAISE(ABORT,'Finish or undo the pending suppression import before creating contacts'); END;
CREATE TRIGGER crm_import_send_gate BEFORE INSERT ON outbound_messages
WHEN NEW.state IN('queued','scheduled') AND EXISTS(SELECT 1 FROM crm_import_reviews WHERE safety_pending=1)
BEGIN SELECT RAISE(ABORT,'Finish or undo the pending suppression import before approving mail'); END;
CREATE TRIGGER crm_import_dispatch_gate BEFORE UPDATE OF state ON outbound_messages
WHEN NEW.state='queued' AND EXISTS(SELECT 1 FROM crm_import_reviews WHERE safety_pending=1)
BEGIN SELECT RAISE(ABORT,'Finish or undo the pending suppression import before sending mail'); END;
CREATE TABLE crm_import_references(id TEXT PRIMARY KEY,record_kind TEXT NOT NULL,record_id TEXT NOT NULL,source_id TEXT NOT NULL,mailbox TEXT);
