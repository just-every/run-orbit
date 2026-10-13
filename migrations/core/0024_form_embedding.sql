-- Public contact forms may be embedded only by explicitly configured websites.
CREATE TABLE form_embed_origins (
 origin TEXT PRIMARY KEY,
 created_at TEXT NOT NULL
);
