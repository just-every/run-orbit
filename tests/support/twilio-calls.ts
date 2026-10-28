import {foldArchiveCatalog} from '../../src/core/features/records/archive-fold-catalog';
import {createId} from '../../src/core/shared/ids';
import assert from 'node:assert/strict';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {todayApp} from './today-workspace';
/** CALL-001: network fake only; all configuration, calls and receipts use the real app. */
export async function exerciseTwilio(db:D1Database){
 const security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)})!,accountSid='AC'+'1'.repeat(32),token='synthetic-orbit-twilio-token',from='+12025550101',operatorPhone='+12025550102',customer='+12025550103';
 let submits=0,providerStatus=201,providerReply:unknown={sid:'CA'+'2'.repeat(32)},providerBody:string|undefined,providerThrows=false;
 const owner=await db.prepare("SELECT id FROM operators WHERE setup_owner=1 AND status='active'").first<{id:string}>();
 const t=await todayApp(db,{operatorId:owner?.id,calling:{sourceSecurity:security,captureOrigin:'https://orbit.test',captureFetch:async(url,init)=>{assert.equal(String(url),`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`);assert.equal(init?.redirect,'manual');assert.match(String(init?.body),/Twiml=/);submits++;if(providerThrows)throw new Error('Synthetic transport timeout');return providerBody===undefined?Response.json(providerReply,{status:providerStatus}):new Response(providerBody,{status:providerStatus});}}});
 if(!owner)await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(t.actor).run();
 await t.json('/api/v1/calls/settings',{method:'PUT',body:{accountSid,token,from,operatorPhone}},200);
 const storage=await db.prepare('SELECT ciphertext FROM call_credentials').first<{ciphertext:string}>();assert.ok(storage&&!storage.ciphertext.includes(token),'credentials are encrypted');
 const catalog=await foldArchiveCatalog(db);assert.equal(catalog.some(table=>table.name==='call_credentials'),false,'current archives exclude installation calling credentials');assert.ok(catalog.some(table=>table.name==='call_events'),'call receipts keep their export meaning');
 const deal=await t.opportunity('Twilio review','Synthetic calls','Synthetic caller',['synthetic-orbit-1','example.test'].join(String.fromCharCode(64)));
 const contact=(await t.json<any>(`/api/v1/opportunities/${deal}`)).opportunity.contacts[0].id;
 const record=await t.json<any>(`/api/v1/records/contact/${contact}`);
 await t.json(`/api/v1/records/contact/${contact}`,{method:'PUT',body:{...record.record,phone:customer,custom_fields:{}}},200);
 const preview=await t.json<any>(`/api/v1/calls/contacts/${contact}/preview`,{},200);
 assert.deepEqual([preview.to,preview.from,preview.operatorPhone],[customer,from,operatorPhone]);
 const dial={operationKey:createId(),confirmed:true,to:customer,from,operatorPhone};
 assert.equal((await t.call(`/api/v1/calls/contacts/${contact}/dial`,{body:{...dial,to:'+12025550999'}})).status,409);assert.equal(submits,0);
 await t.json(`/api/v1/calls/contacts/${contact}/dial`,{body:dial},201);assert.equal(submits,1);
 assert.equal((await t.call(`/api/v1/calls/contacts/${contact}/dial`,{body:dial})).status,409);assert.equal(submits,1,'one attempt per reviewed command');
 providerStatus=307;assert.equal((await t.call(`/api/v1/calls/contacts/${contact}/dial`,{body:{...dial,operationKey:createId()}})).status,502);assert.equal(submits,2,'redirect is neither followed nor retried');
 // Creation refusals are durable outcomes, not conversations; every operation remains one attempt.
 const log=()=>t.json<any>(`/api/v1/calls/contacts/${contact}/log`,{},200);
 for(const code of [21210,21212,21214,21215,21216,21217]){
  providerStatus=400;providerReply={code,status:400,message:'Synthetic refusal with private provider details'};
  const operationKey=createId(),before=submits;
  const response=await t.json<any>(`/api/v1/calls/contacts/${contact}/dial`,{body:{...dial,operationKey}},502);
  assert.deepEqual([response.status,response.providerErrorCode],['failed',code]);
  const attempt=(await log()).attempts.find((row:any)=>row.id===operationKey);
  assert.deepEqual([attempt.state,attempt.provider_error_code,attempt.call_sid],['failed',code,null]);
  assert.equal(JSON.stringify(await log()).includes('private provider details'),false);
  assert.equal((await t.call(`/api/v1/calls/contacts/${contact}/dial`,{body:{...dial,operationKey}})).status,409);
  assert.equal(submits,before+1,'a definite refusal is never automatically retried or replayed');
 }
 for(const scenario of [
  {status:503,reply:{code:21217,status:400}},
  {status:429,reply:{code:21217,status:400}},
  {status:400,reply:{code:99999,status:400}},
  {status:400,reply:{code:21217,status:503}},
  {status:400,body:'not-json'},
  {status:201,body:'not-json'},
  {status:201,reply:null},
  {status:201,reply:{sid:'synthetic-orbit-3'}},
  {status:201,throws:true}
 ]){
  providerStatus=scenario.status;providerReply='reply' in scenario?scenario.reply:{};providerBody='body' in scenario?scenario.body:undefined;providerThrows='throws' in scenario;
  const operationKey=createId(),before=submits;
  const response=await t.json<any>(`/api/v1/calls/contacts/${contact}/dial`,{body:{...dial,operationKey}},502);
  assert.equal(response.status,'uncertain');
  const attempt=(await log()).attempts.find((row:any)=>row.id===operationKey);
  assert.deepEqual([attempt.state,attempt.provider_error_code,attempt.call_sid],['uncertain',null,null]);
  assert.equal((await t.call(`/api/v1/calls/contacts/${contact}/dial`,{body:{...dial,operationKey}})).status,409);
  assert.equal(submits,before+1,'an ambiguous response cannot cause a second provider attempt');
 }
 assert.deepEqual((await log()).calls,[],'creation refusals and uncertainty never fabricate a conversation');
 providerThrows=false;providerBody=undefined;providerStatus=201;providerReply={sid:'CA'+'2'.repeat(32)};
 const callback='https://orbit.test/api/v1/calls/twilio/events';
 async function event(sid:string,sequence:number,direction:string,number:string,status='completed',bad=false){const form=new URLSearchParams({AccountSid:accountSid,CallSid:sid,SequenceNumber:String(sequence),Direction:direction,From:direction==='inbound'?number:from,To:direction==='inbound'?from:number,CallStatus:status,...(status==='completed'?{CallDuration:'125'}:['busy','failed','no-answer','canceled'].includes(status)?{CallDuration:'0'}:{})});const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(token),{name:'HMAC',hash:'SHA-1'},false,['sign']);const raw=callback+[...form.keys()].sort().map(name=>name+form.get(name)).join('');const signature=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw)))));return t.app.request(callback,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Twilio-Signature':bad?'A'.repeat(27)+'=':signature},body:form});}
 const replacement={accountSid,token:'synthetic-orbit-replaced-token',from,operatorPhone};await t.json('/api/v1/calls/settings',{method:'PUT',body:replacement},200);
 assert.equal((await event('CA'+'6'.repeat(32),0,'inbound',customer)).status,403,'replacing credentials refuses callbacks signed by the old token');
 const replaced=await db.prepare('SELECT ciphertext FROM call_credentials').first<{ciphertext:string}>();assert.ok(replaced&&replaced.ciphertext!==storage!.ciphertext&&!replaced.ciphertext.includes(replacement.token));assert.equal(JSON.stringify(await t.json('/api/v1/calls/settings')).includes(replacement.token),false,'replacement tokens are never shown back');
 await t.json('/api/v1/calls/settings',{method:'PUT',body:{accountSid,token,from,operatorPhone}},200);
 const sid='CA'+'3'.repeat(32);assert.equal((await event(sid,2,'inbound',customer,'completed',true)).status,403);
 assert.deepEqual(await(await event(sid,2,'inbound',customer)).json(),{replay:false,held:false});
 assert.deepEqual(await(await event(sid,2,'inbound',customer)).json(),{replay:true});
 assert.equal((await event(sid,1,'inbound',customer,'ringing')).status,200);
 let entries=(await t.json<any>(`/api/v1/records/contact/${contact}`)).timeline.filter((entry:any)=>entry.source==='twilio');
 assert.equal(entries.length,1);assert.equal(JSON.parse(entries[0].payload_json).text,'Twilio inbound call: completed','late ringing cannot regress a completed call');
 const outside='CA'+'4'.repeat(32);assert.equal((await event(outside,0,'outbound-api',customer)).status,200);
 assert.equal((await t.json<any>(`/api/v1/records/contact/${contact}`)).timeline.filter((entry:any)=>entry.source==='twilio').length,2,'outside-Orbit outbound calls are logged too');
 const dispositions=['no-answer','busy','canceled','failed'];
 for(const [index,status] of dispositions.entries()){
  const callSid='CA'+(index+7).toString(16).repeat(32),before=submits;
  assert.equal((await event(callSid,3,'outbound-dial',customer,status,true)).status,403);
  assert.deepEqual(await(await event(callSid,3,'outbound-dial',customer,status)).json(),{replay:false,held:false});
  assert.deepEqual(await(await event(callSid,3,'outbound-dial',customer,status)).json(),{replay:true});
  assert.equal((await event(callSid,1,'outbound-dial',customer,'ringing')).status,200);
  assert.equal((await event(callSid,2,'outbound-dial',customer,'in-progress')).status,200);
  const calls=(await log()).calls.filter((row:any)=>JSON.parse(row.payload_json).callSid===callSid);
  assert.equal(calls.length,1,'one truthful call survives terminal-first delivery and replay');
  assert.equal(JSON.parse(calls[0].payload_json).text,`Twilio outbound-dial call: ${status}`);
  assert.equal(submits,before,'a failed or unanswered callback never dials again');
 }
 const unknown='CA'+'5'.repeat(32);assert.deepEqual(await(await event(unknown,0,'inbound','+12025550999')).json(),{replay:false,held:true});
 const held=(await t.json<any>('/api/v1/calls/settings',{},200)).held;assert.equal(held.length,1);
 await t.json(`/api/v1/calls/held/${held[0].id}/link`,{body:{contactId:contact}},200);
 assert.equal((await t.json<any>('/api/v1/calls/settings',{},200)).held.length,0);
 const logged=await t.json<any>(`/api/v1/calls/contacts/${contact}/log`,{},200);assert.equal(logged.calls.length,7);
 const other=await todayApp(db,{calling:{sourceSecurity:security,captureOrigin:'https://orbit.test'}});assert.equal((await other.call('/api/v1/calls/settings')).status,403);
 const workspace=(await db.prepare('SELECT workspace_id FROM access_memberships WHERE operator_id=? LIMIT 1').bind(t.actor).first<{workspace_id:string}>())!.workspace_id;
 const reportBase=`/api/v2/workspaces/${workspace}/operations`;
 const definition=await t.json<any>(`${reportBase}/reports/suite/sales-activities`,{body:{}},200),month=new Date().toISOString().slice(0,7);
 const report=await t.json<any>(`${reportBase}/reports/${definition.id}/preview`,{body:{version:definition.version,from:month,through:month}},200);
 const calls=report.sections.find((section:any)=>section.measure==='activities').totals.find((cell:any)=>cell.key==='call');
 assert.equal(calls.rows.filter((key:string)=>entries.some((entry:any)=>key===`activity:${entry.id}`)).length,1,'a provider call counts once in Rep activities');
 const providerEntry=entries[0];
 assert.equal((await t.call(`/api/v1/records/contact/${contact}/entries/${providerEntry.id}`,{method:'PUT',body:{kind:'call',text:'Changed provider receipt',occurredAt:new Date().toISOString(),durationMinutes:2}})).status,409,'provider receipts stay immutable');
 await t.json(`/api/v1/records/contact/${contact}`,{method:'DELETE',body:{confirmed:true}},200);
 assert.deepEqual(await(await event(sid,3,'inbound',customer)).json(),{replay:true},'an erased phone never returns as a held call');
 assert.deepEqual(await(await event(unknown,1,'inbound','+12025550999')).json(),{replay:true},'owner-matched unknown numbers are also fenced on erasure');
 assert.equal((await t.json<any>('/api/v1/calls/settings',{},200)).held.length,0);
 assert.deepEqual(await log(),{calls:[],attempts:[]},'erasure removes both attempts and provider logs');
 await t.json('/api/v1/calls/settings',{method:'DELETE',body:{}},200);assert.equal((await event(sid,3,'inbound',customer)).status,503,'disconnect stops callbacks');
}
