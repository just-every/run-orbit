import {reviewedMerge} from './reviewed-merge';
import assert from 'node:assert/strict';
import {launchFixture} from './launch-fixture';
import {RecordsRepository} from '../../src/core/features/records/repository';
import {ImportMergeRepository} from '../../src/core/features/records/import-merge';
import {TestDataRepository} from './record-data';
import {ProviderRepository} from '../../src/core/features/outreach/provider-repository';
import {IngestionRepository} from '../../src/core/features/ingestion/repository';
import {suppressionHashes} from '../../src/core/features/records/suppression';
import {payloadHash} from '../../src/core/platform/source-security';
import {createId} from '../../src/core/shared/ids';
import {createHash,randomBytes} from 'node:crypto';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {createSourceSecurity} from '../../src/core/platform/source-security';

import {reviewTokens} from './reviewed-merge';
import {OutreachRepository} from '../../src/core/features/workbench/outreach-repository';
import {ApprovalRepository} from '../../src/core/features/outreach/approval-repository';
import {OutreachService} from '../../src/core/features/outreach/service';

type Launch=Awaited<ReturnType<typeof launchFixture>>;
export async function ordinarySuppression(f:Launch) {


  const c=await f.customer('Suppressed@Customer.test'),scheduled=await f.message(c.contactId,c.opportunityId);
  const stop=await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Stopped',email:c.email,contactability:'do_not_contact'});assert.equal(stop.status,200);
  assert.equal((await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Renamed'})).status,200);
  let row=(await f.records.detail('contact',c.contactId)).record;assert.equal(row.contactability,'do_not_contact');assert.equal(row.email,'suppressed@customer.test');
  assert.equal((await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Ordinary clear',contactability:'contactable'})).status,409);
  const oldEmail=row.email;assert.equal((await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Changed address',email:'replacement@customer.test'})).status,200);
  assert.equal((await f.records.detail('contact',c.contactId)).record.contactability,'do_not_contact');
  assert.equal((await f.request(`records/contact/${c.contactId}`,'DELETE',{confirmed:true})).status,200);
  const proofs=(await f.db.prepare("SELECT actor_id,details_json,entity_id FROM audit_entries WHERE action='contact.suppressed'").all<{actor_id:string|null;details_json:string;entity_id:string}>()).results;
  assert.ok(proofs.length>=2);for(const token of proofs){assert.equal(token.actor_id,null);assert.equal(token.details_json,'{}');assert.match(token.entity_id,/^[a-f0-9]{32}:[a-f0-9]{64}$/);}
  const recreated=await f.records.save('contact',{name:'Recreated',email:'  SUPPRESSED@CUSTOMER.TEST '},f.actor);assert.equal((await f.records.detail('contact',recreated.id)).record.contactability,'do_not_contact');
  assert.equal((await f.request(`records/contact/${recreated.id}`,'DELETE',{confirmed:true})).status,200);
  const imported=await f.records.save('contact',{name:'Imported identity recreated',email:'SUPPRESSED@CUSTOMER.TEST'},f.actor);assert.equal((await f.records.detail('contact',imported.id)).record.contactability,'do_not_contact');
  const quick=await f.workbench.createOpportunity({title:'Recreated via workbench',companyName:'Company',contactName:'Replacement',email:'REPLACEMENT@CUSTOMER.TEST',stageId:f.stage,valueCents:0},f.actor);
  const quickContact=(await f.db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(quick.id).first<{contact_id:string}>())!;
  row=(await f.records.detail('contact',quickContact.contact_id)).record;
  const clearPath=`records/contact/${row.id}/clear-do-not-contact`,review={confirmed:true,email:row.email,updatedAt:row.updated_at,revision:row.contactability_revision};
  assert.equal((await f.request(clearPath,'POST',review,{Cookie:''})).status,401);assert.equal((await f.request(clearPath,'POST',review,{Origin:'https://other.test'})).status,403);
  assert.equal((await f.request(clearPath,'POST',{...review,confirmed:false})).status,400);assert.equal((await f.request(clearPath,'POST',{...review,updatedAt:'stale'})).status,409);
  await f.db.prepare("UPDATE contacts SET contactability='do_not_contact' WHERE id=?").bind(row.id).run();assert.equal((await f.request(clearPath,'POST',review)).status,409,'A stop sharing the reviewed timestamp changes the monotonic revision');
  const latest=(await f.records.detail('contact',row.id)).record;
  assert.equal((await f.request(clearPath,'POST',{...review,revision:latest.contactability_revision})).status,200);assert.equal((await f.records.detail('contact',row.id)).record.contactability,'contactable');
  assert.ok(await f.db.prepare("SELECT id FROM audit_entries WHERE action='contactability.cleared' AND entity_id=?").bind(row.id).first());
  assert.equal(await f.db.prepare('SELECT id FROM outbound_messages WHERE id=?').bind(scheduled.id).first(),null);


 await inheritedStop(f);
 for(const row of (await f.db.prepare('SELECT id FROM contacts').all<{id:string}>()).results)assert.equal((await f.request(`records/contact/${row.id}`,'DELETE',{confirmed:true})).status,200);
}
async function inheritedStop(f:Launch) {
 const merge=async(survivor:string,retired:string)=>{const response=await f.request('records/contact/merge','POST',{survivorId:survivor,retiredId:retired,choices:{email:'survivor',contactability:'survivor'},reviewed:await reviewTokens(f.db,'contact',survivor,retired),confirmed:true});assert.equal(response.status,200,await response.clone().text());};
 const stop=async(contact:string)=>{
  const record=(await f.records.detail('contact',contact)).record;
  const response=await f.request(`records/contact/${contact}`,'PUT',{name:record.name,email:record.email,contactability:'do_not_contact'});
  assert.equal(response.status,200,await response.clone().text());
 };
 const clear=async(contact:string)=>{const row=(await f.records.detail('contact',contact)).record;assert.equal((await f.request(`records/contact/${contact}/clear-do-not-contact`,'POST',{confirmed:true,email:row.email,updatedAt:row.updated_at,revision:row.contactability_revision})).status,200);};
 const survivor=await f.customer(),retired=await f.customer(),alias=await f.customer();
 await stop(alias.contactId);await merge(retired.contactId,alias.contactId);await clear(retired.contactId);
 const draft=await new OutreachRepository(f.db).createDraft(survivor.opportunityId,{contactId:survivor.contactId,subject:'Reviewed before inherited stop',body:'Must remain unsent'},f.actor);
 const approval=new ApprovalRepository(f.db),message=await approval.approve(draft.id,1,f.actor,{scheduledAt:new Date(Date.now()+2*86400000).toISOString()});
 const history=await f.message(survivor.contactId,survivor.opportunityId,'accepted'),before=await f.db.prepare('SELECT * FROM outbound_messages WHERE id=?').bind(history.id).first();
 await merge(survivor.contactId,retired.contactId);
 assert.equal((await f.records.detail('contact',survivor.contactId)).record.contactability,'do_not_contact','an active alias stop survives a current-mailbox reviewed clear');
 assert.equal(await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(draft.id).first('is_stale'),1);
 assert.equal((await approval.message(message.id)).state,'cancelled');
 await clear(survivor.contactId);
 await assert.rejects(()=>approval.approve(draft.id,1,f.actor),/no longer permitted/);
 let sends=0;await new OutreachService(f.db,{send:async()=>{sends++;return {providerMessageId:'test-only'};}}).dispatchDue(new Date(Date.now()+3*86400000));assert.equal(sends,0,'clearing permission never revives an old approval');
 assert.equal((await approval.message(message.id)).state,'cancelled');
 assert.deepEqual(await f.db.prepare('SELECT * FROM outbound_messages WHERE id=?').bind(history.id).first(),before,'committed sent history survives the merge unchanged');
}
