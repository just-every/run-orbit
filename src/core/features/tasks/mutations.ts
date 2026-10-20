import type { AuthenticatedOperator } from '../identity';
import { createId } from '../../shared/ids';
import { activeTaskOwner, commitTasks, taskAuthority, taskGuard } from './authority';
import { TaskError, type TaskInput, type TaskRow, type TaskStatus } from './contracts';
import { taskAssignment, taskEffects } from './effects';
import { insertTask, rawTask } from './repository';
import { nextTaskDue, taskLocalClock } from './time';
import { mentionPlan } from '../records/mentions';
/** RECORD-017: a task note's mentions notify each colleague once per task; the text keeps them. */
const noteMentions=(db: D1Database, task: TaskRow, author: string) => mentionPlan(db, {source: 'task', sourceId: task.id, kind: task.record_type, recordId: (task.contact_id ?? task.company_id ?? task.opportunity_id)!, label: 'task note', text: task.notes, author});
const tables = {contact: 'contacts', company: 'companies', opportunity: 'opportunities'} as const;
function inputGuard(db: D1Database, input: TaskInput) {
 const owner = input.ownerId ? ` AND ${activeTaskOwner}` : '';
 return taskGuard(db, {sql: `EXISTS(SELECT 1 FROM ${tables[input.recordType]} WHERE id=?)${owner}`, args: [input.recordId, ...(input.ownerId ? [input.ownerId] : [])]});
}
export function newTask(input: TaskInput, actorId: string, now: string): TaskRow {
 const id = createId(), revision = createId();
 return {id, series_id: createId(), occurrence: 0, record_type: input.recordType,
 contact_id: input.recordType === 'contact' ? input.recordId : null,
 company_id: input.recordType === 'company' ? input.recordId : null,
 opportunity_id: input.recordType === 'opportunity' ? input.recordId : null,
 title: input.title, owner_id: input.ownerId, due_at: new Date(input.dueAt).toISOString(), priority: input.priority,
 task_type: input.type, notes: input.notes, recurrence: input.recurrence, timezone: input.timezone,
 recurrence_time: taskLocalClock(input.dueAt, input.timezone), reminder_minutes: input.reminderMinutes,
 status: 'open', revision, assignment_revision: revision, reminder_revision: revision,
 created_by: actorId, updated_by: actorId, created_at: now, updated_at: now};
}
export async function createTask(db: D1Database, actor: AuthenticatedOperator, input: TaskInput) {
 const authority = await taskAuthority(db, actor), now = new Date().toISOString(), task = newTask(input, actor.operatorId, now);
 await commitTasks(db, authority, [inputGuard(db, input),
 db.prepare('INSERT INTO sales_task_series(id,created_at) VALUES(?,?)').bind(task.series_id, now),
 insertTask(db, task), ...taskEffects(db, task, actor.operatorId, 'task.created'), ...taskAssignment(db, task, actor.operatorId), ...(await noteMentions(db, task, actor.operatorId)).statements]);
 return {id: task.id, revision: task.revision};
}
function updatedTask(previous: TaskRow, input: TaskInput, actorId: string, status: TaskStatus): TaskRow {
 const revision = createId(), dueAt = new Date(input.dueAt).toISOString();
 const reminderChanged = dueAt !== previous.due_at || input.ownerId !== previous.owner_id || input.reminderMinutes !== previous.reminder_minutes;
 return {...previous, title: input.title, owner_id: input.ownerId, due_at: dueAt, priority: input.priority,
 task_type: input.type, notes: input.notes, recurrence: input.recurrence, timezone: input.timezone,
 recurrence_time: dueAt !== previous.due_at || input.timezone !== previous.timezone ? taskLocalClock(dueAt, input.timezone) : previous.recurrence_time,
 reminder_minutes: input.reminderMinutes, status, revision,
 assignment_revision: input.ownerId !== previous.owner_id ? revision : previous.assignment_revision,
 reminder_revision: reminderChanged ? revision : previous.reminder_revision,
 updated_by: actorId, updated_at: new Date().toISOString()};
}
function updateStatement(db: D1Database, task: TaskRow) {
 const fields: (keyof TaskRow)[] = ['title','owner_id','due_at','priority','task_type','notes','recurrence','timezone','recurrence_time','reminder_minutes','status','revision','assignment_revision','reminder_revision','updated_by','updated_at'];
 return db.prepare(`UPDATE sales_tasks SET ${fields.map(field => `${field}=?`).join(',')} WHERE id=?`).bind(...fields.map(field => task[field]), task.id);
}
export async function updateTask(db: D1Database, actor: AuthenticatedOperator, id: string, input: TaskInput & {revision: string; status: TaskStatus}) {
 const authority = await taskAuthority(db, actor), previous = await rawTask(db, id);
 if (previous.revision !== input.revision) throw new TaskError(409, 'The task changed. Reload before saving.');
 if (previous.status !== 'open') throw new TaskError(409, 'This occurrence has finished. Edit the next open occurrence instead.');
 if (input.recordType !== previous.record_type || input.recordId !== (previous.contact_id ?? previous.company_id ?? previous.opportunity_id)) throw new TaskError(400, 'A task keeps its original linked record. Create another task to change the link.');
 const task = updatedTask(previous, input, actor.operatorId, input.status);
 const statements = [inputGuard(db, input), taskGuard(db, {sql: "EXISTS(SELECT 1 FROM sales_tasks t JOIN sales_task_series s ON s.id=t.series_id WHERE t.id=? AND t.revision=? AND t.status='open' AND s.cancelled_at IS NULL)", args: [id, input.revision]})];
 if (input.status === 'cancelled') {
  const open = (await db.prepare("SELECT * FROM sales_tasks WHERE series_id=? AND status='open'").bind(previous.series_id).all<TaskRow>()).results;
  statements.push(taskGuard(db, {sql: "(SELECT count(*) FROM sales_tasks WHERE series_id=? AND status='open')=?", args: [previous.series_id, open.length]}));
  for (const row of open) {
   statements.push(taskGuard(db, {sql: 'EXISTS(SELECT 1 FROM sales_tasks WHERE id=? AND revision=?)', args: [row.id, row.revision]}));
   const cancelled = row.id === id ? task : {...row, status: 'cancelled' as const, revision: createId(), updated_by: actor.operatorId, updated_at: task.updated_at};
   statements.push(updateStatement(db, cancelled), ...taskEffects(db, cancelled, actor.operatorId, 'task.cancelled', row, 'Recurring series cancelled'),
    db.prepare("DELETE FROM notifications WHERE read_at IS NULL AND kind='task.reminder' AND id IN(SELECT notification_id FROM sales_task_notification_links WHERE task_id=?)").bind(row.id));
  }
  statements.push(db.prepare('UPDATE sales_task_series SET cancelled_at=?,cancelled_by=? WHERE id=?').bind(task.updated_at, actor.operatorId, task.series_id));
 } else {
  const kind = input.status === 'completed' ? 'task.completed' : task.owner_id !== previous.owner_id ? 'task.reassigned' : task.due_at !== previous.due_at ? 'task.rescheduled' : 'task.updated';
  statements.push(updateStatement(db, task), ...taskEffects(db, task, actor.operatorId, kind, previous), ...(await noteMentions(db, task, actor.operatorId)).statements);
  if (task.owner_id !== previous.owner_id) statements.push(...taskAssignment(db, task, actor.operatorId, previous.owner_id));
  if (input.status === 'completed' && task.recurrence !== 'none') {
   const revision = createId();
   const next: TaskRow = {...task, id: createId(), occurrence: task.occurrence + 1, status: 'open',
    due_at: nextTaskDue(task.due_at, task.recurrence, task.timezone, task.recurrence_time),
    revision, assignment_revision: revision, reminder_revision: revision,
    created_by: actor.operatorId, created_at: task.updated_at};
   statements.push(insertTask(db, next), ...taskEffects(db, next, actor.operatorId, 'task.created', undefined, 'Next recurring occurrence'), ...taskAssignment(db, next, actor.operatorId));
  }
 }
 // Completion/cancellation withdraws unread reminders; reassignment and rescheduling withdraw stale ones.
 if (task.status !== 'open' || task.reminder_revision !== previous.reminder_revision) statements.push(db.prepare("DELETE FROM notifications WHERE read_at IS NULL AND kind='task.reminder' AND id IN(SELECT notification_id FROM sales_task_notification_links WHERE task_id=?)").bind(id));
 await commitTasks(db, authority, statements);
 return {id, revision: task.revision};
}
