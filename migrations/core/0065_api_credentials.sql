-- Installation authority is excluded from both archive formats.
CREATE TABLE api_credentials (
 id TEXT PRIMARY KEY NOT NULL,
 installation_id TEXT NOT NULL,
 name TEXT NOT NULL,
 principal_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
 operations_json TEXT NOT NULL CHECK(json_valid(operations_json)),
 records_json TEXT NOT NULL CHECK(json_valid(records_json)),
 fields_json TEXT NOT NULL CHECK(json_valid(fields_json)),
 verifier TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 revoked_at TEXT,
 revision INTEGER NOT NULL DEFAULT 1
);
