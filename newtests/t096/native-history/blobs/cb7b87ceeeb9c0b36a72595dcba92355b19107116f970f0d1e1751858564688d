-- OUT-020: whether Orbit adds opt-out headers and a link, per message type. Sequence and
-- workflow email default on. One-to-one email defaults off on a new installation; an
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
-- Absent rows take the defaults in src/core/features/outreach/opt-out.ts, so a new
-- installation's table starts empty and an archive restores into it.
INSERT INTO opt_out_settings(message_type,carries,basis,updated_at)
 SELECT 'one_to_one',1,'kept on for an upgraded installation',strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE EXISTS(SELECT 1 FROM operators);
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
