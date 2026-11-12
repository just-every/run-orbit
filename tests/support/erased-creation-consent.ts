import assert from 'node:assert/strict';
import {reviewTokens} from './reviewed-merge';
import {json,finish} from './crm-import-flow';
import type {launchFixture} from './launch-fixture';

/** All creation doors reuse the same anonymous erasure fence, including merged aliases. */
export async function erasedCreationConsent(f:Awaited<ReturnType<typeof launchFixture>>){
 const primary='synthetic-orbit-erased-primary@example.test',alias='synthetic-orbit-erased-alias@example.test';
 const create=async(email:string,name:string)=>json(await f.request('records/contact','POST',{name,email,contactability:'contactable'}));
 const original=await create(primary,'Private erased name'),retired=await create(alias,'Private alias name'),control=await create('synthetic-orbit-consent-control@example.test','Unchanged customer');
 assert.equal((await json(await f.request(`records/contact/${original.id}`))).record.contactability,'contactable');
 await json(await f.request('records/contact/merge','POST',{survivorId:original.id,retiredId:retired.id,choices:{name:'survivor',email:'survivor',contactability:'survivor'},reviewed:await reviewTokens(f.db,'contact',original.id,retired.id),confirmed:true}));
 await json(await f.request(`records/contact/${original.id}`,'DELETE',{confirmed:true}));
 // There was no unsubscribe or bounce before erasure. Both addresses still start blocked.
 for(const email of [primary,alias]){
  const recreated=await create(email.toUpperCase(),'New customer');
  const detail=await json(await f.request(`records/contact/${recreated.id}`));
  assert.equal(detail.record.contactability,'do_not_contact');assert.equal(detail.record.contactability_reason,'erased_address');
  assert.ok(!JSON.stringify(detail).includes('Private erased name'));assert.ok(!JSON.stringify(detail).includes('Private alias name'));
  assert.equal((await f.request(`records/contact/${recreated.id}`,'PUT',{name:'Ordinary edit',contactability:'contactable'})).status,409);
  await json(await f.request(`records/contact/${recreated.id}/clear-do-not-contact`,'POST',{confirmed:true,email:detail.record.email,updatedAt:detail.record.updated_at,revision:detail.record.contactability_revision}));
  const cleared=await json(await f.request(`records/contact/${recreated.id}`));assert.equal(cleared.record.contactability,'contactable');assert.ok(cleared.timeline.some((entry:{kind:string})=>entry.kind==='contactability.cleared'));
  await json(await f.request(`records/contact/${recreated.id}`,'DELETE',{confirmed:true}));
 }
 const source={vendor:'csv',account:'Synthetic erased address consent',files:[{kind:'contact',name:'synthetic-orbit-consent.csv',csv:`email,name,permission\r\n${primary},Reimported primary,subscribed\r\n${alias},Reimported alias,subscribed\r\nsynthetic-orbit-consent-control@example.test,Existing customer,subscribed`,mapping:{email:'email',name:'name',permission:'permission'},separator:';'}],stages:{},contactability:'mapped_permission'};
 const dry=await json(await f.request('imports/dry-run','POST',source));await finish(f,dry);
 for(const email of [primary,alias]){
  const records=(await json(await f.request(`records/contact?q=${encodeURIComponent(email)}`))).records;assert.equal(records.length,1);assert.equal(records[0].contactability,'do_not_contact');
  assert.equal((await json(await f.request(`records/contact/${records[0].id}`))).record.contactability_reason,'erased_address');
 }
 // Once a person explicitly permits this current record, another import must preserve that choice.
 const current=(await json(await f.request(`records/contact?q=${encodeURIComponent(primary)}`))).records[0],reviewed=(await json(await f.request(`records/contact/${current.id}`))).record;
 await json(await f.request(`records/contact/${current.id}/clear-do-not-contact`,'POST',{confirmed:true,email:reviewed.email,updatedAt:reviewed.updated_at,revision:reviewed.contactability_revision}));
 const again=await json(await f.request('imports/dry-run','POST',{...source,account:'Synthetic existing consent import'}));await finish(f,again);
 assert.equal((await json(await f.request(`records/contact/${current.id}`))).record.contactability,'contactable','Import preserves an explicit clear on a current record, even with an older erasure proof');
 assert.equal((await json(await f.request(`records/contact/${control.id}`))).record.contactability,'contactable','Existing contactable customers are unchanged');
}
