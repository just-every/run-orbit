-- Installation-local import authority and source custody never travel in archives.
CREATE TABLE crm_import_salesforce_oauth (
 state_hash TEXT PRIMARY KEY, operator_id TEXT NOT NULL, session_id TEXT NOT NULL,
 origin TEXT NOT NULL, ciphertext TEXT NOT NULL, expires_at INTEGER NOT NULL,
 claimed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE crm_import_salesforce_codes (code_hash TEXT PRIMARY KEY);
CREATE TABLE crm_import_salesforce_connections (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, org_id TEXT NOT NULL,
 instance TEXT NOT NULL, ciphertext TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE crm_import_salesforce_pulls (
 id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES crm_import_salesforce_connections(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL, state TEXT NOT NULL, metadata_json TEXT NOT NULL,
 object_name TEXT NOT NULL DEFAULT 'Account', cursor TEXT, page INTEGER NOT NULL DEFAULT 0,
 account_total INTEGER, contact_total INTEGER, error TEXT, review_id TEXT,
 created_at TEXT NOT NULL
);
CREATE TABLE crm_import_salesforce_pages (
 pull_id TEXT NOT NULL REFERENCES crm_import_salesforce_pulls(id) ON DELETE CASCADE,
 ordinal INTEGER NOT NULL, object_name TEXT NOT NULL, body TEXT NOT NULL,
 PRIMARY KEY(pull_id,ordinal)
);
-- Erasure invalidates staged source copies as well as the shared saved plans.
-- All staged pages are withdrawn: unmapped fields can contain personal content.
CREATE TRIGGER crm_import_salesforce_erasure AFTER DELETE ON contacts BEGIN
 DELETE FROM crm_import_salesforce_pages;
 UPDATE crm_import_salesforce_pulls SET state='withdrawn',metadata_json='{}',cursor=NULL,error='Source withdrawn after contact erasure';
END;
