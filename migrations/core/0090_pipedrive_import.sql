-- Installation-local credentials, source checkpoints and review authority never travel.
CREATE TABLE crm_import_pipedrive_connections (
 id INTEGER PRIMARY KEY CHECK(id=1), account_id TEXT NOT NULL, ciphertext TEXT NOT NULL,
 revision TEXT NOT NULL, actor_id TEXT NOT NULL, connected_at TEXT NOT NULL
);
CREATE TABLE crm_import_pipedrive_pulls (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, connection_revision TEXT NOT NULL,
 account_id TEXT NOT NULL, state TEXT NOT NULL, resource INTEGER NOT NULL DEFAULT 0,
 cursor TEXT, version INTEGER NOT NULL DEFAULT 0, next_at TEXT, error TEXT,
 snapshot_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
CREATE TABLE crm_import_pipedrive_reviews (
 review_id TEXT PRIMARY KEY REFERENCES crm_import_reviews(id) ON DELETE CASCADE,
 pull_id TEXT NOT NULL REFERENCES crm_import_pipedrive_pulls(id), connection_revision TEXT NOT NULL
);
