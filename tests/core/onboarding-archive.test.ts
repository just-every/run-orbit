import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {mailedIdentity} from '../support/email-link';
import {identityResponse} from '../../src/core/features/identity';

test('DATA-001 local archive restores records and keeps the hosted owner able to sign in by mail without reviving sessions',async()=>{
 const source=await launchFixture(),target=await launchFixture();
 const request=async(f:Awaited<ReturnType<typeof launchFixture>>,path:string,method='GET',body?:unknown)=>{const response=await f.request(path,method,body);assert.ok(response.ok,`${method} ${path}: ${response.status} ${(await response.clone().text()).slice(0,300)}`);return response.json() as Promise<any>;};
 try{
 await source.db.prepare("UPDATE operators SET email='owner@orbit.test',setup_owner=1 WHERE id=?").bind(source.actor).run();
 await target.db.prepare("UPDATE operators SET email='hosted-owner@example.test',setup_owner=1 WHERE id=?").bind(target.actor).run();
 await request(target,'../v2/access/workspaces/workspace/invitations','POST',{email:'old-guest@example.test',role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()});
 const customer=await request(source,'records/contact','POST',{name:'Archive customer',email:'archive@example.test'});
 for(const origin of ['https://*.example.test','https://website.example/path','http://website.example','https://user@website.example'])assert.equal((await source.request('settings/form-embedding','PUT',{origins:[origin]})).status,400);
 await request(source,'settings/form-embedding','PUT',{origins:['https://website.example']});
 let exported=await request(source,'records/archive/exports','POST',{});
 for(let n=0;n<300&&exported.state!=='ready';n++)exported=await request(source,`records/archive/exports/${exported.id}/advance`,'POST',{});
 assert.equal(exported.state,'ready');
 const archive=await request(source,`records/archive/exports/${exported.id}/download`);
 for(const tables of [archive.manifest.tables.filter((t:any)=>t.name!=='form_embed_origins'),[...archive.manifest.tables,{name:'unknown_records',columns:['id'],rows:0}]]){
  assert.equal((await target.request('records/archive/imports','POST',{confirmed:true,manifest:{...archive.manifest,tables}})).status,400);
 }
 let imported=await request(target,'records/archive/imports','POST',{confirmed:true,manifest:archive.manifest});
 for(const part of archive.parts)await request(target,`records/archive/imports/${imported.id}/parts/${part.index}`,'PUT',part);
 for(let n=0;n<700&&imported.state!=='complete';n++){imported=await request(target,`records/archive/imports/${imported.id}/finalize`,'POST',{});assert.ok(imported.completedTables<=imported.totalTables);assert.ok(imported.completedSteps<=imported.totalSteps);}
 assert.equal(imported.state,'complete');
 assert.equal(imported.completedSteps,imported.totalSteps);assert.equal(imported.nextPart,archive.manifest.parts);
 assert.deepEqual(await target.db.prepare('SELECT email,status,setup_owner FROM operators WHERE id=?').bind(target.actor).first(),{email:'hosted-owner@example.test',status:'active',setup_owner:1});
 assert.equal((await target.db.prepare('SELECT setup_owner FROM operators WHERE id=?').bind(source.actor).first<{setup_owner:number}>())?.setup_owner,0);
 assert.equal((await target.db.prepare('SELECT email FROM contacts WHERE id=?').bind(customer.id).first<{email:string}>())?.email,'archive@example.test');
 assert.deepEqual((await target.db.prepare('SELECT origin FROM form_embed_origins').all<{origin:string}>()).results.map(row=>row.origin),['https://website.example']);
 assert.equal(await target.db.prepare('SELECT id FROM sessions LIMIT 1').first(),null,'Restoring never revives source or destination sessions');
 const mail=mailedIdentity(target.db),options={ownerClaimed:async()=>true,mailSender:mail.mailSender};
 assert.equal((await identityResponse(mail.post('/auth/magic-link',{json:{email:'hosted-owner@example.test'}}),mail.bindings,options))?.status,202);
 const link=mail.linkIn(mail.sent.at(-1));assert.ok(link,'The retained hosted owner receives a sign-in email');
 const confirmation=await identityResponse(mail.post('/auth/confirm',{form:{token:new URL(link).searchParams.get('token')!}}),mail.bindings,options);
 const cookie=confirmation?.headers.get('set-cookie');assert.ok(cookie);
 const restoredSettings=await target.request('settings','GET',undefined,{Cookie:cookie.split(';')[0]!});assert.equal(restoredSettings.status,200);
 assert.ok(!(await restoredSettings.json() as any).operators.some((operator:any)=>operator.email==='old-guest@example.test'),'A destination collaborator never becomes a full restored operator');

 }finally{await source.dispose();await target.dispose();}
});
