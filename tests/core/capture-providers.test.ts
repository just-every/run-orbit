import {scopes} from '../../src/core/features/capture/providers/config';
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
  // TEAM-005 source.connect grants mailbox lifecycle, never workspace evidence or recipient access.
  await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.operator).run();
  const delegated=createId();await f.deps.auth.ensureOperator({id:delegated,email:'synthetic-orbit-source-admin'+'@'+'example.test',displayName:'Source administrator'});const delegatedSession=await f.deps.auth.createSession(delegated),delegatedCookie=`__Host-orbit_session=${delegatedSession.token}`;
  const role={role:'sales-admin',scope:'all',fields:['*'],permissions:['source.connect'],includeAssociations:false};
  const setRole=async(profile:unknown)=>{const result=await f.app.request(`https://orbit.test/api/v1/settings/teams/roles/${delegated}`,{method:'PUT',headers:{cookie:f.cookie,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify(profile)});assert.equal(result.status,200,await result.clone().text());};
  await setRole(role);assert.equal((await f.request('/providers',undefined,delegatedCookie)).status,200);
  f.state.scope=scopes.google.join(' ');f.state.total=1;
  const delegatedStart=await f.start(undefined,delegatedCookie),delegatedCallback=await f.callback(delegatedStart,delegatedCookie),delegatedId=new URL(delegatedCallback.headers.get('location')!,'https://orbit.test').searchParams.get('connected');assert.ok(delegatedId,delegatedCallback.headers.get('location')!);
  assert.equal((await f.request(`/sources/${delegatedId}/options`,undefined,delegatedCookie)).status,200);
  assert.equal((await f.request(`/sources/${delegatedId}/scope`,{mail:{folders:['INBOX']}},delegatedCookie)).status,200);
  const adminSync=await f.request(`/sources/${delegatedId}/sync`,{},delegatedCookie);assert.equal(adminSync.status,200,await adminSync.clone().text());assert.ok((await adminSync.json() as any).summary.captured>0);
  const manager={...role,role:'manager',scope:'assigned',fields:['mail','notes']};await setRole(manager);
  const ownSources=await(await f.request('/sources',undefined,delegatedCookie)).json() as any;assert.deepEqual(ownSources.sources.map((source:any)=>source.id),[delegatedId],'A scoped connector sees only their own mailbox metadata');
  assert.equal((await f.request(`/sources/${id}/options`,undefined,delegatedCookie)).status,403,'Source permission cannot use another operator’s provider credential');
  assert.equal((await f.request('/proposals',undefined,delegatedCookie)).status,403,'A mailbox connection never exposes workspace capture proposals');
  f.state.incremental=true;f.state.incrementalIds=['synthetic-hidden-recipient'];const beforeProposals=await f.db.prepare('SELECT count(*) FROM capture_proposals').first('count(*)'),beforeRecipient=await f.db.prepare('SELECT name,phone,contactability,updated_at FROM contacts WHERE id=?').bind(f.ana).first(),beforeSignals=await f.count(delegatedId!),hidden=await f.request(`/sources/${delegatedId}/sync`,{},delegatedCookie);assert.equal(hidden.status,200,await hidden.clone().text());assert.equal((await hidden.json() as any).summary.captured,0);assert.equal(await f.count(delegatedId!),beforeSignals,'A current hidden recipient receives no captured evidence');assert.equal(await f.db.prepare('SELECT count(*) FROM capture_proposals').first('count(*)'),beforeProposals,'No proposal is authored for a hidden recipient');assert.deepEqual(await f.db.prepare('SELECT name,phone,contactability,updated_at FROM contacts WHERE id=?').bind(f.ana).first(),beforeRecipient,'The hidden recipient record stays unchanged');
  const revocable=await f.start(delegatedId!,delegatedCookie),tokensBefore=f.state.tokens;await setRole({...manager,permissions:[]});assert.equal((await f.request('/providers',undefined,delegatedCookie)).status,403);assert.equal((await f.callback(revocable,delegatedCookie)).status,403);assert.equal(f.state.tokens,tokensBefore,'Revoked source permission is checked before exchanging an OAuth code');
  await setRole(role);assert.match((await f.callback(revocable,delegatedCookie)).headers.get('location')!,/error=/);assert.equal(f.state.tokens,tokensBefore,'Restoring a role never revives OAuth authority started before its permission epoch changed');const rule=await f.app.request('https://orbit.test/api/v1/capture/mail-rule',{method:'PUT',headers:{cookie:delegatedCookie,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({rule:'review'})});assert.equal(rule.status,200,'A current sales administrator manages the global mail rule');
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
