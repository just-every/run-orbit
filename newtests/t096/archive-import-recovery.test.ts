import {rerTransfer} from './rer-transfer';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fixture,signIn} from './fixture';
import {archiveHttp,httpArchive} from './archive-http-proof';
import {nativeArchiveHttp} from './native-archive-http-fixture';
import {emittedRequest} from './emitted-request';
import {createApp} from '../../tests/support/app';

test('committed import creation survives a lost ACK and exposes failed observations for owner recovery and unchanged shipped CLI retry',async()=>{
 const source=await fixture(),target=await fixture();let listener:Awaited<ReturnType<typeof nativeArchiveHttp>>|undefined;try{
  const application=(database:D1Database)=>createApp({database,assets:{fetch:async()=>{throw Error('Native archive API proof');}}}),sourceRequest=archiveHttp(application(source.db),()=>source.cookie),archive=await httpArchive(sourceRequest);
  let mode:'ack'|'observation'|'none'='ack',committed=false,mutations=0;
  const db=new Proxy(target.db,{get(real,key){
   if(key==='batch')return async(statements:D1PreparedStatement[])=>{const before=await real.prepare("SELECT count(*) n FROM archive_jobs WHERE kind='import'").first<number>('n'),result=await real.batch(statements),after=await real.prepare("SELECT count(*) n FROM archive_jobs WHERE kind='import'").first<number>('n');if(after!>before!){mutations++;committed=true;if(mode==='ack'){mode='none';throw new TypeError('Injected committed acknowledgement loss');}}return result;};
   if(key==='prepare')return(sql:string)=>{const statement=real.prepare(sql);if(sql!=='SELECT 1 AS archive_storage_observation')return statement;return new Proxy(statement,{get(prepared,method){if(method==='all')return async()=>{const actual=await prepared.all();return committed&&mode==='observation'?{...actual,meta:{...actual.meta,size_after:undefined}}:actual;};const value=Reflect.get(prepared,method);return typeof value==='function'?value.bind(prepared):value;}});};
   const value=Reflect.get(real,key);return typeof value==='function'?value.bind(real):value;
  }}),app=application(db);listener=await nativeArchiveHttp(app,target.target.directory);
  assert.equal((await emittedRequest(listener,target.cookie,'/api/v1/settings/operators','POST',{email:'separate-native@fixture.test',displayName:'Separate native operator'})).status,201);
  const base='/api/v1/records/archive',create=()=>emittedRequest(listener!,target.cookie,base+'/imports','POST',{confirmed:true,manifest:archive.manifest});
  const recovered=await create();assert.equal(recovered.status,201);const first=await recovered.json() as any;assert.equal(mutations,1);assert.equal((await create()).status,201);assert.equal(mutations,1);
  const listed=await(await emittedRequest(listener,target.cookie,base+'/imports')).json() as any;assert.deepEqual(listed.jobs.map((job:any)=>job.id),[first.id]);
  assert.equal((await emittedRequest(listener,target.cookie,`${base}/imports/${first.id}/abort`,'POST',{})).status,200);
  committed=false;mode='observation';
  const file=join(source.target.directory,'recovery.orbit.json'),session=join(target.target.directory,'recovery-session');await writeFile(file,JSON.stringify({format:'orbit-export',version:3,manifest:archive.manifest}).slice(0,-1)+',"parts":[\n'+archive.parts.map((part,index)=>(index?',':'')+JSON.stringify(part)).join('\n')+'\n]}\n',{mode:0o600});await writeFile(session,target.cookie,{mode:0o600});
  const cli=()=>rerTransfer('import',listener!.origin,session,file,listener!.certificate.certPath,1024*1024);
  assert.equal((await cli()).ok,false);assert.equal(mutations,2);
  const pending=await(await emittedRequest(listener,target.cookie,base+'/imports')).json() as any;assert.equal(pending.jobs.length,1);const id=pending.jobs[0].id;assert.equal(pending.jobs[0].state,'uploading');
  const failed=await create();assert.equal(failed.status,409);assert.equal((await failed.json() as any).archiveJobId,id);assert.equal(mutations,2);
  const other=await signIn(target.db,'separate-native@fixture.test');assert.deepEqual((await(await emittedRequest(listener,other.cookie,base+'/imports')).json() as any).jobs,[]);
  mode='none';const retried=await cli();assert.equal(retried.ok,true,retried.stderr);assert.match(retried.stdout,new RegExp(`Restore transfer ${id}`));assert.match(retried.stdout,/Archive restored into/);assert.equal(mutations,2);
  assert.equal(await target.db.prepare('SELECT state FROM archive_jobs WHERE id=?').bind(id).first('state'),'complete');assert.equal(await target.db.prepare('SELECT count(*) n FROM archive_storage_reservations').first('n'),0);
  await sourceRequest(`/exports/${archive.id}/abort`,'POST',{});
 }finally{await listener?.dispose();await source.close();await target.close();}
});
