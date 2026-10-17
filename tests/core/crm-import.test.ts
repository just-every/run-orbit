import {reviewTokens} from '../support/reviewed-merge';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {crmFixture} from '../support/crm-fixtures';
import {defaultMapping} from '../../src/core/features/imports/contracts';
import {nativeId} from '../../src/core/features/imports/source';
import {createDependencies} from '../support/dependencies';
import {createApp} from '../support/app';
import {createId} from '../../src/core/shared/ids';
import {signRelayBody} from '../../src/base/sendgrid-event-relay/crypto';
import {json,finish,genericCsvFlow} from '../support/crm-import-flow';
test('RECORD-008 vendor exports and generic spreadsheets dry-run, reconcile, re-import and undo through current operator routes',async t=>{
 const f=await launchFixture();try{for(const vendor of ['hubspot','pipedrive'] as const){
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
  t.diagnostic(`${vendor}: ${dry.counts.input} rows, one listed rejection; records, associations, notes, replay and kit undo reconciled.`);
 }await genericCsvFlow(f);}finally{await f.dispose();}
});
test('RECORD-008 stops block exact approved sends; undo preserves edits and independent stops, authority and malformed mapping fail closed',async()=>{
 const f=await launchFixture();try{
  const c=await f.customer('hubspot-standalone@example.test'),scheduled=await f.message(c.contactId,c.opportunityId),source=crmFixture('hubspot',f.stage,3);
  let paidCalls=0;const deps=createDependencies(f.db),session=await deps.auth.createSession(f.actor),relaySecret=crypto.randomUUID(),app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},mailEventKeys:{relaySecret},outboundMail:{send:async()=>{paidCalls++;return{providerMessageId:'test-edge-receipt'};}}});
  const request=(path:string,method='GET',body?:any,headers:any={})=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test','content-type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  assert.equal((await request('imports/dry-run','POST',source,{cookie:''})).status,401);assert.equal((await request('imports/dry-run','POST',source,{origin:'https://attacker.test'})).status,403);
  const malicious=structuredClone(source);malicious.files[0].mapping.operator_id='Record ID';assert.equal((await f.request('imports/dry-run','POST',malicious)).status,409);
  const blockedDraft=await json(await request(`workbench/opportunities/${c.opportunityId}/drafts`,'POST',{contactId:c.contactId,subject:'Exact saved subject',body:'Exact saved content'}));
  const dry=await json(await f.request('imports/dry-run','POST',source));assert.equal((await f.request(`imports/${dry.id}/apply`,'POST',{fingerprint:'0'.repeat(64),confirmed:true})).status,409);await finish(f,dry);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first<any>())!.state,'cancelled');assert.equal((await f.records.detail('contact',c.contactId)).record.contactability,'do_not_contact');
  async function approve(contact:string,opportunity:string){const draft=await json(await request(`workbench/opportunities/${opportunity}/drafts`,'POST',{contactId:contact,subject:'Reviewed subject',body:'Reviewed customer body'}));const preview=await json(await request(`workbench/drafts/${draft.id}/approval-preview`));return request(`workbench/drafts/${draft.id}/approve`,'POST',{revision:1,quietHoursConfirmation:preview.localTime});}
  const blockedPreview=await json(await request(`workbench/drafts/${blockedDraft.id}/approval-preview`));const blocked=await request(`workbench/drafts/${blockedDraft.id}/approve`,'POST',{revision:1,quietHoursConfirmation:blockedPreview.localTime});assert.ok(blocked.status>=400);assert.equal(paidCalls,0);
  const control=await f.customer();assert.equal((await approve(control.contactId,control.opportunityId)).status,200);assert.equal(paidCalls,1,'Unsuppressed exact approval reaches the paid edge fake');
  const trusted=await f.message(control.contactId,control.opportunityId),events=[{sg_event_id:createId(),event:'unsubscribe',timestamp:Math.floor(Date.now()/1000),email:control.email,rer_product:'orbit',rer_delivery_id:trusted.id}],body=JSON.stringify(events),timestamp=String(Math.floor(Date.now()/1000)),signature=await signRelayBody(relaySecret,timestamp,new TextEncoder().encode(body));
  assert.equal((await app.request('https://orbit.test/api/v1/mail/events/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':'forged'},body})).status,401);
  assert.equal((await app.request('https://orbit.test/api/v1/mail/events/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':signature},body})).status,200);assert.equal((await f.records.detail('contact',control.contactId)).record.contactability,'do_not_contact');assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(trusted.id).first<any>())!.state,'cancelled');
  const person=nativeId(`orbit:hubspot:${source.account}`,'contact','person-2');await f.records.save('contact',{name:'Native edit retained'},f.actor,person,{ordinaryEdit:true});await json(await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Independent native stop',contactability:'do_not_contact'}));const undo=await finish(f,dry,'undo');assert.equal((await f.records.detail('contact',person)).record.name,'Native edit retained');assert.equal((await f.records.detail('contact',c.contactId)).record.contactability,'do_not_contact');assert.ok(undo.undo.dispositions.some((d:any)=>d.disposition==='retained'));
  await deps.auth.revoke(session.id);assert.equal((await request(`imports/${dry.id}`)).status,401);
 }finally{await f.dispose();}
});
test('RECORD-008 a failed native batch keeps suppression effective; revoked grants and another actor cannot publish retained plans',async()=>{
 const f=await launchFixture();try{const source=crmFixture('pipedrive',f.stage,3),existing=await f.customer('pipedrive-standalone@example.test'),dry=await json(await f.request('imports/dry-run','POST',source));
 await f.db.prepare("CREATE TRIGGER import_failure_probe BEFORE INSERT ON companies BEGIN SELECT RAISE(ABORT,'deliberate public-flow storage failure'); END").run();
 assert.equal((await f.request(`imports/${dry.id}/apply`,'POST',{confirmed:true,fingerprint:dry.fingerprint})).status,409);assert.equal((await f.records.detail('contact',existing.contactId)).record.contactability,'do_not_contact');assert.equal((await f.db.prepare('SELECT count(*) n FROM companies').first<any>())!.n,0);
 await f.db.prepare('DROP TRIGGER import_failure_probe').run();
 const recreated=await json(await f.request('records/contact','POST',{name:'Later same suppressed mailbox',email:'pipedrive-0@example.test'}));assert.equal((await f.records.detail('contact',recreated.id)).record.contactability,'do_not_contact');
 // This fresh record wins its identity. The reviewed import cannot silently replace it.
 assert.equal((await f.request(`imports/${dry.id}/apply`,'POST',{confirmed:true,fingerprint:dry.fingerprint})).status,409);
 await f.db.prepare("UPDATE access_memberships SET status='removed' WHERE operator_id=?").bind(f.actor).run();assert.equal((await f.request(`imports/${dry.id}/undo`,'POST',{confirmed:true})).status,403);await f.db.prepare("UPDATE access_memberships SET status='active' WHERE operator_id=?").bind(f.actor).run();
 const undone=await finish(f,dry,'undo');assert.equal(undone.job.state,'rolled_back');assert.ok(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(recreated.id).first());assert.equal((await f.records.detail('contact',recreated.id)).record.contactability,'do_not_contact');
 const deps=createDependencies(f.db),other=createId();await deps.auth.ensureOperator({id:other,email:'other-import-operator@example.test',displayName:'Other operator'});const session=await deps.auth.createSession(other);assert.equal((await f.request(`imports/${dry.id}`,'GET',undefined,{Cookie:`__Host-orbit_session=${session.token}`})).status,404);
 const {archiveCatalog}=await import('../../src/core/features/records/archive-schema');assert.ok((await archiveCatalog(f.db)).every(table=>!table.name.startsWith('ik_')&&!table.name.startsWith('crm_import_')));
 const rep=createId(),secondRep=createId();await deps.auth.ensureOperator({id:rep,email:'csv-owner@example.test',displayName:'CSV recipient'});await deps.auth.ensureOperator({id:secondRep,email:'company-owner@example.test',displayName:'Company recipient'});
 const native=await f.customer('linked-owner@example.test');await json(await f.request(`records/contact/${native.contactId}`,'PUT',{name:'Native owned customer',owner_id:secondRep}));
 const mapped={vendor:'csv',account:'Owner mapping review',contactability:'confirmed_contactable',owners:{contact:{'Legacy owner':rep,'company-owner@example.test':null},company:{'Company queue':secondRep}},files:[{kind:'contact',name:'owners.csv',csv:`id,email,name,owner\r\na,owner-a@example.test,Owner A,csv-owner@example.test\r\nb,owner-b@example.test,Owner B,Legacy owner\r\nc,owner-c@example.test,Owner C,Unknown owner\r\nd,owner-d@example.test,Owner D,company-owner@example.test\r\nn,${native.email},Incoming replacement,Legacy owner`,mapping:{id:'id',email:'email',name:'name',owner:'owner'},separator:';'},{kind:'company',name:'company-owners.csv',csv:'id,name,owner\r\nco,Owned Company,Company queue',mapping:{id:'id',name:'name',owner:'owner'},separator:';'}]};
 const ownerDry=await json(await f.request('imports/dry-run','POST',mapped));assert.equal(ownerDry.owners.find((row:any)=>row.value==='Legacy owner').count,2);assert.equal(ownerDry.owners.find((row:any)=>row.value==='Unknown owner').ownerId,null);assert.equal(ownerDry.owners.find((row:any)=>row.value==='company-owner@example.test').method,'explicit');assert.equal(ownerDry.owners.find((row:any)=>row.value==='company-owner@example.test').ownerId,null);assert.equal(ownerDry.owners.find((row:any)=>row.kind==='company').ownerId,secondRep);assert.equal(ownerDry.owners.find((row:any)=>row.value==='Legacy owner').linkedCount,1);
 const reopened=await json(await f.request(`imports/${ownerDry.id}`));assert.deepEqual(reopened.owners,ownerDry.owners);
 await f.db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(rep).run();assert.equal((await f.request(`imports/${ownerDry.id}/apply`,'POST',{fingerprint:ownerDry.fingerprint,confirmed:true})).status,409);await f.db.prepare("UPDATE operators SET status='active' WHERE id=?").bind(rep).run();
 await finish(f,ownerDry);
 const ownerNs='orbit:csv:Owner mapping review',assigned=nativeId(ownerNs,'contact','a'),explicit=nativeId(ownerNs,'contact','b'),unmatched=nativeId(ownerNs,'contact','c'),assignedCompany=nativeId(ownerNs,'company','co');
 for(const id of [assigned,explicit])assert.equal((await json(await f.request(`records/contact/${id}`))).record.owner_id,rep);assert.equal((await json(await f.request(`records/contact/${unmatched}`))).record.owner_id,null);assert.equal((await json(await f.request(`records/contact/${nativeId(ownerNs,'contact','d')}`))).record.owner_id,null);assert.equal((await json(await f.request(`records/company/${assignedCompany}`))).record.owner_id,secondRep);assert.equal((await json(await f.request(`records/contact/${native.contactId}`))).record.owner_id,secondRep);
 const detail=await json(await f.request(`records/contact/${assigned}`)),ownerHistory=detail.timeline.filter((entry:any)=>entry.kind==='owner.changed');assert.equal(ownerHistory.length,1);assert.equal(ownerHistory[0].actor_type,'source');assert.equal(JSON.parse(JSON.parse(detail.record.custom_fields_json).import_source).owner,'csv-owner@example.test');
 const eventKey=`owner:csv-import:${ownerDry.id}:`,messages=await f.db.prepare("SELECT * FROM notifications WHERE event_key LIKE ?").bind(eventKey+'%').all<any>();assert.equal(messages.results.length,2);const recipientMessage=messages.results.find((message:any)=>message.operator_id===rep);assert.match(recipientMessage.message,/Owner A/);assert.match(recipientMessage.message,/Owner B/);
 await f.db.prepare('UPDATE operators SET display_name=? WHERE id=?').bind('Renamed recipient',rep).run();const repeatedMapping={...mapped,owners:{...mapped.owners,contact:{...mapped.owners.contact,'csv-owner@example.test':rep}}};
 const ownerReplay=await json(await f.request('imports/dry-run','POST',repeatedMapping));await finish(f,ownerReplay);await finish(f,ownerReplay,'undo');assert.equal(await f.db.prepare("SELECT count(*) n FROM notifications WHERE event_key LIKE 'owner:csv-import:%'").first('n'),2);
 await json(await f.request(`records/contact/${assigned}`,'PUT',{name:'Later native name'}));await json(await f.request(`records/contact/${explicit}`,'PUT',{name:'Owner B',owner_id:secondRep}));
 await finish(f,ownerDry,'undo');const retainedOwner=await json(await f.request(`records/contact/${assigned}`));assert.equal(retainedOwner.record.name,'Later native name');assert.equal(retainedOwner.record.owner_id,null,'Owner undo preserves other native fields');assert.equal((await json(await f.request(`records/contact/${explicit}`))).record.owner_id,secondRep,'Later native ownership survives undo');assert.equal(await f.db.prepare('SELECT id FROM companies WHERE id=?').bind(assignedCompany).first(),null);

 }finally{await f.dispose();}
});
test('RECORD-008 a contact arriving after review fences every creation and send until undo; missing permission stays held',async()=>{
 const f=await launchFixture();try{
  const source=crmFixture('hubspot',f.stage,3);delete source.files.find(file=>file.kind==='contact')!.mapping.permission;
  const dry=await json(await f.request('imports/dry-run','POST',source));assert.equal(dry.suppressed,4);
  const arrived=await f.customer('hubspot-standalone@example.test');
  assert.equal((await f.request(`imports/${dry.id}/apply`,'POST',{confirmed:true,fingerprint:dry.fingerprint})).status,409);
  assert.ok((await f.request('records/contact','POST',{name:'Concurrent native creation',email:'another-arrival@example.test'})).status>=400);
  await assert.rejects(f.message(arrived.contactId,arrived.opportunityId,'queued'),/pending suppression import/);
  assert.equal(await f.db.prepare("SELECT id FROM audit_entries WHERE action='contact.suppressed' LIMIT 1").first(),null,'The failed safety batch is atomic');
  await finish(f,dry,'undo');
  await json(await f.request('records/contact','POST',{name:'After explicitly undoing the review',email:'another-arrival@example.test'}));
  const refreshed=await json(await f.request('imports/dry-run','POST',source));await finish(f,refreshed);
  for(let i=0;i<3;i++){const id=nativeId(`orbit:hubspot:${source.account}`,'contact',`person-${i}`);assert.equal((await f.records.detail('contact',id)).record.contactability,'do_not_contact');}
  const existing=await f.customer('leo@example.test'),stopped=await f.customer('stopped-import@example.test');
  await json(await f.request(`records/contact/${existing.contactId}`,'PUT',{name:'Leo Visitor',email:existing.email}));
  await json(await f.request(`records/contact/${stopped.contactId}`,'PUT',{name:'Stopped',email:stopped.email,contactability:'do_not_contact'}));
  const headers=['Record ID','First Name','Last Name','Email','Company Name','Phone Number'],csv=[headers.join(','),'new1,Maya,Chen,maya-import@example.test,Brightwork,0412345678','new2,Ari,Park,ari-import@example.test,Brightwork,0498765432',`native,Leo,Park,${existing.email},Unused company,0123`,`stopped,Prior,Stop,${stopped.email},,`].join('\r\n');
  const ordinary={vendor:'hubspot',account:'standard-contact-export',contactability:'confirmed_contactable',files:[{kind:'contact',name:'contacts.csv',csv,mapping:defaultMapping('hubspot','contact',headers),separator:';'}]};
  const standard=await json(await f.request('imports/dry-run','POST',ordinary));assert.equal(standard.counts.rejected,0);assert.equal(standard.rows.find((row:any)=>row.sourceId==='native').status,'linked');assert.equal(standard.rows.find((row:any)=>row.sourceId==='native').recordId,existing.contactId);
  await finish(f,standard);
  const person=await f.db.prepare("SELECT * FROM contacts WHERE email='maya-import@example.test'").first<any>(),colleague=await f.db.prepare("SELECT * FROM contacts WHERE email='ari-import@example.test'").first<any>();
  assert.equal(person.name,'Maya Chen');assert.equal(person.phone,'0412345678');assert.equal(person.contactability,'contactable');assert.ok(person.company_id);assert.equal(person.company_id,colleague.company_id);assert.equal((await f.records.detail('company',person.company_id)).record.name,'Brightwork');
  assert.equal((await f.records.detail('contact',existing.contactId)).record.name,'Leo Visitor');assert.equal((await f.records.detail('contact',stopped.contactId)).record.contactability,'do_not_contact');assert.equal(await f.db.prepare("SELECT id FROM companies WHERE name='Unused company'").first(),null);
  const again=await json(await f.request('imports/dry-run','POST',ordinary));await finish(f,again);assert.equal(await f.db.prepare("SELECT count(*) n FROM companies WHERE name='Brightwork'").first('n'),1);
  await finish(f,again,'undo');await finish(f,standard,'undo');assert.equal(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(person.id).first(),null);assert.equal(await f.db.prepare('SELECT id FROM companies WHERE id=?').bind(person.company_id).first(),null);assert.equal((await f.records.detail('contact',stopped.contactId)).record.contactability,'do_not_contact');
 }finally{await f.dispose();}
});
