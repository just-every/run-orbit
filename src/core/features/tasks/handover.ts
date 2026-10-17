import { createId } from '../../shared/ids';
import { activeTaskOwner, taskGuard } from './authority';
import { TaskError, type TaskRow } from './contracts';
import { taskEffects } from './effects';
export async function openTaskInventory(db: D1Database, ownerId: string) {
 return (await db.prepare("SELECT id,title,due_at AS dueAt,revision,series_id AS seriesId FROM sales_tasks WHERE owner_id=? AND status='open' ORDER BY due_at,id").bind(ownerId).all<{id: string; title: string; dueAt: string; revision: string; seriesId: string}>()).results;
}
/** The removal flow supplies an explicit recipient (null means reviewed unassignment),
 * stable operationId and reviewed inventory. Join these statements into its SAME
 * native/session-fenced D1 batch; do not execute separately before removal.
 * The count+revision guards reject newly assigned or edited work since review. */
export async function taskHandoverStatements(db: D1Database, input: {
 fromOwnerId: string; toOwnerId: string | null; actorId: string; operationId: string;
 reviewedTasks: {id: string; revision: string}[];
}) {
 if (input.fromOwnerId === input.toOwnerId) throw new TaskError(400, 'Choose another task owner or explicit unassignment.');
 if (new Set(input.reviewedTasks.map(task => task.id)).size !== input.reviewedTasks.length) throw new TaskError(400, 'Review each task once.');
 const rows = (await db.prepare("SELECT * FROM sales_tasks WHERE owner_id=? AND status='open' ORDER BY id").bind(input.fromOwnerId).all<TaskRow>()).results;
 const reviewed = new Map(input.reviewedTasks.map(task => [task.id, task.revision]));
 if (rows.length !== reviewed.size || rows.some(task => reviewed.get(task.id) !== task.revision)) throw new TaskError(409, 'Open tasks changed. Reload the removal review.');
 const now = new Date().toISOString(), statements: D1PreparedStatement[] = [taskGuard(db, {
  sql: "(SELECT count(*) FROM sales_tasks WHERE owner_id=? AND status='open')=?", args: [input.fromOwnerId, rows.length]
 })];
 if (input.toOwnerId) statements.push(taskGuard(db, {sql: activeTaskOwner, args: [input.toOwnerId]}));
 for (const previous of rows) {
  const revision = createId(), task = {...previous, owner_id: input.toOwnerId, revision, assignment_revision: revision, reminder_revision: revision, updated_at: now, updated_by: input.actorId};
  statements.push(taskGuard(db, {sql: "EXISTS(SELECT 1 FROM sales_tasks WHERE id=? AND revision=? AND owner_id=? AND status='open')", args: [previous.id, previous.revision, input.fromOwnerId]}),
   db.prepare('UPDATE sales_tasks SET owner_id=?,revision=?,assignment_revision=?,reminder_revision=?,updated_at=?,updated_by=? WHERE id=?').bind(input.toOwnerId, revision, revision, revision, now, input.actorId, task.id),
   ...taskEffects(db, task, input.actorId, 'task.reassigned', previous, 'Operator removal handover'),
   db.prepare("DELETE FROM notifications WHERE read_at IS NULL AND kind='task.reminder' AND id IN(SELECT notification_id FROM sales_task_notification_links WHERE task_id=?)").bind(task.id));
 }
 if (rows.length && input.toOwnerId && input.toOwnerId !== input.actorId) {
  const key = `task.handover:${input.operationId}`, message = `Tasks: ${rows.map(task => task.title).join('; ')}. `;
  statements.push(db.prepare(`INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
   SELECT ?,?,NULL,?,'task.assigned',?||'Assigned by '||a.display_name||'; previous owner: '||p.display_name||'.',?
   FROM operators a JOIN operators p ON p.id=? WHERE a.id=?`)
   .bind(createId(), input.toOwnerId, key, message, now, input.fromOwnerId, input.actorId));
  for (const task of rows) statements.push(db.prepare("INSERT OR IGNORE INTO sales_task_notification_links(notification_id,task_id,href) SELECT id,?,'/app#sales-tasks' FROM notifications WHERE operator_id=? AND event_key=?").bind(task.id, input.toOwnerId, key));
 }
 // Parent also uses task guards for record handover; clear only at the end of its batch.
 return statements;
}
