-- The minute timer and the notification poll must read a flat number of rows however much history an
-- installation keeps. D1 Free allows 5 million row reads a day for the whole account.
--
-- opportunity_activity is a derived, installation-local summary of each deal: the newest linked timeline entry
-- and whether the deal can go stale. Triggers keep it current; it is never archived, so a restore rebuilds it as
-- the restored rows load. Stale detection reads this one indexed row per candidate instead of every deal's whole
-- timeline. A row is marked dirty when an entry is edited or unlinked; the next timer recomputes just those.
CREATE TABLE opportunity_activity (
 opportunity_id TEXT PRIMARY KEY,
 created_at TEXT,
 entry_at TEXT,
 idle INTEGER NOT NULL DEFAULT 0 CHECK (idle IN (0,1)),
 dirty INTEGER NOT NULL DEFAULT 0 CHECK (dirty IN (0,1))
);
CREATE INDEX opportunity_activity_idle_idx ON opportunity_activity(julianday(COALESCE(entry_at,created_at))) WHERE idle=1;
CREATE INDEX opportunity_activity_dirty_idx ON opportunity_activity(opportunity_id) WHERE dirty=1;

INSERT INTO opportunity_activity(opportunity_id,created_at,entry_at,idle)
SELECT o.id,o.created_at,
 (SELECT MAX(t.occurred_at) FROM timeline_entry_records r JOIN timeline_entries t ON t.id=r.timeline_entry_id WHERE r.record_type='opportunity' AND r.record_id=o.id),
 o.lifecycle='open' AND o.queue_state='none'
FROM opportunities o;

CREATE TRIGGER opportunity_activity_created AFTER INSERT ON opportunities
BEGIN
 INSERT INTO opportunity_activity(opportunity_id,created_at,idle) VALUES(NEW.id,NEW.created_at,NEW.lifecycle='open' AND NEW.queue_state='none')
 ON CONFLICT(opportunity_id) DO UPDATE SET created_at=excluded.created_at,idle=excluded.idle;
END;
CREATE TRIGGER opportunity_activity_state AFTER UPDATE OF lifecycle,queue_state,created_at ON opportunities
BEGIN
 UPDATE opportunity_activity SET created_at=NEW.created_at,idle=NEW.lifecycle='open' AND NEW.queue_state='none' WHERE opportunity_id=NEW.id;
END;
CREATE TRIGGER opportunity_activity_removed AFTER DELETE ON opportunities
BEGIN
 DELETE FROM opportunity_activity WHERE opportunity_id=OLD.id;
END;
-- A new link can only raise the newest entry, so it never needs the whole timeline.
CREATE TRIGGER opportunity_activity_linked AFTER INSERT ON timeline_entry_records
WHEN NEW.record_type='opportunity'
BEGIN
 INSERT INTO opportunity_activity(opportunity_id,entry_at,dirty)
 VALUES(NEW.record_id,(SELECT occurred_at FROM timeline_entries WHERE id=NEW.timeline_entry_id),NOT EXISTS(SELECT 1 FROM timeline_entries WHERE id=NEW.timeline_entry_id))
 ON CONFLICT(opportunity_id) DO UPDATE SET
  entry_at=CASE WHEN excluded.entry_at IS NOT NULL AND (opportunity_activity.entry_at IS NULL OR excluded.entry_at>opportunity_activity.entry_at) THEN excluded.entry_at ELSE opportunity_activity.entry_at END,
  dirty=opportunity_activity.dirty OR excluded.dirty;
END;
CREATE TRIGGER opportunity_activity_unlinked AFTER DELETE ON timeline_entry_records
WHEN OLD.record_type='opportunity'
BEGIN
 UPDATE opportunity_activity SET dirty=1 WHERE opportunity_id=OLD.record_id;
END;
CREATE TRIGGER opportunity_activity_moved AFTER UPDATE OF occurred_at ON timeline_entries
BEGIN
 UPDATE opportunity_activity SET dirty=1 WHERE opportunity_id IN(SELECT record_id FROM timeline_entry_records WHERE timeline_entry_id=NEW.id AND record_type='opportunity');
END;

-- The timer selects only deals that can be due, never every open deal.
CREATE INDEX opportunities_close_due_idx ON opportunities(expected_close_at) WHERE lifecycle='open' AND queue_state<>'now' AND expected_close_at IS NOT NULL;
CREATE INDEX opportunities_next_due_idx ON opportunities(next_due_at) WHERE lifecycle='open' AND queue_state='next' AND next_due_at IS NOT NULL;

-- The inbox lists the newest hundred; without this order D1 reads and sorts every notification an operator has.
CREATE INDEX notifications_recent_idx ON notifications(operator_id,created_at DESC,id DESC);
