import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthenticatedOperator } from '../identity';
import { taskAuthority } from './authority';
import { TaskError } from './contracts';
import { createTask, updateTask } from './mutations';
import { listTasks, readTask, taskHistory } from './repository';
const id = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const timezone = z.string().min(1).max(100).refine(value => {try {new Intl.DateTimeFormat('en', {timeZone: value}); return true;} catch {return false;}}, 'Choose a recognized IANA timezone.');
const content = z.object({
 title: z.string().trim().min(1).max(300), recordType: z.enum(['contact','company','opportunity']), recordId: id,
 ownerId: id.nullable(), dueAt: z.iso.datetime().refine(value => Number.isFinite(Date.parse(value))),
 priority: z.enum(['low','normal','high','urgent']), type: z.enum(['call','email','meeting','follow_up','other']),
 notes: z.string().max(20000), recurrence: z.enum(['none','daily','weekly']), timezone,
 reminderMinutes: z.number().int().min(0).max(10080).nullable()
}).strict();
const query = z.object({view: z.enum(['today','overdue','all']).default('today'), owner: z.union([id, z.literal('unassigned'), z.literal('all')]).optional(), date: z.iso.date().optional(), offset: z.coerce.number().int().min(0).max(1000000).default(0)}).strict();
export function createSalesTaskRoutes(db: D1Database) {
 const app = new Hono<{Variables: {operator: AuthenticatedOperator}}>();
 app.onError((error, c) => {if (error instanceof TaskError) return c.json({error: error.message}, error.status); throw error;});
 app.use('*', async (c, next) => {await taskAuthority(db, c.get('operator')); await next();});
 app.get('/', async c => {
  const parsed = query.safeParse(c.req.query());
  if (!parsed.success) return c.json({error: 'Choose a task view, owner and valid calendar date.'}, 400);
  return c.json(await listTasks(db, c.get('operator').operatorId, parsed.data));
 });
 app.get('/:id', async c => {
  const parsed = id.safeParse(c.req.param('id'));
  if (!parsed.success) return c.json({error: 'Task not found.'}, 404);
  const task = await readTask(db, parsed.data);
  return c.json({task, history: await taskHistory(db, parsed.data)});
 });
 app.post('/', async c => {
  const parsed = content.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({error: parsed.error.issues[0]?.message ?? 'Enter the task details.'}, 400);
  return c.json(await createTask(db, c.get('operator'), parsed.data), 201);
 });
 app.put('/:id', async c => {
  const parsedId = id.safeParse(c.req.param('id'));
  const parsed = content.extend({revision: id, status: z.enum(['open','completed','cancelled'])}).strict().safeParse(await c.req.json().catch(() => null));
  if (!parsedId.success || !parsed.success) return c.json({error: 'Enter valid task details and its current revision.'}, 400);
  return c.json(await updateTask(db, c.get('operator'), parsedId.data, parsed.data));
 });
 return app;
}
