-- Installation credentials are excluded from Records archives; reconnect after restore.
CREATE TABLE call_credentials (id INTEGER PRIMARY KEY CHECK(id=1), ciphertext TEXT NOT NULL);
CREATE TABLE call_events (
 id TEXT PRIMARY KEY NOT NULL,
 account_sid TEXT NOT NULL,
 call_sid TEXT NOT NULL,
 sequence INTEGER NOT NULL CHECK(sequence>=0),
 contact_id TEXT REFERENCES contacts(id) ON DELETE CASCADE,
 from_number TEXT NOT NULL,
 to_number TEXT NOT NULL,
 direction TEXT NOT NULL,
 status TEXT NOT NULL,
 duration_seconds INTEGER,
 received_at TEXT NOT NULL,
 entry_id TEXT REFERENCES timeline_entries(id) ON DELETE CASCADE,
 UNIQUE(account_sid,call_sid,sequence)
);
CREATE INDEX call_events_contact ON call_events(contact_id,received_at);
CREATE TABLE call_dial_attempts (
 id TEXT PRIMARY KEY NOT NULL,
 contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
 actor_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('attempted','submitted','uncertain')),
 call_sid TEXT
);
