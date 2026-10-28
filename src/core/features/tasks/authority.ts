import type { NativeActor } from '../identity';
import { actorFence, version, type Fence } from '../identity/store';
import { createId } from '../../shared/ids';
import { TaskError } from './contracts';
export const activeTaskOwner = "EXISTS(SELECT 1 FROM operators p WHERE p.id=? AND p.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=p.id))";
export const tasksAvailable = "NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN ('restore','archive_import'))";
export async function taskAuthority(db: D1Database, actor: NativeActor): Promise<Fence> {
 const person = await db.prepare(`SELECT ${version('o')} AS version FROM operators o WHERE o.id=?`).bind(actor.operatorId).first<{version: number}>();
 if (!person) throw new TaskError(403, 'An active full operator session is required.');
 const session = !('sessionId' in actor) ? {sql:`EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND ${version('o')}=?)`,args:[actor.operatorId,person.version]} : actorFence({id: actor.sessionId, operator: {id: actor.operatorId, version: person.version}}, Date.now());
 const fence = {sql: `${session.sql} AND ${activeTaskOwner} AND ${tasksAvailable}`, args: [...session.args, actor.operatorId]};
 const result = await db.prepare(`SELECT ${fence.sql} AS allowed, ${tasksAvailable} AS available`).bind(...fence.args).first<{allowed: number; available: number}>();
 if (!result?.available) throw new TaskError(503, 'Tasks are unavailable during workspace restore.');
 if (!result.allowed) throw new TaskError(403, 'An active full operator session is required.');
 return fence;
}
export function taskGuard(db: D1Database, fence: Fence, authority = false) {
 return db.prepare(`INSERT INTO sales_task_guards(id,authority,revision) SELECT ?,${authority ? `CASE WHEN ${fence.sql} THEN 1 ELSE 0 END,1` : `1,CASE WHEN ${fence.sql} THEN 1 ELSE 0 END`}`).bind(createId(), ...fence.args);
}
export async function commitTasks(db: D1Database, authority: Fence, statements: D1PreparedStatement[]) {
 try { await db.batch([taskGuard(db, authority, true), ...statements, db.prepare('DELETE FROM sales_task_guards')]); }
 catch (error) {
  if (String(error).includes('sales_task_authority')) throw new TaskError(403, 'Your session or access changed. Sign in again and reload.');
  if (/sales_task_revision|UNIQUE constraint failed: sales_tasks/.test(String(error))) throw new TaskError(409, 'The task or its assignment changed. Reload before saving.');
  if (/FOREIGN KEY constraint/.test(String(error))) throw new TaskError(409, 'A linked record or operator changed. Reload before saving.');
  throw error;
 }
}
