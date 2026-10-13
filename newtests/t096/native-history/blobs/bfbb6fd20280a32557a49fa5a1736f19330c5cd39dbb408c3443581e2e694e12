-- This random privacy matching context is confidential native-backup material,
-- not a source, authentication, mail or delegation credential.
CREATE TABLE privacy_matching_contexts (
 context_id TEXT PRIMARY KEY CHECK(length(context_id)=32 AND context_id NOT GLOB '*[^0-9a-f]*'),
 matching_key TEXT NOT NULL CHECK(length(matching_key)=64 AND matching_key NOT GLOB '*[^0-9a-f]*')
);
-- Erased mailbox matching proofs contain only a keyed digest and context identity.
CREATE INDEX contact_suppression_proof ON audit_entries(entity_id,action) WHERE action IN ('contact.suppressed','contact.suppression_cleared');
CREATE TRIGGER archive_guard_privacy_matching_contexts_insert BEFORE INSERT ON privacy_matching_contexts
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_privacy_matching_contexts_delete BEFORE DELETE ON privacy_matching_contexts
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
-- Reviewed clears compare a monotonic version even when multiple writes share a millisecond.
ALTER TABLE contacts ADD COLUMN contactability_revision INTEGER NOT NULL DEFAULT 0;
CREATE TRIGGER contactability_revision_after_update AFTER UPDATE OF contactability ON contacts
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN UPDATE contacts SET contactability_revision=OLD.contactability_revision+1 WHERE id=NEW.id; END;
CREATE TRIGGER archive_guard_privacy_matching_contexts_update BEFORE UPDATE ON privacy_matching_contexts
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
