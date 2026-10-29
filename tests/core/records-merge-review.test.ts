import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';

test('RECORD-004 RECORD-009 matching names across companies remain review-only and native merges refuse missing and stale reviews',async()=>{
 const f=await launchFixture();try{
  for(const kind of ['company','contact'] as const){
   const companyIds:string[]=[];
   if(kind==='contact')for(const name of ['First workplace','Second workplace']){const response=await f.request('records/company','POST',{name});assert.equal(response.status,201);companyIds.push((await response.json() as {id:string}).id);}
   const create=async(index:number)=>{const result=await f.request(`records/${kind}`,'POST',{name:index===2?`  REVIEWED   ${kind}  `:`Reviewed ${kind}`,custom_fields:{label:`Choice ${index}`},...(kind==='company'?{primary_domain:`${kind}-${index}.example`}:{email:`${kind}-${index}@example.test`,company_id:companyIds[index-1]??null})});assert.equal(result.status,201);return (await result.json() as {id:string}).id;};
   const survivorId=await create(1),retiredId=await create(2),path=`records/${kind}/merge`;
   const unassignedId=kind==='contact'?await create(3):undefined;
   const read=async(id:string)=>(await (await f.request(`records/${kind}/${id}`)).json()) as any;
   const review=async()=>{const before=await Promise.all([read(survivorId),read(retiredId)]),result=await f.request(`records/${kind}/duplicates`);assert.equal(result.status,200);const groups=(await result.json() as {groups:Record<string,any>[][]}).groups,group=groups.find(group=>group.some(row=>row.id===survivorId))!;assert.ok(group.some(row=>row.id===retiredId));if(unassignedId){assert.ok(group.some(row=>row.id===unassignedId));for(const [index,id] of [survivorId,retiredId,unassignedId].entries()){const row=group.find(row=>row.id===id)!;assert.equal(row.email,`contact-${index+1}@example.test`);assert.equal(row.companyName,['First workplace','Second workplace',null][index]);}}assert.deepEqual(await Promise.all([read(survivorId),read(retiredId)]),before);return {survivor:group.find(row=>row.id===survivorId)!.mergeReviewToken,retired:group.find(row=>row.id===retiredId)!.mergeReviewToken};};
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
   assert.equal((await f.request(path,'POST',{...body,reviewed:await review()})).status,200);
   const result=await read(survivorId);assert.equal(result.record[kind==='company'?'primary_domain':'email'],kind==='company'?'company-2.example':'contact-2@example.test');
   assert.equal((await f.request(`records/${kind}/${retiredId}`)).status,404);
   assert.equal(result.timeline.filter((entry:any)=>entry.kind==='record.merged').length,1);
   const audit=await f.db.prepare("SELECT details_json FROM audit_entries WHERE action='record.merged' AND entity_id=?").bind(survivorId).all<{details_json:string}>();assert.equal(audit.results.length,1);assert.deepEqual(JSON.parse(audit.results[0].details_json),{retiredId,choices});
  }
  for(const stopped of ['survivor','retired'] as const){
   const survivor=await f.customer(),retired=await f.customer(),scheduled=await Promise.all([f.message(survivor.contactId,survivor.opportunityId),f.message(retired.contactId,retired.opportunityId)]);
   const survivorId=survivor.contactId,retiredId=retired.contactId,path='records/contact/merge';
   const read=async(id:string)=>{const response=await f.request(`records/contact/${id}`);assert.equal(response.status,200);return response.json() as Promise<any>;};
   const duplicates=await f.request('records/contact/duplicates');assert.equal(duplicates.status,200);
   const rows=(await duplicates.json() as {groups:Record<string,any>[][]}).groups.flat(),pair=[survivorId,retiredId].map(id=>rows.find(row=>row.id===id)!);
   assert.deepEqual(pair.map(row=>row.contactability),['contactable','contactable']);
   const body={survivorId,retiredId,choices:{email:'survivor'},reviewed:{survivor:pair[0].mergeReviewToken,retired:pair[1].mergeReviewToken},confirmed:true};
   assert.equal((await f.request(path,'POST',body,{Cookie:''})).status,401);
   assert.equal((await f.request(path,'POST',body,{Origin:'https://other.test'})).status,403);
   const stoppedId=stopped==='survivor'?survivorId:retiredId,before=(await read(stoppedId)).record;
   assert.equal((await f.request(`records/contact/${stoppedId}`,'PUT',{name:before.name,contactability:'do_not_contact'})).status,200);
   const reviewedValues=({contactability,contactability_revision,updated_at,...fields}:Record<string,any>)=>fields;
   assert.deepEqual(reviewedValues((await read(stoppedId)).record),reviewedValues(before),'Only the inherited stop changed after review');
   const merged=await f.request(path,'POST',body);assert.equal(merged.status,200,await merged.clone().text());
   const result=await read(survivorId);assert.equal(result.record.contactability,'do_not_contact',`${stopped} stop is inherited without a contactability choice`);
   assert.equal((await f.request(`records/contact/${retiredId}`)).status,404);
   for(const message of scheduled)assert.deepEqual(await f.db.prepare('SELECT contact_id,state FROM outbound_messages WHERE id=?').bind(message.id).first(),{contact_id:survivorId,state:'cancelled'},'Both participants’ scheduled work stays cancelled on the survivor');
   assert.deepEqual(result.opportunities.map((row:any)=>row.id).sort(),[survivor.opportunityId,retired.opportunityId].sort(),'Both deals now belong to the surviving contact');
   assert.equal(result.timeline.filter((entry:any)=>entry.kind==='record.merged').length,1);
   const audits=async()=>(await f.db.prepare("SELECT details_json FROM audit_entries WHERE action='record.merged' AND entity_id=?").bind(survivorId).all<{details_json:string}>()).results;
   assert.deepEqual((await audits()).map(row=>JSON.parse(row.details_json)),[{retiredId,choices:body.choices}]);
   assert.equal((await f.request(path,'POST',body)).status,404,'Replaying the original review cannot merge twice');
   assert.deepEqual(await read(survivorId),result);assert.equal((await audits()).length,1);
  }
 }finally{await f.dispose();}
});
