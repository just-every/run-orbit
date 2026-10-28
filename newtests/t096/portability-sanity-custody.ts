import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHmac} from 'node:crypto';
import {removeSourceWithEvidence,assertRemovedSourceEvidence} from '../../tests/support/removed-source-proof';
import {captureFixture,eml} from '../../tests/support/capture-fixture';
import {captured} from '../../tests/support/capture-data-archive';
import {currentSalesData} from '../../tests/support/current-sales-data';
import {proveCurrentArchive} from '../../tests/support/current-sales-archive';
import {populateSalesPortability} from '../../tests/support/sales-sanity-portability';
import {portableLibrary} from './portability-sanity-library';
import {portableReports} from './portability-sanity-reports';
import {createApp,TEST_SESSION_SECRET} from '../../tests/support/app';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {connectSource} from '../../src/core/features/capture/sources';
import {OutreachRepository} from '../../src/core/features/workbench/outreach-repository';
import {ApprovalRepository} from '../../src/core/features/outreach/approval-repository';
import {archiveHash} from '../../src/core/features/records/archive-schema';
import {readArchiveFile} from '../../src/core/shared/archive-file';
import {fixture,signIn} from './fixture';
import {emittedWorker} from './emitted-fixture';
import {emittedRequest} from './emitted-request';
import {rerTransfer} from './rer-transfer';

type Door=(path:string,init?:RequestInit)=>Promise<Response>;
const ownerDDL=[
 'CREATE TABLE owner_portability(id TEXT PRIMARY KEY,payload BLOB,marker TEXT,amount INTEGER,ratio REAL,optional TEXT)',
 'CREATE TABLE owner_generated(id TEXT PRIMARY KEY,amount INTEGER,twice INTEGER GENERATED ALWAYS AS(amount*2) STORED) WITHOUT ROWID',
 'CREATE INDEX owner_portability_amount ON owner_portability(amount)',
 'CREATE VIEW owner_portability_view AS SELECT id,marker FROM owner_portability',
 'CREATE TRIGGER owner_portability_update INSTEAD OF UPDATE ON owner_portability_view BEGIN UPDATE owner_portability SET marker=NEW.marker WHERE id=OLD.id; END',
];
async function installOwnerSchema(db:D1Database){for(const ddl of ownerDDL)await db.prepare(ddl).run();}
async function typedRows(db:D1Database){return(await db.prepare('SELECT id,hex(payload) bytes,typeof(payload) storage,marker,amount,ratio,optional FROM owner_portability ORDER BY id').all()).results;}
const json=(body:unknown,method='POST')=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
async function value(door:Door,path:string,body?:unknown,method?:string){const response=await door(path,body===undefined?undefined:json(body,method));assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;}

/** Real source routes with this fixture's encrypted credential custody and sign-in. */
function sourceClient(db:D1Database,cookie:string,contactId:string){
 const app=createApp({database:db,assets:{fetch:async()=>new Response('')},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'44'.repeat(32)})!});
 return{
  request(path:string,method='GET',body?:unknown){return app.request('https://orbit.test/api/v1/sources'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});},
  signed(secret:string,id='website'){
   const body=JSON.stringify({eventId:crypto.randomUUID(),type:'form.submitted',subject:'Retained source inquiry',occurredAt:new Date().toISOString(),record:{type:'contact',id:contactId}}),timestamp=String(Math.floor(Date.now()/1000));
   return app.request('https://orbit.test/api/v1/signals/'+id,{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex')},body});
  }
 };
}

/** One installation contains every current category before either archive door is exercised. */
export async function populatedPortabilityJourney(){
 const original=await captureFixture(),target=await fixture();let cookie=original.cookie,worker:Awaited<ReturnType<typeof emittedWorker>>|undefined;
 const source={...original,get db(){return original.platform.db;},get cookie(){return cookie;},get app(){return createApp({database:original.platform.db,assets:{fetch:async()=>new Response('')},formAbuse:{secret:TEST_SESSION_SECRET}});},request(path:string,init:RequestInit={}){return this.app.request('https://orbit.test'+path,{...init,headers:{Cookie:cookie,Origin:'https://orbit.test',...init.headers}});}};
 try{
  await captured(source);await installOwnerSchema(source.db);await installOwnerSchema(target.db);
  await source.db.prepare('INSERT INTO owner_portability VALUES(?,?,?,?,?,?)').bind('typed',Uint8Array.of(0,1,127,128,255).buffer,'orbit-cell-v1:blob:ordinary text',Number.MAX_SAFE_INTEGER,2.75,null).run();
  await source.db.prepare("INSERT INTO owner_generated(id,amount) VALUES('generated',7)").run();
  const beforeTyped=await typedRows(source.db),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'44'.repeat(32)})!;
  await connectSource(source.db,{id:'capture-provider',adapter:'fake-mail',name:'Provider mailbox',scope:{mail:{folders:['INBOX']}},credential:'synthetic-orbit-provider-grant'},security,source.operator);
  const sealed=await source.db.prepare("SELECT ciphertext FROM capture_credentials WHERE source_id='capture-provider'").first<string>('ciphertext');
  const data=await currentSalesData(source),sales=await populateSalesPortability(source),reports=await portableReports(source),library=await portableLibrary(source);
  const stopped=await value(source.request.bind(source),'/api/v1/records/contact',{name:'Erased source',email:'source-erased@acme.example',contactability:'do_not_contact'});
  const erasedMail=eml({From:'source-erased@acme.example',To:'seller@orbit.test',Date:new Date(Date.now()-60000).toUTCString(),Subject:'Erased source evidence','Message-ID':'<source-erased@acme.example>'},'Source private evidence');
  assert.equal((await source.upload([{name:'source-erased.eml',text:erasedMail}])).status,201);
  await value(source.request.bind(source),`/api/v1/records/contact/${stopped.id}`,{confirmed:true},'DELETE');
  const anonymous=(await source.db.prepare("SELECT entity_id,details_json FROM audit_entries WHERE action IN('capture.erased_item','capture.erased_mailbox')").all<{entity_id:string;details_json:string}>()).results;assert.ok(anonymous.length>=2);assert.ok(anonymous.every(row=>/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(row.entity_id)&&row.details_json==='{}'));
  const handoff=await source.db.prepare('SELECT id FROM handoff_tasks LIMIT 1').first<string>('id');assert.ok(handoff);
  await source.db.prepare('DELETE FROM opportunity_contacts WHERE opportunity_id=? AND contact_id=?').bind(source.opportunity,source.ana).run();
  const handoffContacts=(await source.db.prepare('SELECT * FROM handoff_contacts ORDER BY 1,2').all()).results;
  // Destination privacy history is private installation state; importing must union it with source history.
  await target.db.prepare('UPDATE operators SET email=? WHERE id=?').bind('hosted-owner@portability.test',target.operator.operatorId).run();
  let receiverCookie=(await signIn(target.db,'hosted-owner@portability.test')).cookie;
  const destinationApp=()=>createApp({database:target.db,assets:{fetch:async()=>new Response('')},formAbuse:{secret:TEST_SESSION_SECRET}});
  const destination:Door=(path,init={})=>destinationApp().request('https://orbit.test'+path,{...init,headers:{Cookie:receiverCookie,Origin:'https://orbit.test',...init.headers}});
  const erased=await value(destination,'/api/v1/records/contact',{name:'Erased destination',email:'destination@acme.example',contactability:'do_not_contact'});
  await value(destination,`/api/v1/records/contact/${erased.id}`,{confirmed:true},'DELETE');
  const retained=(await target.db.prepare("SELECT id FROM audit_entries WHERE action='capture.erased_mailbox'").all<{id:string}>()).results;assert.ok(retained.length);
  cookie=(await signIn(source.db,'seller@orbit.test')).cookie;
  const removedSource=await removeSourceWithEvidence(source.db,sourceClient(source.db,cookie,source.ana),source.ana);
  // Population edits intentionally stale earlier work; retain one newly reviewed dispatch approval to prove that both doors strip it.
  const freshDraft=await new OutreachRepository(source.db).createDraft(source.opportunity,{contactId:source.bob,subject:'Reviewed immediately before export',body:'Requires receiver review'},source.operator);
  assert.equal((await new ApprovalRepository(source.db).approve(freshDraft.id,1,source.operator,{scheduledAt:new Date(Date.now()+2*86400000).toISOString()})).state,'scheduled');
  const reportTables=(await source.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name GLOB 'forecast_*' OR name GLOB 'sales_dashboard*') AND name<>'forecast_source_clock'").all<{name:string}>()).results.map(row=>row.name),reportRows=new Map<string,Record<string,unknown>[]>();
  for(const name of reportTables)reportRows.set(name,(await source.db.prepare(`SELECT * FROM ${name}`).all<Record<string,unknown>>()).results);
  const stable=(rows:Record<string,unknown>[])=>rows.map(row=>JSON.stringify(row)).sort();
  const file=join(original.platform.directory,'populated.rer'),session=join(original.platform.directory,'session');await writeFile(session,cookie,{mode:0o600});
  worker=await emittedWorker(original.platform);
  const exported=await rerTransfer('export',worker.origin,session,file,worker.certificate.certPath);assert.equal(exported.ok,true,exported.stderr);
  const archive=JSON.parse(await readFile(file,'utf8')),text=JSON.stringify(archive);assert.ok(text.includes('Can we talk on Tuesday?'));assert.ok(!text.includes(sealed!)&&!text.includes('synthetic-orbit-provider-grant'));
  library.assertExport(archive);
  const removedSignal=archive.parts.flatMap((part:any)=>part.records).find((record:any)=>record.table==='signals'&&record.row.id===removedSource.signalId);assert.deepEqual(removedSignal?.row,removedSource.signal,'Export retains immutable evidence from a removed source');assert.ok(!text.includes(removedSource.secret),'A removed signing credential never travels');
  const entries=[];for await(const entry of readArchiveFile(new Response(await readFile(file,'utf8')).body!))entries.push(entry);assert.equal(entries.length,archive.manifest.parts+1);
  const exports=await (await emittedRequest(worker,cookie,'/api/v1/records/archive/exports')).json() as any;const exportId=exports.jobs[0].id;
  await worker.dispose();worker=undefined;await original.platform.reopen();
  const receiverSession=join(target.target.directory,'session');await writeFile(receiverSession,receiverCookie,{mode:0o600});worker=await emittedWorker(target.target);
  const variants=[{name:'truncated',text:(await readFile(file,'utf8')).replace(/\n\]}\s*$/,'\n')},{name:'checksum',text:(await readFile(file,'utf8')).replace(archive.parts[0].sha256,'0'.repeat(64))}];
  const mistyped=structuredClone(archive),part=mistyped.parts.find((p:any)=>p.records.some((r:any)=>r.table==='owner_portability'));part.records.find((r:any)=>r.table==='owner_portability').row.amount=1.5;part.sha256=await archiveHash(part.records);variants.push({name:'unsafe-scalar',text:JSON.stringify({format:mistyped.format,version:mistyped.version,manifest:mistyped.manifest}).slice(0,-1)+',"parts":[\n'+mistyped.parts.map((p:any,i:number)=>(i?',':'')+JSON.stringify(p)).join('\n')+'\n]}\n'});
  for(const variant of variants){const invalid=join(original.platform.directory,variant.name+'.rer');await writeFile(invalid,variant.text,{mode:0o600});const refused=await rerTransfer('import',worker.origin,receiverSession,invalid,worker.certificate.certPath);assert.equal(refused.ok,false,variant.name);const jobs=await(await emittedRequest(worker,receiverCookie,'/api/v1/records/archive/imports')).json() as any;for(const job of jobs.jobs)assert.equal((await emittedRequest(worker,receiverCookie,`/api/v1/records/archive/imports/${job.id}/abort`,'POST',{})).status,200);}
  assert.equal((await emittedRequest(worker,receiverCookie,`/api/v1/records/contact/${source.ana}`)).status,404);
  const imported=await rerTransfer('import',worker.origin,receiverSession,file,worker.certificate.certPath);assert.equal(imported.ok,true,imported.stderr);
  await worker.dispose();worker=undefined;await target.target.reopen();
  assert.equal(await target.db.prepare('SELECT count(*) n FROM sessions').first('n'),0);
  assert.equal(await target.db.prepare('SELECT status FROM operators WHERE id=?').bind(source.operator).first('status'),'removed','the hosted owner replaces source owner access while retaining its attribution');
  receiverCookie=(await signIn(target.db,'hosted-owner@portability.test')).cookie;
  worker=await emittedWorker(target.target);const restarted=await emittedRequest(worker,receiverCookie,`/api/v1/records/contact/${source.ana}`);assert.equal(restarted.status,200);assert.equal((await restarted.json() as any).record.email,'ana@acme.example');assert.equal((await emittedRequest(worker,cookie,'/api/v1/records')).status,401);
  await worker.dispose();worker=undefined;await target.target.reopen();
  for(const proof of retained)assert.ok(await target.db.prepare('SELECT 1 FROM audit_entries WHERE id=?').bind(proof.id).first());
  const restored=async(db:D1Database,door:Door)=>{
   const owner=await db.prepare("SELECT email FROM operators WHERE setup_owner=1 AND status='active'").first<string>('email');assert.ok(owner);
   const sourceCookie=(await signIn(db,owner!)).cookie;await assertRemovedSourceEvidence(db,sourceClient(db,sourceCookie,source.ana),removedSource,source.ana);
   assert.deepEqual(await typedRows(db),beforeTyped);assert.equal(await db.prepare('SELECT twice FROM owner_generated').first('twice'),14);
   await db.prepare("UPDATE owner_portability_view SET marker='view still writes' WHERE id='typed'").run();assert.equal(await db.prepare('SELECT marker FROM owner_portability').first('marker'),'view still writes');await db.prepare("UPDATE owner_portability SET marker='orbit-cell-v1:blob:ordinary text'").run();
   assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);assert.deepEqual((await db.prepare('SELECT * FROM handoff_contacts ORDER BY 1,2').all()).results,handoffContacts);
   const replay=new FormData();replay.append('files',new File([erasedMail],'erased.eml'));assert.equal((await door('/api/v1/capture/imports',{method:'POST',body:replay})).status,201);assert.equal(await db.prepare("SELECT count(*) n FROM capture_items WHERE instr(headers||body,'source-erased@acme.example')>0").first('n'),0,'both archive doors preserve anonymous replay barriers');
   const recreated=await value(door,'/api/v1/records/contact',{name:'Recreated stopped address',email:' SOURCE-ERASED@ACME.EXAMPLE '}),stoppedRow=(await value(door,`/api/v1/records/contact/${recreated.id}`)).record;assert.equal(stoppedRow.contactability,'do_not_contact');
   await value(door,`/api/v1/records/contact/${recreated.id}/clear-do-not-contact`,{confirmed:true,email:stoppedRow.email,updatedAt:stoppedRow.updated_at,revision:stoppedRow.contactability_revision});assert.equal((await value(door,`/api/v1/records/contact/${recreated.id}`)).record.contactability,'contactable');
   for(const name of reportTables){const normalize=(row:Record<string,unknown>)=>name==='sales_dashboards'?{...row,authority:0}:name==='sales_dashboard_schedules'?{...row,state:'paused'}:row;assert.deepEqual(stable((await db.prepare(`SELECT * FROM ${name}`).all<Record<string,unknown>>()).results.map(normalize)),stable(reportRows.get(name)!.map(normalize)),`${name} complete contents survive both doors`);}
   await library.assertRestored(db);await sales.assertRestored(db,door);await reports.assertRestored({db,request:door});
  };
  await proveCurrentArchive(source,{get db(){return target.db;},actor:target.operator.operatorId},data,archive,{
   beforeCopy:installOwnerSchema,restored,
   afterComparison:async(db,door)=>{await restorePublication(db,door,data.forms,data.operation);},
   erased:async(db,door)=>{assert.equal(await db.prepare('SELECT id FROM signals WHERE id=?').bind(removedSource.signalId).first(),null,'Erasure removes retained evidence from a removed source');assert.equal(await db.prepare('SELECT id FROM timeline_entries WHERE id=?').bind(removedSource.signalId).first(),null);assert.ok(await db.prepare('SELECT removed_at FROM signal_sources WHERE id=?').bind(removedSource.id).first('removed_at'),'Erasure keeps the source retired');await sales.assertErased(db,door);await reports.assertErased({db,request:door});assert.equal(await db.prepare('SELECT id FROM handoff_tasks WHERE id=?').bind(handoff).first(),null);const raw=eml({From:'destination@acme.example',To:'seller@orbit.test',Date:new Date(Date.now()-60000).toUTCString(),Subject:'Destination history','Message-ID':'<destination-history@acme.example>'},'Old destination evidence'),form=new FormData();form.append('files',new File([raw],'old.eml'));assert.equal((await door('/api/v1/capture/imports',{method:'POST',body:form})).status,201);assert.equal(await db.prepare("SELECT count(*) n FROM capture_items WHERE instr(headers||body,'destination@acme.example')>0").first('n'),0);},
  });
  await source.request(`/api/v1/records/archive/exports/${exportId}/abort`,json({}));
 }finally{await worker?.dispose();await original.dispose();await target.close();}
}

async function restorePublication(db:D1Database,door:Door,forms:string,operation:string){
 const held=await value(door,forms+'/spam');assert.ok(held.length);assert.equal((await door(`${forms}/spam/${held[0].id}/release`,json({}))).status,403);
 const reviewed=await value(door,'/api/v2/workspaces/workspace/forms/publications/'+operation);assert.equal(reviewed.requiresAuthorization,true);
 const root='/api/v2/workspaces/workspace/forms/publications/'+operation,exact={artifactHash:reviewed.hash,formRevision:reviewed.formRevision};
 assert.equal((await door(root+'/approve',json(exact))).status,400);assert.equal((await door(root+'/publish',json({}))).status,400);
 await value(door,root+'/approve',{...exact,capture:{maxRecords:3,expiresAt:new Date(Date.now()+86400000).toISOString()}});await value(door,root+'/publish',{});
 const page=await door('/p/portability-enquiry');assert.equal(page.status,200);assert.equal(await page.text(),reviewed.html);
 const released=await value(door,`${forms}/spam/${held[0].id}/release`,{}),replayed=await value(door,`${forms}/spam/${held[0].id}/release`,{});assert.equal(replayed.submissionId,released.submissionId);
 assert.equal(await db.prepare("SELECT count(*) n FROM outbound_messages WHERE state='scheduled'").first('n'),0);
}
