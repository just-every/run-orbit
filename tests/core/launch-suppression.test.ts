import {reviewedMerge} from '../support/reviewed-merge';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {RecordsRepository} from '../../src/core/features/records/repository';
import {ImportMergeRepository} from '../../src/core/features/records/import-merge';
import {TestDataRepository} from '../support/record-data';
import {ProviderRepository} from '../../src/core/features/outreach/provider-repository';
import {IngestionRepository} from '../../src/core/features/ingestion/repository';
import {suppressionHashes} from '../../src/core/features/records/suppression';
import {payloadHash} from '../../src/core/platform/source-security';
import {createId} from '../../src/core/shared/ids';
import {createHash,randomBytes} from 'node:crypto';
import {createApp} from '../support/app';
import {createDependencies} from '../support/dependencies';
import {createSourceSecurity} from '../../src/core/platform/source-security';

test('RECORD-012 DATA-002 launch suppression survives ordinary edits, erasure, normalized recreation, and workbench creation; only reviewed native clear permits future review',async()=>{
 const f=await launchFixture();try{
  const c=await f.customer('Suppressed@Customer.test'),scheduled=await f.message(c.contactId,c.opportunityId);
  const stop=await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Stopped',email:c.email,contactability:'do_not_contact'});assert.equal(stop.status,200);
  assert.equal((await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Renamed'})).status,200);
  let row=(await f.records.detail('contact',c.contactId)).record;assert.equal(row.contactability,'do_not_contact');assert.equal(row.email,'suppressed@customer.test');
  assert.equal((await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Ordinary clear',contactability:'contactable'})).status,409);
  const oldEmail=row.email;assert.equal((await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Changed address',email:'replacement@customer.test'})).status,200);
  assert.equal((await f.records.detail('contact',c.contactId)).record.contactability,'do_not_contact');
  await new TestDataRepository(f.db).remove('contact',c.contactId,f.actor);
  const exported=await new TestDataRepository(f.db).export(),serialized=JSON.stringify(exported);
  assert.ok(!serialized.includes(oldEmail));assert.ok(!serialized.includes('replacement@customer.test'));assert.ok(!serialized.includes('Reviewed body'));
  const proofs=exported.tables.audit_entries.filter(row=>row.action==='contact.suppressed');assert.ok(proofs.length>=2);for(const token of proofs){assert.equal(token.actor_id,null);assert.equal(token.details_json,'{}');assert.match(token.entity_id,/^[a-f0-9]{32}:[a-f0-9]{64}$/);}
  const recreated=await f.records.save('contact',{name:'Recreated',email:'  SUPPRESSED@CUSTOMER.TEST '},f.actor);assert.equal((await f.records.detail('contact',recreated.id)).record.contactability,'do_not_contact');
  await new TestDataRepository(f.db).remove('contact',recreated.id,f.actor);
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
 }finally{await f.dispose();}
});

test('RECORD-012 concurrent stop dominates stale edit; merge preserves both recipients and clear never resurrects a schedule',async()=>{
 const f=await launchFixture();try{
  const a=await f.customer(),b=await f.customer(),scheduled=await f.message(a.contactId,a.opportunityId);
  let intervened=false;const raced=new Proxy(f.db,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{if(!intervened){intervened=true;await target.prepare("UPDATE contacts SET contactability='do_not_contact' WHERE id=?").bind(a.contactId).run();}return target.batch(statements);};const value=(target as any)[key];return typeof value==='function'?value.bind(target):value;}});
  await new RecordsRepository(raced).save('contact',{name:'Stale name',contactability:'contactable'},f.actor,a.contactId,{ordinaryEdit:true});
  assert.equal((await f.records.detail('contact',a.contactId)).record.contactability,'do_not_contact');assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'cancelled');
  await reviewedMerge(new ImportMergeRepository(f.db),'contact',b.contactId,a.contactId,{name:'survivor',email:'survivor',contactability:'survivor'},f.actor);
  const merged=(await f.records.detail('contact',b.contactId)).record;assert.equal(merged.contactability,'do_not_contact');
  assert.equal((await f.request(`records/contact/${b.contactId}/clear-do-not-contact`,'POST',{confirmed:true,email:merged.email,updatedAt:merged.updated_at,revision:merged.contactability_revision})).status,200);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'cancelled');
 }finally{await f.dispose();}
});

test('INTEGRATE-007 Mailchimp receives only consented contacts, its unsubscribes stop Orbit outreach and no replay re-subscribes; RECORD-012 DATA-001 manual, source and provider stops preserve anonymous suppression through export and restore',async()=>{
 const f=await launchFixture(),nativeFetch=globalThis.fetch;try{
  for(const mode of ['manual','source','provider'] as const){const c=await f.customer(),at=new Date().toISOString();
   if(mode==='manual')await f.workbench.recordEvent(c.opportunityId,{eventId:createId(),type:'email.unsubscribed',subject:'Stop',occurredAt:at,contactId:c.contactId},f.actor);
   if(mode==='source'){const source=createId();await f.db.prepare("INSERT INTO signal_sources(id,name,type,enabled,created_at,updated_at) VALUES(?,'Stop source','signed_webhook',1,?,?)").bind(source,at,at).run();const event={eventId:createId(),type:'email.bounced',permanentBounce:true,subject:'Stop',occurredAt:at,email:c.email};await new IngestionRepository(f.db).ingest(source,event,await payloadHash(JSON.stringify(event)),JSON.stringify(event));}
   if(mode==='provider'){const message=await f.message(c.contactId,c.opportunityId,'accepted');await new ProviderRepository(f.db).event({sg_event_id:createId(),event:'unsubscribe',timestamp:Math.floor(Date.now()/1000),email:c.email,rer_product:'orbit',rer_delivery_id:message.id},'provider-stop');}
   const tokens=await suppressionHashes(f.db,c.email);assert.ok(await f.db.prepare("SELECT id FROM audit_entries WHERE action='contact.suppressed' AND entity_id=?").bind(tokens[0]).first(),mode);
  }
  // INTEGRATE-007: Mailchimp is faked only at its network edge; every Orbit step goes through Orbit's own routes.
  await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
  const api='https://us1.api.mailchimp.com/3.0',members=new Map<string,any>(),calls:{method:string;path:string;body?:any}[]=[],md5=(email:string)=>createHash('md5').update(email.toLowerCase()).digest('hex');
  globalThis.fetch=async(input,init)=>{const url=String(input);if(!url.startsWith(api+'/'))return nativeFetch(input,init);const method=init?.method??'GET',path=url.slice(api.length).split('?')[0]!,body=init?.body?JSON.parse(String(init.body)):undefined;calls.push({method,path,body});
   if(path==='/ping')return Response.json({health_status:'ok'});
   if(path==='/lists/synthlist1')return Response.json({id:'synthlist1',name:'synthetic-orbit-hk2 audience',web_id:4242});
   if(path==='/lists/synthlist1/merge-fields')return Response.json(method==='POST'?{tag:'ORBITCONS'}:{merge_fields:[{tag:'FNAME'},{tag:'LNAME'},{tag:'PHONE'}]});
   const hash=/^\/lists\/synthlist1\/members\/([a-f0-9]{32})$/.exec(path)?.[1],member=hash?members.get(hash):undefined;
   if(hash&&method==='PUT'){const next={id:hash,unique_email_id:'u'+hash.slice(0,9),status:body.status??member?.status??body.status_if_new,merge_fields:{...member?.merge_fields,...body.merge_fields}};members.set(hash,next);return Response.json(next);}
   if(hash&&member&&method==='PATCH'){member.status=body.status;return Response.json(member);}
   return member?Response.json(member):Response.json({title:'Resource Not Found'},{status:404});};
  const app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')})}),session=await createDependencies(f.db).auth.createSession(f.actor);
  const call=(path:string,method='GET',body?:unknown)=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const json=async(path:string,method='GET',body?:unknown)=>{const response=await call(path,method,body);assert.equal(response.status,200,await response.clone().text());return response.json() as Promise<any>;};
  const mailchimpState=async(request:typeof call)=>((await(await request('settings/products')).json()) as any).products.find((p:any)=>p.products.includes('Mailchimp')).state;
  await json('settings/mailchimp/connect','POST',{apiKey:'synthetic-orbit-hk2-key-us1'});await json('settings/mailchimp/audience','PUT',{audienceId:'synthlist1'});assert.equal(await mailchimpState(call),'connected');
  const consented=await f.customer('synthetic-orbit-hk2-1@example.test'),unknown=await f.customer('synthetic-orbit-hk2-2@example.test'),stopped=await f.customer('synthetic-orbit-hk2-3@example.test'),later=await f.customer('synthetic-orbit-hk2-4@example.test');
  assert.equal((await f.request(`records/contact/${stopped.contactId}`,'PUT',{name:'Customer',email:stopped.email,contactability:'do_not_contact'})).status,200);
  for(const c of [consented,stopped,later])await json(`marketing/mailchimp/consents/${c.contactId}`,'POST',{source:'Webinar sign-up form',basis:'Ticked product news on 21 October',confirmed:true});
  const preview=await json('marketing/mailchimp/preview?fields=name'),ids=(view:any,group:string)=>view.groups[group].map((item:any)=>item.contactId);
  assert.deepEqual(ids(preview,'subscribed').sort(),[consented.contactId,later.contactId].sort());assert.deepEqual(ids(preview,'unknown'),[unknown.contactId]);
  assert.ok(ids(preview,'stopped').includes(stopped.contactId),'Recorded consent never lifts a do-not-contact stop');assert.ok(preview.groups.subscribed.every((item:any)=>item.consent.source&&item.consent.basis),'Each subscribed contact shows its consent source and basis');
  const firstOperation=crypto.randomUUID(),sent=calls.length;assert.equal((await json('marketing/mailchimp/handoffs','POST',{fields:preview.fields,previewDigest:preview.digest,operationId:firstOperation})).counts.sent,2);
  const puts=calls.slice(sent).filter(c=>c.method==='PUT');assert.deepEqual(puts.map(c=>c.path.split('/').pop()).sort(),[md5(consented.email),md5(later.email)].sort(),'Only the authorized subset is sent');
  for(const put of puts){assert.equal(put.body.status,undefined,'Orbit never sends an overwriting status');assert.equal(put.body.status_if_new,'subscribed');assert.deepEqual(Object.keys(put.body.merge_fields).sort(),['FNAME','LNAME','ORBITCONS'],'Only the selected fields and the consent basis are handed over');}
  assert.ok(!calls.slice(sent).some(c=>c.method!=='GET'&&[unknown.email,stopped.email].some(email=>c.path.endsWith(md5(email)))),'Unknown and stopped contacts are never written');
  const again=await json('marketing/mailchimp/preview?fields=name'),quiet=calls.length;assert.deepEqual([again.counts.send,again.counts.unchanged],[0,2]);
  await json('marketing/mailchimp/handoffs','POST',{fields:again.fields,previewDigest:again.digest,operationId:crypto.randomUUID()});assert.equal(calls.length,quiet,'An unchanged re-sync makes no provider request');assert.equal(members.size,2,'No duplicate subscriber');
  const hook=new URL((await json('settings/mailchimp')).webhookUrl).pathname;assert.equal((await app.request('https://orbit.test'+hook)).status,200,'Mailchimp’s address check is answered');
  const deliver=(type:string,email:string,firedAt:string,extra:Record<string,string>={})=>app.request('https://orbit.test'+hook,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({type,fired_at:firedAt,'data[list_id]':'synthlist1','data[email]':email,'data[id]':'u'+md5(email).slice(0,9),...extra}).toString()});
  const scheduled=await f.message(later.contactId,later.opportunityId),mailchimpSignals=async()=>(await f.db.prepare("SELECT count(*) AS n FROM signals WHERE source_id='mailchimp'").first<{n:number}>())!.n;
  assert.equal((await deliver('subscribe',later.email,'2026-10-20 09:00:00')).status,200);members.get(md5(later.email)).status='unsubscribed';
  const unsubscribe={'data[action]':'unsub','data[reason]':'manual'};assert.equal((await deliver('unsubscribe',later.email,'2026-10-21 09:00:00',unsubscribe)).status,200);
  assert.equal((await f.records.detail('contact',later.contactId)).record.contactability,'do_not_contact','A Mailchimp unsubscribe is an Orbit stop');assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'cancelled');
  assert.ok(await f.db.prepare("SELECT 1 FROM signals s JOIN signal_links l ON l.signal_id=s.id WHERE s.source_id='mailchimp' AND s.type='email.unsubscribed' AND l.record_id=?").bind(later.contactId).first(),'The stop keeps Mailchimp as its source');
  const received=await mailchimpSignals();assert.equal(((await(await deliver('unsubscribe',later.email,'2026-10-21 09:00:00',unsubscribe)).json()) as any).replayed,true);assert.equal(((await(await deliver('subscribe',later.email,'2026-10-20 09:00:00')).json()) as any).replayed,true,'Replaying the earlier subscription update changes nothing');assert.equal(await mailchimpSignals(),received);
  assert.equal((await deliver('subscribe',later.email,'2026-10-20 10:00:00')).status,200);assert.equal((await f.records.detail('contact',later.contactId)).record.contactability,'do_not_contact','A late subscribe never lifts the stop');
  const replayed=calls.length;assert.equal((await call('marketing/mailchimp/handoffs','POST',{fields:preview.fields,previewDigest:preview.digest,operationId:firstOperation})).status,409);assert.equal(calls.length,replayed,'Replaying Orbit’s earlier handoff makes no provider request');
  const after=await json('marketing/mailchimp/preview?fields=name'),resync=calls.length;assert.ok(ids(after,'stopped').includes(later.contactId));await json('marketing/mailchimp/handoffs','POST',{fields:after.fields,previewDigest:after.digest,operationId:crypto.randomUUID()});
  assert.ok(!calls.slice(resync).some(c=>c.method==='PUT'&&c.path.endsWith(md5(later.email))),'A later sync never re-subscribes a stopped person');assert.equal(members.get(md5(later.email)).status,'unsubscribed');assert.equal(members.size,2);
  const draft=await f.request(`workbench/opportunities/${later.opportunityId}/drafts`,'POST',{contactId:later.contactId,subject:'Checking in',body:'Reviewed follow-up'});assert.equal(draft.status,409,'One-to-one outreach to the stopped person stays refused');
  assert.equal((await deliver('cleaned',consented.email,'2026-10-22 09:00:00',{'data[reason]':'hard'})).status,200);assert.equal((await f.records.detail('contact',consented.contactId)).record.contactability,'do_not_contact','A cleaned address is a permanent-bounce stop');
  const memberIds=async(email:string)=>(await f.db.prepare('SELECT count(*) AS n FROM audit_entries WHERE instr(details_json,?)>0').bind(md5(email)).first<{n:number}>())!.n;assert.ok(await memberIds(consented.email));
  await new TestDataRepository(f.db).remove('contact',consented.contactId,f.actor);assert.equal(await memberIds(consented.email),0,'Contact erasure removes the stored Mailchimp IDs');
  const archive=await new TestDataRepository(f.db).export(),target=await launchFixture();try{
   assert.ok(!JSON.stringify(archive).includes('synthetic-orbit-hk2-key-us1')&&!JSON.stringify(archive).includes(hook.split('/').pop()!),'The archive carries no Mailchimp key or webhook token');
   await new TestDataRepository(target.db).restore(archive,target.actor);
   const restored=await new TestDataRepository(target.db).export();assert.equal(await payloadHash(JSON.stringify(restored.tables.privacy_matching_contexts)),await payloadHash(JSON.stringify(archive.tables.privacy_matching_contexts)));assert.deepEqual(restored.tables.audit_entries.filter(row=>row.action==='contact.suppressed'),archive.tables.audit_entries.filter(row=>row.action==='contact.suppressed'));
   const fresh=await createDependencies(target.db).auth.createSession(target.actor);assert.equal(await mailchimpState(path=>target.request(path,'GET',undefined,{Cookie:`__Host-orbit_session=${fresh.token}`})),'unresolved-setup','A restored installation asks to reconnect Mailchimp');
  }finally{await target.dispose();}
  await json('settings/mailchimp/disconnect','POST',{});assert.equal(await mailchimpState(call),'unresolved-setup');
  assert.equal((await deliver('unsubscribe',unknown.email,'2026-10-23 09:00:00',unsubscribe)).status,404,'Disconnecting stops every ingest');assert.equal((await call('marketing/mailchimp/preview?fields=name')).status,409,'and every sync');
 }finally{globalThis.fetch=nativeFetch;await f.dispose();}
});
