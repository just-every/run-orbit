-- Extend native review with a question that cannot create a contact.
-- Refuse unexpected owner extensions before replacing the known proposal table.
SELECT CASE WHEN (SELECT group_concat(name,',') FROM pragma_table_info('capture_proposals'))<>'id,proposal_key,signal_id,kind,record_type,record_id,field,current_value,proposed_value,details_json,status,decided_by,decided_at,decided_value,created_at'
 OR EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name<>'capture_proposals' AND lower(sql) LIKE '%references%capture_proposals%')
 OR EXISTS(SELECT 1 FROM sqlite_master WHERE tbl_name='capture_proposals' AND type='index' AND sql IS NOT NULL AND name NOT IN('capture_proposals_status','capture_proposals_record'))
 OR EXISTS(SELECT 1 FROM sqlite_master WHERE tbl_name='capture_proposals' AND type='trigger' AND name NOT LIKE 'archive_guard_capture_proposals_%')
 THEN json_extract('ORBIT_GRAPH_PROPOSAL_SCHEMA_REQUIRES_REVIEW','$') ELSE 1 END;
CREATE TABLE capture_proposals_new (
 id TEXT PRIMARY KEY,
 proposal_key TEXT NOT NULL UNIQUE,
 signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK (kind IN ('link_signal','create_contact','set_field','next_action','do_not_contact','question')),
 record_type TEXT CHECK (record_type IN ('contact','company','opportunity')),
 record_id TEXT,
 field TEXT,
 current_value TEXT,
 proposed_value TEXT,
 details_json TEXT NOT NULL,
 status TEXT NOT NULL CHECK (status IN ('pending','accepted','declined','withdrawn')),
 decided_by TEXT,
 decided_at TEXT,
 decided_value TEXT,
 created_at TEXT NOT NULL
);
INSERT INTO capture_proposals_new SELECT * FROM capture_proposals;
DROP TABLE capture_proposals;
ALTER TABLE capture_proposals_new RENAME TO capture_proposals;
CREATE INDEX capture_proposals_status ON capture_proposals(status,created_at);
CREATE INDEX capture_proposals_record ON capture_proposals(record_type,record_id);
CREATE TRIGGER archive_guard_capture_proposals_insert BEFORE INSERT ON capture_proposals
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_capture_proposals_update BEFORE UPDATE ON capture_proposals
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_capture_proposals_delete BEFORE DELETE ON capture_proposals
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;

-- Source withdrawal is terminal for this proposal, including after reconnection.
CREATE TRIGGER capture_graph_source_withdrawn AFTER UPDATE ON capture_sources
WHEN NEW.state='disconnected' OR NEW.connection_id IS NOT OLD.connection_id
BEGIN
 UPDATE capture_proposals SET status='withdrawn',decided_at=NEW.updated_at,
  details_json=json_set(details_json,'$.withdrawal','Evidence source revoked')
 WHERE status='pending' AND json_extract(details_json,'$.graphProposal')=1
 AND signal_id IN(SELECT id FROM signals WHERE source_id=NEW.id);
END;
