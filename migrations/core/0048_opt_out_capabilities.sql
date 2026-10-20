-- OUT-020: an unguessable capability for one approved message and recipient.
-- No time expiry: CAN-SPAM requires at least 30 days after sending; a working
-- link forever is the honest choice. Erasure removes the capability with its data.
CREATE TABLE outbound_opt_out_capabilities (
 token TEXT PRIMARY KEY CHECK(length(token)=64 AND token NOT GLOB '*[^a-f0-9]*'),
 message_id TEXT NOT NULL UNIQUE REFERENCES outbound_messages(id) ON DELETE CASCADE,
 contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
 origin TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX outbound_opt_out_contact ON outbound_opt_out_capabilities(contact_id);
