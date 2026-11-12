-- Definitions contain no result rows or delegated grants. Every open reads current records.
CREATE TABLE record_saved_views (
 id TEXT PRIMARY KEY,
 author_id TEXT NOT NULL REFERENCES operators(id),
 kind TEXT NOT NULL CHECK(kind IN ('contact','company','opportunity')),
 name TEXT NOT NULL,
 visibility TEXT NOT NULL CHECK(visibility IN ('private','workspace')),
 revision INTEGER NOT NULL CHECK(revision>0),
 definition_json TEXT NOT NULL CHECK(json_valid(definition_json)),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX record_saved_views_reader ON record_saved_views(kind,visibility,author_id);
