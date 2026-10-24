import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {actorFence,guard,clearGuards,version} from '../identity/store';
import {RecordError,audit} from './shared';
const source=z.enum(['entry','task','handoff']),id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const definitions={entry:{table:'timeline_entries',author:'actor_id',condition:"kind IN('manual.note','manual.call','manual.meeting')"},task:{table:'sales_tasks',author:'created_by',condition:'1=1'},handoff:{table:'handoff_tasks',author:'actor_id',condition:'1=1'}};
export function entryPrivacyRoutes(db:D1Database){const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.onError((e,c)=>c.json({error:e instanceof RecordError?e.message:'Entry visibility could not be changed.'},e instanceof RecordError?e.status:503));
 async function read(kind:z.infer<typeof source>,entry:string,actor:string){const definition=definitions[kind],row=await db.prepare(`SELECT ${definition.author} AS author FROM ${definition.table} WHERE id=? AND ${definition.condition}`).bind(entry).first<{author:string|null}>();if(!row)throw new RecordError(404,'Entry not found.');return {private:Boolean(await db.prepare('SELECT 1 FROM entry_privacy WHERE source=? AND entry_id=?').bind(kind,entry).first()),editable:row.author===actor};}
 app.get('/:source/:id',async c=>c.json(await read(source.parse(c.req.param('source')),id.parse(c.req.param('id')),c.get('operator').operatorId)));
 app.put('/:source/:id',async c=>{const kind=source.parse(c.req.param('source')),entry=id.parse(c.req.param('id')),input=z.object({private:z.boolean()}).strict().parse(await c.req.json()),actor=c.get('operator'),current=await read(kind,entry,actor.operatorId);if(!current.editable)throw new RecordError(403,'Only the entry author changes its visibility.');
  const person=await db.prepare(`SELECT ${version('o')} AS version FROM operators o WHERE id=?`).bind(actor.operatorId).first<{version:number}>();if(!person)throw new RecordError(403,'Operator access ended.');const definition=definitions[kind];
  await db.batch([guard(db,actorFence({id:actor.sessionId,operator:{id:actor.operatorId,version:person.version}},Date.now())),guard(db,{sql:`EXISTS(SELECT 1 FROM ${definition.table} WHERE id=? AND ${definition.author}=? AND ${definition.condition}) AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=?)`,args:[entry,actor.operatorId,actor.operatorId]}),input.private?db.prepare('INSERT INTO entry_privacy VALUES(?,?,?) ON CONFLICT(source,entry_id) DO NOTHING').bind(kind,entry,actor.operatorId):db.prepare('DELETE FROM entry_privacy WHERE source=? AND entry_id=?').bind(kind,entry),...(input.private?[db.prepare("DELETE FROM notifications WHERE kind='record.mention' AND event_key=? AND operator_id IN(SELECT operator_id FROM access_collaborators)").bind(`mention:${kind}:${entry}`)]:[]),audit(db,actor.operatorId,'entry.visibility','entry',entry,{source:kind,private:input.private}),clearGuards(db)]);return c.json({private:input.private,editable:true});
 });return app;
}
