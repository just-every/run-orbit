import assert from 'node:assert/strict';
import type {CaptureFixture} from './capture-fixture';
import {isolatedDatabase} from './isolated-database';
import {localArchiveRoundTrip} from './capture-privacy-archive';

/** The local CLI's real transfer engine must strip approval just like Records HTTP. */
export type PortabilityCopyHooks={beforeCopy?(db:D1Database):Promise<void>;restored?(db:D1Database,request:(path:string,init?:RequestInit)=>Promise<Response>):Promise<void>};
export async function proveLocalSalesArchive(source:CaptureFixture,hooks:PortabilityCopyHooks={}){
 const target=await isolatedDatabase();
 try{
  const messages=async(db:D1Database)=>(await db.prepare('SELECT * FROM outbound_messages ORDER BY id').all<Record<string,unknown>>()).results;
  const before=await messages(source.db);assert.ok(before.some(row=>row.state==='scheduled'));
  await hooks.beforeCopy?.(target.db);
  await localArchiveRoundTrip(source.db,target.db);
  for(const table of ['sessions','access_grants','access_invitations','access_form_authorities','delegation_grants','delegation_codes','capture_credentials'])assert.equal(Number(await target.db.prepare(`SELECT count(*) n FROM ${table}`).first('n')),0,`${table} authority never travels through the local CLI`);
  const {testAuth}=await import('./test-auth'),{createApp}=await import('./app');
  const session=await testAuth(target.db).createSession(source.operator),app=createApp({database:target.db,assets:{fetch:async()=>new Response('')}});
  const door=(path:string,init:RequestInit={})=>app.request('https://orbit.test'+path,{...init,headers:{Cookie:'__Host-orbit_session='+session.token,Origin:'https://orbit.test',...init.headers}});
  await hooks.restored?.(target.db,door);
  const after=await messages(target.db);assert.equal(after.length,before.length);
  for(const row of before){const restored=after.find(candidate=>candidate.id===row.id);assert.ok(restored);if(row.state==='scheduled'){assert.equal(restored.state,'cancelled');assert.ok(String(restored.failure).includes('review'));assert.deepEqual(restored,{...row,state:'cancelled',failure:restored.failure});}else assert.deepEqual(restored,row);}
  assert.deepEqual(await messages(source.db),before,'export leaves the source installation approval unchanged');
 }finally{await target.dispose();}
}
