-- Transaction-local context is emptied by the writer in the same D1 batch.
-- It cannot survive a rolled-back write and is never an admission credential.
CREATE TABLE orbit_agent_write_context(singleton INTEGER PRIMARY KEY CHECK(singleton=1),actor_json TEXT NOT NULL CHECK(json_valid(actor_json)));
CREATE TRIGGER orbit_agent_timeline BEFORE INSERT ON timeline_entries
WHEN NEW.actor_type<>'agent' AND EXISTS(SELECT 1 FROM orbit_agent_write_context WHERE singleton=1)
BEGIN
 INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json)
 VALUES(NEW.id,NEW.kind,NEW.occurred_at,NEW.recorded_at,'agent',NEW.actor_id,NEW.source,json_patch(NEW.payload_json,(SELECT actor_json FROM orbit_agent_write_context WHERE singleton=1)));
 SELECT RAISE(IGNORE);
END;
CREATE TRIGGER orbit_agent_native_audit AFTER INSERT ON audit_entries
WHEN EXISTS(SELECT 1 FROM orbit_agent_write_context WHERE singleton=1)
BEGIN
 UPDATE audit_entries SET details_json=json_patch(details_json,(SELECT actor_json FROM orbit_agent_write_context WHERE singleton=1)) WHERE id=NEW.id;
END;
