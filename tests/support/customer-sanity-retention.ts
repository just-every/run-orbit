import assert from 'node:assert/strict';
import {runOrbitTimers} from '../../src/core/features/outreach/timing-repository';
export async function retainedHistory(db:D1Database) {
 const tables=['contacts','companies','opportunities','signals','drafts','notifications','audit_entries'];
 const before=Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await db.prepare(`SELECT id FROM ${table}`).all<{id:string}>()).results.map(row=>row.id)])));
 await runOrbitTimers(db,undefined,new Date(Date.now()+10*365*86400000));
 for(const table of tables){const after=new Set((await db.prepare(`SELECT id FROM ${table}`).all<{id:string}>()).results.map(row=>row.id));for(const id of before[table])assert.ok(after.has(id),`${table} ${id} was automatically deleted`);}
}
