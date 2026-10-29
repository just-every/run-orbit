import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {recordsTransfer} from '../support/sanity-records-transfer';
test('RECORD-012 DATA-001 DATA-002 suppression follows exact mailboxes through edits, reviewed merge, erasure and restore; clearing never revives prior approval',async()=>{
 const f=await launchFixture(),target=await launchFixture();try{
  const transfer=await recordsTransfer(f.db,f.actor),receiver=await recordsTransfer(target.db,target.actor),api=transfer.call;
  const detail=async(id:string)=>(await api(`records/contact/${id}`)).record;
  const erase=async(id:string)=>api(`records/contact/${id}`,'DELETE',{confirmed:true});
  const create=async(email:string)=>api('records/contact','POST',{name:'Customer',email});
  const stop=async(id:string)=>api(`records/contact/${id}`,'PUT',{name:'Customer',contactability:'do_not_contact'});
  const merge=async(survivorId:string,retiredId:string)=>{const groups=(await api('records/contact/duplicates')).groups as any[][],rows=groups.flat();const survivor=rows.find(row=>row.id===survivorId),retired=rows.find(row=>row.id===retiredId);assert.ok(survivor&&retired);return api('records/contact/merge','POST',{survivorId,retiredId,confirmed:true,reviewed:{survivor:survivor.mergeReviewToken,retired:retired.mergeReviewToken},choices:Object.fromEntries(['name','email','phone','job_title','timezone','company_id','contactability','custom_fields_json'].map(field=>[field,'survivor']))});};
  const clear=async(id:string)=>{const row=await detail(id);return api(`records/contact/${id}/clear-do-not-contact`,'POST',{confirmed:true,email:row.email,updatedAt:row.updated_at,revision:row.contactability_revision});};
  const c=await f.customer('Suppressed@Customer.test'),scheduled=await f.message(c.contactId,c.opportunityId);
  await stop(c.contactId);await api(`records/contact/${c.contactId}`,'PUT',{name:'Customer'});
  assert.equal((await detail(c.contactId)).contactability,'do_not_contact');
  assert.equal((await transfer.request(`records/contact/${c.contactId}`,'PUT',{name:'Customer',contactability:'contactable'})).status,409);
  await api(`records/contact/${c.contactId}`,'PUT',{name:'Customer',email:'replacement@customer.test'});await erase(c.contactId);
  const archiveText=JSON.stringify(await transfer.exportArchive());for(const value of ['suppressed@customer.test','replacement@customer.test','Reviewed body'])assert.ok(!archiveText.includes(value));
  const reborn=await create(' SUPPRESSED@CUSTOMER.TEST ');assert.equal((await detail(reborn.id)).contactability,'do_not_contact');
  const quick=await api('workbench/opportunities','POST',{title:'Replacement deal',companyName:'Company',contactName:'Customer',email:'REPLACEMENT@CUSTOMER.TEST',stageId:f.stage,valueCents:0});
  const quickId=(await api(`opportunities/${quick.id}`)).opportunity.contacts[0].id;
  assert.equal((await detail(quickId)).contactability,'do_not_contact');
  const reviewed=await detail(quickId),review={confirmed:true,email:reviewed.email,updatedAt:reviewed.updated_at,revision:reviewed.contactability_revision},path=`records/contact/${quickId}/clear-do-not-contact`;
  assert.equal((await f.request(path,'POST',review,{Cookie:''})).status,401);assert.equal((await f.request(path,'POST',review,{Origin:'https://foreign.test'})).status,403);
  assert.equal((await transfer.request(path,'POST',{...review,confirmed:false})).status,400);assert.equal((await transfer.request(path,'POST',{...review,updatedAt:'stale'})).status,409);
  await stop(quickId);assert.equal((await transfer.request(path,'POST',review)).status,409,'a fresh stop invalidates the old review');await clear(quickId);
  assert.equal((await detail(quickId)).contactability,'contactable');assert.equal(await f.db.prepare('SELECT id FROM outbound_messages WHERE id=?').bind(scheduled.id).first(),null,'erasure removes the old approval');

  // Merging inherits a stopped alias and invalidates already-approved survivor work.
  const carrier=await f.customer(),alias=await create('alias-stop@customer.test');await stop(alias.id);await merge(carrier.contactId,alias.id);await clear(carrier.contactId);
  const survivor=await f.customer(),draft=await api(`workbench/opportunities/${survivor.opportunityId}/drafts`,'POST',{contactId:survivor.contactId,subject:'Survivor review',body:'Never dispatch an inherited stop'});
  // Existing approval is fixture data; all changes of customer authority use the public review doors.
  const existing=await f.message(survivor.contactId,survivor.opportunityId),history=await f.message(survivor.contactId,survivor.opportunityId,'accepted');
  const before=await f.db.prepare('SELECT * FROM outbound_messages WHERE id=?').bind(history.id).first();
  await merge(survivor.contactId,carrier.contactId);assert.equal((await detail(survivor.contactId)).contactability,'do_not_contact');
  assert.equal((await api(`workbench/opportunities/${survivor.opportunityId}/messages`)).messages.find((m:any)=>m.id===existing.id).state,'cancelled');
  assert.equal(await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(draft.id).first('is_stale'),1);
  assert.deepEqual(await f.db.prepare('SELECT * FROM outbound_messages WHERE id=?').bind(history.id).first(),before);await clear(survivor.contactId);
  assert.equal((await api(`workbench/opportunities/${survivor.opportunityId}/messages`)).messages.find((m:any)=>m.id===existing.id).state,'cancelled');

  // Restore keeps both installations' anonymous stops and removes the source's dispatch authority.
  const destination=await receiver.call('records/contact','POST',{name:'Destination',email:'destination-stop@customer.test',contactability:'do_not_contact'});await receiver.call(`records/contact/${destination.id}`,'DELETE',{confirmed:true});
  const sourceArchive=await transfer.exportArchive();await receiver.restore(sourceArchive);
  assert.equal((await receiver.call(`workbench/opportunities/${survivor.opportunityId}/messages`)).messages.find((m:any)=>m.id===existing.id).state,'cancelled');
  await receiver.call(`records/contact/${reborn.id}`,'DELETE',{confirmed:true});await receiver.call(`records/contact/${survivor.contactId}`,'DELETE',{confirmed:true});
  for(const email of ['suppressed@customer.test','alias-stop@customer.test','destination-stop@customer.test']){const contact=await receiver.call('records/contact','POST',{name:'Restored identity',email});assert.equal((await receiver.call(`records/contact/${contact.id}`)).record.contactability,'do_not_contact');}

 }finally{await f.dispose();await target.dispose();}
});
