CREATE TABLE magic_links (
  token_hash TEXT PRIMARY KEY,
  operator_id TEXT NOT NULL REFERENCES operators(id),
  return_to TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX magic_links_operator_created ON magic_links(operator_id, created_at);
