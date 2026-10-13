ALTER TABLE signal_sources ADD COLUMN secret_ciphertext TEXT;
ALTER TABLE signal_sources ADD COLUMN last_accepted_at TEXT;
ALTER TABLE signal_sources ADD COLUMN last_error TEXT;
ALTER TABLE signal_sources ADD COLUMN rejected_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE signal_sources ADD COLUMN cursor TEXT;
ALTER TABLE signals ADD COLUMN payload_json TEXT;
CREATE TABLE unlinked_signals (signal_id TEXT PRIMARY KEY REFERENCES signals(id), reason TEXT NOT NULL, resolved_at TEXT);
CREATE TABLE source_event_errors (id TEXT PRIMARY KEY,source_id TEXT NOT NULL,source_event_id TEXT,reason TEXT NOT NULL,created_at TEXT NOT NULL);

ALTER TABLE outbound_messages RENAME TO outbound_messages_previous;
CREATE TABLE outbound_messages (
 id TEXT PRIMARY KEY,draft_id TEXT REFERENCES drafts(id),revision INTEGER NOT NULL,
 opportunity_id TEXT NOT NULL REFERENCES opportunities(id),operator_id TEXT NOT NULL REFERENCES operators(id),
 contact_id TEXT REFERENCES contacts(id),recipient_email TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('draft','scheduled','queued','reconciling','accepted','delivered','bounced','failed','cancelled','delivery-unknown')),
 provider_message_id TEXT,failure TEXT,settlement_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
 idempotency_key TEXT NOT NULL UNIQUE,message_id TEXT NOT NULL UNIQUE,reference_ids TEXT NOT NULL DEFAULT '',
 scheduled_at TEXT,next_attempt_at TEXT,attempt_count INTEGER NOT NULL DEFAULT 0,approved_at TEXT NOT NULL,claimed_at TEXT,first_attempt_at TEXT,
 UNIQUE(draft_id,revision)
);
INSERT INTO outbound_messages(id,draft_id,revision,opportunity_id,operator_id,contact_id,recipient_email,subject,body,state,provider_message_id,failure,settlement_id,created_at,updated_at,idempotency_key,message_id,approved_at)
 SELECT m.id,m.draft_id,m.revision,m.opportunity_id,m.operator_id,d.recipient_contact_id,m.recipient_email,m.subject,m.body,m.state,m.provider_message_id,m.failure,m.settlement_id,m.created_at,m.updated_at,m.id,'<'||m.id||'@orbit.local>',m.created_at
 FROM outbound_messages_previous m LEFT JOIN drafts d ON d.id=m.draft_id;
DROP TABLE outbound_messages_previous;
CREATE INDEX outbound_due ON outbound_messages(state,next_attempt_at,scheduled_at);
CREATE TABLE mail_provider_events(id TEXT PRIMARY KEY,payload_hash TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE unlinked_replies(id TEXT PRIMARY KEY,provider_event_id TEXT NOT NULL UNIQUE,sender TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,message_id TEXT,reference_ids TEXT,occurred_at TEXT NOT NULL,opportunity_id TEXT);
ALTER TABLE recommendations ADD COLUMN completed_at TEXT;
ALTER TABLE recommendations ADD COLUMN completion_outcome TEXT;
ALTER TABLE recommendations ADD COLUMN completion_note TEXT;
CREATE TABLE evaluation_job_runs(opportunity_id TEXT NOT NULL,requested_at TEXT NOT NULL,PRIMARY KEY(opportunity_id,requested_at));
CREATE TABLE action_completions(recommendation_id TEXT PRIMARY KEY,completed_at TEXT NOT NULL);
