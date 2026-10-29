import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createApp} from './app';
import type {AIProvider} from '../../src/core/features/assistance/provider';
import {createId} from '../../src/core/shared/ids';

/** A connected customer source progresses from unverifiable/unlinked events to scored, cited, reviewed work. */
export async function sourceEvidence(f:any,opportunityId:string,contactId:string,email:string){
 const configured=await (await f.request('sources/evidence','PUT',{name:'Customer evidence',enabled:true})).json() as any;
 const post=async(event:any,signature?:string)=>{const raw=typeof event==='string'?event:JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000));return f.app.request('https://orbit.test/api/v1/signals/evidence',{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':signature??createHmac('sha256',configured.secret).update(timestamp+'.'+raw).digest('hex')},body:raw});};
 const api=async(path:string,body?:unknown,method=body===undefined?'GET':'POST')=>{const response=await f.request(path,method,body);assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;};
 const at=new Date(Date.now()-86400000).toISOString(),event={eventId:createId(),type:'form.submitted',subject:'Customer request',occurredAt:at,email};
 const before=await api(`opportunities/${opportunityId}`);
 assert.equal((await post(event,'invalid')).status,401);assert.equal((await post('x'.repeat(262145))).status,413);
 const parallel=await Promise.all([post(event),post(event)]);assert.deepEqual(parallel.map(r=>r.status),[201,201]);const received=await Promise.all(parallel.map(r=>r.json() as Promise<any>));assert.equal(received[0].id,received[1].id);
 assert.equal((await post({...event,subject:'Changed evidence'})).status,409);
 const linked=await api(`opportunities/${opportunityId}`);assert.ok(linked.opportunity.evaluation.contributions.some((c:any)=>c.signalId===received[0].id));
 assert.equal(await f.db.prepare('SELECT occurred_at FROM signals WHERE id=?').bind(received[0].id).first('occurred_at'),at);
 assert.ok(Number.isFinite(Date.parse(await f.db.prepare('SELECT received_at FROM signals WHERE id=?').bind(received[0].id).first('received_at'))));
 for(const type of ['evidence:customer.custom','email.opened','page.viewed'])assert.equal((await post({...event,eventId:createId(),type,email:undefined})).status,201);
 for(const type of ['foreign:customer.custom','unknown'])assert.equal((await post({...event,eventId:createId(),type})).status,400);
 const unknown={...event,eventId:createId(),type:'meeting.booked',email:undefined};const unlinked=await (await post(unknown)).json() as any;
 assert.equal(unlinked.linked,false);assert.equal((await f.request(`sources/unlinked/${unlinked.id}/link`,'POST',{type:'opportunity',id:opportunityId})).status,200);assert.equal((await f.request(`sources/unlinked/${unlinked.id}/link`,'POST',{type:'opportunity',id:opportunityId})).status,409);
 // A failed linked write has no partial evidence, timeline or scoring effects; replay remains possible.
 const candidate={...event,eventId:createId(),type:'email.replied'};
 await f.db.prepare("CREATE TRIGGER test_reject_evaluation BEFORE INSERT ON evaluations BEGIN SELECT RAISE(ABORT,'fixture persistence failure'); END").run();
 try{assert.equal((await post(candidate)).status,503);}finally{await f.db.prepare('DROP TRIGGER test_reject_evaluation').run();}
 assert.equal(await f.db.prepare('SELECT id FROM signals WHERE source_id=? AND source_event_id=?').bind('evidence',candidate.eventId).first(),null);
 assert.equal((await post(candidate)).status,201);
 const current=(await api(`opportunities/${opportunityId}`)).opportunity;
 const action=current.recommendation??(await f.db.prepare('SELECT * FROM recommendations WHERE opportunity_id=? AND is_current=1').bind(opportunityId).first());assert.ok(action);
 assert.equal((await f.request(`workbench/recommendations/${action.id}/complete`,'POST',{outcome:'completed',note:'Handled personally'})).status,200);
 assert.equal((await api(`opportunities/${opportunityId}`)).opportunity.queueState,'none');
 assert.equal((await post({...event,eventId:createId(),type:'meeting.booked'})).status,201);
 const next=(await f.db.prepare('SELECT id FROM recommendations WHERE opportunity_id=? AND is_current=1').bind(opportunityId).first())!;assert.notEqual(next.id,action.id);
 assert.equal((await f.request(`workbench/recommendations/${action.id}/complete`,'POST',{outcome:'completed'})).status,409,'superseded work cannot be completed again');
 const prior=await api(`opportunities/${opportunityId}`);
 await f.db.prepare("CREATE TRIGGER test_fail_refresh BEFORE INSERT ON evaluations BEGIN SELECT RAISE(ABORT,'test evaluation failed'); END").run();
 try{assert.equal((await f.request(`workbench/opportunities/${opportunityId}/recommendation`,'POST',{})).status,500);}finally{await f.db.prepare('DROP TRIGGER test_fail_refresh').run();}
 const failed=(await api(`opportunities/${opportunityId}`)).opportunity;assert.ok(failed.evaluation.failureAt);assert.deepEqual(failed.evaluation.contributions,prior.opportunity.evaluation.contributions);
 await api(`workbench/opportunities/${opportunityId}/recommendation`,{});assert.equal((await api(`opportunities/${opportunityId}`)).opportunity.evaluation.failureAt,null);
 // No provider remains a working, named and cited recommendation; AI produces only an unsent draft on request.
 assert.equal((await f.request('assistance/generate','POST',{previewId:createId()})).status,503);
 let receivedInput:unknown,calls=0,invalid=false;
 const provider:AIProvider={provider:'paid-edge',model:'draft-model',inputCostPerMillion:1,outputCostPerMillion:2,async generate(input:any){calls++;receivedInput=input;return{output:{explanation:'Follow up on the request.',subject:'Customer request',body:'What would help with your review?',evidenceIds:[invalid?'invented-evidence':input.evidence[0].id]},inputTokens:20,outputTokens:10};}};
 const ai=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},aiProvider:provider});
 const generate=(path:string,body:any)=>ai.request('https://orbit.test/api/v1/assistance/'+path,{method:'POST',headers:{Cookie:`__Host-orbit_session=${f.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify(body)});
 const preview=await (await generate('preview',{opportunityId,contactId,feature:'draft'})).json() as any;
 const mailBefore=await f.db.prepare('SELECT count(*) n FROM outbound_messages').first('n');
 const generated=await generate('generate',{previewId:preview.id});assert.equal(generated.status,200);const draft=await generated.json() as any;assert.ok(draft.draftId);assert.deepEqual(receivedInput,preview.preview);assert.equal((await generate('generate',{previewId:preview.id})).status,409);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM outbound_messages').first('n'),mailBefore);
 const stale=await (await generate('preview',{opportunityId,feature:'draft'})).json() as any;
 const changed=(await api(`records/opportunity/${opportunityId}`)).record;await api(`records/opportunity/${opportunityId}`,{title:'Changed after AI preview',stage_id:changed.stage_id,value_cents:changed.value_cents},'PUT');
 assert.equal((await generate('generate',{previewId:stale.id})).status,409);assert.equal(calls,1);
 invalid=true;const rejected=await (await generate('preview',{opportunityId,feature:'draft'})).json() as any;assert.equal((await generate('generate',{previewId:rejected.id})).status,502);
 const usage=await api('assistance/usage');assert.ok(usage.totals.some((total:any)=>total.inputTokens>0||total.estimatedCost>0));
 // Inferred observations saturate without becoming an observed action or a high-confidence account.
 const inferred=await api('workbench/opportunities',{title:'Inferred-only account',companyName:'Inference customer',contactName:'Inference buyer',email:`${createId().toLowerCase()}@inferred.test`,stageId:changed.stage_id,valueCents:0});
 for(let i=0;i<36;i++)assert.equal((await post({eventId:createId(),type:'email.opened',subject:'Reported open',occurredAt:new Date().toISOString(),record:{type:'opportunity',id:inferred.id},identityBasis:'Authenticated customer identity'})).status,201);
 const inferredDetail=(await api(`opportunities/${inferred.id}`)).opportunity;assert.notEqual(inferredDetail.band,'high');assert.equal(await f.db.prepare('SELECT id FROM recommendations WHERE opportunity_id=? AND is_current=1').bind(inferred.id).first(),null);
 const notifications=await api('notifications'),notice=notifications.notifications.find((n:any)=>n.opportunityId===opportunityId);assert.ok(notice);
 assert.equal((await f.request(`notifications/${notice.id}/read`,'POST',{})).status,200);const read=await api('notifications');assert.ok(read.notifications.find((n:any)=>n.id===notice.id).readAt);
 const other=await api('settings/operators',{email:`${createId().toLowerCase()}@operator.test`,displayName:'Other operator'}),session=await f.db.prepare('SELECT id FROM operators WHERE id=?').bind(other.id).first();assert.ok(session);
 const {testAuth}=await import('./test-auth');const stranger=await testAuth(f.db).createSession(other.id);
 const denied=await f.app.request(`https://orbit.test/api/v1/notifications/${notice.id}/read`,{method:'POST',headers:{Cookie:`__Host-orbit_session=${stranger.token}`,Origin:'https://orbit.test'}});assert.equal(denied.status,404);
 // Imported unassigned work may have no native operator history. A source reply then reaches every active native operator once.
 const orphan=await api('workbench/opportunities',{title:'Imported unassigned account',companyName:'Imported account',contactName:'Imported buyer',email:`${createId().toLowerCase()}@imported.test`,stageId:changed.stage_id,valueCents:0});
 await f.db.prepare('UPDATE opportunities SET owner_id=NULL WHERE id=?').bind(orphan.id).run();
 await f.db.prepare("DELETE FROM timeline_entries WHERE id IN(SELECT timeline_entry_id FROM timeline_entry_records WHERE record_type='opportunity' AND record_id=?)").bind(orphan.id).run();
 await f.db.prepare('DELETE FROM notifications WHERE opportunity_id=?').bind(orphan.id).run();
 const orphanContact=(await api(`opportunities/${orphan.id}`)).opportunity.contacts[0];
 const orphanReply={eventId:createId(),type:'email.replied',subject:'New reply on imported work',occurredAt:new Date().toISOString(),email:orphanContact.email};assert.equal((await post(orphanReply)).status,201);assert.equal((await post(orphanReply)).status,201);
 const ours=(await api('notifications')).notifications.filter((n:any)=>n.opportunityId===orphan.id);assert.equal(ours.length,1);
 const otherInbox=await f.app.request('https://orbit.test/api/v1/notifications',{headers:{Cookie:`__Host-orbit_session=${stranger.token}`}});assert.equal((await otherInbox.json() as any).notifications.filter((n:any)=>n.opportunityId===orphan.id).length,1);
 const audit=await f.db.prepare("SELECT details_json FROM audit_entries WHERE entity_type='notification' AND entity_id=?").bind(ours[0].id).first();assert.equal(JSON.parse(audit.details_json).feature,'notifications');
 assert.ok(before.opportunity,'all evidence work used the original customer');
}
