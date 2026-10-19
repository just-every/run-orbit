-- OUT-020: whether Orbit adds opt-out headers and a link, per message type. Sequence and
-- workflow email start on. One-to-one email starts off on a fresh installation; an
-- installation upgraded with users already present keeps today's opt-out on until an
-- administrator changes it (ct, 19 October 2026), so no consent state changes silently.
CREATE TABLE opt_out_settings (
 message_type TEXT PRIMARY KEY CHECK(message_type IN('one_to_one','sequence','workflow')),
 carries INTEGER NOT NULL CHECK(carries IN(0,1)),
 removal_allowed INTEGER NOT NULL DEFAULT 1 CHECK(removal_allowed IN(0,1)),
 basis TEXT NOT NULL,
 updated_by TEXT,
 updated_at TEXT NOT NULL
);
INSERT INTO opt_out_settings(message_type,carries,basis,updated_at) VALUES
 ('sequence',1,'default',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 ('workflow',1,'default',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
INSERT INTO opt_out_settings(message_type,carries,basis,updated_at)
 SELECT 'one_to_one',CASE WHEN EXISTS(SELECT 1 FROM operators) THEN 1 ELSE 0 END,
  CASE WHEN EXISTS(SELECT 1 FROM operators) THEN 'kept on for an upgraded installation' ELSE 'default for a new installation' END,
  strftime('%Y-%m-%dT%H:%M:%fZ','now');
-- A rep's marking on one draft: removal as relationship or transactional mail, or adding opt-out.
CREATE TABLE draft_opt_out (
 draft_id TEXT PRIMARY KEY REFERENCES drafts(id) ON DELETE CASCADE,
 choice TEXT NOT NULL CHECK(choice IN('relationship','transactional','added')),
 updated_by TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
-- The opt-out state an approval bound; delivery sends exactly this. Messages approved
-- before OUT-020 have no row and keep the state they were approved with.
CREATE TABLE outbound_message_opt_out (
 message_id TEXT PRIMARY KEY REFERENCES outbound_messages(id) ON DELETE CASCADE,
 carries INTEGER NOT NULL CHECK(carries IN(0,1)),
 marking TEXT CHECK(marking IN('relationship','transactional','added','transport'))
);
