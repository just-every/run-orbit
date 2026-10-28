import assert from 'node:assert/strict';
import {createDependencies} from './dependencies';
import {createId} from '../../src/core/shared/ids';
import {createSourceSecurity,payloadHash} from '../../src/core/platform/source-security';
import {createSignalIngress} from '../../src/core/features/ingestion/routes';
import {IngestionRepository} from '../../src/core/features/ingestion/repository';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import type {SalesMailJourney} from './sales-sanity-mail-workspace';
export async function ingestCustomerEvidence({db,context,fixture,customer,sign}:SalesMailJourney){
 const f=await customer(),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'11'.repeat(32)})!,repository=new IngestionRepository(db),source=createId(),secret='source-secret-'.repeat(4);await repository.configure({id:source,name:'Source',enabled:true,secret},security);const app=createSignalIngress(db,security),timestamp=String(Math.floor(Date.now()/1000));
 const event={eventId:createId(),type:'email.replied',subject:'Reply',occurredAt:f.at,email:f.email};const raw=JSON.stringify(event),signature=await sign(secret,raw,timestamp);
 const request=(body=raw,sig=signature)=>app.request(`https://orbit.test/${source}`,{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':sig},body});
 assert.equal((await request(raw,'invalid')).status,401);assert.equal((await request('x'.repeat(262145))).status,413);
 const results=await Promise.all([request(),request()]);assert.deepEqual(results.map(r=>r.status),[201,201]);const ids=await Promise.all(results.map(r=>r.json() as Promise<{id:string}>));assert.equal(ids[0]!.id,ids[1]!.id);
 const changed=JSON.stringify({...event,subject:'Different'});assert.equal((await request(changed,await sign(secret,changed,timestamp))).status,409);
 const signal=await db.prepare('SELECT COUNT(*) AS n FROM signals WHERE source_id=?').bind(source).first<{n:number}>();assert.equal(signal?.n,1);
 const score=await db.prepare('SELECT score FROM opportunities WHERE id=?').bind(f.opportunityId).first<{score:number}>();assert.ok(score!.score>0);
 const tracking={...event,eventId:createId(),type:'page.viewed'};await repository.ingest(source,tracking,await payloadHash(JSON.stringify(tracking)),JSON.stringify(tracking));const unlinked=await repository.unlinked();assert.ok(unlinked.some(row=>row.type==='page.viewed'));
 const diagnostics=await repository.sources();assert.equal(diagnostics.find(row=>row.id===source)?.rejected_count,1);
}
export async function reviewUnlinkedEvidence({db,fixture,sign,request,json}:SalesMailJourney){
 const f=await fixture(),repository=new IngestionRepository(db),source=createId(),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'22'.repeat(32)})!;await repository.configure({id:source,name:'Review source',secret:'s'.repeat(40),enabled:true},security);
 const event={eventId:createId(),type:'meeting.booked',subject:'Late customer meeting',occurredAt:new Date(Date.now()-86400000).toISOString()};const raw=JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000)),ingress=createSignalIngress(db,security),deliver=async(body:string)=>ingress.request(`https://orbit.test/${source}`,{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':await sign('s'.repeat(40),body,timestamp)},body}),accepted=await deliver(raw);assert.equal(accepted.status,201);const signal=await accepted.json() as {id:string};const prior=await db.prepare('SELECT score FROM opportunities WHERE id=?').bind(f.opportunityId).first<{score:number}>();assert.equal(prior?.score,0);
 await json(f,`sources/unlinked/${signal.id}/link`,'POST',{type:'opportunity',id:f.opportunityId});assert.ok((await request(f,`sources/unlinked/${signal.id}/link`,'POST',{type:'opportunity',id:f.opportunityId})).status>=400);
 const entry=await db.prepare('SELECT occurred_at FROM timeline_entries WHERE id=?').bind(signal.id).first<{occurred_at:string}>();assert.equal(entry?.occurred_at,event.occurredAt);
 const candidate={...event,eventId:createId(),record:{type:'opportunity' as const,id:f.opportunityId}};const candidateRaw=JSON.stringify(candidate);
 await db.prepare("CREATE TRIGGER test_reject_evaluation BEFORE INSERT ON evaluations BEGIN SELECT RAISE(ABORT,'fixture persistence failure'); END").run();
 try{assert.ok((await deliver(candidateRaw)).status>=400);}finally{await db.prepare('DROP TRIGGER test_reject_evaluation').run();}
 const absent=await db.prepare('SELECT id FROM signals WHERE source_id=? AND source_event_id=?').bind(source,candidate.eventId).first();assert.equal(absent,null);
}
export async function distinguishInferredEvidence({db,context,fixture,sign}:SalesMailJourney){
 const {standardTypes}=await import('../../src/core/features/ingestion/contracts');const f=await fixture(),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'33'.repeat(32)})!,repository=new IngestionRepository(db),source=createId(),secret='test-signal-types-'.repeat(3);await repository.configure({id:source,name:'Typed source',secret,enabled:true},security);const app=createSignalIngress(db,security),timestamp=String(Math.floor(Date.now()/1000));
 async function post(type:string,linked=false){const event={eventId:createId(),type,subject:type,occurredAt:f.at,...(linked?{record:{type:'opportunity',id:f.opportunityId},identityBasis:'Authenticated customer identity'}:{})};const raw=JSON.stringify(event);return app.request(`https://orbit.test/${source}`,{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':await sign(secret,raw,timestamp)},body:raw});}
 for(const type of standardTypes)assert.equal((await post(type)).status,201,type);
 assert.equal((await post(`${source}:customer.custom`)).status,201);assert.equal((await post('other:customer.custom')).status,400);assert.equal((await post('unknown')).status,400);
 const deliberate=['form.submitted','email.replied','meeting.booked','meeting.completed','content.downloaded','chat.started'];for(const type of deliberate){const row=await db.prepare('SELECT confidence FROM signals WHERE source_id=? AND type=?').bind(source,type).first<{confidence:string}>();assert.equal(row?.confidence,'observed');}
 for(let i=0;i<36;i++)assert.equal((await post('email.opened',true)).status,201);
 const state=await db.prepare('SELECT score,band FROM opportunities WHERE id=?').bind(f.opportunityId).first<{score:number;band:string}>();assert.equal(state?.band,'medium');assert.equal(await db.prepare('SELECT id FROM recommendations WHERE opportunity_id=? AND is_current=1').bind(f.opportunityId).first(),null);
 const count=await db.prepare('SELECT COUNT(*) AS n FROM opportunities WHERE id=?').bind(f.opportunityId).first<{n:number}>();assert.equal(count?.n,1);
}
export async function finishRecommendation({customer,json}:SalesMailJourney){
 const f=await customer();
 const before=(await json(f,`opportunities/${f.opportunityId}`)).opportunity,current=before.recommendation;assert.ok(current);
 await json(f,`workbench/recommendations/${current.id}/complete`,'POST',{outcome:'completed',note:'Handled personally'});
 const done=(await json(f,`opportunities/${f.opportunityId}`)).opportunity;assert.equal(done.queueState,'none');
 await json(f,`workbench/opportunities/${f.opportunityId}/events`,'POST',{type:'meeting.booked',subject:'Customer requests another review',occurredAt:new Date().toISOString(),eventId:createId()});
 const next=(await json(f,`opportunities/${f.opportunityId}`)).opportunity.recommendation;assert.ok(next);assert.notEqual(next.id,current.id);
}
export async function refreshReadableEvidence({db,customer,request,json}:SalesMailJourney){
 const f=await customer(),before=(await json(f,`opportunities/${f.opportunityId}`)).opportunity;
 await db.prepare("CREATE TRIGGER test_fail_refresh BEFORE INSERT ON evaluations BEGIN SELECT RAISE(ABORT,'test evaluation failed'); END").run();
 try{assert.ok((await request(f,`workbench/opportunities/${f.opportunityId}/recommendation`,'POST',{})).status>=400);}finally{await db.prepare('DROP TRIGGER test_fail_refresh').run();}
 const failed=(await json(f,`opportunities/${f.opportunityId}`)).opportunity;assert.ok(failed.evaluation.failureAt);assert.equal(failed.evaluation.id,before.evaluation.id);assert.deepEqual(failed.evaluation.contributions,before.evaluation.contributions);
 await json(f,`workbench/opportunities/${f.opportunityId}/recommendation`,'POST',{});
 const refreshed=(await json(f,`opportunities/${f.opportunityId}`)).opportunity;assert.equal(refreshed.evaluation.failureAt,null);assert.notEqual(refreshed.evaluation.id,before.evaluation.id);
}
