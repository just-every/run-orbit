-- Refusal metadata is portable; personal values have a separately erasable home.
CREATE TABLE form_abuse_refusals (
 id TEXT PRIMARY KEY, form_id TEXT NOT NULL, operation_id TEXT NOT NULL,
 idempotency_key TEXT, payload_hash TEXT, reason TEXT NOT NULL,
 created_at TEXT NOT NULL, UNIQUE(form_id,idempotency_key)
);
CREATE TABLE form_spam (
 id TEXT PRIMARY KEY REFERENCES form_abuse_refusals(id),
 values_json TEXT NOT NULL, intake_json TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('pending','released','erased')),
 receipt_json TEXT
);
CREATE INDEX form_abuse_refusals_form ON form_abuse_refusals(form_id,created_at);
