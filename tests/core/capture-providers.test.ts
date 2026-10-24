import {calendarWritebackProof} from '../support/calendar-writeback';
import {providerFixture as fixture,captureFixtureSecurity as security} from '../support/capture-provider-fixture';
import {oversizedMessageProof,deletedEventProof} from '../support/capture-provider-items';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createId} from '../../src/core/shared/ids';
import {foldArchiveCatalog as archiveCatalog} from '../../src/core/features/records/archive-fold-catalog';
const selected={mail:{folders:['INBOX','SENT']},calendars:['calendar'],calendarWindow:{start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'}};



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

test('CAPTURE-006 provider deletion respects occurrence and erasure; CAPTURE-011 read-only and writeback consent request and store distinct scopes',async()=>{
 for(const provider of ['google','microsoft'] as const){await deletedEventProof(provider);await calendarWritebackProof(provider);}
});
