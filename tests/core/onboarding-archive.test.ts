import {issueNativeCredential} from '../support/api-credentials-proof';
import {preCallingCatalog} from '../../src/core/features/records/archive-generations';
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
import {isolatedDatabase} from '../support/isolated-database';
import {localArchiveRoundTrip} from '../support/capture-privacy-archive';
import {foldInstalledCatalog,foldSchemaHash} from '../../src/core/features/records/archive-fold-catalog';
import {preOptOutCapabilityCatalog} from '../../src/core/features/records/archive-generations';
import {preForecastCatalog} from '../../src/core/features/records/forecast-archive-compatibility';
import {preLibraryCatalog} from '../../src/core/features/records/library-archive-compatibility';
import {preCaptureMailRuleCatalog} from '../../src/core/features/capture/archive';
import {preRecordMailCatalog} from '../../src/core/features/outreach/record-mail-archive';
import {preFormAssignmentCatalog} from '../../src/core/features/forms/archive';
import {preOwnershipCatalog} from '../../src/core/features/ownership/archive';
import {preDashboardCatalog} from '../../src/core/features/dashboards/archive';
import {preSlackCatalog} from '../../src/core/features/slack/archive';
import {preReportShareCatalog} from '../../src/core/features/analytics/archive-compatibility';
import {archiveHash,type ArchivePart} from '../../src/core/features/records/archive-schema';
import {nativeCatalogGenerations} from '../../src/core/features/records/archive-generations';
import {removeSourceWithEvidence,assertRemovedSourceEvidence} from '../support/removed-source-proof';

function sourceRequests(db:D1Database,cookie:string){
 const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')})});
 const request=(path:string,method='GET',body?:unknown)=>app.request(`https://orbit.test/api/v1/sources${path}`,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const signed=(secret:string,id='website')=>{const body=JSON.stringify({eventId:crypto.randomUUID(),type:'form.submitted',subject:'Restored source inquiry',occurredAt:new Date().toISOString(),email:'archive@example.test'}),timestamp=String(Math.floor(Date.now()/1000));return app.request(`https://orbit.test/api/v1/signals/${id}`,{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex')},body});};
 return {request,signed};
}

test('API-001 credentials stay local while DATA-001 local archive restores records and keeps the hosted owner able to sign in by mail without reviving sessions',async()=>{
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
 const removedSource=await removeSourceWithEvidence(source.db,connected,customer.id);
 const trialOwned=await source.customer('trial-owned@example.test');
 await source.db.prepare('UPDATE opportunities SET owner_id=? WHERE id=?').bind(source.actor,trialOwned.opportunityId).run();
 const apiCredential=await issueNativeCredential(source.db,source.actor,trialOwned.opportunityId);
 const scheduled=await source.message(trialOwned.contactId,trialOwned.opportunityId);
 const libraryRows=['template','snippet','signature'].map((kind,index)=>({id:createId(),kind,name:`Archive ${kind}`,subject:kind==='template'?'Hello {{contact.name}}':'',body:`Saved ${kind} 雪`,visibility:index===1?'private':'shared',owner_id:source.actor,revision:index+1,updated_at:new Date().toISOString()}));
 for(const row of libraryRows)await source.db.prepare('INSERT INTO message_library(id,kind,name,subject,body,visibility,owner_id,revision,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(...Object.values(row)).run();
 const draft=createId(),draftMetadata={library_selection_json:JSON.stringify(Object.fromEntries(libraryRows.map(row=>[row.kind,{id:row.id,revision:row.revision}]))),merge_review_json:null};
 await source.db.prepare('INSERT INTO drafts(id,opportunity_id,author_id,recipient_contact_id,recipient_email,subject,body,created_at,updated_at,library_selection_json) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(draft,trialOwned.opportunityId,source.actor,trialOwned.contactId,trialOwned.email,'Archive draft','Saved draft body',new Date().toISOString(),new Date().toISOString(),draftMetadata.library_selection_json).run();
 const capability={token:randomBytes(32).toString('hex'),message_id:scheduled.id,contact_id:trialOwned.contactId,origin:'https://orbit.test',created_at:new Date().toISOString()};
 await source.db.batch([
  source.db.prepare('INSERT INTO outbound_message_opt_out VALUES(?,1,\'added\')').bind(scheduled.id),
  source.db.prepare('INSERT INTO outbound_opt_out_capabilities VALUES(?,?,?,?,?)').bind(capability.token,capability.message_id,capability.contact_id,capability.origin,capability.created_at),
 ]);
 const approvedOptOut=await source.db.prepare('SELECT * FROM outbound_message_opt_out WHERE message_id=?').bind(scheduled.id).first();
 for(const origin of ['https://*.example.test','https://website.example/path','http://website.example','https://user@website.example'])assert.equal((await source.request('settings/form-embedding','PUT',{origins:[origin]})).status,400);
 await request(source,'settings/form-embedding','PUT',{origins:['https://website.example']});
 let exported=await request(source,'records/archive/exports','POST',{});
 for(let n=0;n<300&&exported.state!=='ready';n++)exported=await request(source,`records/archive/exports/${exported.id}/advance`,'POST',{});
 assert.equal(exported.state,'ready');
 const archive=await request(source,`records/archive/exports/${exported.id}/download`);
 assert.ok(!JSON.stringify(archive).includes(apiCredential.secret));assert.ok(!archive.manifest.tables.some((table:{name:string})=>table.name==='api_credentials'));
 const exportedLibrary=archive.parts.flatMap((part:ArchivePart)=>part.records).filter((record:ArchivePart['records'][number])=>record.table==='message_library').map((record:ArchivePart['records'][number])=>record.row);
 assert.deepEqual(exportedLibrary.sort((a:any,b:any)=>a.id.localeCompare(b.id)),libraryRows.sort((a,b)=>a.id.localeCompare(b.id)));
 assert.deepEqual(archive.parts.flatMap((part:ArchivePart)=>part.records).filter((record:ArchivePart['records'][number])=>record.table==='outbound_opt_out_capabilities').map((record:ArchivePart['records'][number])=>record.row),[capability]);
 assert.ok(archive.parts.flatMap((part:any)=>part.records).filter((record:any)=>record.table==='signal_sources').every((record:any)=>record.row.secret_ciphertext===undefined),'Signing credentials do not travel in archives');
 const archivedSignal=archive.parts.flatMap((part:ArchivePart)=>part.records).find((record:ArchivePart['records'][number])=>record.table==='signals'&&record.row.id===removedSource.signalId);
 assert.deepEqual(archivedSignal?.row,removedSource.signal,'Removing a source retains the complete immutable evidence in exports');
 const previousCatalog=nativeCatalogGenerations(await foldInstalledCatalog(source.db)).find(catalog=>!catalog.find(table=>table.name==='signal_sources')!.columns.some(column=>column.name==='removed_at'))!;
 const previousTables=previousCatalog.map(table=>({...archive.manifest.tables.find((item:any)=>item.name===table.name)!,columns:table.columns.map(column=>column.name)}));
 const previousManifest={...archive.manifest,schemaHash:await foldSchemaHash(previousCatalog),tables:previousTables,rows:previousTables.reduce((total,table)=>total+table.rows,0)};
 const previousImport=await request(target,'records/archive/imports','POST',{confirmed:true,manifest:previousManifest});
 await request(target,`records/archive/imports/${previousImport.id}/abort`,'POST',{});
 for(const tables of [archive.manifest.tables.filter((t:any)=>t.name!=='form_embed_origins'),[...archive.manifest.tables,{name:'unknown_records',columns:['id'],rows:0}]]){
  assert.equal((await target.request('records/archive/imports','POST',{confirmed:true,manifest:{...archive.manifest,tables}})).status,400);
 }
 const restore=async(destination:typeof target,document:typeof archive)=>{
  let imported=await request(destination,'records/archive/imports','POST',{confirmed:true,manifest:document.manifest});
  for(const part of document.parts)await request(destination,`records/archive/imports/${imported.id}/parts/${part.index}`,'PUT',part);
  for(let n=0;n<700&&imported.state!=='complete';n++){imported=await request(destination,`records/archive/imports/${imported.id}/finalize`,'POST',{});assert.ok(imported.completedTables<=imported.totalTables);assert.ok(imported.completedSteps<=imported.totalSteps);}
  assert.equal(imported.state,'complete');
  assert.equal(imported.completedSteps,imported.totalSteps);assert.equal(imported.nextPart,document.manifest.parts);
 };
 const historicalCatalog=preSlackCatalog(preReportShareCatalog(preDashboardCatalog(preOwnershipCatalog(preFormAssignmentCatalog(preRecordMailCatalog(preCaptureMailRuleCatalog(preCallingCatalog(await foldInstalledCatalog(source.db)))))))));
 for(const catalog of [preLibraryCatalog(historicalCatalog),preForecastCatalog(preOptOutCapabilityCatalog(preLibraryCatalog(historicalCatalog)))]){
 const previous=await launchFixture();
 try{
  const names=new Set(catalog.map(table=>table.name)),columns=new Map(catalog.map(table=>[table.name,new Set(table.columns.map(column=>column.name))]));
  const parts:ArchivePart[]=[];
  for(const part of archive.parts as ArchivePart[]){const records=part.records.filter(record=>names.has(record.table)).map(record=>({...record,row:Object.fromEntries(Object.entries(record.row).filter(([column])=>columns.get(record.table)!.has(column)))}));if(records.length)parts.push({index:parts.length,records,sha256:await archiveHash(records)});}
  const tables=archive.manifest.tables.filter((table:{name:string})=>names.has(table.name)).map((table:{name:string;columns:string[]})=>({...table,columns:table.columns.filter(column=>columns.get(table.name)!.has(column))}));
  const schemaHash=await foldSchemaHash(catalog);
  await restore(previous,{...archive,parts,manifest:{...archive.manifest,tables,schemaHash,parts:parts.length,rows:tables.reduce((sum:number,table:{rows:number})=>sum+table.rows,0)}});
  assert.deepEqual(await previous.db.prepare('SELECT * FROM outbound_message_opt_out WHERE message_id=?').bind(scheduled.id).first(),approvedOptOut,'The released opt-out binding survives an archive without capabilities');
  assert.equal(await previous.db.prepare('SELECT email FROM contacts WHERE id=?').bind(customer.id).first('email'),'archive@example.test');
  assert.equal(await previous.db.prepare('SELECT count(*) FROM outbound_opt_out_capabilities').first('count(*)'),names.has('outbound_opt_out_capabilities')?1:0,'Restoring old messages never invents capability authority');
  assert.equal(await previous.db.prepare('SELECT count(*) FROM message_library').first('count(*)'),0,'An older generation does not invent library entries');
  assert.deepEqual(await previous.db.prepare('SELECT library_selection_json,merge_review_json FROM drafts WHERE id=?').bind(draft).first(),{library_selection_json:'{}',merge_review_json:null},'Historical draft rows receive the additive migration defaults');
 }finally{await previous.dispose();}
 }
 const local=await isolatedDatabase();
 try{
  await localArchiveRoundTrip(source.db,local.db);
  assert.equal(await local.db.prepare('SELECT count(*) FROM api_credentials').first('count(*)'),0,'CLI restore creates no API credential authority');
  assert.deepEqual((await local.db.prepare('SELECT * FROM message_library ORDER BY id').all()).results,libraryRows,'The local CLI preserves library content, permissions, ownership and revision');
  assert.deepEqual(await local.db.prepare('SELECT library_selection_json,merge_review_json FROM drafts WHERE id=?').bind(draft).first(),draftMetadata);
  assert.deepEqual(await local.db.prepare('SELECT * FROM outbound_opt_out_capabilities WHERE token=?').bind(capability.token).first(),capability,'The local CLI preserves the exact capability and origin');
  assert.deepEqual(await local.db.prepare('SELECT * FROM outbound_message_opt_out WHERE message_id=?').bind(scheduled.id).first(),approvedOptOut);
  assert.deepEqual(await local.db.prepare('SELECT * FROM signal_sources WHERE id=?').bind(removedSource.id).first(),removedSource.source,'The local archive keeps removed sources retired');
  assert.deepEqual(await local.db.prepare('SELECT * FROM signals WHERE id=?').bind(removedSource.signalId).first(),removedSource.signal);
 }finally{await local.dispose();}
 await restore(target,archive);
 assert.equal(await target.db.prepare('SELECT count(*) FROM api_credentials').first('count(*)'),0,'Records restore creates no API credential authority');
 assert.deepEqual((await target.db.prepare('SELECT * FROM message_library ORDER BY id').all()).results,libraryRows,'Records restore preserves library content, permissions, ownership and revision');
 assert.deepEqual(await target.db.prepare('SELECT library_selection_json,merge_review_json FROM drafts WHERE id=?').bind(draft).first(),draftMetadata);
 assert.deepEqual(await target.db.prepare('SELECT * FROM outbound_opt_out_capabilities WHERE token=?').bind(capability.token).first(),capability,'Records restore preserves the exact capability and origin');
 assert.deepEqual(await target.db.prepare('SELECT * FROM outbound_message_opt_out WHERE message_id=?').bind(scheduled.id).first(),approvedOptOut);
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
 await assertRemovedSourceEvidence(target.db,restored,removedSource,customer.id);
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
 const erased=await target.request(`records/contact/${customer.id}`,'DELETE',{confirmed:true},{Cookie:cookie.split(';')[0]!});assert.equal(erased.status,200,await erased.text());
 assert.equal(await target.db.prepare('SELECT id FROM signals WHERE id=?').bind(removedSource.signalId).first(),null,'Contact erasure still removes evidence belonging to a removed source');
 assert.equal(await target.db.prepare('SELECT id FROM timeline_entries WHERE id=?').bind(removedSource.signalId).first(),null);
 assert.ok(await target.db.prepare('SELECT removed_at FROM signal_sources WHERE id=?').bind(removedSource.id).first('removed_at'),'Erasure never reconnects a removed source');
 }finally{await source.dispose();await target.dispose();}
});
