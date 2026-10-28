-- Current promise ownership is independent of the historical sender.
ALTER TABLE record_mail_obligations ADD COLUMN owner_id TEXT REFERENCES operators(id);
ALTER TABLE record_mail_obligations ADD COLUMN owner_recorded_at TEXT;
UPDATE record_mail_obligations SET owner_id=operator_id,owner_recorded_at=opened_at;
CREATE INDEX record_mail_promise_owner_index ON record_mail_obligations(owner_id,closed_at,due_at);
CREATE TRIGGER record_mail_promise_owner AFTER INSERT ON record_mail_obligations
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))
BEGIN UPDATE record_mail_obligations SET owner_id=NEW.operator_id,owner_recorded_at=NEW.opened_at WHERE message_id=NEW.message_id; END;
-- Request previews are transient, never restored as sending or generation authority.
CREATE TRIGGER record_ai_contact_erased AFTER DELETE ON contacts BEGIN
 DELETE FROM runtime_controls WHERE name LIKE 'record_ai_preview:%';
END;
CREATE TRIGGER record_ai_operator_changed AFTER UPDATE OF status,email,display_name ON operators
WHEN NEW.status IS NOT OLD.status OR NEW.email IS NOT OLD.email OR NEW.display_name IS NOT OLD.display_name BEGIN
 DELETE FROM runtime_controls WHERE name LIKE 'record_ai_preview:%';
END;
