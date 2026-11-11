-- A direct-person notification marker is transaction-local writer context, not
-- an authority change. Keep real runtime controls fenced, including renames to
-- or from the marker, without invalidating the write's reviewed epoch ourselves.
DROP TRIGGER delegation_fence_runtime_controls_insert;
CREATE TRIGGER delegation_fence_runtime_controls_insert AFTER INSERT ON runtime_controls
WHEN NEW.name<>'direct_notification_actor'
BEGIN UPDATE delegation_installation SET epoch=epoch+1; END;

DROP TRIGGER delegation_fence_runtime_controls_update;
CREATE TRIGGER delegation_fence_runtime_controls_update AFTER UPDATE ON runtime_controls
WHEN OLD.name<>'direct_notification_actor' OR NEW.name<>'direct_notification_actor'
BEGIN UPDATE delegation_installation SET epoch=epoch+1; END;

DROP TRIGGER delegation_fence_runtime_controls_delete;
CREATE TRIGGER delegation_fence_runtime_controls_delete AFTER DELETE ON runtime_controls
WHEN OLD.name<>'direct_notification_actor'
BEGIN UPDATE delegation_installation SET epoch=epoch+1; END;
