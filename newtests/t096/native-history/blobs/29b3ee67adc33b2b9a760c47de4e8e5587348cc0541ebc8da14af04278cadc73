-- Installation-local authority; neither OAuth flows nor leases travel in archives.
CREATE TABLE capture_oauth (
 state_hash TEXT PRIMARY KEY,
 provider TEXT NOT NULL,
 operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
 session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 origin TEXT NOT NULL,
 source_id TEXT NOT NULL,
 connection_id TEXT,
 ciphertext TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 claimed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX capture_oauth_source ON capture_oauth(source_id);
CREATE TABLE capture_locks (
 source_id TEXT PRIMARY KEY REFERENCES capture_sources(id) ON DELETE CASCADE,
 lease TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
