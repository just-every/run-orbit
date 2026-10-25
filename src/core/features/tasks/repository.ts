import {operatorListingPredicate} from '../identity/operator-listing';
import { localTime } from '../outreach/time';
import { TaskError, type SalesTask, type TaskHistory, type TaskList, type TaskRow } from './contracts';
import { taskDayWindow } from './time';
export const taskSelect = `SELECT t.*,s.cancelled_at AS series_cancelled_at,p.display_name AS owner_name,a.display_name AS updated_by_name,
 COALESCE(c.name,c.email,co.name,o.title) AS record_label FROM sales_tasks t
 JOIN sales_task_series s ON s.id=t.series_id LEFT JOIN contacts c ON c.id=t.contact_id
 LEFT JOIN companies co ON co.id=t.company_id LEFT JOIN opportunities o ON o.id=t.opportunity_id
 LEFT JOIN operators p ON p.id=t.owner_id LEFT JOIN operators a ON a.id=t.updated_by`;
type JoinedTask = TaskRow & {series_cancelled_at: string | null; owner_name: string | null; updated_by_name: string | null; record_label: string};
export function presentTask(row: JoinedTask): SalesTask {
 return {id: row.id, seriesId: row.series_id, occurrence: row.occurrence, recordType: row.record_type,
 recordId: row.contact_id ?? row.company_id ?? row.opportunity_id!, title: row.title, ownerId: row.owner_id,
 dueAt: row.due_at, priority: row.priority, type: row.task_type, notes: row.notes, recurrence: row.recurrence,
 timezone: row.timezone, reminderMinutes: row.reminder_minutes, status: row.status, revision: row.revision,
 assignmentRevision: row.assignment_revision, reminderRevision: row.reminder_revision, recurrenceTime: row.recurrence_time,
 recordLabel: row.record_label, ownerName: row.owner_name, createdAt: row.created_at, updatedAt: row.updated_at,
 updatedByName: row.updated_by_name, seriesCancelledAt: row.series_cancelled_at};
}
export async function readTask(db: D1Database, id: string) {
 const row = await db.prepare(`${taskSelect} WHERE t.id=?`).bind(id).first<JoinedTask>();
 if (!row) throw new TaskError(404, 'Task not found.');
 return presentTask(row);
}
export async function taskHistory(db: D1Database, id: string): Promise<TaskHistory[]> {
 const rows = (await db.prepare(`SELECT e.id,e.kind,e.occurred_at AS occurredAt,e.recorded_at AS recordedAt,COALESCE(p.display_name,'Erased operator') AS actorName,
 owner.display_name AS ownerName,previous.display_name AS previousOwnerName,e.payload_json
 FROM sales_task_timeline l JOIN timeline_entries e ON e.id=l.entry_id LEFT JOIN operators p ON p.id=e.actor_id
 LEFT JOIN operators owner ON owner.id=json_extract(e.payload_json,'$.ownerId')
 LEFT JOIN operators previous ON previous.id=json_extract(e.payload_json,'$.previousOwnerId')
 WHERE l.task_id=? ORDER BY e.occurred_at DESC,e.id LIMIT 100`).bind(id).all<Omit<TaskHistory, 'payload'> & {payload_json: string}>()).results;
 return rows.map(({payload_json, ...row}) => ({...row, payload: JSON.parse(payload_json)}));
}
export interface TaskQuery {view: 'today' | 'overdue' | 'all'; owner?: string; date?: string; offset: number}
export async function listTasks(db: D1Database, actorId: string, query: TaskQuery): Promise<TaskList> {
 const [workspace, operators] = await Promise.all([
  db.prepare("SELECT timezone FROM workspace_settings WHERE id='workspace'").first<{timezone: string}>(),
  db.prepare(`SELECT p.id,p.display_name AS displayName FROM operators p WHERE p.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=p.id) AND ${operatorListingPredicate('p')} ORDER BY p.display_name,p.id`).all<{id: string; displayName: string}>()
 ]);
 if (!workspace) throw new TaskError(503, 'Finish workspace setup before creating tasks.');
 const timezone = workspace.timezone, now = new Date().toISOString(), today = localTime(new Date(now), timezone).day;
 const clauses: string[] = [], args: (string | number)[] = [], owner = query.owner ?? actorId;
 if (owner === 'unassigned') clauses.push('t.owner_id IS NULL');
 else if (owner !== 'all') {clauses.push('t.owner_id=?'); args.push(owner);}
 if (query.view !== 'all') clauses.push("t.status='open'");
 if (query.view === 'overdue') {clauses.push('t.due_at<?'); args.push(now);}
 const date = query.date ?? (query.view === 'today' ? today : null);
 if (date) {clauses.push('t.due_at>=? AND t.due_at<?'); args.push(...taskDayWindow(date, timezone));}
 const rows = (await db.prepare(`${taskSelect} ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
 ORDER BY t.due_at,CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,t.id LIMIT 101 OFFSET ?`).bind(...args, query.offset).all<JoinedTask>()).results;
 return {tasks: rows.slice(0, 100).map(presentTask), operators: operators.results, timezone, today, actorId, view: query.view, date, offset: query.offset, more: rows.length > 100};
}
export async function rawTask(db: D1Database, id: string) {
 const row = await db.prepare('SELECT * FROM sales_tasks WHERE id=?').bind(id).first<TaskRow>();
 if (!row) throw new TaskError(404, 'Task not found.');
 return row;
}
export function insertTask(db: D1Database, task: TaskRow) {
 const fields: (keyof TaskRow)[] = ['id','series_id','occurrence','record_type','contact_id','company_id','opportunity_id','title','owner_id','due_at','priority','task_type','notes','recurrence','timezone','recurrence_time','reminder_minutes','status','revision','assignment_revision','reminder_revision','created_by','updated_by','created_at','updated_at'];
 return db.prepare(`INSERT INTO sales_tasks(${fields.join(',')}) VALUES(${fields.map(() => '?').join(',')})`).bind(...fields.map(field => task[field]));
}
