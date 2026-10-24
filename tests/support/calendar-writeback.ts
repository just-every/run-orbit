import assert from 'node:assert/strict';
import {providerFixture} from './capture-provider-fixture';
import {writeScopes,type Provider} from '../../src/core/features/capture/providers/config';
import {createId} from '../../src/core/shared/ids';
/** Exact reviewed invitations go through native HTTP; only Google/Graph's network edge is synthetic. */
export async function calendarWritebackProof(provider:Provider){const f=await providerFixture(provider);try{
 let source=await f.connect();const scope={calendars:['calendar'],calendarWindow:{start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'}};assert.equal((await f.request(`/sources/${source}/scope`,scope)).status,200);
 const meeting={title:'Synthetic Orbit planning',message:'Review the rollout with Ana.',start:'2026-11-01T15:00:00.000Z',end:'2026-11-01T15:30:00.000Z',attendees:['ana@acme.example']};
 const input=()=>({sourceId:source,calendarId:'calendar',recordType:'opportunity',recordId:f.opportunity,contactId:f.ana,operation:'create',meeting});
 assert.equal((await f.request('/writeback/preview',input())).status,409,'read consent never authorizes writeback');assert.equal(f.state.writes.length,0);
 f.state.scope+=' '+writeScopes[provider];const pending=await f.start(source,f.cookie,true);assert.ok(pending.searchParams.get('scope')!.split(' ').includes(writeScopes[provider]));const connected=await f.callback(pending);assert.match(connected.headers.get('location')!,/connected=/);source=new URL(connected.headers.get('location')!,'https://orbit.test').searchParams.get('connected')!;await f.request(`/sources/${source}/scope`,scope);
 async function preview(body:any){const response=await f.request('/writeback/preview',body);assert.equal(response.status,200,await response.clone().text());return await response.json() as any;}
 async function confirm(review:any,key=createId()){return f.request('/writeback/confirm',{input:review.input,reviewHash:review.reviewHash,operationKey:key,confirmed:true});}
 const first=await preview(input());assert.deepEqual(first.input.meeting.attendees,meeting.attendees);assert.equal(f.state.writes.length,0,'preview sends no invitation');
 const operationKey=createId(),created=await confirm(first,operationKey);assert.equal(created.status,201,await created.clone().text());const one=await created.json() as any;assert.equal(f.state.writes.length,1);assert.equal((await confirm(first,operationKey)).status,409);assert.equal(f.state.writes.length,1,'command replay is a no-op');
 const providerId=await f.db.prepare('SELECT provider_event_id FROM calendar_writebacks WHERE id=?').bind(one.id).first<string>('provider_event_id');assert.ok(providerId);
 const write=f.state.writes[0]!;assert.deepEqual(provider==='google'?write.body.attendees.map((a:any)=>a.email):write.body.attendees.map((a:any)=>a.emailAddress.address),meeting.attendees);assert.equal(provider==='google'?write.body.description:write.body.body.content,meeting.message);
 const reschedule={...input(),operation:'reschedule',writebackId:one.id,meeting:{...meeting,start:'2026-11-01T16:00:00.000Z',end:'2026-11-01T16:30:00.000Z'}};
 const stale=await preview(reschedule),event=f.state.writeEvents.get(providerId)!;if(provider==='google')event.etag='"provider-edit"';else event['@odata.etag']='"provider-edit"';
 assert.equal((await confirm(stale)).status,409,'stale provider revision needs review again');assert.equal(f.state.writes.length,1);
 f.state.total=0;await f.drain(source);assert.equal(await f.db.prepare('SELECT state FROM calendar_writebacks WHERE id=?').bind(one.id).first('state'),'conflict');
 const fresh=await preview(reschedule);assert.ok(fresh.warning);assert.equal((await confirm(fresh)).status,201);assert.equal(f.state.writes.length,2);
 const second=await confirm(await preview({...input(),meeting:{...meeting,title:'Synthetic Orbit second occurrence'}}));assert.equal(second.status,201);const two=await second.json() as any;
 const cancelled=await confirm(await preview({...reschedule,operation:'cancel'}));assert.equal(cancelled.status,201,await cancelled.clone().text());assert.equal(await f.db.prepare('SELECT state FROM calendar_writebacks WHERE id=?').bind(one.id).first('state'),'cancelled');assert.equal(await f.db.prepare('SELECT state FROM calendar_writebacks WHERE id=?').bind(two.id).first('state'),'written','one cancelled occurrence never cancels another');
 const timeline=await f.db.prepare("SELECT count(*) n FROM timeline_entries WHERE source='calendar-writeback'").first('n');assert.equal(timeline,2,'changes update a single activity per meeting');
 const uncertainReview=await preview({...input(),meeting:{...meeting,title:'Synthetic Orbit uncertain'}});f.state.uncertainWrite=true;const failedKey=createId();assert.equal((await confirm(uncertainReview,failedKey)).status,409);assert.equal((await confirm(uncertainReview,failedKey)).status,409);assert.equal(await f.db.prepare('SELECT state FROM calendar_writebacks WHERE id=?').bind(failedKey).first('state'),'uncertain');
 }finally{await f.dispose();}}
