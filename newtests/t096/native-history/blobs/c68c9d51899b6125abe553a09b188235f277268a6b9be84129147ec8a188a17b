-- OUT-018: administrator overrides of the shared transport rate ('shared') and each
-- user's one-to-one rolling-day budget ('one-to-one:<operator id>'). Absent rows use
-- the defaults in src/core/features/outreach/sending-limits.ts.
CREATE TABLE sending_limits (
 id TEXT PRIMARY KEY CHECK(id='shared' OR id LIKE 'one-to-one:%'),
 value INTEGER NOT NULL CHECK(value>0),
 updated_by TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
