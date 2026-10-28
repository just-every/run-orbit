import assert from 'node:assert/strict';
import type {launchFixture} from './launch-fixture';
type Fixture=Awaited<ReturnType<typeof launchFixture>>;
import {crmFixture} from './crm-fixtures';
function reviewedSource(vendor:'hubspot'|'pipedrive',stage:string,count:number,domain:string){const source=crmFixture(vendor,stage,count);source.account+=' '+domain;for(const file of source.files)file.csv=file.csv.replaceAll('@example.test','@'+domain+'.example.test');return source;}
import {defaultMapping} from '../../src/core/features/imports/contracts';
import {nativeId} from '../../src/core/features/imports/source';
import {createDependencies} from './dependencies';
import {createApp} from './app';
import {createId} from '../../src/core/shared/ids';
import {signRelayBody} from '../../src/base/sendgrid-event-relay/crypto';
import {json,finish} from './crm-import-flow';

export async function verifySuppressionAndUndo(f:Fixture){

  const c=await f.customer('hubspot-standalone@suppression.example.test'),scheduled=await f.message(c.contactId,c.opportunityId),source=reviewedSource('hubspot',f.stage,3,'suppression');
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
  const person=nativeId(`orbit:hubspot:${source.account}`,'contact','person-2');await json(await f.request(`records/contact/${person}`,'PUT',{name:'Native edit retained'}));await json(await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Independent native stop',contactability:'do_not_contact'}));const undo=await finish(f,dry,'undo');assert.equal((await f.records.detail('contact',person)).record.name,'Native edit retained');assert.equal((await f.records.detail('contact',c.contactId)).record.contactability,'do_not_contact');assert.ok(undo.undo.dispositions.some((d:any)=>d.disposition==='retained'));
  await deps.auth.revoke(session.id);assert.equal((await request(`imports/${dry.id}`)).status,401);

}

export async function recoverInterruptedImport(f:Fixture){
const beforeCompanies=await f.db.prepare('SELECT count(*) n FROM companies').first('n'),source=reviewedSource('pipedrive',f.stage,3,'interrupted'),existing=await f.customer('pipedrive-standalone@interrupted.example.test'),dry=await json(await f.request('imports/dry-run','POST',source));
 await f.db.prepare("CREATE TRIGGER import_failure_probe BEFORE INSERT ON companies BEGIN SELECT RAISE(ABORT,'deliberate public-flow storage failure'); END").run();
 assert.equal((await f.request(`imports/${dry.id}/apply`,'POST',{confirmed:true,fingerprint:dry.fingerprint})).status,409);assert.equal((await f.records.detail('contact',existing.contactId)).record.contactability,'do_not_contact');assert.equal((await f.db.prepare('SELECT count(*) n FROM companies').first<any>())!.n,beforeCompanies);
 await f.db.prepare('DROP TRIGGER import_failure_probe').run();
 const recreated=await json(await f.request('records/contact','POST',{name:'Later same suppressed mailbox',email:'pipedrive-0@interrupted.example.test'}));assert.equal((await f.records.detail('contact',recreated.id)).record.contactability,'do_not_contact');
 // This fresh record wins its identity. The reviewed import cannot silently replace it.
 assert.equal((await f.request(`imports/${dry.id}/apply`,'POST',{confirmed:true,fingerprint:dry.fingerprint})).status,409);
 await f.db.prepare("UPDATE access_memberships SET status='removed' WHERE operator_id=?").bind(f.actor).run();assert.equal((await f.request(`imports/${dry.id}/undo`,'POST',{confirmed:true})).status,403);await f.db.prepare("UPDATE access_memberships SET status='active' WHERE operator_id=?").bind(f.actor).run();
 const undone=await finish(f,dry,'undo');assert.equal(undone.job.state,'rolled_back');assert.ok(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(recreated.id).first());assert.equal((await f.records.detail('contact',recreated.id)).record.contactability,'do_not_contact');
 const deps=createDependencies(f.db),other=createId();await deps.auth.ensureOperator({id:other,email:'other-import-operator@interrupted.example.test',displayName:'Other operator'});const session=await deps.auth.createSession(other);assert.equal((await f.request(`imports/${dry.id}`,'GET',undefined,{Cookie:`__Host-orbit_session=${session.token}`})).status,404);

}

export async function refuseStaleContactReview(f:Fixture){

  const source=reviewedSource('hubspot',f.stage,3,'stale');delete source.files.find(file=>file.kind==='contact')!.mapping.permission;
  const auditCount=()=>f.db.prepare("SELECT count(*) FROM audit_entries WHERE action='contact.suppressed'").first('count(*)'),beforeAudit=await auditCount();
  const dry=await json(await f.request('imports/dry-run','POST',source));assert.equal(dry.suppressed,4);
  const arrived=await f.customer('hubspot-standalone@stale.example.test');
  assert.equal((await f.request(`imports/${dry.id}/apply`,'POST',{confirmed:true,fingerprint:dry.fingerprint})).status,409);
  assert.ok((await f.request('records/contact','POST',{name:'Concurrent native creation',email:'another-arrival@stale.example.test'})).status>=400);
  await assert.rejects(f.message(arrived.contactId,arrived.opportunityId,'queued'),/pending suppression import/);
  assert.equal(await auditCount(),beforeAudit,'The failed safety batch is atomic');
  await finish(f,dry,'undo');
  await json(await f.request('records/contact','POST',{name:'After explicitly undoing the review',email:'another-arrival@stale.example.test'}));
  const refreshed=await json(await f.request('imports/dry-run','POST',source));await finish(f,refreshed);
  for(let i=0;i<3;i++){const id=nativeId(`orbit:hubspot:${source.account}`,'contact',`person-${i}`);assert.equal((await f.records.detail('contact',id)).record.contactability,'do_not_contact');}
  const existing=await f.customer('leo@stale.example.test'),stopped=await f.customer('stopped-import@stale.example.test');
  await json(await f.request(`records/contact/${existing.contactId}`,'PUT',{name:'Leo Visitor',email:existing.email}));
  await json(await f.request(`records/contact/${stopped.contactId}`,'PUT',{name:'Stopped',email:stopped.email,contactability:'do_not_contact'}));
  const headers=['Record ID','First Name','Last Name','Email','Company Name','Phone Number'],csv=[headers.join(','),'new1,Maya,Chen,maya-import@stale.example.test,Brightwork,0412345678','new2,Ari,Park,ari-import@stale.example.test,Brightwork,0498765432',`native,Leo,Park,${existing.email},Unused company,0123`,`stopped,Prior,Stop,${stopped.email},,`].join('\r\n');
  const ordinary={vendor:'hubspot',account:'standard-contact-export',contactability:'confirmed_contactable',files:[{kind:'contact',name:'contacts.csv',csv,mapping:defaultMapping('hubspot','contact',headers),separator:';'}]};
  const standard=await json(await f.request('imports/dry-run','POST',ordinary));assert.equal(standard.counts.rejected,0);assert.equal(standard.rows.find((row:any)=>row.sourceId==='native').status,'linked');assert.equal(standard.rows.find((row:any)=>row.sourceId==='native').recordId,existing.contactId);
  await finish(f,standard);
  const person=await f.db.prepare("SELECT * FROM contacts WHERE email='maya-import@stale.example.test'").first<any>(),colleague=await f.db.prepare("SELECT * FROM contacts WHERE email='ari-import@stale.example.test'").first<any>();
  assert.equal(person.name,'Maya Chen');assert.equal(person.phone,'0412345678');assert.equal(person.contactability,'contactable');assert.ok(person.company_id);assert.equal(person.company_id,colleague.company_id);assert.equal((await f.records.detail('company',person.company_id)).record.name,'Brightwork');
  assert.equal((await f.records.detail('contact',existing.contactId)).record.name,'Leo Visitor');assert.equal((await f.records.detail('contact',stopped.contactId)).record.contactability,'do_not_contact');assert.equal(await f.db.prepare("SELECT id FROM companies WHERE name='Unused company'").first(),null);
  const again=await json(await f.request('imports/dry-run','POST',ordinary));await finish(f,again);assert.equal(await f.db.prepare("SELECT count(*) n FROM companies WHERE name='Brightwork'").first('n'),1);
  await finish(f,again,'undo');await finish(f,standard,'undo');assert.equal(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(person.id).first(),null);assert.equal(await f.db.prepare('SELECT id FROM companies WHERE id=?').bind(person.company_id).first(),null);assert.equal((await f.records.detail('contact',stopped.contactId)).record.contactability,'do_not_contact');

}
