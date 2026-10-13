CREATE TABLE outbound_messages (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id),
  revision INTEGER NOT NULL,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  operator_id TEXT NOT NULL REFERENCES operators(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('queued','accepted','failed','delivery-unknown')),
  provider_message_id TEXT,
  failure TEXT,
  settlement_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(draft_id, revision)
);
ALTER TABLE opportunities ADD COLUMN next_due_at TEXT;
