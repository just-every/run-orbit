CREATE TABLE entry_privacy (
 source TEXT NOT NULL CHECK(source IN('entry','task','handoff')),
 entry_id TEXT NOT NULL,
 author_id TEXT NOT NULL REFERENCES operators(id),
 PRIMARY KEY(source,entry_id)
);
CREATE TRIGGER entry_privacy_timeline_delete AFTER DELETE ON timeline_entries BEGIN DELETE FROM entry_privacy WHERE source='entry' AND entry_id=OLD.id; END;
CREATE TRIGGER entry_privacy_task_delete AFTER DELETE ON sales_tasks BEGIN DELETE FROM entry_privacy WHERE source='task' AND entry_id=OLD.id; END;
CREATE TRIGGER entry_privacy_handoff_delete AFTER DELETE ON handoff_tasks BEGIN DELETE FROM entry_privacy WHERE source='handoff' AND entry_id=OLD.id; END;
