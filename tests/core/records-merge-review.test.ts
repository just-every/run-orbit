import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';

test('RECORD-004 RECORD-009 matching names across companies and keyless records remain review-only and native merges refuse missing and stale reviews',async()=>{
 const f=await launchFixture();try{
  for(const kind of ['company','contact'] as const){
   const companyIds:string[]=[];
   if(kind==='contact')for(const name of ['First workplace','Second workplace']){const response=await f.request('records/company','POST',{name});assert.equal(response.status,201);companyIds.push((await response.json() as {id:string}).id);}
   const create=async(index:number,keyless=false)=>{const result=await f.request(`records/${kind}`,'POST',{name:index===2?`  REVIEWED   ${kind}  `:`Reviewed ${kind}`,custom_fields:{label:`Choice ${index}`},...(!keyless?kind==='company'?{primary_domain:`${kind}-${index}.example`}:{email:`${kind}-${index}@example.test`}:{}),...kind==='contact'?{company_id:companyIds[index-1]??null}:{}});assert.equal(result.status,201);return (await result.json() as {id:string}).id;};
   const survivorId=await create(1),retiredId=await create(2),path=`records/${kind}/merge`;
   const unassignedId=kind==='contact'?await create(3):undefined;
   const keylessIds=await Promise.all([create(4,true),create(5,true)]);
   const ids=[survivorId,retiredId,...unassignedId?[unassignedId]:[],...keylessIds];
   const read=async(id:string)=>(await (await f.request(`records/${kind}/${id}`)).json()) as any;
   const history=async()=>Promise.all(['record_aliases','record_merge_claims','audit_entries','timeline_entries','timeline_entry_records'].map(async table=>(await f.db.prepare(`SELECT * FROM ${table}`).all()).results));
   const review=async()=>{
    const before=await Promise.all(ids.map(read)),beforeHistory=await history(),result=await f.request(`records/${kind}/duplicates`);
    assert.equal(result.status,200);
    const groups=(await result.json() as {groups:Record<string,any>[][]}).groups,group=groups.find(group=>group.some(row=>row.id===survivorId))!;
    assert.deepEqual(group.map(row=>row.id).sort(),[...ids].sort());
    assert.ok(group.some(row=>row.id===retiredId));
    for(const id of keylessIds){const row=group.find(row=>row.id===id)!;assert.equal(row[kind==='contact'?'email':'primary_domain'],null);assert.equal(row[kind==='contact'?'email_key':'primary_domain_key'],null);}
    if(unassignedId){assert.ok(group.some(row=>row.id===unassignedId));for(const [index,id] of [survivorId,retiredId,unassignedId].entries()){const row=group.find(row=>row.id===id)!;assert.equal(row.email,`contact-${index+1}@example.test`);assert.equal(row.companyName,['First workplace','Second workplace',null][index]);}}
    assert.deepEqual(await Promise.all(ids.map(read)),before);
    assert.deepEqual(await history(),beforeHistory);
    return {survivor:group.find(row=>row.id===survivorId)!.mergeReviewToken,retired:group.find(row=>row.id===retiredId)!.mergeReviewToken};
   };
   const choices={name:'survivor',custom_fields_json:'survivor',[kind==='company'?'primary_domain':'email']:'retired',...kind==='contact'?{company_id:'survivor'}:{}},body={survivorId,retiredId,choices,confirmed:true};
   assert.equal((await f.request(path,'POST',body)).status,400);
   for(const changedId of [survivorId,retiredId]){
    const reviewed=await review(),before=(await read(changedId)).record;
    const result=await f.request(`records/${kind}/${changedId}`,'PUT',{...before,custom_fields:{...JSON.parse(before.custom_fields_json),label:'Changed after review'}});assert.equal(result.status,200);
    const current=await Promise.all([read(survivorId),read(retiredId)]);
    const counts=async()=>Promise.all(['record_aliases','record_merge_claims','audit_entries'].map(async table=>(await f.db.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n));
    const baseline=await counts();assert.equal((await f.request(path,'POST',{...body,reviewed})).status,409);
    assert.deepEqual(await Promise.all([read(survivorId),read(retiredId)]),current);assert.deepEqual(await counts(),baseline);
   }
   const untouchedIds=ids.filter(id=>id!==survivorId&&id!==retiredId),untouched=await Promise.all(untouchedIds.map(read));
   assert.equal((await f.request(path,'POST',{...body,reviewed:await review()})).status,200);
   const result=await read(survivorId);assert.equal(result.record[kind==='company'?'primary_domain':'email'],kind==='company'?'company-2.example':'contact-2@example.test');
   assert.equal((await f.request(`records/${kind}/${retiredId}`)).status,404);
   assert.deepEqual(await Promise.all(untouchedIds.map(read)),untouched);
   assert.equal(result.timeline.filter((entry:any)=>entry.kind==='record.merged').length,1);
   const audit=await f.db.prepare("SELECT details_json FROM audit_entries WHERE action='record.merged' AND entity_id=?").bind(survivorId).all<{details_json:string}>();assert.equal(audit.results.length,1);assert.deepEqual(JSON.parse(audit.results[0].details_json),{retiredId,choices});
  }
 }finally{await f.dispose();}
});
