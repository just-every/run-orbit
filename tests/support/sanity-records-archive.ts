import assert from 'node:assert/strict';
import {archiveHash} from '../../src/core/features/records/archive-schema';
import {responseJson,type RecordsFixture} from './sanity-records-http';

export async function beginErasureTransfer(f:RecordsFixture,contact:string,email:string){
 const call=async(path:string,method='GET',body?:unknown)=>responseJson(await f.request('records/archive/'+path,method,body));
 let exported=await call('exports','POST',{});
 for(let i=0;i<400&&exported.state!=='ready';i++)exported=await call(`exports/${exported.id}/advance`,'POST',{});
 assert.equal(exported.state,'ready');const document=await call(`exports/${exported.id}/download`);
 const download=await f.request(`records/archive/exports/${exported.id}/download`),reader=download.body!.getReader();await reader.read();
 assert.equal((await f.request('records/archive/imports','POST',{confirmed:true,manifest:document.manifest})).status,409);
 return async()=>{
  const noCopies=async()=>{
   for(const table of ['archive_jobs','archive_parts','archive_part_segments'])assert.equal(await f.db.prepare(`SELECT count(*) FROM ${table}`).first('count(*)'),0);
   assert.equal((await f.db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'archive_snapshot_%' OR name LIKE 'archive_stage_%'").all()).results.length,0);
  };
  await noCopies();assert.equal((await f.request(`records/archive/exports/${exported.id}/download`)).status,404);
  await assert.rejects(async()=>{while(!(await reader.read()).done){}},/removed|incomplete/);
  // An upload is also a private copy. A later erasure must invalidate it before it can restore the customer.
  const replacement=await responseJson(await f.request('records/contact','POST',{name:'Replacement erased customer',email}));
  const upload=await call('imports','POST',{confirmed:true,manifest:document.manifest});
  for(const part of document.parts)await call(`imports/${upload.id}/parts/${part.index}`,'PUT',part);
  await responseJson(await f.request(`records/contact/${replacement.id}`,'DELETE',{confirmed:true}));
  await noCopies();assert.equal((await f.request(`records/archive/imports/${upload.id}/finalize`,'POST',{})).status,404);
  assert.equal((await f.request(`records/contact/${contact}`)).status,404);
  let fresh=await call('exports','POST',{});for(let i=0;i<400&&fresh.state!=='ready';i++)fresh=await call(`exports/${fresh.id}/advance`,'POST',{});assert.equal(fresh.state,'ready');
  const clean=JSON.stringify(await call(`exports/${fresh.id}/download`));for(const text of [email,'Retained customer body','Personal signal subject'])assert.ok(!clean.includes(text),'fresh archives retain no erased customer history');
  await call(`exports/${fresh.id}/abort`,'POST',{});
 };
}

/** One rejected restore on the same destination precedes its successful import. */
export async function abortInvalidRestore(f:RecordsFixture,document:any){
 const before=async()=>Object.fromEntries(await Promise.all(['operators','sessions','pipeline_stages','workspace_settings'].map(async table=>[table,(await f.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results])));
 const original=await before(),copy=structuredClone(document),part=copy.parts.find((part:any)=>part.records.some((record:any)=>record.table==='operators'));
 part.records.find((record:any)=>record.table==='operators').row.setup_owner=2;part.sha256=await archiveHash(part.records);
 const call=async(path:string,method='POST',body:unknown={})=>responseJson(await f.request('records/archive/'+path,method,body));
 let job=await call('imports','POST',{confirmed:true,manifest:copy.manifest});
 for(const part of copy.parts)await call(`imports/${job.id}/parts/${part.index}`,'PUT',part);
 let failure:Response|undefined;
 for(let i=0;i<700;i++){const result=await f.request(`records/archive/imports/${job.id}/finalize`,'POST',{});if(!result.ok){failure=result;break;}job=await result.json();}
 assert.ok(failure,'invalid owner metadata must refuse restore');assert.equal(failure.status,500);
 for(let i=0;i<700&&job.state!=='aborted';i++)job=await call(`imports/${job.id}/abort`);
 assert.equal(job.state,'aborted');assert.deepEqual(await before(),original,'abort preserves administrator, session and original workspace');
 assert.equal(await f.db.prepare("SELECT 1 FROM runtime_controls WHERE name='archive_import'").first(),null);
}
