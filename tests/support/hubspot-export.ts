import assert from 'node:assert/strict';
import {defaultMapping,type ImportInput} from '../../src/core/features/imports/contracts';
import {parseCsv} from '../../src/core/shared/csv';
import {nativeId} from '../../src/core/features/imports/source';
import {json,finish} from './crm-import-flow';

/** Display labels from HubSpot's property/export documentation, independent of Orbit's presets. */
export function hubspotExport(stage:string):ImportInput{
 const exports=[
  ['company','Record ID,Company name,Company domain name,Company owner,Description\nsynthetic-orbit-company,Synthetic Export Company,synthetic-orbit-export.example.test,Historical company owner,Synthetic company description'],
  ['contact','Record ID,First Name,Last Name,Email,Phone Number,Job Title,Company Name,Associated Company IDs,Contact owner,Unsubscribed from all email,Email hard bounce reason,Email address quarantined\nsynthetic-orbit-contact,Synthetic,Export Person,synthetic-orbit-export@example.test,5550100,Synthetic role,Unused company name,synthetic-orbit-company,Historical contact owner,false,,false'],
  ['deal','Record ID,Deal name,Deal stage,Deal owner,Associated Company IDs,Associated Contact IDs,Amount,Close date,Deal description\nsynthetic-orbit-deal,Synthetic export deal,Qualified,Historical deal owner,synthetic-orbit-company,synthetic-orbit-contact,4321.25,2027-01-01,Synthetic deal description'],
  ['note','Record ID,Note Body,Create Date,Associated Contact IDs,Associated Company IDs,Associated Deal IDs,Activity assigned to\nsynthetic-orbit-note-1,Synthetic note <script>inert</script>,2026-09-01T12:00:00Z,synthetic-orbit-contact,synthetic-orbit-company,synthetic-orbit-deal,Historical note owner\nsynthetic-orbit-note-2,Second synthetic note,2026-09-02T12:00:00Z,synthetic-orbit-contact,synthetic-orbit-company,synthetic-orbit-deal,Historical note owner'],
 ] as const;
 return {vendor:'hubspot',account:'Synthetic documented HubSpot export',stages:{Qualified:stage},contactability:'mapped_permission',files:exports.map(([kind,csv])=>({kind,name:`hubspot-${kind}.csv`,csv,mapping:defaultMapping('hubspot',kind,parseCsv(csv)[0]),separator:';'}))};
}

/** A standard notes CSV must reach native timelines through saved review, Apply, replay and undo. */
export async function hubspotExportFlow(f:any){
 const source=hubspotExport(f.stage),namespace=`orbit:hubspot:${source.account}`;
 const before=await json(await f.request('records/contact?q=synthetic-orbit-export%40example.test'));assert.equal(before.records.length,0);
 const dry=await json(await f.request('imports/dry-run','POST',source));
 assert.equal(dry.counts.input,5);assert.equal(dry.counts.rejected,0);assert.equal(dry.rows.filter((row:any)=>row.kind==='note'&&row.status==='ready').length,2);
 assert.equal(dry.rows.filter((row:any)=>row.kind==='company').length,1,'Explicit company associations do not create a company from Company Name');
 assert.deepEqual((await json(await f.request(`imports/${dry.id}`))).rows,dry.rows);
 assert.equal((await json(await f.request('records/contact?q=synthetic-orbit-export%40example.test'))).records.length,0,'Dry run creates no customer');
 await finish(f,dry);
 const contact=nativeId(namespace,'contact','synthetic-orbit-contact'),company=nativeId(namespace,'company','synthetic-orbit-company'),deal=nativeId(namespace,'deal','synthetic-orbit-deal');
 const person=await json(await f.request(`records/contact/${contact}`)),organization=await json(await f.request(`records/company/${company}`)),opportunity=await json(await f.request(`records/opportunity/${deal}`));
 assert.equal(person.record.name,'Synthetic Export Person');assert.equal(person.record.phone,'5550100');assert.equal(person.record.job_title,'Synthetic role');assert.equal(person.record.company_id,company);assert.equal(person.record.contactability,'do_not_contact');
 assert.equal(organization.record.name,'Synthetic Export Company');assert.equal(organization.record.primary_domain,'synthetic-orbit-export.example.test');
 assert.equal(opportunity.record.title,'Synthetic export deal');assert.equal(opportunity.record.value_cents,432125);assert.equal(opportunity.record.stage_id,f.stage);assert.equal(opportunity.record.expected_close_at,'2027-01-01T00:00:00.000Z');assert.equal(opportunity.record.owner_id,null);
 const expected=[['Synthetic note <script>inert</script>','2026-09-01T12:00:00.000Z'],['Second synthetic note','2026-09-02T12:00:00.000Z']];
 for(const detail of [person,organization,opportunity]){
  const notes=detail.timeline.filter((entry:any)=>entry.kind==='import.note');assert.equal(notes.length,2);
  for(const [text,at] of expected){const note=notes.find((entry:any)=>JSON.parse(entry.payload_json).text===text);assert.ok(note);assert.equal(note.occurred_at,at);assert.equal(note.actor_type,'import');assert.equal(note.source,'hubspot');}
 }
 const replay=await json(await f.request('imports/dry-run','POST',source));await finish(f,replay);assert.equal((await json(await f.request(`records/contact/${contact}`))).timeline.filter((entry:any)=>entry.kind==='import.note').length,2);
 await finish(f,replay,'undo');await finish(f,dry,'undo');assert.equal((await f.request(`records/contact/${contact}`)).status,404);
 // The prepared/API-label recipe predating display-label exports remains a working public-door path.
 const prepared=structuredClone(source);prepared.account='Synthetic prepared HubSpot notes';
 const preparedNotes=prepared.files.find(file=>file.kind==='note')!;
 preparedNotes.csv='Note ID,hs_note_body,hs_timestamp,hubspot_owner_id,Contact IDs,Company IDs,Deal IDs\nsynthetic-orbit-note-1,Prepared note,2026-09-01T12:00:00Z,Historical note owner,synthetic-orbit-contact,synthetic-orbit-company,synthetic-orbit-deal';
 preparedNotes.mapping=defaultMapping('hubspot','note',parseCsv(preparedNotes.csv)[0]);
 const preparedReview=await json(await f.request('imports/dry-run','POST',prepared));assert.equal(preparedReview.counts.rejected,0);await finish(f,preparedReview);
 const preparedDeal=nativeId(`orbit:hubspot:${prepared.account}`,'deal','synthetic-orbit-deal'),preparedDetail=await json(await f.request(`records/opportunity/${preparedDeal}`));assert.ok(preparedDetail.timeline.some((entry:any)=>entry.kind==='import.note'&&JSON.parse(entry.payload_json).text==='Prepared note'));await finish(f,preparedReview,'undo');
 // The occurrence timestamp wins over creation when both are exported; missing/future dates still refuse rows.
 for(const [columns,time,ready] of [
  ['Activity date,Create Date','2026-08-01T12:00:00Z,2026-09-01T12:00:00Z',true],
  ['hs_timestamp,Create Date','2026-08-01T12:00:00Z,2026-09-01T12:00:00Z',true],
  ['Create Date','2099-01-01T00:00:00Z',false],
  ['Create Date','',false],
 ] as const){
  const variant=structuredClone(source);variant.account=`Date fallback ${columns} ${time}`;
  const note=variant.files.find(file=>file.kind==='note')!;note.csv=`Record ID,Note Body,${columns},Associated Contact IDs\nsynthetic-orbit-note-1,Date choice,${time},synthetic-orbit-contact`;note.mapping=defaultMapping('hubspot','note',parseCsv(note.csv)[0]);
  const review=await json(await f.request('imports/dry-run','POST',variant));assert.equal(review.rows.find((row:any)=>row.kind==='note').status,ready?'ready':'rejected');
  if(ready){await finish(f,review);const id=nativeId(`orbit:hubspot:${variant.account}`,'contact','synthetic-orbit-contact'),detail=await json(await f.request(`records/contact/${id}`));assert.equal(detail.timeline.find((entry:any)=>entry.kind==='import.note').occurred_at,'2026-08-01T12:00:00.000Z');await finish(f,review,'undo');}
 }
}
