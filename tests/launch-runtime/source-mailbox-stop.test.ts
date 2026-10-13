import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHmac, randomBytes } from 'node:crypto';
import { isolatedDatabase } from '../support/isolated-database';
import { emittedMailWorker } from '../support/emitted-mail-worker';
import { createDependencies } from '../support/dependencies';
import { createId } from '../../src/core/shared/ids';
import { RecordsRepository } from '../../src/core/features/records/repository';
import { OutreachRepository } from '../../src/core/features/workbench/outreach-repository';
import { ApprovalRepository } from '../../src/core/features/outreach/approval-repository';
import { suppressionHashes } from '../../src/core/features/records/suppression';
import type { SignalEvent } from '../../src/core/features/ingestion/contracts';

test('emitted Worker: authenticated configured-source opportunity stops suppress native mailboxes atomically with truthful links and exact replay',async()=>{
 const fixture=await isolatedDatabase(),source=createId(),actor=createId(),stage=createId();
 const worker=await emittedMailWorker(fixture.directory,{ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')});
 try{
  const deps=createDependencies(fixture.db);await deps.auth.ensureOperator({id:actor,email:'source-runtime@operator.test',displayName:'Source runtime operator'});
  await deps.workspace.ensureWorkspace({name:'Source runtime',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});await deps.workspace.ensurePipelineStage({id:stage,name:'Qualified',position:0});
  const session=await deps.auth.createSession(actor),headers={Cookie:`__Host-orbit_session=${session.token}`,Origin:worker.origin,'Content-Type':'application/json'};
  const cases:Array<{contactId:string;opportunityId:string;draftId:string;messageId:string;event:SignalEvent;signalId?:string}>=[];
  for(const type of ['email.unsubscribed','email.bounced'])for(const shape of ['opportunity','email-only','contact-only'] as const){
   const records=new RecordsRepository(fixture.db),email=`${createId()}@customer.test`,contact=await records.save('contact',{name:'Source runtime contact',email},actor),opportunity=await records.save('opportunity',{title:'Source runtime opportunity',stage_id:stage,value_cents:0,contact_ids:[contact.id],primary_contact_id:contact.id},actor);
   const draft=await new OutreachRepository(fixture.db).createDraft(opportunity.id,{contactId:contact.id,subject:'Runtime reviewed subject',body:'Runtime reviewed body'},actor),message=await new ApprovalRepository(fixture.db).approve(draft.id,1,actor,{now:new Date('2030-01-07T09:00:00Z'),scheduledAt:'2030-01-07T10:00:00Z'});
   cases.push({contactId:contact.id,opportunityId:opportunity.id,draftId:draft.id,messageId:message.id,event:{eventId:createId(),type,subject:'Source stop',occurredAt:new Date().toISOString(),...(type==='email.bounced'?{permanentBounce:true}:{}),...(shape==='contact-only'?{record:{type:'contact',id:contact.id}}:{email:email.toUpperCase(),...(shape==='opportunity'?{record:{type:'opportunity',id:opportunity.id}}:{})})}});
  }
  await fixture.close();await worker.start();
  const configure=()=>fetch(`${worker.origin}/api/v1/sources/${source}`,{method:'PUT',headers,body:JSON.stringify({name:'Runtime configured source',enabled:true})});
  assert.equal((await fetch(`${worker.origin}/api/v1/sources/${source}`,{method:'PUT',headers:{Origin:worker.origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Runtime configured source',enabled:true})})).status,401);
  // Orbit generates the signing secret and shows it once in the configuration response.
  const configured=await configure();assert.equal(configured.status,200);const secret=(await configured.json() as {secret:string}).secret;assert.match(secret,/^[a-f0-9]{64}$/);
  const send=(event:SignalEvent,valid=true)=>{const body=JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000));return fetch(`${worker.origin}/api/v1/signals/${source}`,{method:'POST',headers:{'Content-Type':'application/json','X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':valid?createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex'):'invalid'},body});};
  assert.equal((await send(cases[0]!.event,false)).status,401);
  assert.equal((await send({...cases[0]!.event,email:'invalid mailbox'})).status,400);
  assert.equal((await send({...cases[0]!.event,eventId:createId(),record:{type:'contact',id:cases[1]!.contactId}})).status,409);
  for(const row of cases){
   const accepted=await send(row.event);assert.equal(accepted.status,201);row.signalId=(await accepted.json() as {id:string}).id;
   const replay=await send(row.event);assert.equal(replay.status,201);assert.deepEqual(await replay.json(),{id:row.signalId,replayed:true});
   const detail=await fetch(`${worker.origin}/api/v1/records/contact/${row.contactId}`,{headers});assert.equal(detail.status,200);assert.equal((await detail.json() as any).record.contactability,'do_not_contact');
   const messages=await fetch(`${worker.origin}/api/v1/workbench/opportunities/${row.opportunityId}/messages`,{headers});assert.equal(messages.status,200);assert.equal((await messages.json() as any).messages.find((message:any)=>message.id===row.messageId).state,'cancelled');
  }
  assert.equal((await send({...cases[0]!.event,subject:'Conflicting source event'})).status,409);
  await worker.stop();await fixture.reopen();
  for(const row of cases){
   assert.equal((await fixture.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(row.draftId).first())!.is_stale,1);
   assert.equal((await fixture.db.prepare('SELECT payload_json FROM signals WHERE id=?').bind(row.signalId).first())!.payload_json,JSON.stringify(row.event));
   if(row.event.record?.type==='opportunity')assert.deepEqual((await fixture.db.prepare('SELECT record_type,record_id FROM signal_links WHERE signal_id=?').bind(row.signalId).all()).results,[{record_type:'opportunity',record_id:row.opportunityId}]);
   if(row.event.email){const tokens=await suppressionHashes(fixture.db,row.event.email);assert.equal((await fixture.db.prepare("SELECT count(*) AS n FROM audit_entries WHERE action='contact.suppressed' AND entity_id=? AND actor_id IS NULL AND details_json='{}'").bind(tokens[0]).first())!.n,1);}
  }
  // A real SQLite failure after private proof insertion must roll back the event.
  const rollback={...cases[0]!.event,eventId:createId()};
  await fixture.db.prepare("CREATE TRIGGER refuse_runtime_stop BEFORE UPDATE OF contactability ON contacts WHEN NEW.contactability='do_not_contact' BEGIN SELECT RAISE(ABORT,'Runtime stop failure'); END").run();
  await fixture.close();await worker.start();assert.equal((await send(rollback)).status,503);await worker.stop();await fixture.reopen();
  assert.equal((await fixture.db.prepare('SELECT count(*) AS n FROM signals WHERE source_id=? AND source_event_id=?').bind(source,rollback.eventId).first())!.n,0);
  await fixture.db.prepare('DROP TRIGGER refuse_runtime_stop').run();await fixture.close();await worker.start();assert.equal((await send(rollback)).status,201);
 }finally{await worker.stop();await fixture.dispose();}
});
