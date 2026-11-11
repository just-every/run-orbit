-- Every notification kind shares this rule, including inserts from triggers.
-- The native request writer sets and clears the actor in the same D1 batch.
-- Agent, provider and scheduled writes carry no direct-person context.
CREATE TRIGGER notification_skip_direct_actor BEFORE INSERT ON notifications
WHEN NEW.operator_id=(SELECT value FROM runtime_controls WHERE name='direct_notification_actor')
 AND NOT EXISTS(SELECT 1 FROM orbit_agent_write_context)
 AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import','workflow_chain'))
BEGIN
 SELECT RAISE(IGNORE);
END;
