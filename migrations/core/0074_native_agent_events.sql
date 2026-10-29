-- Use the native timeline id for retained events. Restored historical rows do
-- not become new events. The door still re-reads each URI at delivery time.
CREATE TRIGGER orbit_native_record_event AFTER INSERT ON timeline_entry_records
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))
 AND EXISTS(SELECT 1 FROM timeline_entries e WHERE e.id=NEW.timeline_entry_id AND e.actor_type IN('operator','agent'))
BEGIN
 INSERT OR IGNORE INTO agent_door_events(id,uri,event)
 SELECT e.id||':'||NEW.record_type||':'||NEW.record_id,
  'orbit://records/'||NEW.record_type||'/'||NEW.record_id,
  json_object('id',e.id||':'||NEW.record_type||':'||NEW.record_id,'type',e.kind,
   'uri','orbit://records/'||NEW.record_type||'/'||NEW.record_id,'at',e.recorded_at,
   'native_activity_id',e.id,'actor',json(CASE WHEN e.actor_type='agent'
    THEN json_patch(json_extract(e.payload_json,'$.preparedBy'),'{"kind":"agent"}')
    ELSE json_object('kind','person','person',json_object('id',e.actor_id,'name',COALESCE(o.display_name,'Former operator'))) END))
 FROM timeline_entries e LEFT JOIN operators o ON o.id=e.actor_id WHERE e.id=NEW.timeline_entry_id;
END;
