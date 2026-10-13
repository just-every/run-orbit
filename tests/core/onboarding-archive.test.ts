import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';

test('DATA-001 configured website embedding origins roundtrip through native archive routes without reviving sessions',async()=>{
 const source=await launchFixture(),target=await launchFixture();
 const request=async(f:Awaited<ReturnType<typeof launchFixture>>,path:string,method='GET',body?:unknown)=>{const response=await f.request(path,method,body);assert.ok(response.ok,`${method} ${path}: ${response.status} ${(await response.clone().text()).slice(0,300)}`);return response.json() as Promise<any>;};
 try{
 const customer=await request(source,'records/contact','POST',{name:'Archive customer',email:'archive@example.test'});
 for(const origin of ['https://*.example.test','https://website.example/path','http://website.example','https://user@website.example'])assert.equal((await source.request('settings/form-embedding','PUT',{origins:[origin]})).status,400);
 await request(source,'settings/form-embedding','PUT',{origins:['https://website.example']});
 let exported=await request(source,'records/archive/exports','POST',{});
 for(let n=0;n<300&&exported.state!=='ready';n++)exported=await request(source,`records/archive/exports/${exported.id}/advance`,'POST',{});
 assert.equal(exported.state,'ready');
 const archive=await request(source,`records/archive/exports/${exported.id}/download`);
 for(const tables of [archive.manifest.tables.filter((t:any)=>t.name!=='form_embed_origins'),[...archive.manifest.tables,{name:'unknown_records',columns:['id'],rows:0}]]){
  assert.equal((await target.request('records/archive/imports','POST',{confirmed:true,manifest:{...archive.manifest,tables}})).status,400);
 }
 let imported=await request(target,'records/archive/imports','POST',{confirmed:true,manifest:archive.manifest});
 for(const part of archive.parts)await request(target,`records/archive/imports/${imported.id}/parts/${part.index}`,'PUT',part);
 for(let n=0;n<700&&imported.state!=='complete';n++)imported=await request(target,`records/archive/imports/${imported.id}/finalize`,'POST',{});
 assert.equal(imported.state,'complete');
 assert.equal((await target.db.prepare('SELECT email FROM contacts WHERE id=?').bind(customer.id).first<{email:string}>())?.email,'archive@example.test');
 assert.deepEqual((await target.db.prepare('SELECT origin FROM form_embed_origins').all<{origin:string}>()).results.map(row=>row.origin),['https://website.example']);
 assert.equal(await target.db.prepare('SELECT id FROM sessions LIMIT 1').first(),null,'Restoring never revives source or destination sessions');
 }finally{await source.dispose();await target.dispose();}
});
