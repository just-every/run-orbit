import assert from 'node:assert/strict';
import type {CaptureFixture} from './capture-fixture';
import {isolatedDatabase} from './isolated-database';
import {localArchiveRoundTrip} from './capture-privacy-archive';

/** The local CLI's real transfer engine must strip approval just like Records HTTP. */
export async function proveLocalSalesArchive(source:CaptureFixture){
 const target=await isolatedDatabase();
 try{
  const messages=async(db:D1Database)=>(await db.prepare('SELECT * FROM outbound_messages ORDER BY id').all<Record<string,unknown>>()).results;
  const before=await messages(source.db);assert.ok(before.some(row=>row.state==='scheduled'));
  await localArchiveRoundTrip(source.db,target.db);
  const after=await messages(target.db);assert.equal(after.length,before.length);
  for(const row of before){const restored=after.find(candidate=>candidate.id===row.id);assert.ok(restored);if(row.state==='scheduled'){assert.equal(restored.state,'cancelled');assert.ok(String(restored.failure).includes('review'));assert.deepEqual(restored,{...row,state:'cancelled',failure:restored.failure});}else assert.deepEqual(restored,row);}
  assert.deepEqual(await messages(source.db),before,'export leaves the source installation approval unchanged');
  for(const table of ['sessions','access_grants','access_invitations','access_form_authorities','delegation_grants','delegation_codes','capture_credentials'])assert.equal(Number(await target.db.prepare(`SELECT count(*) n FROM ${table}`).first('n')),0,`${table} authority never travels through the local CLI`);
 }finally{await target.dispose();}
}
