import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {mailedIdentity} from '../support/email-link';
import {identityResponse} from '../../src/core/features/identity';
import {createApp} from '../support/app';
import {createDependencies} from '../support/dependencies';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {createHmac,randomBytes} from 'node:crypto';
import {createId} from '../../src/core/shared/ids';

function sourceRequests(db:D1Database,cookie:string){
 const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')})});
 const request=(path:string,method='GET',body?:unknown)=>app.request(`https://orbit.test/api/v1/sources${path}`,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const signed=(secret:string)=>{const body=JSON.stringify({eventId:crypto.randomUUID(),type:'form.submitted',subject:'Restored source inquiry',occurredAt:new Date().toISOString(),email:'archive@example.test'}),timestamp=String(Math.floor(Date.now()/1000));return app.request('https://orbit.test/api/v1/signals/website',{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex')},body});};
 return {request,signed};
}

test('DATA-001 local archive restores records and keeps the hosted owner able to sign in by mail without reviving sessions',async()=>{
 const source=await launchFixture(),target=await launchFixture();
 const request=async(f:Awaited<ReturnType<typeof launchFixture>>,path:string,method='GET',body?:unknown)=>{const response=await f.request(path,method,body);assert.ok(response.ok,`${method} ${path}: ${response.status} ${(await response.clone().text()).slice(0,300)}`);return response.json() as Promise<any>;};
 try{
 await source.db.prepare("UPDATE operators SET email='owner@orbit.test',setup_owner=1 WHERE id=?").bind(source.actor).run();
 await target.db.prepare("UPDATE operators SET email='hosted-owner@example.test',setup_owner=1 WHERE id=?").bind(target.actor).run();
 const teammate=createId();await createDependencies(source.db).auth.ensureOperator({id:teammate,email:'teammate@example.test',displayName:'Teammate'});
 const sourceSession=await createDependencies(source.db).auth.createSession(source.actor),connected=sourceRequests(source.db,`__Host-orbit_session=${sourceSession.token}`);
 const connection=await connected.request('/website','PUT',{name:'Website',enabled:true});assert.equal(connection.status,200);
 const {secret}=await connection.json() as {secret:string};
 assert.equal((await connected.request('').then(r=>r.json()) as any).sources.find((row:any)=>row.id==='website').has_signing_secret,1);
 await request(target,'../v2/access/workspaces/workspace/invitations','POST',{email:'old-guest@example.test',role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()});
 const customer=await request(source,'records/contact','POST',{name:'Archive customer',email:'archive@example.test'});
 const trialOwned=await source.customer('trial-owned@example.test');
 await source.db.prepare('UPDATE opportunities SET owner_id=? WHERE id=?').bind(source.actor,trialOwned.opportunityId).run();
 const scheduled=await source.message(trialOwned.contactId,trialOwned.opportunityId);
 for(const origin of ['https://*.example.test','https://website.example/path','http://website.example','https://user@website.example'])assert.equal((await source.request('settings/form-embedding','PUT',{origins:[origin]})).status,400);
 await request(source,'settings/form-embedding','PUT',{origins:['https://website.example']});
 let exported=await request(source,'records/archive/exports','POST',{});
 for(let n=0;n<300&&exported.state!=='ready';n++)exported=await request(source,`records/archive/exports/${exported.id}/advance`,'POST',{});
 assert.equal(exported.state,'ready');
 const archive=await request(source,`records/archive/exports/${exported.id}/download`);
 assert.ok(archive.parts.flatMap((part:any)=>part.records).filter((record:any)=>record.table==='signal_sources').every((record:any)=>record.row.secret_ciphertext===undefined),'Signing credentials do not travel in archives');
 for(const tables of [archive.manifest.tables.filter((t:any)=>t.name!=='form_embed_origins'),[...archive.manifest.tables,{name:'unknown_records',columns:['id'],rows:0}]]){
  assert.equal((await target.request('records/archive/imports','POST',{confirmed:true,manifest:{...archive.manifest,tables}})).status,400);
 }
 let imported=await request(target,'records/archive/imports','POST',{confirmed:true,manifest:archive.manifest});
 for(const part of archive.parts)await request(target,`records/archive/imports/${imported.id}/parts/${part.index}`,'PUT',part);
 for(let n=0;n<700&&imported.state!=='complete';n++){imported=await request(target,`records/archive/imports/${imported.id}/finalize`,'POST',{});assert.ok(imported.completedTables<=imported.totalTables);assert.ok(imported.completedSteps<=imported.totalSteps);}
 assert.equal(imported.state,'complete');
 assert.equal(imported.completedSteps,imported.totalSteps);assert.equal(imported.nextPart,archive.manifest.parts);
 assert.deepEqual(await target.db.prepare('SELECT email,status,setup_owner FROM operators WHERE id=?').bind(target.actor).first(),{email:'hosted-owner@example.test',status:'active',setup_owner:1});
 assert.deepEqual(await target.db.prepare('SELECT email,status,setup_owner FROM operators WHERE id=?').bind(source.actor).first(),{email:'owner@orbit.test',status:'removed',setup_owner:0});
 assert.equal((await target.db.prepare('SELECT status FROM operators WHERE id=?').bind(teammate).first<{status:string}>())?.status,'active','Real archived operators retain access');
 assert.equal((await target.db.prepare('SELECT owner_id FROM opportunities WHERE id=?').bind(trialOwned.opportunityId).first<{owner_id:string|null}>())?.owner_id,null);
 assert.equal((await target.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first<{state:string}>())?.state,'cancelled');
 assert.ok(await target.db.prepare('SELECT id FROM outbound_messages WHERE id=? AND operator_id=?').bind(scheduled.id,source.actor).first(),'Historical attribution keeps the trial identity');
 assert.equal((await target.db.prepare('SELECT email FROM contacts WHERE id=?').bind(customer.id).first<{email:string}>())?.email,'archive@example.test');
 assert.deepEqual((await target.db.prepare('SELECT origin FROM form_embed_origins').all<{origin:string}>()).results.map(row=>row.origin),['https://website.example']);
 assert.equal(await target.db.prepare('SELECT id FROM sessions LIMIT 1').first(),null,'Restoring never revives source or destination sessions');
 const mail=mailedIdentity(target.db),options={ownerClaimed:async()=>true,mailSender:mail.mailSender};
 assert.equal((await identityResponse(mail.post('/auth/magic-link',{json:{email:'owner@orbit.test'}}),mail.bindings,options))?.status,202);
 assert.equal(mail.sent.length,0,'The retired trial owner cannot receive a sign-in link');
 assert.equal((await identityResponse(mail.post('/auth/magic-link',{json:{email:'hosted-owner@example.test'}}),mail.bindings,options))?.status,202);
 const link=mail.linkIn(mail.sent.at(-1));assert.ok(link,'The retained hosted owner receives a sign-in email');
 const confirmation=await identityResponse(mail.post('/auth/confirm',{form:{token:new URL(link).searchParams.get('token')!}}),mail.bindings,options);
 const cookie=confirmation?.headers.get('set-cookie');assert.ok(cookie);
 const restoredSettings=await target.request('settings','GET',undefined,{Cookie:cookie.split(';')[0]!});assert.equal(restoredSettings.status,200);
 assert.ok(!(await restoredSettings.json() as any).operators.some((operator:any)=>operator.email==='old-guest@example.test'),'A destination collaborator never becomes a full restored operator');
 const restored=sourceRequests(target.db,cookie.split(';')[0]!);
 const sourceState=async()=>{const response=await restored.request('');assert.equal(response.status,200);const body=await response.json() as any;assert.ok(!JSON.stringify(body).includes(secret));return body.sources.find((row:any)=>row.id==='website');};
 assert.equal((await sourceState()).has_signing_secret,0,'An enabled restored source still needs reconnect when its secret was excluded');
 assert.equal((await restored.request('/website/test','POST',{contactId:customer.id})).status,403);
 assert.equal((await restored.signed(secret)).status,403);
 const reconnected=await restored.request('/website','PUT',{name:'Website',enabled:true});assert.equal(reconnected.status,200);
 const replacement=await reconnected.json() as {secret:string};assert.notEqual(replacement.secret,secret);
 assert.equal((await sourceState()).has_signing_secret,1);
 assert.equal((await restored.request('/website/test','POST',{contactId:customer.id})).status,201);
 assert.equal((await restored.signed(secret)).status,401);
 assert.equal((await restored.signed(replacement.secret)).status,201);
 }finally{await source.dispose();await target.dispose();}
});
