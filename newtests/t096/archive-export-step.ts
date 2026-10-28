import {rerTransfer} from './rer-transfer';
import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fixture,signIn} from './fixture';
import {nativeArchiveHttp} from './native-archive-http-fixture';
import {emittedRequest} from './emitted-request';
import {createApp} from '../../tests/support/app';
import {readArchiveFile} from '../../src/core/shared/archive-file';
import type {ArchiveManifest,ArchivePart} from '../../src/core/shared/archive-transfer-profile';

export async function recoverExport(f:Awaited<ReturnType<typeof fixture>>,contact:Awaited<ReturnType<typeof import('./fixture').nativeRecord>>){
 let listener:Awaited<ReturnType<typeof nativeArchiveHttp>>|undefined;try{
  let committed=false,fail=true;
  const db=new Proxy(f.db,{get(real,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{const result=await real.batch(statements);if(await real.prepare("SELECT 1 FROM archive_jobs WHERE kind='export' AND state='snapshotting'").first())committed=true;return result;};if(key==='prepare')return(sql:string)=>{const statement=real.prepare(sql);if(sql!=='SELECT 1 AS archive_storage_observation')return statement;return new Proxy(statement,{get(prepared,method){if(method==='all')return async()=>{const actual=await prepared.all();return committed&&fail?{...actual,meta:{...actual.meta,size_after:undefined}}:actual;};const value=Reflect.get(prepared,method);return typeof value==='function'?value.bind(prepared):value;}});};const value=Reflect.get(real,key);return typeof value==='function'?value.bind(real):value;}});
  listener=await nativeArchiveHttp(createApp({database:db,assets:{fetch:async()=>{throw Error('Native API proof');}}}),f.target.directory);const base='/api/v1/records/archive';
  assert.equal((await emittedRequest(listener,f.cookie,'/api/v1/settings/operators','POST',{email:'other-export-owner@fixture.test',displayName:'Other native export owner'})).status,201);
  const failed=await emittedRequest(listener,f.cookie,base+'/exports','POST',{});assert.equal(failed.status,409);const id=(await failed.json() as any).archiveJobId;assert.ok(id);
  const found=await(await emittedRequest(listener,f.cookie,base+'/exports')).json() as any;assert.deepEqual(found.jobs.map((job:any)=>job.id),[id]);assert.equal(await f.db.prepare('SELECT count(*) n FROM archive_storage_reservations').first('n'),1);
  await f.db.prepare("UPDATE contacts SET name='New live export' WHERE id=?").bind(contact.ref.id).run();const other=await signIn(f.db,'other-export-owner@fixture.test');assert.deepEqual((await(await emittedRequest(listener,other.cookie,base+'/exports')).json() as any).jobs,[]);assert.equal((await emittedRequest(listener,other.cookie,`${base}/exports/${id}/abort`,'POST',{})).status,404);
  fail=false;let status=found.jobs[0];while(status.state!=='ready'){const response=await emittedRequest(listener,f.cookie,`${base}/exports/${id}/advance`,'POST',{});assert.equal(response.status,200);status=await response.json();}
  const snapshot=await(await emittedRequest(listener,f.cookie,`${base}/exports/${id}/download`)).json() as any;assert.equal(snapshot.parts.flatMap((part:any)=>part.records).find((row:any)=>row.table==='contacts').row.name,'Original frozen export');assert.equal(await f.db.prepare('SELECT count(*) n FROM archive_storage_reservations').first('n'),1);
  assert.equal((await emittedRequest(listener,f.cookie,`${base}/exports/${id}/abort`,'POST',{})).status,200);assert.equal(await f.db.prepare('SELECT count(*) n FROM archive_storage_reservations').first('n'),0);
  const session=join(f.target.directory,'export-recovery-session'),file=join(f.target.directory,'fresh-export.json');await writeFile(session,f.cookie,{mode:0o600});const output=await rerTransfer('export',listener.origin,session,file,listener.certificate.certPath,1024*1024);assert.equal(output.ok,true,output.stdout);assert.match(output.stdout,/Verified archive saved/);const entries=[];for await(const entry of readArchiveFile(new Response(await readFile(file,'utf8')).body!))entries.push(entry);assert.equal(entries.flatMap(entry=>entry.kind==='part'?entry.part.records:[]).find(row=>row.table==='contacts')!.row.name,'New live export');
  const pending=await(await emittedRequest(listener,f.cookie,base+'/exports')).json() as any;assert.equal(pending.jobs.length,1);assert.notEqual(pending.jobs[0].id,id);const manifest=entries.find(entry=>entry.kind==='manifest');assert.ok(manifest?.kind==='manifest');return{id:pending.jobs[0].id as string,manifest:manifest.manifest as ArchiveManifest,parts:entries.flatMap(entry=>entry.kind==='part'?[entry.part]:[]) as ArchivePart[]};
 }finally{await listener?.dispose();}
}
