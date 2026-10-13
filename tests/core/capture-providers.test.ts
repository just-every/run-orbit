import {oversizedMessageProof,deletedEventProof} from '../support/capture-provider-items';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createId} from '../../src/core/shared/ids';
import {captureFixture} from '../support/capture-fixture';
import {createApp} from '../support/app';
import {captureProviderNetwork} from '../support/capture-provider-network';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {type Provider} from '../../src/core/features/capture/providers/config';
import {archiveCatalog} from '../../src/core/features/records/archive-schema';
const security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'72'.repeat(32)})!;
const selected={mail:{folders:['INBOX','SENT']},calendars:['calendar'],calendarWindow:{start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'}};
async function fixture(provider:Provider){
 const f=await captureFixture(),network=captureProviderNetwork(provider);let crash=false;
 const db=new Proxy({} as D1Database,{get(_target,key){const target=f.platform.db;if(key==='prepare')return (sql:string)=>{if(crash&&sql.startsWith('UPDATE capture_sources SET cursor=')){crash=false;throw new Error('Worker stopped before cursor commit');}return target.prepare(sql);};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
 const build=()=>createApp({database:db,assets:{fetch:async()=>new Response('')},sourceSecurity:security,captureOrigin:'https://orbit.test',captureFetch:network.fetcher});let app=build();
 const request=(path:string,body?:unknown,cookie=f.cookie)=>app.request(`https://orbit.test/api/v1/capture${path}`,{method:body===undefined?'GET':'POST',headers:{cookie,origin:'https://orbit.test','content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 async function start(sourceId?:string,cookie=f.cookie){const response=await request(`/oauth/${provider}/start`,{name:`${provider} account`,clientId:'test-client',clientSecret:'test-secret',sourceId},cookie);assert.equal(response.status,200);const url=new URL((await response.json() as any).authorizationUrl);network.state.challenge=url.searchParams.get('code_challenge')!;return url;}
 async function callback(url:URL,cookie=f.cookie){return request(`/oauth/${provider}/callback?state=${encodeURIComponent(url.searchParams.get('state')!)}&code=test-code`,undefined,cookie);}
 async function connect(sourceId?:string){const response=await callback(await start(sourceId));assert.equal(response.status,303);const location=new URL(response.headers.get('location')!,'https://orbit.test');assert.ok(!location.searchParams.has('error'),location.searchParams.get('error')??'');return location.searchParams.get('connected')!;}
 const count=(id:string)=>db.prepare('SELECT count(*) n FROM signals WHERE source_id=?').bind(id).first<number>('n');
 async function drain(id:string){let rounds=0;while(true){const response=await request(`/sources/${id}/sync`,{});assert.equal(response.status,200);const value=await response.json() as any;assert.ok(!value.summary.halted);if(!value.more)return;assert.ok(++rounds<100,'bounded resumable source must eventually finish');}}
 return {...f,...network,db,get app(){return app;},request,start,callback,connect,count,drain,reopen:async()=>{await f.platform.close();await f.platform.reopen();app=build();},crash:()=>{crash=true;}};
}

test('CAPTURE-006 both real adapters page selected scope fairly, replay a crashed commit, resume incrementally and retain no unknown mail',async()=>{
 for(const provider of ['google','microsoft'] as const){const f=await fixture(provider);try{
  const id=await f.connect();assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);assert.equal(f.state.reads.length,0);
  let continuation:string|undefined,mail:string[]=[],calendars:string[]=[];do{const response=await f.request(`/sources/${id}/options${continuation?`?continuation=${encodeURIComponent(continuation)}`:''}`);assert.equal(response.status,200);const value=await response.json() as any;mail.push(...value.mail.map((x:any)=>x.id));calendars.push(...value.calendars.map((x:any)=>x.id));continuation=value.continuation;}while(continuation);
  assert.deepEqual(mail,['INBOX','SENT']);assert.deepEqual(calendars,['calendar']);
  assert.equal((await f.request(`/sources/${id}/scope`,selected)).status,200);
  f.crash();assert.equal((await f.request(`/sources/${id}/sync`,{})).status,500);assert.ok((await f.count(id))!>0);
  await f.reopen();await f.drain(id);assert.equal(await f.count(id),26);assert.equal(await f.db.prepare("SELECT count(*) n FROM capture_items WHERE headers LIKE '%unknown%' OR body LIKE '%unknown%'").first('n'),0);
  f.state.incremental=true;f.state.tombstones=true;await f.drain(id);assert.equal(await f.count(id),28);
  assert.equal(await f.db.prepare("SELECT count(*) n FROM signals WHERE source_id=? AND type='meeting.cancelled'").bind(id).first('n'),1);
  assert.ok(Number(await f.db.prepare('SELECT skipped_count FROM capture_sources WHERE id=?').bind(id).first('skipped_count'))>0);
  if(provider==='google'){f.state.expireHistory=true;await f.drain(id);assert.equal(await f.count(id),28);assert.ok(f.state.reads.some(url=>url.includes('startHistoryId=900719925474099312345')));}
  f.state.recurring=true;await f.drain(id);assert.equal(await f.count(id),30);await f.drain(id);assert.equal(await f.count(id),30,'recurring occurrences replay independently');
  const starts=(await f.db.prepare("SELECT json_extract(payload_json,'$.data.start') AS start FROM signals WHERE source_id=? AND type LIKE 'meeting.%'").bind(id).all<{start:string}>()).results.map(row=>row.start);assert.ok(starts.includes('2026-11-01T05:30:00.000Z'));assert.ok(starts.includes('2026-11-08T06:30:00.000Z'));
  f.state.outage=true;const before=await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor');const unavailable=await (await f.request(`/sources/${id}/sync`,{})).json() as any;assert.equal(unavailable.summary.halted,'unavailable');assert.equal(await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor'),before);
  f.state.outage=false;f.state.revoked=true;assert.equal((await (await f.request(`/sources/${id}/sync`,{})).json() as any).summary.halted,'revoked');const reads=f.state.reads.length;assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);assert.equal(f.state.reads.length,reads);
  f.state.revoked=false;await f.connect(id);assert.equal(await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor'),null);assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);
  assert.equal((await f.request(`/sources/${id}/disconnect`,{confirmed:true})).status,200);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials WHERE source_id=?').bind(id).first('n'),0);
 }finally{await f.dispose();}}
});

test('CAPTURE-005 OAuth binds native session, provider, origin, expiry and one use; encrypted authority stays out of status and archives',async()=>{
 const f=await fixture('google');try{
  assert.equal((await f.request('/providers',undefined,'')).status,401);
  const signed=await f.app.request('https://orbit.test/api/v1/capture/oauth/google/start',{method:'POST',headers:{origin:'https://orbit.test',authorization:'Bearer external-client','X-Orbit-Signature':'source-signature','content-type':'application/json'},body:'{}'});assert.equal(signed.status,401);
  const start=await f.start(),second=await f.deps.auth.createSession(f.operator),cookie=`__Host-orbit_session=${second.token}`;
  assert.match((await f.callback(start,cookie)).headers.get('location')!,/error=/);assert.equal(f.state.tokens,0);
  const wrong=await f.request(`/oauth/microsoft/callback?state=${start.searchParams.get('state')}&code=test`);assert.match(wrong.headers.get('location')!,/error=/);assert.equal(f.state.tokens,0);
  const origin=await f.app.request('https://evil.test/api/v1/capture/oauth/google/start',{method:'POST',headers:{cookie:f.cookie,origin:'https://evil.test','content-type':'application/json'},body:JSON.stringify({clientId:'test-client',clientSecret:'test-secret',name:'Name'})});assert.equal(origin.status,403);
  const response=await f.callback(start);assert.match(response.headers.get('location')!,/connected=/);assert.equal(f.state.tokens,1);assert.match((await f.callback(start)).headers.get('location')!,/error=/);assert.equal(f.state.tokens,1);
  const id=new URL(response.headers.get('location')!,'https://orbit.test').searchParams.get('connected')!;
  const stored=await f.db.prepare('SELECT ciphertext FROM capture_credentials WHERE source_id=?').bind(id).first<string>('ciphertext');assert.ok(stored&&!stored.includes('test-secret')&&!stored.includes('access-'));
  const status=await (await f.request('/sources')).text();assert.ok(!status.includes('test-secret')&&!status.includes('access-')&&!status.includes('refresh-'));
  const catalog=await archiveCatalog(f.db);assert.ok(!catalog.some(table=>['capture_credentials','capture_oauth','capture_locks'].includes(table.name)));
  const expired=await f.start();await f.db.prepare('UPDATE capture_oauth SET expires_at=0').run();assert.match((await f.callback(expired)).headers.get('location')!,/error=/);
  const denied=await f.start();f.state.scope='https://www.googleapis.com/auth/gmail.readonly';assert.match((await f.callback(denied)).headers.get('location')!,/error=/);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials').first('n'),1);
  const pending=await f.start(id);assert.equal((await f.request(`/sources/${id}/disconnect`,{confirmed:true})).status,200);assert.match((await f.callback(pending)).headers.get('location')!,/error=/);
  const collaborator=createId();await f.db.prepare('INSERT INTO access_collaborators VALUES(?,?)').bind(collaborator,new Date().toISOString()).run();await f.deps.auth.ensureOperator({id:collaborator,email:'collaborator@orbit.test',displayName:'Analyst'});const restricted=await f.deps.auth.createSession(collaborator);assert.equal((await f.request('/providers',undefined,`__Host-orbit_session=${restricted.token}`)).status,403);
 }finally{await f.dispose();}
});

test('CAPTURE-006 refreshed credentials are durable, leases prevent concurrent reads and disconnect fences in-flight tokens and callbacks',async()=>{
 for(const provider of ['google','microsoft'] as const){const f=await fixture(provider);try{
  const id=await f.connect();await f.request(`/sources/${id}/scope`,selected);
  const expire=async()=>{const row=await f.db.prepare('SELECT ciphertext FROM capture_credentials WHERE source_id=?').bind(id).first<string>('ciphertext');const value=JSON.parse(await security.open(row!));value.expiresAt=0;await f.db.prepare('UPDATE capture_credentials SET ciphertext=? WHERE source_id=?').bind(await security.seal(JSON.stringify(value)),id).run();};
  await expire();await f.drain(id);assert.equal(f.state.tokens,2);await f.drain(id);assert.equal(f.state.tokens,2);
  f.state.early401=true;await f.drain(id);assert.equal(f.state.tokens,3,'one early access expiry refreshes durably');
  await expire();let release!:()=>void,entered!:()=>void;const ready=new Promise<void>(r=>entered=r),wait=new Promise<void>(r=>release=r);f.state.pause=async url=>{if(url.endsWith('/token')){entered();await wait;}};
  const syncing=f.request(`/sources/${id}/sync`,{});await ready;assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);
  assert.equal((await f.request(`/sources/${id}/disconnect`,{confirmed:true})).status,200);const reads=f.state.reads.length;release();assert.equal((await syncing).status,409);assert.equal(f.state.reads.length,reads);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials WHERE source_id=?').bind(id).first('n'),0);
  f.state.pause=undefined;await f.connect(id);const pending=await f.start(id);let callbackRelease!:()=>void,callbackEntered!:()=>void;const callbackReady=new Promise<void>(r=>callbackEntered=r),callbackWait=new Promise<void>(r=>callbackRelease=r);f.state.pause=async url=>{if(url.endsWith('/token')){callbackEntered();await callbackWait;}};
  const callback=f.callback(pending);await callbackReady;await f.request(`/sources/${id}/disconnect`,{confirmed:true});callbackRelease();assert.match((await callback).headers.get('location')!,/error=/);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials WHERE source_id=?').bind(id).first('n'),0);
  f.state.pause=undefined;const nativePending=await f.start();let nativeRelease!:()=>void,nativeEntered!:()=>void;const nativeReady=new Promise<void>(r=>nativeEntered=r),nativeWait=new Promise<void>(r=>nativeRelease=r);f.state.pause=async url=>{if(url.endsWith('/token')){nativeEntered();await nativeWait;}};
  const nativeCallback=f.callback(nativePending);await nativeReady;
  if(provider==='google')await f.db.prepare('UPDATE sessions SET revoked_at=? WHERE operator_id=?').bind(new Date().toISOString(),f.operator).run();else{await assert.rejects(f.db.prepare('INSERT INTO access_collaborators VALUES(?,?)').bind(f.operator,new Date().toISOString()).run(),/NATIVE_OPERATOR_CLASS_IMMUTABLE/);await f.db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(f.operator).run();}
  nativeRelease();assert.match((await nativeCallback).headers.get('location')!,/error=/);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials').first('n'),0);
  assert.equal((await f.request('/providers')).status,401);
 }finally{await f.dispose();}}
});

test('CAPTURE-006 Microsoft rejects foreign host, user, folder and calendar delta links before bearer disclosure',async()=>{
 const f=await fixture('microsoft');try{const id=await f.connect();await f.request(`/sources/${id}/scope`,selected);
 for(const link of ['https://evil.test/v1.0/me/mailFolders/INBOX/messages/delta','https://graph.microsoft.com/v1.0/users/other/mailFolders/INBOX/messages/delta','https://graph.microsoft.com/v1.0/me/mailFolders/OTHER/messages/delta','https://graph.microsoft.com/v1.0/me/calendars/OTHER/calendarView/delta']){
  f.state.unsafeLink=link;const before=f.state.reads.length;const response=await f.request(`/sources/${id}/sync`,{});assert.equal(response.status,200);assert.equal((await response.json() as any).summary.halted,'unavailable');assert.ok(!f.state.reads.slice(before).includes(link));
 }
 f.state.unsafeLink='';for(const mode of ['malformed','redirect'] as const){f.state[mode]=true;const before=await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor');const response=await f.request(`/sources/${id}/sync`,{});assert.equal((await response.json() as any).summary.halted,'unavailable');assert.equal(await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor'),before);f.state[mode]=false;}
 }finally{await f.dispose();}
});


test('CAPTURE-006 oversized mail skips once while both providers finish other messages and selected calendars',async()=>{
 for(const provider of ['google','microsoft'] as const)await oversizedMessageProof(provider);
});

test('CAPTURE-006 provider deletion matches the captured calendar occurrence, replays once and respects erasure',async()=>{
 for(const provider of ['google','microsoft'] as const)await deletedEventProof(provider);
});
