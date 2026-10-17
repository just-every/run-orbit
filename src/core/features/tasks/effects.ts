import { createId } from '../../shared/ids';
import type { TaskRow } from './contracts';
import { activeTaskOwner, tasksAvailable } from './authority';
export function taskEffects(db: D1Database, task: TaskRow, actorId: string, kind: string, previous?: TaskRow, reason?: string) {
 const id = createId();
 const payload = JSON.stringify({taskId: task.id, title: task.title, ownerId: task.owner_id,
 previousOwnerId: previous?.owner_id, dueAt: task.due_at, previousDueAt: previous?.due_at,
 priority: task.priority, type: task.task_type, status: task.status, seriesId: task.series_id, occurrence: task.occurrence, reason});
 return [
  db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,?,?,?,'operator',?,'tasks',?)").bind(id, kind, task.updated_at, task.updated_at, actorId, payload),
  db.prepare('INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) VALUES(?,?,?)').bind(id, task.record_type, task.contact_id ?? task.company_id ?? task.opportunity_id),
  db.prepare('INSERT INTO sales_task_timeline(task_id,entry_id) VALUES(?,?)').bind(task.id, id),
  db.prepare("INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) VALUES(?,?,?,'sales_task',?,?,?)").bind(createId(), actorId, kind, task.id, JSON.stringify({revision: task.revision, seriesId: task.series_id}), task.updated_at)
 ];
}
export function taskAssignment(db: D1Database, task: TaskRow, actorId: string, previousOwnerId: string | null = null) {
 if (!task.owner_id || task.owner_id === actorId || task.owner_id === previousOwnerId) return [];
 const key = `task.assigned:${task.id}:${task.assignment_revision}`;
 return [
  db.prepare(`INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
   SELECT ?,t.owner_id,t.opportunity_id,?,'task.assigned','Task: '||t.title||'. Assigned by '||a.display_name||'; previous owner: '||COALESCE(p.display_name,'Unassigned')||'.',?
   FROM sales_tasks t JOIN operators a ON a.id=? LEFT JOIN operators p ON p.id=?
   WHERE t.id=? AND t.owner_id=? AND t.status='open' AND ${activeTaskOwner} AND ${tasksAvailable}`)
   .bind(createId(), key, task.updated_at, actorId, previousOwnerId, task.id, task.owner_id, task.owner_id),
  db.prepare(`INSERT OR IGNORE INTO sales_task_notification_links(notification_id,task_id,href)
   SELECT n.id,?,? FROM notifications n WHERE n.operator_id=? AND n.event_key=?`)
   .bind(task.id, `/app#sales-task-${task.id}`, task.owner_id, key)
 ];
}
