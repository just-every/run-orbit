-- Native sales tasks remain separate from delegated onboarding handoffs.
CREATE TABLE sales_task_series (
 id TEXT PRIMARY KEY,
 cancelled_at TEXT,
 cancelled_by TEXT REFERENCES operators(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE sales_tasks (
 id TEXT PRIMARY KEY,
 series_id TEXT NOT NULL REFERENCES sales_task_series(id) ON DELETE CASCADE,
 occurrence INTEGER NOT NULL CHECK(occurrence>=0),
 record_type TEXT NOT NULL CHECK(record_type IN ('contact','company','opportunity')),
 contact_id TEXT REFERENCES contacts(id) ON DELETE CASCADE,
 company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
 opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 300),
 owner_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
 due_at TEXT NOT NULL,
 priority TEXT NOT NULL CHECK(priority IN ('low','normal','high','urgent')),
 task_type TEXT NOT NULL CHECK(task_type IN ('call','email','meeting','follow_up','other')),
 notes TEXT NOT NULL DEFAULT '',
 recurrence TEXT NOT NULL CHECK(recurrence IN ('none','daily','weekly')),
 timezone TEXT NOT NULL,
 recurrence_time TEXT NOT NULL,
 reminder_minutes INTEGER CHECK(reminder_minutes BETWEEN 0 AND 10080),
 status TEXT NOT NULL CHECK(status IN ('open','completed','cancelled')),
 revision TEXT NOT NULL,
 assignment_revision TEXT NOT NULL,
 reminder_revision TEXT NOT NULL,
 created_by TEXT REFERENCES operators(id) ON DELETE SET NULL,
 updated_by TEXT REFERENCES operators(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(series_id,occurrence),
 CHECK((record_type='contact' AND contact_id IS NOT NULL AND company_id IS NULL AND opportunity_id IS NULL)
    OR (record_type='company' AND company_id IS NOT NULL AND contact_id IS NULL AND opportunity_id IS NULL)
    OR (record_type='opportunity' AND opportunity_id IS NOT NULL AND contact_id IS NULL AND company_id IS NULL))
);
CREATE INDEX sales_tasks_owner_due ON sales_tasks(owner_id,status,due_at,id);
CREATE INDEX sales_tasks_due ON sales_tasks(status,due_at,id);
CREATE INDEX sales_tasks_contact ON sales_tasks(contact_id);
CREATE INDEX sales_tasks_company ON sales_tasks(company_id);
CREATE INDEX sales_tasks_opportunity ON sales_tasks(opportunity_id);
CREATE TABLE sales_task_timeline (
 task_id TEXT NOT NULL REFERENCES sales_tasks(id) ON DELETE CASCADE,
 entry_id TEXT NOT NULL REFERENCES timeline_entries(id) ON DELETE CASCADE,
 PRIMARY KEY(task_id,entry_id)
);
-- Existing notifications.opportunity_id is nullable. Contact and company tasks use a native link.
CREATE TABLE sales_task_notification_links (
 notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
 task_id TEXT NOT NULL REFERENCES sales_tasks(id) ON DELETE CASCADE,
 href TEXT NOT NULL,
 PRIMARY KEY(notification_id,task_id)
);
CREATE INDEX sales_task_notification_task ON sales_task_notification_links(task_id,notification_id);
-- Empty outside each atomic write; named constraints distinguish permission and review races.
CREATE TABLE sales_task_guards (
 id TEXT PRIMARY KEY,
 authority INTEGER NOT NULL CONSTRAINT sales_task_authority CHECK(authority=1),
 revision INTEGER NOT NULL CONSTRAINT sales_task_revision CHECK(revision=1)
);
-- Remove ALL copies of task content, even entries linked to another record.
CREATE TRIGGER sales_task_erase BEFORE DELETE ON sales_tasks
BEGIN
 DELETE FROM timeline_entries WHERE id IN(SELECT entry_id FROM sales_task_timeline WHERE task_id=OLD.id);
 DELETE FROM notifications WHERE id IN(SELECT notification_id FROM sales_task_notification_links WHERE task_id=OLD.id);
 UPDATE audit_entries SET entity_id='erased',details_json='{}' WHERE entity_type='sales_task' AND entity_id=OLD.id;
END;
