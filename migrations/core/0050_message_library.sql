CREATE TABLE message_library (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('template','snippet','signature')),
 name TEXT NOT NULL,
 subject TEXT NOT NULL,
 body TEXT NOT NULL,
 visibility TEXT NOT NULL CHECK(visibility IN ('private','shared')),
 owner_id TEXT NOT NULL REFERENCES operators(id),
 revision INTEGER NOT NULL,
 updated_at TEXT NOT NULL
);
ALTER TABLE drafts ADD COLUMN library_selection_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE drafts ADD COLUMN merge_review_json TEXT;
ALTER TABLE outbound_messages ADD COLUMN render_snapshot_json TEXT;
