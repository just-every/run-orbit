import assert from 'node:assert/strict';
import { createId } from '../../src/core/shared/ids';
import type { SalesTask, TaskHistory, TaskInput, TaskList } from '../../src/core/features/tasks/contracts';
import { createApp } from './app';
import type { TodayApp } from './today-workspace';
/** Add to an existing public core journey; deliberately registers no test().
 * Returns the remaining owner/task for the parent's removal-handover assertions. */
export async function exerciseSalesTasks(t: TodayApp, db: D1Database) {
 const contact = (await t.json<{id: string}>('/api/v1/records/contact', {body: {name: 'Task buyer', email: `tasks-${createId().toLowerCase()}@example.test`}}, 201)).id;
 const other = (await t.json<{id: string}>('/api/v1/settings/operators', {body: {email: `tasks-${createId().toLowerCase()}@seller.test`, displayName: 'Task receiver'}}, 201)).id;
 const base: TaskInput = {title: 'Call task buyer', recordType: 'contact', recordId: contact, ownerId: other,
  dueAt: new Date(Date.now() - 600000).toISOString(), priority: 'high', type: 'call', notes: 'Confirm the buying committee.', recurrence: 'none', timezone: 'America/New_York', reminderMinutes: 15};
 const created = await t.json<{id: string; revision: string}>('/api/v1/tasks', {body: base}, 201);
 const read = async (id: string) => (await t.json<{task: SalesTask; history: TaskHistory[]}>(`/api/v1/tasks/${id}`, {}, 200));
 const save = async (id: string, content: TaskInput, revision: string, status = 'open') => t.json<{id: string; revision: string}>(`/api/v1/tasks/${id}`, {method: 'PUT', body: {...content, revision, status}}, 200);
 const assignmentCount = async (id: string) => (await db.prepare("SELECT count(*) AS n FROM notifications n JOIN sales_task_notification_links l ON l.notification_id=n.id WHERE l.task_id=? AND n.kind='task.assigned'").bind(id).first<{n: number}>())!.n;
 assert.ok((await t.json<TaskList>(`/api/v1/tasks?view=overdue&owner=${other}`, {}, 200)).tasks.some(task => task.id === created.id));
 assert.equal(await assignmentCount(created.id), 1);
 const mine = await save(created.id, {...base, ownerId: t.actor}, created.revision);
 assert.equal(await assignmentCount(created.id), 1, 'self assignment creates no notification');
 const back = await save(created.id, base, mine.revision);
 assert.equal(await assignmentCount(created.id), 2);
 assert.equal((await t.call(`/api/v1/tasks/${created.id}`, {method: 'PUT', body: {...base, revision: mine.revision, status: 'open'}})).status, 409);
 assert.equal(await assignmentCount(created.id), 2, 'a stale replay cannot notify again');
 const history = (await read(created.id)).history;
 assert.ok(history.some(entry => entry.kind === 'task.reassigned' && entry.payload.previousOwnerId === t.actor));
 assert.ok(history.every(entry => entry.actorName && entry.occurredAt && entry.recordedAt));
 const weekly: TaskInput = {...base, title: 'Weekly buyer follow-up', dueAt: '2027-03-07T14:00:00.000Z', recurrence: 'weekly'};
 const repeated = await t.json<{id: string; revision: string}>('/api/v1/tasks', {body: weekly}, 201);
 const completeRequest = {method: 'PUT', body: {...weekly, revision: repeated.revision, status: 'completed'}};
 const concurrent = await Promise.all([t.call(`/api/v1/tasks/${repeated.id}`, completeRequest), t.call(`/api/v1/tasks/${repeated.id}`, completeRequest)]);
 assert.deepEqual(concurrent.map(response => response.status).sort(), [200, 409]);
 const finished = (await read(repeated.id)).task;
 const next = (await t.json<TaskList>(`/api/v1/tasks?view=all&owner=${other}`, {}, 200)).tasks.filter(task => task.seriesId === finished.seriesId && task.status === 'open');
 assert.equal(next.length, 1); assert.equal(next[0]!.dueAt, '2027-03-14T13:00:00.000Z', 'weekly 9am stays 9am after spring DST');
 // Restart the real route graph against persisted rows and replay the old request.
 const restarted = createApp({database: db, assets: {fetch: async () => new Response('test')}});
 assert.equal((await restarted.request(`https://orbit.test/api/v1/tasks/${repeated.id}`, {method: 'PUT', headers: {cookie: `__Host-orbit_session=${t.session.token}`, origin: 'https://orbit.test', 'content-type': 'application/json'}, body: JSON.stringify(completeRequest.body)})).status, 409);
 assert.equal((await db.prepare("SELECT count(*) AS n FROM sales_tasks WHERE series_id=? AND status='open'").bind(finished.seriesId).first<{n: number}>())!.n, 1);
 await save(next[0]!.id, {...weekly, dueAt: next[0]!.dueAt}, next[0]!.revision, 'cancelled');
 assert.equal((await db.prepare("SELECT count(*) AS n FROM sales_tasks WHERE series_id=? AND status='open'").bind(finished.seriesId).first<{n: number}>())!.n, 0);
 const daily: TaskInput = {...base, title: 'Daily buyer check', dueAt: '2027-11-06T13:00:00.000Z', recurrence: 'daily'};
 const fall = await t.json<{id: string; revision: string}>('/api/v1/tasks', {body: daily}, 201);
 await save(fall.id, daily, fall.revision, 'completed');
 const fallSeries = (await read(fall.id)).task.seriesId;
 const fallNext = (await t.json<TaskList>(`/api/v1/tasks?view=all&owner=${other}`, {}, 200)).tasks.find(task => task.seriesId === fallSeries && task.status === 'open')!;
 assert.equal(fallNext.dueAt, '2027-11-07T14:00:00.000Z', 'daily 9am stays 9am after fall DST');
 await save(fallNext.id, {...daily, dueAt: fallNext.dueAt}, fallNext.revision, 'cancelled');
 const erasedEmail=`erasure-${createId().toLowerCase()}@example.test`;
 const erased = (await t.json<{id: string}>('/api/v1/records/contact', {body: {name: 'Erase task notes', email: erasedEmail}}, 201)).id;
 const company=(await t.json<{id:string}>('/api/v1/records/company',{body:{name:'Task privacy company'}},201)).id;
 const copied=await t.json<{id:string}>('/api/v1/tasks',{body:{...base,recordType:'company',recordId:company,notes:`Customer mailbox ${erasedEmail}`}},201);
 const personal = await t.json<{id: string}>('/api/v1/tasks', {body: {...base, recordId: erased, notes: 'Private task note for erasure'}}, 201);
 const eventIds = (await db.prepare('SELECT entry_id FROM sales_task_timeline WHERE task_id=?').bind(personal.id).all<{entry_id: string}>()).results.map(row => row.entry_id);
 await t.json(`/api/v1/records/contact/${erased}`, {method: 'DELETE', body: {confirmed: true}}, 200);
 assert.equal((await t.call(`/api/v1/tasks/${personal.id}`)).status, 404);
 assert.equal((await t.call(`/api/v1/tasks/${copied.id}`)).status,404,'exact mailbox copies in another record task are erased');
 for (const id of eventIds) assert.equal(await db.prepare('SELECT id FROM timeline_entries WHERE id=?').bind(id).first(), null);
 assert.equal(await assignmentCount(personal.id), 0);
 return {ownerId: other, contactId: contact, openTaskId: created.id, openTaskRevision: back.revision};
}
