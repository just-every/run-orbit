-- Send authority is installation-local; message provenance travels with history.
CREATE TABLE mailbox_send_authorizations (
 source_id TEXT PRIMARY KEY REFERENCES capture_sources(id) ON DELETE CASCADE,
 connection_id TEXT NOT NULL,
 operator_id TEXT NOT NULL REFERENCES operators(id),
 provider TEXT NOT NULL CHECK(provider IN ('google','microsoft')),
 mailbox_address TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('authorized','paused')),
 retry_at TEXT,
 created_at TEXT NOT NULL
);
ALTER TABLE outbound_messages ADD COLUMN mailbox_source_id TEXT;
ALTER TABLE outbound_messages ADD COLUMN mailbox_connection_id TEXT;
ALTER TABLE outbound_messages ADD COLUMN mailbox_address TEXT;
ALTER TABLE outbound_messages ADD COLUMN mailbox_provider TEXT;
ALTER TABLE outbound_messages ADD COLUMN provider_thread_id TEXT;
ALTER TABLE outbound_messages ADD COLUMN mailbox_submission_claimed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE record_mail_outbound_messages ADD COLUMN mailbox_source_id TEXT;
ALTER TABLE record_mail_outbound_messages ADD COLUMN mailbox_connection_id TEXT;
ALTER TABLE record_mail_outbound_messages ADD COLUMN mailbox_address TEXT;
ALTER TABLE record_mail_outbound_messages ADD COLUMN mailbox_provider TEXT;
ALTER TABLE record_mail_outbound_messages ADD COLUMN provider_thread_id TEXT;
ALTER TABLE record_mail_outbound_messages ADD COLUMN mailbox_submission_claimed INTEGER NOT NULL DEFAULT 0;
