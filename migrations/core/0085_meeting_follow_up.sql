-- A reply is a message outcome. Only the reviewed goal movement or a human stop closes the goal.
CREATE TABLE follow_up_obligations (
 id TEXT PRIMARY KEY, opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
 contact_id TEXT, meeting_id TEXT, owner_id TEXT NOT NULL REFERENCES operators(id),
 goal_stage_id TEXT REFERENCES pipeline_stages(id) ON DELETE SET NULL, goal_stage_name TEXT NOT NULL,
 title TEXT NOT NULL, stop_condition TEXT NOT NULL, due_at TEXT NOT NULL,
 accepted_by TEXT NOT NULL, accepted_at TEXT NOT NULL, draft_id TEXT UNIQUE,
 responded_at TEXT, response_evidence_id TEXT,
 paused INTEGER NOT NULL DEFAULT 0 CHECK(paused IN(0,1)),
 closed_at TEXT, closed_reason TEXT, closed_by TEXT,
 CHECK((closed_at IS NULL AND closed_reason IS NULL) OR (closed_at IS NOT NULL AND closed_reason IS NOT NULL))
);
CREATE INDEX follow_up_opportunity ON follow_up_obligations(opportunity_id,accepted_at);
CREATE TABLE follow_up_work (
 obligation_id TEXT NOT NULL REFERENCES follow_up_obligations(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN('handoff','task','reminder')), item_id TEXT NOT NULL,
 dispatched_at TEXT, exited_at TEXT, exit_reason TEXT,
 PRIMARY KEY(kind,item_id)
);
CREATE INDEX follow_up_work_obligation ON follow_up_work(obligation_id);
CREATE TRIGGER follow_up_closed AFTER UPDATE OF closed_at ON follow_up_obligations
WHEN OLD.closed_at IS NULL AND NEW.closed_at IS NOT NULL
BEGIN
 UPDATE follow_up_work SET exited_at=NEW.closed_at,exit_reason=NEW.closed_reason WHERE obligation_id=NEW.id AND exited_at IS NULL;
 UPDATE handoff_tasks SET status='cancelled',revision=NEW.id,updated_at=NEW.closed_at
 WHERE status='open' AND id IN(SELECT item_id FROM follow_up_work WHERE obligation_id=NEW.id AND kind='handoff');
 INSERT OR IGNORE INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json)
 SELECT 'obligation-task-close:'||t.id,'task.cancelled',NEW.closed_at,NEW.closed_at,'operator',NEW.closed_by,'tasks',json_object('obligationId',NEW.id,'taskId',t.id,'title',t.title,'ownerId',t.owner_id,'dueAt',t.due_at,'status','cancelled','reason',NEW.closed_reason)
 FROM sales_tasks t WHERE t.status='open' AND t.id IN(SELECT item_id FROM follow_up_work WHERE obligation_id=NEW.id AND kind='task');
 INSERT OR IGNORE INTO sales_task_timeline SELECT t.id,'obligation-task-close:'||t.id FROM sales_tasks t WHERE t.status='open' AND t.id IN(SELECT item_id FROM follow_up_work WHERE obligation_id=NEW.id AND kind='task');
 INSERT OR IGNORE INTO timeline_entry_records SELECT 'obligation-task-close:'||t.id,'opportunity',NEW.opportunity_id FROM sales_tasks t WHERE t.status='open' AND t.id IN(SELECT item_id FROM follow_up_work WHERE obligation_id=NEW.id AND kind='task');
 UPDATE sales_task_series SET cancelled_at=COALESCE(cancelled_at,NEW.closed_at),cancelled_by=COALESCE(cancelled_by,NEW.closed_by) WHERE id IN(SELECT series_id FROM sales_tasks WHERE id IN(SELECT item_id FROM follow_up_work WHERE obligation_id=NEW.id AND kind='task'));
 DELETE FROM notifications WHERE kind='task.reminder' AND id IN(SELECT notification_id FROM sales_task_notification_links WHERE task_id IN(SELECT item_id FROM follow_up_work WHERE obligation_id=NEW.id AND kind='task'));
 UPDATE sales_tasks SET status='cancelled',revision=NEW.id,updated_at=NEW.closed_at,updated_by=NEW.closed_by
 WHERE status='open' AND id IN(SELECT item_id FROM follow_up_work WHERE obligation_id=NEW.id AND kind='task');
 UPDATE outbound_messages SET state='cancelled',failure=NEW.closed_reason,updated_at=NEW.closed_at WHERE draft_id=NEW.draft_id AND state IN('draft','scheduled','queued');
 UPDATE record_mail_outbound_messages SET state='cancelled',failure=NEW.closed_reason,updated_at=NEW.closed_at WHERE draft_id=NEW.draft_id AND state IN('draft','scheduled','queued');
 UPDATE drafts SET is_stale=1,stale_reason=NEW.closed_reason WHERE id=NEW.draft_id;
 UPDATE record_mail_drafts SET is_stale=1,stale_reason=NEW.closed_reason WHERE id=NEW.draft_id;
 DELETE FROM notifications WHERE event_key='obligation.due:'||NEW.id;
 INSERT OR IGNORE INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json)
 VALUES('obligation-close:'||NEW.id,'obligation.closed',NEW.closed_at,NEW.closed_at,'operator',NEW.closed_by,'obligations',json_object('obligationId',NEW.id,'reason',NEW.closed_reason));
 INSERT OR IGNORE INTO timeline_entry_records VALUES('obligation-close:'||NEW.id,'opportunity',NEW.opportunity_id);
 INSERT OR IGNORE INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at)
 VALUES('obligation-close:'||NEW.id,NEW.closed_by,'obligation.closed','opportunity',NEW.opportunity_id,json_object('obligationId',NEW.id,'reason',NEW.closed_reason),NEW.closed_at);
END;
CREATE TRIGGER follow_up_handoff_no_revival BEFORE UPDATE ON handoff_tasks
WHEN NEW.status='open' AND EXISTS(SELECT 1 FROM follow_up_work w JOIN follow_up_obligations o ON o.id=w.obligation_id WHERE w.kind='handoff' AND w.item_id=NEW.id AND (w.exited_at IS NOT NULL OR o.closed_at IS NOT NULL))
BEGIN SELECT RAISE(ABORT,'Follow-up obligation is closed or paused'); END;

CREATE TRIGGER follow_up_task_no_revival BEFORE UPDATE ON sales_tasks
WHEN NEW.status='open' AND EXISTS(SELECT 1 FROM follow_up_work w JOIN follow_up_obligations o ON o.id=w.obligation_id WHERE w.kind='task' AND w.item_id=NEW.id AND (w.exited_at IS NOT NULL OR o.closed_at IS NOT NULL))
BEGIN SELECT RAISE(ABORT,'Follow-up obligation is closed or paused'); END;
