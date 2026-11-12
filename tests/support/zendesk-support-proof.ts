import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {createId} from '../../src/core/shared/ids';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {createDependencies} from './dependencies';
import {createApp} from './app';
import {isolatedDatabase} from './isolated-database';
import {localArchiveRoundTrip} from './capture-privacy-archive';
import {zendeskNetwork} from './zendesk-network';
interface Fixture {db:D1Database;actor:string;app:ReturnType<typeof createApp>;request:(path:string,method?:string,body?:unknown,override?:Record<string,string>)=>Promise<Response>}
export async function proveZendeskSupport(f:Fixture){
 const edge=zendeskNetwork(),originalFetch=globalThis.fetch;
 globalThis.fetch=async(input,init)=>String(input).startsWith(`https://${edge.subdomain}.zendesk.com`)?edge.fetcher(input,init):originalFetch(input,init);
 const call=async(path:string,method='GET',body?:unknown)=>{const response=await f.request(path,method,body);assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;};
 const connect={subdomain:edge.subdomain,email:edge.email,token:edge.token,signingSecret:edge.signingSecret};
 const product=async()=>((await call('settings/products')).products as any[]).find(p=>p.products.includes('Zendesk'));
 try{
  await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
  const company=await call('records/company','POST',{name:'synthetic-orbit-1',primary_domain:'synthetic-orbit-1.test'}),contact=await call('records/contact','POST',{name:'synthetic-orbit-person-1',company_id:company.id});
  const path=`support/zendesk/companies/${company.id}`;
  assert.equal((await product()).state,'unresolved-setup');
  assert.equal((await f.request('settings/zendesk/connect','POST',{...connect,token:'synthetic-orbit-refused'})).status,400);
  assert.equal((await product()).state,'unresolved-setup');assert.equal(await f.db.prepare('SELECT count(*) n FROM support_credentials').first('n'),0,'A refused token is never retained');
  assert.equal((await f.request('settings/zendesk/connect','POST',connect,{Cookie:''})).status,401);
  const deps=createDependencies(f.db),other=createId();await deps.auth.ensureOperator({id:other,email:['synthetic-orbit-2','example.test'].join('@'),displayName:'synthetic-orbit-operator'});const otherSession=await deps.auth.createSession(other);
  const otherCookie={Cookie:`__Host-orbit_session=${otherSession.token}`};
  assert.equal((await f.request('settings/zendesk/connect','POST',connect,otherCookie)).status,403,'A full operator cannot administer the owner connection');
  await call('settings/zendesk/connect','POST',connect);
  const sealed=await f.db.prepare('SELECT ciphertext FROM support_credentials').first<string>('ciphertext');assert.ok(sealed&&!sealed.includes(edge.token)&&!sealed.includes(edge.signingSecret)&&!sealed.includes(edge.email));
  const settings=await call('settings/zendesk');assert.equal(settings.state,'connected');assert.ok(!JSON.stringify(settings).includes(edge.token)&&!JSON.stringify(settings).includes(edge.signingSecret)&&!JSON.stringify(settings).includes(edge.email));
  const connected=await product();assert.equal(connected.state,'connected');assert.equal(connected.link.href,`https://${edge.subdomain}.zendesk.com/agent/`);assert.match(connected.owns,/replies and SLA/);
  assert.equal((await call(path)).state,'unavailable','Connection alone is not a reviewed customer mapping');
  const inventory=async()=>({maps:(await f.db.prepare('SELECT * FROM support_mappings').all()).results,handoffs:(await f.db.prepare('SELECT * FROM support_handoffs').all()).results,audits:(await f.db.prepare("SELECT * FROM audit_entries WHERE action LIKE 'zendesk.%'").all()).results,creates:edge.creates.length});
  const initial=await inventory();assert.equal((await f.request(`${path}/mapping-preview`,'POST',{organizationId:'22'})).status,409);assert.deepEqual(await inventory(),initial,'A mismatched organization changes nothing');
  const preview=await call(`${path}/mapping-preview`,'POST',{organizationId:'11'});assert.deepEqual(await inventory(),initial,'Preview writes no mapping or audit');
  assert.equal((await f.request(`${path}/mapping`,'PUT',{organizationId:'11',digest:preview.digest})).status,400);
  await call(`${path}/mapping`,'PUT',{organizationId:'11',digest:preview.digest,confirmed:true});
  const duplicate=await call('records/company','POST',{name:'synthetic-orbit-1'}),beforeDuplicate=await inventory();
  assert.equal((await f.request(`support/zendesk/companies/${duplicate.id}/mapping-preview`,'POST',{organizationId:'11'})).status,409);assert.deepEqual(await inventory(),beforeDuplicate,'An organization linked elsewhere changes nothing');
  let panel=await call(path);assert.equal(panel.state,'available');assert.equal(panel.tickets.length,2);assert.deepEqual(panel.tickets[0],{id:'101',summary:'synthetic-orbit-ticket-101',severity:'high',status:'open',lastUpdate:'2026-11-01T12:00:00Z',link:`https://${edge.subdomain}.zendesk.com/agent/tickets/101`,state:'available'});
  assert.ok(!JSON.stringify(panel).includes('hidden-'),'Descriptions, comments and attachments never leave the support route');
  assert.match(panel.ownership,/replies and SLA work/);
  edge.tickets.delete(101);edge.unreadable.add(102);panel=await call(path);assert.equal(panel.state,'unavailable');assert.deepEqual(panel.tickets.map((t:any)=>[t.id,t.state]),[['101','unavailable'],['102','unavailable']]);
  edge.unreadable.clear();edge.tickets.set(101,{...edge.tickets.get(102)!,id:101,subject:'synthetic-orbit-ticket-101'});
  // Current native class and session are checked again after the HTTP read, not just at admission.
  const collaborator=createId();await f.db.prepare('INSERT INTO access_collaborators VALUES(?,?)').bind(collaborator,new Date().toISOString()).run();
  await deps.auth.ensureOperator({id:collaborator,email:['synthetic-orbit-3','example.test'].join('@'),displayName:'synthetic-orbit-collaborator'});const collab=await deps.auth.createSession(collaborator);
  const noWrites=await inventory(),callsBefore=edge.calls.length;
  for(const [route,method,body] of [[path,'GET',undefined],[`${path}/mapping-preview`,'POST',{organizationId:'11'}],[`${path}/handoff-preview`,'POST',{title:'synthetic-orbit-1',fields:['companyName']}]] as const)assert.equal((await f.request(route,method,body,{Cookie:`__Host-orbit_session=${collab.token}`})).status,403);
  assert.deepEqual(await inventory(),noWrites);assert.equal(edge.calls.length,callsBefore,'A collaborator never reaches Zendesk');
  edge.beforeRead(async()=>{await f.db.prepare('UPDATE sessions SET revoked_at=? WHERE id=?').bind(new Date().toISOString(),otherSession.id).run();});
  const registryBefore=(await f.db.prepare('SELECT * FROM support_tickets').all()).results;
  assert.equal((await f.request(path,'GET',undefined,otherCookie)).status,403,'Access revoked during the provider read exposes no ticket');assert.deepEqual((await f.db.prepare('SELECT * FROM support_tickets').all()).results,registryBefore);
  const input={title:'synthetic-orbit-reviewed-handoff',fields:['companyName','contactName'],contactId:contact.id};
  const review=await call(`${path}/handoff-preview`,'POST',input);assert.equal(edge.creates.length,0);assert.equal(review.ticket.comment.body,'Company: synthetic-orbit-1\nContact: synthetic-orbit-person-1');assert.equal(review.ticket.comment.public,false);assert.ok(!JSON.stringify(review).includes('hidden-'));
  assert.equal((await f.request(`${path}/handoffs`,'POST',{...input,digest:'0'.repeat(64),operationId:crypto.randomUUID(),confirmed:true})).status,409);assert.equal(edge.creates.length,0);
  await call(`records/contact/${contact.id}`,'PUT',{name:'synthetic-orbit-person-changed',company_id:company.id});
  assert.equal((await f.request(`${path}/handoffs`,'POST',{...input,digest:review.digest,operationId:crypto.randomUUID(),confirmed:true})).status,409,'An actual context edit invalidates the exact reviewed handoff');assert.equal(edge.creates.length,0);
  await call(`records/contact/${contact.id}`,'PUT',{name:'synthetic-orbit-person-1',company_id:company.id});
  const operation={...input,digest:review.digest,operationId:crypto.randomUUID(),confirmed:true};
  const created=await call(`${path}/handoffs`,'POST',operation);assert.equal(created.state,'created');assert.equal(edge.creates.length,1);assert.deepEqual(edge.creates[0],{ticket:review.ticket},'Exactly the selected, reviewed context reaches Zendesk');
  assert.equal((await call(`${path}/handoffs`,'POST',operation)).replayed,true);assert.equal(edge.creates.length,1);
  const afterReplay=await inventory();assert.equal((await f.request(`${path}/handoffs`,'POST',{...operation,digest:'1'.repeat(64)})).status,409);assert.deepEqual(await inventory(),afterReplay);
  // A genuinely signed Zendesk delivery carries a ticket ID; current provider state supplies the outcome.
  const ticketId=Number(created.ticketId),raw=JSON.stringify({ticket_id:String(ticketId)}),timestamp=new Date().toISOString();
  const signed=(body=raw,ts=timestamp,signature=createHmac('sha256',edge.signingSecret).update(ts+body).digest('base64'))=>f.app.request('https://orbit.test/api/v1/support/zendesk/webhook',{method:'POST',headers:{'X-Zendesk-Webhook-Signature-Timestamp':ts,'X-Zendesk-Webhook-Signature':signature},body});
  const timeline=async()=>((await call(`records/company/${company.id}`)).timeline as any[]).filter(t=>t.kind==='support.outcome');
  const pendingRaw=raw+'\n';assert.equal((await signed(pendingRaw)).status,200);assert.equal((await signed(pendingRaw)).status,409,'A nonterminal signed delivery is single-use too');assert.equal((await timeline()).length,0);
  edge.tickets.get(ticketId)!.status='solved';
  assert.equal((await signed(raw,timestamp,'A'.repeat(43)+'=')).status,401);assert.equal((await signed(raw,new Date(Date.now()-600000).toISOString())).status,401);
  const actualSignature=createHmac('sha256',edge.signingSecret).update(timestamp+raw).digest('base64');assert.equal((await signed(raw+' ',timestamp,actualSignature)).status,401);assert.equal((await timeline()).length,0);
  assert.equal((await signed()).status,201);assert.equal((await timeline()).length,1);assert.deepEqual(JSON.parse((await timeline())[0].payload_json),{ticketId:String(ticketId),status:'solved',severity:'high',link:created.link});
  assert.equal((await signed()).status,409);assert.equal((await signed(raw,new Date(Date.now()+1000).toISOString())).status,409);assert.equal((await timeline()).length,1,'A new signature cannot return the handoff outcome twice');
  // Populated Records and CLI archives retain provenance, never credentials or resumed authority.
  await proveZendeskArchive(f,edge,company.id,operation,raw,timestamp);
  // The reviewed contact context is erased, with inert ticket identity retained only to refuse resurrection.
  assert.equal((await f.request(`records/contact/${contact.id}`,'DELETE',{confirmed:true})).status,200);
  assert.equal((await timeline()).length,0,'Contact erasure removes its copied support outcome');
  assert.equal((await signed(raw,new Date(Date.now()+2000).toISOString())).status,404);
  panel=await call(path);assert.ok(!panel.tickets.some((t:any)=>t.id===String(ticketId)),'A provider ticket containing erased contact context is not re-exposed');
  assert.equal((await f.request(`${path}/handoffs`,'POST',operation)).status,409);assert.equal(edge.creates.length,1);
  // Ambiguous create results are durable and replay never submits another ticket.
  edge.setUncertain(true);const uncertainInput={title:'synthetic-orbit-uncertain',fields:['companyName']},uncertainReview=await call(`${path}/handoff-preview`,'POST',uncertainInput),uncertainOperation={...uncertainInput,digest:uncertainReview.digest,operationId:crypto.randomUUID(),confirmed:true};
  assert.equal((await f.request(`${path}/handoffs`,'POST',uncertainOperation)).status,502);assert.equal((await call(`${path}/handoffs`,'POST',uncertainOperation)).state,'uncertain');assert.equal(edge.creates.length,2);edge.setUncertain(false);
  edge.setRevoked(true);panel=await call(path);assert.equal(panel.state,'unavailable');assert.equal((await product()).state,'unresolved-setup');assert.equal(await f.db.prepare('SELECT count(*) n FROM support_credentials').first('n'),0);assert.equal((await f.request(`${path}/handoff-preview`,'POST',uncertainInput)).status,409);
  edge.setRevoked(false);await call('settings/zendesk/connect','POST',connect);assert.equal((await call(path)).state,'unavailable','Reconnect alone does not reactivate the old mapping');
  const remap=await call(`${path}/mapping-preview`,'POST',{organizationId:'11'});await call(`${path}/mapping`,'PUT',{organizationId:'11',digest:remap.digest,confirmed:true});assert.ok((await call(path)).tickets.length);
  await call('settings/zendesk/disconnect','POST',{});assert.equal((await call(path)).state,'unavailable');assert.equal((await product()).state,'unresolved-setup');assert.equal((await f.request(`${path}/handoffs`,'POST',uncertainOperation)).status,409);assert.equal((await signed()).status,409);assert.equal(await f.db.prepare('SELECT count(*) n FROM support_credentials').first('n'),0);
 }finally{globalThis.fetch=originalFetch;}
}

async function proveZendeskArchive(f:Fixture,edge:ReturnType<typeof zendeskNetwork>,companyId:string,operation:any,raw:string,timestamp:string){
 const request=async(path:string,method='GET',body?:unknown)=>{const r=await f.request(path,method,body);assert.ok(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;};
 let job=await request('records/archive/exports','POST',{});while(job.state==='preparing')job=await request(`records/archive/exports/${job.id}/advance`,'POST',{});const archive=await request(`records/archive/exports/${job.id}/download`);
 assert.ok(!archive.manifest.tables.some((t:any)=>t.name==='support_credentials'));assert.ok(!JSON.stringify(archive).includes(edge.signingSecret)&&!JSON.stringify(archive).includes(edge.email));
 for(const table of ['support_installation','support_mappings','support_tickets','support_handoffs','support_webhooks'])assert.ok(archive.manifest.tables.find((t:any)=>t.name===table)?.rows>0,`${table} is populated at export`);
 const target=await isolatedDatabase(),local=await isolatedDatabase();
 try{
  const deps=createDependencies(target.db),actor=createId();await deps.auth.ensureOperator({id:actor,email:['synthetic-orbit-restored','example.test'].join('@'),displayName:'synthetic-orbit-receiver'});await target.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(actor).run();await deps.workspace.ensureWorkspace({name:'synthetic-orbit-restore',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});let session=await deps.auth.createSession(actor);
  const app=createApp({database:target.db,assets:{fetch:async()=>new Response('')},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')})});
  const call=async(path:string,method='GET',body?:unknown)=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const ok=async(path:string,method='GET',body?:unknown)=>{const r=await call(path,method,body);assert.ok(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;};
  let restored=await ok('records/archive/imports','POST',{manifest:archive.manifest,confirmed:true});for(const part of archive.parts)await ok(`records/archive/imports/${restored.id}/parts/${part.index}`,'PUT',part);for(let i=0;i<1000&&restored.state!=='complete';i++)restored=await ok(`records/archive/imports/${restored.id}/finalize`,'POST',{});assert.equal(restored.state,'complete');
  session=await deps.auth.createSession(actor);
  assert.equal((await ok('settings/zendesk')).state,'unresolved-setup');assert.equal((await ok(`support/zendesk/companies/${companyId}`)).state,'unavailable');assert.equal(await target.db.prepare('SELECT count(*) n FROM support_credentials').first('n'),0);
  for(const table of ['support_tickets','support_handoffs','support_webhooks'])assert.deepEqual((await target.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results,(await f.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results,`${table} populated provenance round-trips`);
  const before=edge.creates.length;
  assert.equal((await call(`support/zendesk/companies/${companyId}/handoffs`,'POST',operation)).status,409);
  await ok('settings/zendesk/connect','POST',{subdomain:edge.subdomain,email:edge.email,token:edge.token,signingSecret:edge.signingSecret});assert.equal((await ok(`support/zendesk/companies/${companyId}`)).state,'unavailable','Restored mapping needs fresh review even after reconnect');
  assert.equal((await app.request('https://orbit.test/api/v1/support/zendesk/webhook',{method:'POST',headers:{'X-Zendesk-Webhook-Signature-Timestamp':timestamp,'X-Zendesk-Webhook-Signature':createHmac('sha256',edge.signingSecret).update(timestamp+raw).digest('base64')},body:raw})).status,409,'Previously recorded webhook cannot be replayed after restore');assert.equal(edge.creates.length,before);
  await localArchiveRoundTrip(f.db,local.db);
  assert.equal(await local.db.prepare('SELECT count(*) n FROM support_credentials').first('n'),0);assert.equal(await local.db.prepare("SELECT count(*) n FROM support_installation WHERE state='paused'").first('n'),1);assert.equal(await local.db.prepare('SELECT count(*) n FROM support_mappings WHERE generation IS NOT NULL').first('n'),0);
  for(const table of ['support_tickets','support_handoffs','support_webhooks'])assert.deepEqual((await local.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results,(await f.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results,`CLI ${table} populated history round-trips`);
 }finally{await target.dispose();await local.dispose();await request(`records/archive/exports/${job.id}`,'DELETE');}
}
