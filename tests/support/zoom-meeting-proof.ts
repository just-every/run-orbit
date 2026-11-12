import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {todayApp,type TodayApp} from './today-workspace';
import {zoomNetwork} from './zoom-network.mjs';
import {isolatedDatabase} from './isolated-database';
import {localArchiveRoundTrip} from './capture-privacy-archive';
import {emailLinkSignIn} from './email-link';

const address=(id:number)=>['synthetic-orbit-'+id,'example.test'].join(String.fromCharCode(64));
/** One native sanity journey: only Zoom HTTP is faked; signatures, sealing, records, plans, erasure and both archives are real. */
export async function exerciseZoom(db:D1Database){
 const owner=(await db.prepare("SELECT id FROM operators WHERE setup_owner=1 AND status='active' LIMIT 1").first<{id:string}>())?.id;
 const provider=zoomNetwork([address(430),address(431),address(432)]),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'bc'.repeat(32)})!;
 const t=await todayApp(db,{operatorId:owner,calling:{sourceSecurity:security,captureOrigin:'https://orbit.test',captureFetch:provider.fetch}});
 await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(t.actor).run();
 const deal=await t.opportunity('Synthetic Zoom buyer deal','Synthetic Zoom company','Synthetic Zoom attendee',address(430));
 const contact=(await t.json<any>(`/api/v1/opportunities/${deal}`)).opportunity.contacts[0].id;
 const duplicate=await todayApp(db,{email:address(431)});
 const direct=await t.json<{id:string}>('/api/v1/records/contact',{body:{name:'Synthetic ambiguous contact',email:address(431)}},201);
 // An operator and a customer can share an address. This valid collision is unresolved, never guessed as a customer.

 await t.json(`/api/v1/workbench/opportunities/${deal}/drafts`,{body:{contactId:contact,subject:'Synthetic reviewed follow-up',body:'A saved draft stays untouched by Zoom.'}},201);
 const inventory=async()=>Object.fromEntries(await Promise.all(['drafts','outbound_messages','record_mail_drafts','record_mail_outbound_messages'].map(async table=>[table,(await db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).results])));
 const outreach=await inventory();assert.ok((outreach.drafts as any[]).length>0);
 const status=()=>t.json<any>('/api/v1/settings/zoom',{},200),products=async()=>(await t.json<any>('/api/v1/settings/products')).products.find((product:any)=>product.products.includes('Zoom'));
 assert.equal((await status()).state,'unresolved-setup');assert.equal((await products()).state,'unresolved-setup');
 const unauthed=await t.app.request('https://orbit.test/api/v1/settings/zoom/connect',{method:'POST',headers:{origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify(provider.credentials)});assert.equal(unauthed.status,401);
 const rep=await todayApp(db,{calling:{sourceSecurity:security,captureFetch:provider.fetch}}),beforeRefusal=provider.requests.length;
 assert.equal((await rep.call('/api/v1/settings/zoom/connect',{body:provider.credentials})).status,403);assert.equal(provider.requests.length,beforeRefusal);
 provider.tokenStatus=401;const denied=await t.call('/api/v1/settings/zoom/connect',{body:provider.credentials});assert.equal(denied.status,403);assert.equal((await status()).state,'unresolved-setup');assert.equal((await denied.text()).includes(provider.credentials.clientSecret),false);
 provider.tokenStatus=200;await t.json('/api/v1/settings/zoom/connect',{body:provider.credentials},200);
 const stored=await db.prepare("SELECT secret_ciphertext FROM signal_sources WHERE id='zoom'").first<string>('secret_ciphertext');assert.ok(stored);for(const value of Object.values(provider.credentials))assert.equal(stored.includes(value),false);
 assert.equal((await products()).state,'connected');
 for(const value of [...Object.values(provider.credentials),provider.token])assert.equal(JSON.stringify(await status()).includes(value),false,'Settings never returns a credential or access token');
 const selection={meetingId:'98765432101',opportunityId:deal};
 const read=()=>t.json<any>('/api/v1/zoom/meetings/preview',{body:selection},200);
 const first=await read();assert.equal(first.meeting.id,selection.meetingId);assert.equal(first.deal.id,deal);assert.equal(first.participants.find((person:any)=>person.email===address(431)).state,'ambiguous');assert.equal(first.participants.find((person:any)=>person.email===address(432)).state,'unknown');
 assert.equal((await t.call('/api/v1/zoom/meetings/attach',{body:{...selection,previewDigest:first.digest}})).status,400,'Attachment always needs explicit confirmation');
 provider.meetings.get(selection.meetingId).topic='Synthetic changed Zoom topic';
 assert.equal((await t.call('/api/v1/zoom/meetings/attach',{body:{...selection,previewDigest:first.digest,confirmed:true}})).status,409,'A changed provider meeting needs a new review');
 const reviewed=await read(),attachment={...selection,previewDigest:reviewed.digest,confirmed:true};
 const attached=await t.json<any>('/api/v1/zoom/meetings/attach',{body:attachment},201),signalId=attached.signalId;
 assert.equal((await t.json<any>('/api/v1/zoom/meetings/attach',{body:attachment},201)).signalId,signalId,'Repeated explicit attachment keeps the same activity');
 const activity=(await t.json<any>(`/api/v1/records/opportunity/${deal}`,{},200)).timeline.filter((entry:any)=>entry.source==='zoom');assert.equal(activity.length,1);assert.equal(activity[0].id,signalId);assert.equal(activity[0].signal_type,'meeting.booked');const activityDetails=JSON.parse(activity[0].payload_json);assert.deepEqual([activityDetails.joinUrl,activityDetails.start,activityDetails.duration,activityDetails.hostId],[reviewed.meeting.joinUrl,reviewed.meeting.start,reviewed.meeting.duration,reviewed.meeting.hostId]);
 const linked=(await db.prepare('SELECT record_type,record_id FROM signal_links WHERE signal_id=? ORDER BY record_type,record_id').bind(signalId).all()).results;
 assert.deepEqual(linked,[{record_type:'contact',record_id:contact},{record_type:'opportunity',record_id:deal}]);assert.ok(!linked.some(row=>row.record_id===direct.id||row.record_id===duplicate.actor));
 const plan=async(id=signalId)=>(await t.json<any>(`/api/v1/today/meetings/${id}`,{},200)).plan;
 const initial=await plan();assert.equal(initial.meeting.status,'booked');assert.equal(initial.zoom.joinUrl,reviewed.meeting.joinUrl);assert.deepEqual([initial.zoom.meetingId,initial.zoom.hostId,initial.zoom.duration],[selection.meetingId,reviewed.meeting.hostId,30]);
 assert.equal(initial.attendees.some((person:any)=>person.contact.id===contact),true);assert.match(initial.unresolved.find((person:any)=>person.email===address(431)).reason,/Ambiguous/);assert.match(initial.zoom.recording,/not granted/);assert.match(initial.zoom.transcript,/missing/);
 const saved=await t.json<any>(`/api/v1/today/meetings/${signalId}/plan`,{method:'PUT',body:{agenda:'Review the recorded deal facts',prep:'Bring the saved checklist'}},200);
 const action=async(id:string,title:string)=>(await t.json<any>(`/api/v1/today/meetings/${id}/actions`,{body:{title,dueAt:null,evidenceId:id}},201)).observed.target.split('/')[3];
 const firstAction=await action(signalId,'Synthetic first meeting next action');
 const activityId=(await db.prepare("SELECT id FROM timeline_entries WHERE source='zoom' AND json_extract(payload_json,'$.signalId')=?").bind(signalId).first<{id:string}>())!.id;
 const now=Date.now(),endTime=new Date(now-1800000).toISOString();
 const payload=(event:string,id='98765432101',offset=0)=>({event,event_ts:now+offset,payload:{object:{id:Number(id),uuid:provider.meetings.get(id).uuid,...(event==='meeting.ended'?{end_time:endTime}:{})}}});
 const delivery=async(value:unknown,options:{timestamp?:string;signature?:string;raw?:string}={})=>{const raw=options.raw??JSON.stringify(value),timestamp=options.timestamp??String(Math.floor(Date.now()/1000)),signature=options.signature??'v0='+createHmac('sha256',provider.credentials.webhookSecret).update(`v0:${timestamp}:${raw}`).digest('hex');return t.app.request('https://orbit.test/api/v1/signals/zoom',{method:'POST',headers:{'content-type':'application/json','x-zm-request-timestamp':timestamp,'x-zm-signature':signature},body:raw});};
 const validation={event:'endpoint.url_validation',event_ts:now,payload:{plainToken:'synthetic-orbit-440'}};
 const validated=await delivery(validation);assert.equal(validated.status,200);assert.deepEqual(await validated.json(),{plainToken:validation.payload.plainToken,encryptedToken:createHmac('sha256',provider.credentials.webhookSecret).update(validation.payload.plainToken).digest('hex')});
 const beforeForged=await db.prepare('SELECT * FROM zoom_meetings ORDER BY signal_id').all(),requestsBefore=provider.requests.length;
 assert.equal((await delivery(payload('meeting.ended'),{signature:'v0='+'0'.repeat(64)})).status,401);
 assert.equal((await delivery(payload('meeting.ended'),{timestamp:String(Math.floor(Date.now()/1000)-301)})).status,401);
 const exactTimestamp=String(Math.floor(Date.now()/1000)),exact=JSON.stringify(payload('meeting.ended'));assert.equal((await delivery(payload('meeting.ended'),{timestamp:exactTimestamp,raw:exact+' ',signature:'v0='+createHmac('sha256',provider.credentials.webhookSecret).update(`v0:${exactTimestamp}:${exact}`).digest('hex')})).status,401,'Even a whitespace change invalidates the exact-body signature');
 assert.equal(provider.requests.length,requestsBefore);assert.deepEqual((await db.prepare('SELECT * FROM zoom_meetings ORDER BY signal_id').all()).results,beforeForged.results);
 const ended=payload('meeting.ended');const done=await delivery(ended);assert.equal(done.status,200,await done.clone().text());
 const completed=await plan();assert.equal(completed.meeting.status,'completed');assert.equal(completed.zoom.attendance.length,3);assert.equal(completed.zoom.attendance.find((person:any)=>person.email===address(430)).match.contactId,contact);assert.equal(completed.zoom.attendance.find((person:any)=>person.email===address(431)).match.state,'ambiguous');
 assert.equal(completed.zoom.completedAt,endTime);assert.match(completed.zoom.completionDigest,/^[a-f0-9]{64}$/);assert.ok(await db.prepare('SELECT 1 FROM zoom_deliveries WHERE digest=?').bind(completed.zoom.completionDigest).first());assert.match(completed.zoom.recap.summary,/No discussion, decisions or transcript are inferred/);assert.deepEqual(completed.zoom.recap.citations.map((citation:any)=>citation.kind),['plan','attendance','completion']);assert.ok(completed.zoom.recap.citations[0].href.endsWith('#entry-'+saved.entryId));assert.ok(completed.zoom.recap.citations[2].href.endsWith('#entry-'+activityId));
 const completedRows=await db.prepare('SELECT * FROM zoom_meetings ORDER BY signal_id').all(),completionReads=provider.requests.length;
 assert.equal((await delivery(ended)).status,409);assert.equal((await delivery(payload('meeting.ended','98765432101',1))).status,200);assert.equal((await delivery(payload('meeting.deleted','98765432101',-1))).status,200);
 assert.equal(provider.requests.length,completionReads,'Replayed and reordered completions never read attendance again');assert.deepEqual((await db.prepare('SELECT * FROM zoom_meetings ORDER BY signal_id').all()).results,completedRows.results);
 assert.equal(await db.prepare("SELECT count(*) n FROM timeline_entries WHERE source='zoom' AND json_extract(payload_json,'$.signalId')=?").bind(signalId).first('n'),1,'Completion retains one Zoom activity');
 assert.deepEqual(await inventory(),outreach,'Attach, preparation, handoffs, signed completion and replay change no outreach state');
 const secondSelection={meetingId:'98765432102',opportunityId:deal},secondPreview=await t.json<any>('/api/v1/zoom/meetings/preview',{body:secondSelection},200),second=await t.json<any>('/api/v1/zoom/meetings/attach',{body:{...secondSelection,previewDigest:secondPreview.digest,confirmed:true}},201),secondAction=await action(second.signalId,'Synthetic second meeting follow-up');
 const cancellation=payload('meeting.deleted','98765432102',2);assert.equal((await delivery(cancellation)).status,200);assert.equal((await delivery(cancellation)).status,409);
 assert.equal((await plan(second.signalId)).meeting.status,'cancelled');assert.equal(await db.prepare('SELECT status FROM handoff_tasks WHERE id=?').bind(secondAction).first('status'),'cancelled');assert.equal(await db.prepare('SELECT status FROM handoff_tasks WHERE id=?').bind(firstAction).first('status'),'open');assert.equal((await plan()).meeting.status,'completed');
 assert.equal((await t.call(`/api/v1/today/meetings/${second.signalId}/actions`,{body:{title:'Must stay stopped',dueAt:null,evidenceId:second.signalId}})).status,409);
 assert.equal((await t.call(`/api/v1/today/meetings/${second.signalId}/plan`,{method:'PUT',body:{agenda:'Must stay stopped',prep:''}})).status,409);
 assert.equal((await delivery(payload('meeting.ended','98765432102',1))).status,200);assert.equal((await plan(second.signalId)).meeting.status,'cancelled');
 // A denied attendance read records only authenticated completion, with the missing metadata clearly unresolved.
 const thirdSelection={meetingId:'98765432103',opportunityId:deal},thirdPreview=await t.json<any>('/api/v1/zoom/meetings/preview',{body:thirdSelection},200),third=await t.json<any>('/api/v1/zoom/meetings/attach',{body:{...thirdSelection,previewDigest:thirdPreview.digest,confirmed:true}},201);
 provider.attendanceStatus=403;assert.equal((await delivery(payload('meeting.ended','98765432103',3))).status,200);assert.equal((await plan(third.signalId)).zoom.attendanceState,'permission-denied');assert.equal((await plan(third.signalId)).zoom.attendance.length,0);provider.attendanceStatus=200;
 await t.json('/api/v1/settings/zoom/connect',{body:{...provider.credentials,webhookSecret:'synthetic-orbit-406'}},200);assert.equal((await delivery(payload('meeting.ended','98765432101',6))).status,401,'A replaced webhook secret revokes old signatures');await t.json('/api/v1/settings/zoom/connect',{body:provider.credentials},200);
 provider.tokenStatus=403;assert.equal((await t.call('/api/v1/zoom/meetings/preview',{body:selection})).status,403);assert.equal((await products()).state,'unresolved-setup');provider.tokenStatus=200;
 await t.json('/api/v1/settings/zoom/connect',{body:provider.credentials},200);
 await proveZoomArchives(db,t,provider,signalId,second.signalId);
 const erased=await t.call(`/api/v1/records/contact/${contact}`,{method:'DELETE',body:{confirmed:true}});assert.equal(erased.status,200,await erased.clone().text());
 assert.equal(await db.prepare('SELECT count(*) n FROM zoom_meetings WHERE signal_id IN(?,?,?)').bind(signalId,second.signalId,third.signalId).first('n'),0);
 assert.equal((await delivery(payload('meeting.ended','98765432101',4))).status,200);assert.equal((await t.call('/api/v1/zoom/meetings/attach',{body:attachment})).status,409,'Erasure matching refuses reattachment of the same provider occurrence');
 assert.equal(await db.prepare('SELECT count(*) n FROM signals WHERE id=?').bind(signalId).first('n'),0);
 for(const table of ['zoom_meetings','signals','timeline_entries'])assert.equal(JSON.stringify((await db.prepare(`SELECT * FROM ${table}`).all()).results).includes(address(430)),false,'Erasure removes attendee identity and its copies');
 await t.json('/api/v1/settings/zoom/disconnect',{body:{}},200);assert.equal((await delivery(payload('meeting.ended','98765432101',5))).status,409);assert.equal((await products()).state,'unresolved-setup');assert.equal(await db.prepare("SELECT secret_ciphertext FROM signal_sources WHERE id='zoom'").first('secret_ciphertext'),null);
 assert.deepEqual(provider.unexpected,[]);assert.ok(provider.requests.every((request:any)=>!request.path.includes('recording')&&!request.path.includes('transcript')),'No recording or transcript endpoint is ever called');
}

async function proveZoomArchives(db:D1Database,t:TodayApp,provider:ReturnType<typeof zoomNetwork>,signalId:string,secondId:string){
 let job=await t.json<any>('/api/v1/records/archive/exports',{body:{}},201);while(job.state==='preparing')job=await t.json<any>(`/api/v1/records/archive/exports/${job.id}/advance`,{body:{}},200);
 const archive=await t.json<any>(`/api/v1/records/archive/exports/${job.id}/download`,{},200),raw=JSON.stringify(archive);
 for(const value of [...Object.values(provider.credentials),provider.token])assert.equal(raw.includes(value),false,'The actual downloaded archive contains no connection credential');
 assert.ok(archive.parts.some((part:any)=>part.records.some((record:any)=>record.table==='zoom_meetings'&&record.row.signal_id===signalId)));
 const target=await isolatedDatabase(),local=await isolatedDatabase();
 try{
  const receiver=await todayApp(target.db),email=await target.db.prepare('SELECT email FROM operators WHERE id=?').bind(receiver.actor).first<string>('email');
  const identity=await emailLinkSignIn(target.db,email!);
  const request=async(path:string,body?:unknown,method='POST')=>{const response=await receiver.app.request('https://orbit.test'+path,{method,headers:{Cookie:identity.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;};
  let imported=await request('/api/v1/records/archive/imports',{manifest:archive.manifest,confirmed:true});
  for(const part of archive.parts)await request(`/api/v1/records/archive/imports/${imported.id}/parts/${part.index}`,part,'PUT');
  for(let step=0;step<1000&&imported.state!=='complete';step++)imported=await request(`/api/v1/records/archive/imports/${imported.id}/finalize`,{});
  assert.equal(imported.state,'complete');
  const restored=await todayApp(target.db,{operatorId:t.actor,calling:{sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'cd'.repeat(32)})!,captureFetch:provider.fetch}});
  assert.equal((await restored.json<any>('/api/v1/settings/zoom',{},200)).state,'unresolved-setup');assert.equal(await target.db.prepare("SELECT enabled FROM signal_sources WHERE id='zoom'").first('enabled'),0);
  const read=(await restored.json<any>(`/api/v1/today/meetings/${signalId}`,{},200)).plan;assert.equal(read.meeting.status,'completed');assert.ok(read.zoom.recap);assert.equal((await restored.json<any>(`/api/v1/today/meetings/${secondId}`,{},200)).plan.meeting.status,'cancelled');
  assert.deepEqual((await target.db.prepare('SELECT * FROM zoom_meetings ORDER BY signal_id').all()).results,(await db.prepare('SELECT * FROM zoom_meetings ORDER BY signal_id').all()).results);
  await localArchiveRoundTrip(db,local.db);assert.deepEqual((await local.db.prepare('SELECT * FROM zoom_meetings ORDER BY signal_id').all()).results,(await db.prepare('SELECT * FROM zoom_meetings ORDER BY signal_id').all()).results);assert.equal(await local.db.prepare("SELECT enabled FROM signal_sources WHERE id='zoom'").first('enabled'),0);assert.equal(await local.db.prepare("SELECT secret_ciphertext FROM signal_sources WHERE id='zoom'").first('secret_ciphertext'),null);
 }finally{await target.dispose();await local.dispose();await t.json(`/api/v1/records/archive/exports/${job.id}/abort`,{body:{}},200);}
}
