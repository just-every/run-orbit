-- Private import custody never travels in either archive format.
CREATE TABLE crm_import_hubspot_connection (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 id TEXT NOT NULL,
 portal_id TEXT NOT NULL,
 secret_ciphertext TEXT,
 state TEXT NOT NULL,
 reason TEXT
);
CREATE TABLE crm_import_hubspot_pulls (
 id TEXT PRIMARY KEY,
 actor_id TEXT NOT NULL REFERENCES operators(id),
 connection_id TEXT NOT NULL,
 portal_id TEXT NOT NULL,
 state TEXT NOT NULL,
 queue_json TEXT NOT NULL,
 checkpoint INTEGER NOT NULL DEFAULT 0,
 validated INTEGER NOT NULL DEFAULT 0,
 retry_at TEXT,
 error TEXT,
 created_at TEXT NOT NULL
);
CREATE TABLE crm_import_hubspot_pages (
 pull_id TEXT NOT NULL REFERENCES crm_import_hubspot_pulls(id) ON DELETE CASCADE,
 ordinal INTEGER NOT NULL,
 path TEXT NOT NULL,
 page_json TEXT NOT NULL,
 PRIMARY KEY(pull_id,ordinal)
);
CREATE TABLE crm_import_hubspot_reviews (
 review_id TEXT PRIMARY KEY REFERENCES crm_import_reviews(id) ON DELETE CASCADE,
 pull_id TEXT NOT NULL REFERENCES crm_import_hubspot_pulls(id) ON DELETE CASCADE,
 summary_json TEXT NOT NULL
);
-- A contact erasure also withdraws any unpublished or reviewed provider custody.
-- Imports are private staging, so conservative whole-pull withdrawal is intentional.
CREATE TRIGGER crm_import_hubspot_erasure AFTER DELETE ON contacts
BEGIN
 DELETE FROM crm_import_hubspot_pages;
 UPDATE crm_import_hubspot_pulls SET state='withdrawn',queue_json='[]',error='Source withdrawn after privacy erasure',retry_at=NULL;
END;
