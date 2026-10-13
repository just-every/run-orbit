import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';

test('RECORD-004 native merge refuses missing and stale reviews without modifying either record or its history',async()=>{
 const f=await launchFixture();try{
  for(const kind of ['company','contact'] as const){
   const create=async(index:number)=>{const result=await f.request(`records/${kind}`,'POST',{name:`Reviewed ${kind}`,custom_fields:{label:`Choice ${index}`},...(kind==='company'?{primary_domain:`${kind}-${index}.example`}:{email:`${kind}-${index}@example.test`})});assert.equal(result.status,201);return (await result.json() as {id:string}).id;};
   const survivorId=await create(1),retiredId=await create(2),path=`records/${kind}/merge`;
   const read=async(id:string)=>(await (await f.request(`records/${kind}/${id}`)).json()) as any;
   const review=async()=>{const result=await f.request(`records/${kind}/duplicates`);assert.equal(result.status,200);const rows=(await result.json() as {groups:Record<string,any>[][]}).groups.flat();return {survivor:rows.find(row=>row.id===survivorId)!.mergeReviewToken,retired:rows.find(row=>row.id===retiredId)!.mergeReviewToken};};
   const choices={custom_fields_json:'survivor',[kind==='company'?'primary_domain':'email']:'retired'},body={survivorId,retiredId,choices,confirmed:true};
   assert.equal((await f.request(path,'POST',body)).status,400);
   for(const changedId of [survivorId,retiredId]){
    const reviewed=await review(),before=(await read(changedId)).record;
    const result=await f.request(`records/${kind}/${changedId}`,'PUT',{...before,custom_fields:{...JSON.parse(before.custom_fields_json),label:'Changed after review'}});assert.equal(result.status,200);
    const current=await Promise.all([read(survivorId),read(retiredId)]);
    const counts=async()=>Promise.all(['record_aliases','record_merge_claims','audit_entries'].map(async table=>(await f.db.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n));
    const baseline=await counts();assert.equal((await f.request(path,'POST',{...body,reviewed})).status,409);
    assert.deepEqual(await Promise.all([read(survivorId),read(retiredId)]),current);assert.deepEqual(await counts(),baseline);
   }
   assert.equal((await f.request(path,'POST',{...body,reviewed:await review()})).status,200);
   const result=await read(survivorId);assert.equal(result.record[kind==='company'?'primary_domain':'email'],kind==='company'?'company-2.example':'contact-2@example.test');
   assert.equal((await f.request(`records/${kind}/${retiredId}`)).status,404);
   assert.equal(result.timeline.filter((entry:any)=>entry.kind==='record.merged').length,1);
   const audit=await f.db.prepare("SELECT details_json FROM audit_entries WHERE action='record.merged' AND entity_id=?").bind(survivorId).all<{details_json:string}>();assert.equal(audit.results.length,1);assert.deepEqual(JSON.parse(audit.results[0].details_json),{retiredId,choices});
  }
 }finally{await f.dispose();}
});
