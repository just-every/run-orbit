import assert from 'node:assert/strict';
import type {launchFixture} from './launch-fixture';
import {crmFixture} from './crm-fixtures';
import {reviewTokens} from './reviewed-merge';
import {nativeId} from '../../src/core/features/imports/source';
import {json,finish} from './crm-import-flow';

/** Run one complete vendor migration in the calling journey's independent fixture. */
export async function migrateVendorExport(f:Awaited<ReturnType<typeof launchFixture>>,vendor:'hubspot'|'pipedrive',diagnostic:(message:string)=>void){
 const independentlyStopped=await f.customer(`${vendor}-independent@example.test`),restorable=await f.customer(`${vendor}-standalone@example.test`);
 await json(await f.request(`records/contact/${independentlyStopped.contactId}`,'PUT',{name:'Independently stopped customer',email:independentlyStopped.email,contactability:'do_not_contact'}));
 let stoppedSourceMailbox=independentlyStopped.email;
 if(vendor==='pipedrive'){const alias=await f.customer(`${vendor}-independent-alias@example.test`);await json(await f.request('records/contact/merge','POST',{survivorId:independentlyStopped.contactId,retiredId:alias.contactId,choices:{name:'survivor',email:'survivor',contactability:'survivor'},reviewed:await reviewTokens(f.db,'contact',independentlyStopped.contactId,alias.contactId),confirmed:true}));stoppedSourceMailbox=alias.email;}
 const independentProofs=(await f.db.prepare("SELECT id FROM audit_entries WHERE action='contact.suppressed'").all<{id:string}>()).results.map(row=>row.id),scheduled=await f.message(restorable.contactId,restorable.opportunityId);
 const source=crmFixture(vendor,f.stage);source.files.find(file=>file.kind==='suppression')!.csv+=`\r\n"${stoppedSourceMailbox}"`;
 const before=(await f.db.prepare('SELECT count(*) n FROM contacts').first<any>())!.n;
 const dry=await json(await f.request('imports/dry-run','POST',source));assert.equal((await f.db.prepare('SELECT count(*) n FROM contacts').first<any>())!.n,before);assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first<any>())!.state,'scheduled');
 assert.equal(dry.counts.rejected,1);assert.ok(dry.counts.rejected/dry.counts.input<.01);assert.equal(dry.rows.filter((r:any)=>r.status==='rejected').length,1);assert.match(dry.rows.find((r:any)=>r.status==='rejected').reason,/occurrence time/);
 await finish(f,dry);assert.equal((await f.db.prepare('SELECT count(*) n FROM contacts').first<any>())!.n,before+120);
 const namespace=`orbit:${vendor}:${source.account}`,person=nativeId(namespace,'contact','person-0'),deal=nativeId(namespace,'deal','deal-1');
 assert.equal((await f.records.detail('contact',person)).record.contactability,'do_not_contact');const opportunity=(await f.records.detail('opportunity',deal));assert.equal(opportunity.contacts.length,2);assert.equal(opportunity.record.value_cents,125025);assert.equal(opportunity.record.owner_id,null);assert.equal(opportunity.record.queue_state,'none');assert.equal(opportunity.timeline.length,1);assert.match(opportunity.timeline[0].payload_json,/not executable/);
 const replay=await json(await f.request('imports/dry-run','POST',source));await finish(f,replay);assert.equal((await f.db.prepare('SELECT count(*) n FROM contacts').first<any>())!.n,before+120);assert.equal((await f.records.detail('opportunity',deal)).timeline.length,1);
 await finish(f,replay,'undo');assert.ok(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(person).first(),'Undo of a reused import cannot steal the first job effects');
 assert.equal((await f.records.detail('contact',restorable.contactId)).record.contactability,'do_not_contact');
 await finish(f,dry,'undo');assert.equal((await f.db.prepare('SELECT count(*) n FROM contacts').first<any>())!.n,before);assert.equal(await f.db.prepare('SELECT id FROM opportunities WHERE id=?').bind(deal).first(),null);
 assert.equal((await f.records.detail('contact',independentlyStopped.contactId)).record.contactability,'do_not_contact','A pre-existing independent stop survives');
 assert.equal((await f.records.detail('contact',restorable.contactId)).record.contactability,'contactable','An unrelated mailbox regains its exact pre-import permission');
 assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first<any>())!.state,'cancelled','Undo never resumes cancelled mail');
 const survivingProofs=new Set((await f.db.prepare("SELECT id FROM audit_entries WHERE action='contact.suppressed'").all<{id:string}>()).results.map(row=>row.id));assert.ok(independentProofs.every(id=>survivingProofs.has(id)));
 diagnostic(`${vendor}: ${dry.counts.input} rows, one listed rejection; records, associations, notes, replay and kit undo reconciled.`);
}
