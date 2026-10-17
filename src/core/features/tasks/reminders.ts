import { createId } from '../../shared/ids';
import { tasksAvailable } from './authority';
/** In-app only. The timer may call this again after interruption: event keys bind
 * to the due/assignee/reminder revision, and every insert rechecks current state.
 * Restore never invokes this from a table trigger and the runtime fence also
 * prevents a concurrent timer from dispatching during restore. */
export async function dispatchSalesTaskReminders(db: D1Database, now = new Date().toISOString()) {
 const available = await db.prepare(`SELECT ${tasksAvailable} AS available`).first<{available: number}>();
 if (!available?.available) return {created: 0, blocked: true};
 const due = (await db.prepare(`SELECT t.id,t.reminder_revision,t.owner_id FROM sales_tasks t
 JOIN sales_task_series s ON s.id=t.series_id JOIN operators p ON p.id=t.owner_id
 WHERE t.status='open' AND s.cancelled_at IS NULL AND t.reminder_minutes IS NOT NULL
 AND p.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=p.id)
 AND julianday(t.due_at)-t.reminder_minutes/1440.0<=julianday(?)
 AND NOT EXISTS(SELECT 1 FROM notifications n WHERE n.operator_id=t.owner_id AND n.event_key='task.reminder:'||t.id||':'||t.reminder_revision)
 ORDER BY t.due_at,t.id LIMIT 50`).bind(now).all<{id: string; reminder_revision: string; owner_id: string}>()).results;
 if (!due.length) return {created: 0, blocked: false};
 const statements = due.flatMap(task => {
  const key = `task.reminder:${task.id}:${task.reminder_revision}`;
  return [db.prepare(`INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
   SELECT ?,t.owner_id,t.opportunity_id,?,'task.reminder','Task reminder: '||t.title||'. Due '||t.due_at||'.',?
   FROM sales_tasks t JOIN sales_task_series s ON s.id=t.series_id JOIN operators p ON p.id=t.owner_id
   WHERE t.id=? AND t.reminder_revision=? AND t.owner_id=? AND t.status='open' AND s.cancelled_at IS NULL
   AND t.reminder_minutes IS NOT NULL AND julianday(t.due_at)-t.reminder_minutes/1440.0<=julianday(?)
   AND p.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=p.id) AND ${tasksAvailable}`)
   .bind(createId(), key, now, task.id, task.reminder_revision, task.owner_id, now),
  db.prepare(`INSERT OR IGNORE INTO sales_task_notification_links(notification_id,task_id,href)
   SELECT n.id,t.id,? FROM notifications n JOIN sales_tasks t ON t.id=? AND t.reminder_revision=? AND t.owner_id=n.operator_id
   WHERE n.operator_id=? AND n.event_key=? AND t.status='open' AND ${tasksAvailable}`)
   .bind(`/app#sales-task-${task.id}`, task.id, task.reminder_revision, task.owner_id, key)];
 });
 const results = await db.batch(statements);
 return {created: results.filter((_, index) => index % 2 === 0).reduce((total, result) => total + result.meta.changes, 0), blocked: false};
}
