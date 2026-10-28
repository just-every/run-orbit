import assert from 'node:assert/strict';
import {fixtureMailbox,type CaptureFixture} from './capture-fixture';
import type {currentSalesData} from './current-sales-data';
import {archiveHash,type ArchivePart} from '../../src/core/features/records/archive-schema';
import {proveLocalSalesArchive,type PortabilityCopyHooks} from './current-sales-local';
import {testAuth} from './test-auth';
import {createApp} from './app';

export type CurrentArchiveHooks=PortabilityCopyHooks&{replacedOwnerId?:string;erased?(db:D1Database,request:(path:string,init?:RequestInit)=>Promise<Response>):Promise<void>;afterComparison?(db:D1Database,request:(path:string,init?:RequestInit)=>Promise<Response>):Promise<void>};
const canonicalRows=(rows:Record<string,unknown>[])=>rows
 .map(row=>Object.fromEntries(Object.entries(row).sort(([left],[right])=>left.localeCompare(right))))
 .sort((left,right)=>JSON.stringify(left).localeCompare(JSON.stringify(right)));

export async function proveCurrentArchive(source:CaptureFixture,target:{db:D1Database;actor:string},data:Awaited<ReturnType<typeof currentSalesData>>,archive:{manifest:any;parts:ArchivePart[]},hooks:CurrentArchiveHooks={}){
 for(const part of archive.parts)assert.equal(await archiveHash(part.records),part.sha256,'all exported part digests validate');
 const rows=(document:typeof archive,table:string)=>document.parts.flatMap(part=>part.records.filter(row=>row.table===table).map(row=>row.row));
 const categories=['workspace_settings','pipeline_stages','signal_sources','signal_links','timeline_entry_records','evaluations','evaluation_contributions','recommendations','recommendation_evidence','notifications','outbound_messages','drafts','schema_types','ai_calls','ai_previews','contacts','companies','opportunities','record_aliases','pipelines','pipeline_stage_rules','sales_tasks','sales_task_series','sales_task_timeline','opportunity_stakeholder_roles','opportunity_buying_context','contact_company_relationships','analytics_definitions','analytics_snapshots','analytics_snapshot_sources','content_entities','content_revisions','publication_operations','form_spam','marketing_form_submissions','consent_events','capture_sources','capture_items','capture_proposals','handoff_tasks','timeline_entries','signals','audit_entries'];
 for(const table of categories.filter(name=>name!=='record_aliases'))assert.ok(rows(archive,table).length>0,`${table} has populated current data`);
 if(hooks.replacedOwnerId){
  assert.equal(rows(archive,'operators').find(row=>row.id===hooks.replacedOwnerId)?.setup_owner,1,'The caller declares the archived setup owner replaced by the hosted owner');
  assert.notEqual(hooks.replacedOwnerId,target.actor);
  assert.deepEqual(await target.db.prepare('SELECT status,setup_owner FROM operators WHERE id=?').bind(hooks.replacedOwnerId).first(),{status:'removed',setup_owner:0});
 }
 const text=JSON.stringify(archive);assert.ok(!text.includes('anonymous-before-export@example.test'));
 assert.ok(rows(archive,'audit_entries').some(row=>row.entity_id==='erased'),'anonymized deletion audit travels');
 for(const table of ['capture_credentials','sessions','access_grants','access_invitations','access_form_authorities','delegation_grants','delegation_codes'])assert.ok(!archive.manifest.tables.some((entry:any)=>entry.name===table),`${table} never travels`);
 const session=await testAuth(target.db).createSession(target.actor),cookie=`__Host-orbit_session=${session.token}`,app=createApp({database:target.db,assets:{fetch:async()=>new Response(null,{status:404})}});
 const request=(path:string,body?:unknown,method=body===undefined?'GET':'POST',override?:string)=>app.request('https://orbit.test'+path,{method,headers:{Cookie:override??cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const call=async(path:string,body?:unknown,method?:string)=>{const response=await request(path,body,method);assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;};
 let job=await call('/api/v1/records/archive/exports',{});
 while(job.state==='preparing')job=await call(`/api/v1/records/archive/exports/${job.id}/advance`,{});
 assert.equal(job.state,'ready');const again=await call(`/api/v1/records/archive/exports/${job.id}/download`) as typeof archive;
 for(const part of again.parts)assert.equal(await archiveHash(part.records),part.sha256);
 for(const table of categories){
  const original=rows(archive,table),restored=rows(again,table);
  if(table==='audit_entries'){for(const row of original)assert.ok(restored.some(candidate=>JSON.stringify(candidate)===JSON.stringify(row)),'every original audit row remains');continue;}
  if(table==='signal_sources'){for(const row of original){const actual=restored.find(candidate=>candidate.id===row.id);assert.deepEqual(actual,{...row,enabled:row.type==='fixed_form'?0:row.enabled});}continue;}
  if(table==='publication_operations'){assert.ok(restored.every(row=>row.state!=='published'));for(const row of original){const actual=restored.find(candidate=>candidate.id===row.id);assert.deepEqual(actual,{...row,state:row.state==='published'?'withdrawn':row.state});}continue;}
  if(table==='outbound_messages'){for(const row of original){const actual=restored.find(candidate=>candidate.id===row.id);assert.ok(actual);if(row.state==='scheduled'){
   assert.equal(actual.state,'cancelled');
   if(row.operator_id===hooks.replacedOwnerId){
    assert.match(String(actual.failure),/owner.*replaced.*restore/i);
    assert.deepEqual(actual,{...row,state:'cancelled',failure:actual.failure},'Retiring the source owner cancels its approval without rewriting the original timestamp or message');
   }else{
    assert.match(String(actual.failure),/restore.*review/i);
    const changedAt=Date.parse(String(actual.updated_at));assert.ok(changedAt>=Date.parse(archive.manifest.exportedAt)&&changedAt<=Date.now(),'Fresh-review cancellation records its restore time');
    assert.deepEqual(actual,{...row,state:'cancelled',failure:actual.failure,updated_at:actual.updated_at});
   }
  }else assert.deepEqual(actual,row);}continue;}
  if(table==='timeline_entries'){
   for(const row of original)assert.ok(restored.some(candidate=>candidate.id===row.id&&JSON.stringify(candidate)===JSON.stringify(row)),'immutable agent, task and customer history survives');continue;
  }
  let expected=original;
  if(table==='opportunities'&&hooks.replacedOwnerId){
   assert.ok(original.some(row=>row.lifecycle==='open'&&row.owner_id===hooks.replacedOwnerId),'The fixture includes future work assigned to the replaced owner');
   // Hosted restore retires the source setup owner and leaves their open deals unassigned.
   // Every other field, including queue state and updated_at, must remain exact.
   expected=original.map(row=>row.lifecycle==='open'&&row.owner_id===hooks.replacedOwnerId?{...row,owner_id:null}:row);
  }
  assert.deepEqual(canonicalRows(restored),canonicalRows(expected),`${table} complete contents survive the declared authority changes`);
 }
 const peer=await target.db.prepare("SELECT id FROM operators WHERE status='active' AND id<>? LIMIT 1").bind(target.actor).first<string>('id');assert.ok(peer,'a second full operator exists');
 const otherSession=await testAuth(target.db).createSession(peer!);assert.equal((await request(`/api/v1/records/archive/exports/${job.id}/download`,undefined,'GET',`__Host-orbit_session=${otherSession.token}`)).status,404,'one full operator cannot download another operator export job');
 assert.equal(await target.db.prepare('SELECT count(*) n FROM access_form_authorities').first('n'),0);
 assert.equal(await target.db.prepare('SELECT count(*) n FROM publication_targets').first('n'),0);
 assert.equal(await target.db.prepare('SELECT count(*) n FROM delegation_grants').first('n'),0);
 assert.equal((await app.request('https://orbit.test/api/delegation/v1/identity',{headers:{Authorization:'Bearer '+data.token}})).status,401,'source agent authority cannot execute in receiver');
 assert.ok((await request('/api/v1/records/archive/exports',{},'POST','')).status>=400,'anonymous export is denied');
 const sourceJob=await source.db.prepare("SELECT id FROM archive_jobs WHERE kind='export' AND state='ready'").first<string>('id');
 assert.equal((await source.app.request('https://orbit.test/api/v1/records/archive/exports/'+sourceJob+'/download',{headers:{Cookie:data.reader.cookie}})).status,403,'complete export access is independent of report access');
 assert.equal((await request('/api/v1/records',undefined,'GET',data.reader.cookie)).status,401,'source collaborator session never travels');
 assert.equal(await target.db.prepare("SELECT status FROM access_memberships WHERE operator_id=?").bind(data.reader.operator.operatorId).first('status'),'removed','restored collaborator requires renewed authority');
 assert.ok((await request('/api/public/forms/portability-enquiry',{},'POST')).status>=400,'publication is withdrawn until fresh review');
 assert.equal(Number(await target.db.prepare("SELECT count(*) n FROM outbound_messages WHERE state='scheduled'").first('n')),0,'restore never transfers approved scheduled dispatch authority');
 const door=(path:string,init:RequestInit={})=>app.request('https://orbit.test'+path,{...init,headers:{Cookie:cookie,Origin:'https://orbit.test',...init.headers}});
 await hooks.restored?.(target.db,door);
 await hooks.afterComparison?.(target.db,door);
 const inFlight=(await request(`/api/v1/records/archive/exports/${job.id}/download`)).body!.getReader();await inFlight.read();
 const before=Date.now();await call(`/api/v1/records/contact/${source.ana}`,{confirmed:true},'DELETE');assert.ok(Date.now()-before<300000);
 const absent=(value:unknown)=>{const serialized=JSON.stringify(value);for(const privateValue of data.privateValues)assert.ok(!serialized.includes(privateValue),`erased ${privateValue} absent`);};
 for(const kind of ['contact','company','opportunity'])absent(await call(`/api/v1/records/${kind}?q=${encodeURIComponent('ana@acme.example')}`));
 assert.equal((await request(`/api/v1/records/contact/${source.ana}`)).status,404);
 await assert.rejects(async()=>{while(!(await inFlight.read()).done){}},/removed|incomplete/,'erasure interrupts an already opened archive download');
 absent(await call(`/api/v1/records/company/${source.company}`));absent(await call(`/api/v1/records/opportunity/${source.opportunity}`));
 absent(await call('/api/v1/tasks?view=all'));absent(await call('/api/v1/capture/proposals'));absent(await call('/api/v1/today'));
 const report=await request(`/api/v2/workspaces/workspace/operations/snapshots/${data.report.id}/export`);assert.ok(report.status>=400,'erased report sources cannot be read');
 const preview=await request('/api/v1/assistance/preview',{opportunityId:source.opportunity,feature:'explanation'});absent(await preview.json());
 const held=await call(data.forms+'/spam');absent(held);absent(await call(data.forms+'/submissions'));
 const replay=new FormData();replay.append('files',new File([fixtureMailbox(source).reply],'replayed.eml'));
 const replayed=await app.request('https://orbit.test/api/v1/capture/imports',{method:'POST',headers:{Cookie:cookie,Origin:'https://orbit.test'},body:replay});assert.equal(replayed.status,201);
 absent(await call('/api/v1/capture/proposals'));assert.equal(await target.db.prepare("SELECT count(*) n FROM capture_items WHERE instr(headers||body,'ana@acme.example')>0").first('n'),0,'replayed old mail stays erased');
 let erased=await call('/api/v1/records/archive/exports',{});while(erased.state==='preparing')erased=await call(`/api/v1/records/archive/exports/${erased.id}/advance`,{});
 absent(await call(`/api/v1/records/archive/exports/${erased.id}/download`));
 assert.equal((await request(`/api/v1/records/archive/exports/${job.id}/download`)).status,404,'pre-erasure materialized export is withdrawn');
 await hooks.erased?.(target.db,door);
 await proveLocalSalesArchive(source,hooks);
 const audit=(await target.db.prepare("SELECT entity_id,details_json FROM audit_entries WHERE action='record.deleted' AND entity_type='contact'").all()).results;assert.ok(audit.length);assert.ok(audit.every(row=>row.entity_id==='erased'));absent(audit);
}
