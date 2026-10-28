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

import {ordinarySuppression} from '../support/customer-sanity-suppression';
test('RECORD-012 DATA-002 INTEGRATE-007 a reviewed contact stop survives aliases, erasure and merges; consented Mailchimp handoff preserves stops and accounts for provider deletion before fresh restore authority',async()=>{

 const f=await launchFixture(),nativeFetch=globalThis.fetch;try{
  await ordinarySuppression(f);
  for(const mode of ['manual','source','provider'] as const){const c=await f.customer(),at=new Date().toISOString();
   if(mode==='manual')await f.workbench.recordEvent(c.opportunityId,{eventId:createId(),type:'email.unsubscribed',subject:'Stop',occurredAt:at,contactId:c.contactId},f.actor);
   if(mode==='source'){const source=createId();await f.db.prepare("INSERT INTO signal_sources(id,name,type,enabled,created_at,updated_at) VALUES(?,'Stop source','signed_webhook',1,?,?)").bind(source,at,at).run();const event={eventId:createId(),type:'email.bounced',permanentBounce:true,subject:'Stop',occurredAt:at,email:c.email};await new IngestionRepository(f.db).ingest(source,event,await payloadHash(JSON.stringify(event)),JSON.stringify(event));}
   if(mode==='provider'){const message=await f.message(c.contactId,c.opportunityId,'accepted');await new ProviderRepository(f.db).event({sg_event_id:createId(),event:'unsubscribe',timestamp:Math.floor(Date.now()/1000),email:c.email,rer_product:'orbit',rer_delivery_id:message.id},'provider-stop');}
   const tokens=await suppressionHashes(f.db,c.email);assert.ok(await f.db.prepare("SELECT id FROM audit_entries WHERE action='contact.suppressed' AND entity_id=?").bind(tokens[0]).first(),mode);
  }
  // INTEGRATE-007: Mailchimp is faked only at its network edge; every Orbit step goes through Orbit's own routes.
  await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
  const api='https://us1.api.mailchimp.com/3.0',members=new Map<string,any>(),calls:{method:string;path:string;body?:any}[]=[],faults=new Map<string,number>(),md5=(email:string)=>createHash('md5').update(email.toLowerCase()).digest('hex');
  globalThis.fetch=async(input,init)=>{const url=String(input);if(!url.startsWith(api+'/'))return nativeFetch(input,init);const method=init?.method??'GET',path=url.slice(api.length).split('?')[0]!,body=init?.body?JSON.parse(String(init.body)):undefined;calls.push({method,path,body});
   if(path==='/ping')return Response.json({health_status:'ok'});
   if(path==='/lists/synthlist1')return Response.json({id:'synthlist1',name:'synthetic-orbit-hk2 audience',web_id:4242});
   if(path==='/lists/synthlist1/merge-fields')return Response.json(method==='POST'?{tag:'ORBITCONS'}:{merge_fields:[{tag:'FNAME'},{tag:'LNAME'},{tag:'PHONE'}]});
   // A permanent delete answers 204 while the member exists and 404 after; a queued fault answers once instead (0: no answer).
   const removed=/^\/lists\/synthlist1\/members\/([a-f0-9]{32})\/actions\/delete-permanent$/.exec(path)?.[1],fault=removed?faults.get(removed):undefined;
   if(removed&&method==='POST'){faults.delete(removed);if(fault===0)throw new TypeError('Paid edge lost the answer');if(fault)return Response.json({title:'Invalid Resource'},{status:fault});return members.delete(removed)?new Response(null,{status:204}):Response.json({title:'Resource Not Found'},{status:404});}
   const hash=/^\/lists\/synthlist1\/members\/([a-f0-9]{32})$/.exec(path)?.[1],member=hash?members.get(hash):undefined;
   if(hash&&method==='PUT'){const next={id:hash,unique_email_id:'u'+hash.slice(0,9),status:body.status??member?.status??body.status_if_new,merge_fields:{...member?.merge_fields,...body.merge_fields}};members.set(hash,next);return Response.json(next);}
   if(hash&&member&&method==='PATCH'){member.status=body.status;return Response.json(member);}
   return member?Response.json(member):Response.json({title:'Resource Not Found'},{status:404});};
  const client=async(db:D1Database,actor:string)=>{
   const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')})}),session=await createDependencies(db).auth.createSession(actor);
   const call=(path:string,method='GET',body?:unknown)=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
   return {app,call,json:async(path:string,method='GET',body?:unknown)=>{const response=await call(path,method,body);assert.equal(response.status,200,await response.clone().text());return response.json() as Promise<any>;}};
  };
  const {app,call,json}=await client(f.db,f.actor);
  const mailchimpState=async(request:typeof call)=>((await(await request('settings/products')).json()) as any).products.find((p:any)=>p.products.includes('Mailchimp')).state;
  await json('settings/mailchimp/connect','POST',{apiKey:'synthetic-orbit-hk2-key-us1'});await json('settings/mailchimp/audience','PUT',{audienceId:'synthlist1'});assert.equal(await mailchimpState(call),'connected');
  const consented=await f.customer('synthetic-orbit-hk2-1@example.test'),unknown=await f.customer('synthetic-orbit-hk2-2@example.test'),stopped=await f.customer('synthetic-orbit-hk2-3@example.test'),later=await f.customer('synthetic-orbit-hk2-4@example.test'),long=await f.customer('synthetic-orbit-hk3-5@example.test'),withdrawn=await f.customer('synthetic-orbit-hk3-6@example.test');
  assert.equal((await f.request(`records/contact/${stopped.contactId}`,'PUT',{name:'Customer',email:stopped.email,contactability:'do_not_contact'})).status,200);
  // ORBITCONS is the recorded source and basis, cut to Mailchimp's 255-character text field.
  const webinar={source:'Webinar sign-up form',basis:'Ticked product news on 21 October'},lengthy={source:'Trade show badge scan at booth 14, '.padEnd(120,'s'),basis:'Asked at the booth for quarterly product news and event invitations; '.padEnd(300,'b')},stated=(consent:{source:string;basis:string})=>`${consent.source}: ${consent.basis}`.slice(0,255);
  for(const c of [consented,stopped,later,withdrawn])await json(`marketing/mailchimp/consents/${c.contactId}`,'POST',{...webinar,confirmed:true});
  await json(`marketing/mailchimp/consents/${long.contactId}`,'POST',{...lengthy,confirmed:true});await json(`marketing/mailchimp/consents/${withdrawn.contactId}/withdraw`,'POST',{confirmed:true});
  for(const attempt of [{...webinar,confirmed:false},{...webinar},{basis:webinar.basis,confirmed:true},{source:webinar.source,confirmed:true}])assert.equal((await call(`marketing/mailchimp/consents/${unknown.contactId}`,'POST',attempt)).status,400,'Consent needs its source, basis and confirmation');
  const preview=await json('marketing/mailchimp/preview?fields=name'),ids=(view:any,group:string)=>view.groups[group].map((item:any)=>item.contactId);
  assert.deepEqual(ids(preview,'subscribed').sort(),[consented.contactId,later.contactId,long.contactId].sort());assert.deepEqual(ids(preview,'unknown'),[unknown.contactId],'A refused consent attempt leaves the contact unknown');
  assert.ok(ids(preview,'stopped').includes(stopped.contactId),'Recorded consent never lifts a do-not-contact stop');assert.ok(ids(preview,'stopped').includes(withdrawn.contactId),'Withdrawn consent is a stop');assert.ok(preview.groups.subscribed.every((item:any)=>item.consent.source&&item.consent.basis),'Each subscribed contact shows its consent source and basis');
  const firstOperation=crypto.randomUUID(),sent=calls.length;assert.equal((await json('marketing/mailchimp/handoffs','POST',{fields:preview.fields,previewDigest:preview.digest,operationId:firstOperation})).counts.sent,3);
  const puts=calls.slice(sent).filter(c=>c.method==='PUT'),consentOf=new Map([[md5(consented.email),stated(webinar)],[md5(later.email),stated(webinar)],[md5(long.email),stated(lengthy)]]);
  assert.deepEqual(puts.map(c=>c.path.split('/').pop()).sort(),[...consentOf.keys()].sort(),'Only the authorized subset is sent');
  for(const put of puts){const memberId=put.path.split('/').pop()!;assert.equal(put.body.status,undefined,'Orbit never sends an overwriting status');assert.equal(put.body.status_if_new,'subscribed');assert.deepEqual(Object.keys(put.body.merge_fields).sort(),['FNAME','LNAME','ORBITCONS'],'Only the selected fields and the consent basis are handed over');
   assert.equal(put.body.merge_fields.ORBITCONS,consentOf.get(memberId),'The consent field carries exactly the recorded source and basis');assert.equal(members.get(memberId).merge_fields.ORBITCONS,consentOf.get(memberId),'Mailchimp stores the recorded consent');}
  assert.ok(!calls.slice(sent).some(c=>c.method!=='GET'&&[unknown.email,stopped.email,withdrawn.email].some(email=>c.path.endsWith(md5(email)))),'Unknown, stopped and withdrawn contacts are never written');
  const again=await json('marketing/mailchimp/preview?fields=name'),quiet=calls.length;assert.deepEqual([again.counts.send,again.counts.unchanged],[0,3]);
  await json('marketing/mailchimp/handoffs','POST',{fields:again.fields,previewDigest:again.digest,operationId:crypto.randomUUID()});assert.equal(calls.length,quiet,'An unchanged re-sync makes no provider request');assert.equal(members.size,3,'No duplicate subscriber');
  const pricing={source:'Pricing call notes',basis:'Asked for the monthly product newsletter on 22 October'};await json(`marketing/mailchimp/consents/${consented.contactId}`,'POST',{...pricing,confirmed:true});
  const changed=await json('marketing/mailchimp/preview?fields=name'),edited=calls.length;await json('marketing/mailchimp/handoffs','POST',{fields:changed.fields,previewDigest:changed.digest,operationId:crypto.randomUUID()});
  assert.deepEqual(calls.slice(edited).filter(c=>c.method==='PUT').map(c=>[c.path.split('/').pop(),c.body.merge_fields.ORBITCONS]),[[md5(consented.email),stated(pricing)]],'A consent change sends exactly one update with the new consent');assert.equal(members.get(md5(consented.email)).merge_fields.ORBITCONS,stated(pricing));
  const hook=new URL((await json('settings/mailchimp')).webhookUrl).pathname;assert.equal((await app.request('https://orbit.test'+hook)).status,200,'Mailchimp’s address check is answered');
  const deliver=(type:string,email:string,firedAt:string,extra:Record<string,string>={})=>app.request('https://orbit.test'+hook,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({type,fired_at:firedAt,'data[list_id]':'synthlist1','data[email]':email,'data[id]':'u'+md5(email).slice(0,9),...extra}).toString()});
  const scheduled=await f.message(later.contactId,later.opportunityId),mailchimpSignals=async()=>(await f.db.prepare("SELECT count(*) AS n FROM signals WHERE source_id='mailchimp'").first<{n:number}>())!.n;
  assert.equal((await deliver('subscribe',later.email,'2026-10-20 09:00:00')).status,200);assert.equal(members.get(md5(later.email)).status,'subscribed','The fake member is still subscribed when the unsubscribe arrives');
  const unsubscribe={'data[action]':'unsub','data[reason]':'manual'},stopAt=calls.length;assert.equal((await deliver('unsubscribe',later.email,'2026-10-21 09:00:00',unsubscribe)).status,200);
  assert.equal((await f.records.detail('contact',later.contactId)).record.contactability,'do_not_contact','A Mailchimp unsubscribe is an Orbit stop');assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'cancelled');
  assert.ok(await f.db.prepare("SELECT 1 FROM signals s JOIN signal_links l ON l.signal_id=s.id WHERE s.source_id='mailchimp' AND s.type='email.unsubscribed' AND l.record_id=?").bind(later.contactId).first(),'The stop keeps Mailchimp as its source');
  // A stop made in Orbit on a subscribed member, and a webhook stop Orbit has not read back, are pushed to Mailchimp on the next sync; later syncs keep them.
  assert.equal((await f.request(`records/contact/${long.contactId}`,'PUT',{name:'Customer',email:long.email,contactability:'do_not_contact'})).status,200);
  const sync=async()=>{const view=await json('marketing/mailchimp/preview?fields=name');assert.ok(ids(view,'stopped').includes(later.contactId)&&ids(view,'stopped').includes(long.contactId),'Both stops stay stops');await json('marketing/mailchimp/handoffs','POST',{fields:view.fields,previewDigest:view.digest,operationId:crypto.randomUUID()});assert.deepEqual([members.get(md5(later.email)).status,members.get(md5(long.email)).status],['unsubscribed','unsubscribed'],'Mailchimp reads both members unsubscribed');};
  const pushed=calls.length;await sync();assert.deepEqual(calls.slice(pushed).filter(c=>c.method==='PATCH').map(c=>[c.path.split('/').pop(),c.body.status]).sort(),[[md5(later.email),'unsubscribed'],[md5(long.email),'unsubscribed']].sort(),'Orbit unsubscribes each stopped member in Mailchimp');
  const received=await mailchimpSignals();assert.equal(((await(await deliver('unsubscribe',later.email,'2026-10-21 09:00:00',unsubscribe)).json()) as any).replayed,true);assert.equal(((await(await deliver('subscribe',later.email,'2026-10-20 09:00:00')).json()) as any).replayed,true,'Replaying the earlier subscription update changes nothing');assert.equal(await mailchimpSignals(),received);
  assert.equal((await deliver('subscribe',later.email,'2026-10-20 10:00:00')).status,200);assert.equal((await f.records.detail('contact',later.contactId)).record.contactability,'do_not_contact','A late subscribe never lifts the stop');
  const replayed=calls.length;assert.equal((await call('marketing/mailchimp/handoffs','POST',{fields:preview.fields,previewDigest:preview.digest,operationId:firstOperation})).status,409);assert.equal(calls.length,replayed,'Replaying Orbit’s earlier handoff makes no provider request');
  await sync();await sync();assert.ok(!calls.slice(stopAt).some(c=>c.method==='PUT'&&c.path.endsWith(md5(later.email))),'A later sync never re-subscribes a stopped person');assert.equal(members.size,3);
  const draft=await f.request(`workbench/opportunities/${later.opportunityId}/drafts`,'POST',{contactId:later.contactId,subject:'Checking in',body:'Reviewed follow-up'});assert.equal(draft.status,409,'One-to-one outreach to the stopped person stays refused');
  const cleanedAt=calls.length;assert.equal((await deliver('cleaned',consented.email,'2026-10-22 09:00:00',{'data[reason]':'hard'})).status,200);assert.equal((await f.records.detail('contact',consented.contactId)).record.contactability,'do_not_contact','A cleaned address is a permanent-bounce stop');
  // DATA-003 through the public door: erasure asks Mailchimp to delete each linked member; the request is tracked apart from the erasure and its outcome is visible.
  const erase=(id:string)=>json(`records/contact/${id}`,'DELETE',{confirmed:true}),removals=(email:string)=>calls.filter(c=>c.method==='POST'&&c.path===`/lists/synthlist1/members/${md5(email)}/actions/delete-permanent`).length,deletions=async(request=json)=>(await request('settings/mailchimp')).deletions as any[];
  const memberIds=async(email:string)=>(await f.db.prepare('SELECT count(*) AS n FROM audit_entries WHERE instr(details_json,?)>0').bind(md5(email)).first<{n:number}>())!.n;assert.ok(await memberIds(consented.email));
  await erase(consented.contactId);assert.equal(removals(consented.email),1,'Erasure asks Mailchimp to permanently delete the member');assert.ok(!members.has(md5(consented.email)),'Mailchimp no longer holds the member');
  assert.equal(await memberIds(consented.email),0,'Contact erasure removes the stored Mailchimp IDs');assert.deepEqual((await deletions()).map(item=>item.state),['deleted'],'The deletion outcome is visible apart from the erasure');
  const untouched=calls.length;await erase(unknown.contactId);await erase(stopped.contactId);assert.equal(calls.length,untouched,'A contact Mailchimp never held makes no deletion request');assert.equal((await deletions()).length,1);
  faults.set(md5(long.email),400);await erase(long.contactId);const refused=(await deletions())[0];assert.deepEqual([refused.state,Boolean(refused.reason),members.has(md5(long.email))],['failed',true,true],'A refused deletion is failed, with its reason');
  await json(`records/contact/${withdrawn.contactId}`,'PUT',{name:'Customer'});assert.equal(removals(long.email),1,'Orbit never repeats a refused deletion on its own');
  await json(`settings/mailchimp/deletions/${refused.id}/retry`,'POST',{});assert.deepEqual([(await deletions())[0].state,removals(long.email),members.has(md5(long.email))],['deleted',2,false],'The owner’s confirmed retry deletes the member');
  faults.set(md5(later.email),0);await erase(later.contactId);const pending=(await deletions())[0];assert.deepEqual([pending.state,members.has(md5(later.email))],['uncertain',true],'No answer leaves the deletion unconfirmed, never deleted');
  const archive=await new TestDataRepository(f.db).export(),target=await launchFixture();try{
   assert.ok(!JSON.stringify(archive).includes('synthetic-orbit-hk2-key-us1')&&!JSON.stringify(archive).includes(hook.split('/').pop()!),'The archive carries no Mailchimp key or webhook token');
   await new TestDataRepository(target.db).restore(archive,target.actor);
   const restored=await new TestDataRepository(target.db).export();assert.equal(await payloadHash(JSON.stringify(restored.tables.privacy_matching_contexts)),await payloadHash(JSON.stringify(archive.tables.privacy_matching_contexts)));assert.deepEqual(restored.tables.audit_entries.filter(row=>row.action==='contact.suppressed'),archive.tables.audit_entries.filter(row=>row.action==='contact.suppressed'));
   const fresh=await createDependencies(target.db).auth.createSession(target.actor);assert.equal(await mailchimpState(path=>target.request(path,'GET',undefined,{Cookie:`__Host-orbit_session=${fresh.token}`})),'unresolved-setup','A restored installation asks to reconnect Mailchimp');
   // A restored pending deletion waits for a reconnect, then for the owner's confirmation, before Orbit sends it.
   await target.db.batch([target.db.prepare('UPDATE operators SET setup_owner=0 WHERE setup_owner=1'),target.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(target.actor)]);const owner=await client(target.db,target.actor),restoredState=async()=>(await deletions(owner.json)).find(item=>item.id===pending.id)?.state;
   assert.equal(await restoredState(),'paused','A restored deletion waits for Mailchimp to be connected again');
   await owner.json('settings/mailchimp/connect','POST',{apiKey:'synthetic-orbit-hk2-key-us1'});await owner.json('settings/mailchimp/audience','PUT',{audienceId:'synthlist1'});
   assert.equal((await owner.call('records/contact','POST',{name:'Restored probe',email:'synthetic-orbit-hk3-7@example.test'})).status,201);assert.deepEqual([await restoredState(),removals(later.email)],['held',1],'A restored deletion is never sent before the owner confirms it');
   await owner.json(`settings/mailchimp/deletions/${pending.id}/retry`,'POST',{});assert.deepEqual([await restoredState(),removals(later.email),members.has(md5(later.email))],['deleted',2,false],'The confirmed restored deletion reaches Mailchimp');
  }finally{await target.dispose();}
  // The source retries its unconfirmed request on the next change; a 404 for a member of an audience Mailchimp still has is a verified deletion.
  const recreated=await call('records/contact','POST',{name:'Recreated',email:`  ${later.email.toUpperCase()} `});assert.equal(recreated.status,201);const reborn=((await recreated.json()) as any).id;
  assert.deepEqual([(await deletions()).find(item=>item.id===pending.id)?.state,removals(later.email)],['deleted',3],'Orbit’s processor retries the unconfirmed deletion');
  // Anonymous suppression re-applies the stop to the re-created address: consent is recorded, yet no subscribing write reaches Mailchimp.
  assert.equal((await f.records.detail('contact',reborn)).record.contactability,'do_not_contact');await json(`marketing/mailchimp/consents/${reborn}`,'POST',{...webinar,confirmed:true});
  const suppressed=await json('marketing/mailchimp/preview?fields=name');assert.ok(ids(suppressed,'stopped').includes(reborn));await json('marketing/mailchimp/handoffs','POST',{fields:suppressed.fields,previewDigest:suppressed.digest,operationId:crypto.randomUUID()});
  for(const [email,from] of [[unknown.email,0],[stopped.email,0],[withdrawn.email,0],[later.email,stopAt],[long.email,pushed],[consented.email,cleanedAt]] as const)assert.ok(!calls.slice(from).some(c=>c.path.endsWith(md5(email))&&(c.method==='PUT'||c.body?.status==='subscribed')),'Unknown, stopped, withdrawn, unsubscribed, cleaned and suppressed addresses never get a subscribing write');
  await json('settings/mailchimp/disconnect','POST',{});assert.equal(await mailchimpState(call),'unresolved-setup');
  assert.equal((await deliver('unsubscribe',unknown.email,'2026-10-23 09:00:00',unsubscribe)).status,404,'Disconnecting stops every ingest');assert.equal((await call('marketing/mailchimp/preview?fields=name')).status,409,'and every sync');
 }finally{globalThis.fetch=nativeFetch;await f.dispose();}

});
