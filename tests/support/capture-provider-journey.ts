import {exported} from './capture-data-archive';
import assert from 'node:assert/strict';
import {providerFixture as fixture,captureFixtureSecurity as security} from './capture-provider-fixture';
import {scopes,type Provider} from '../../src/core/features/capture/providers/config';
import {createId} from '../../src/core/shared/ids';
import {reviewMailAssociations} from './sanity-mail-association';
const selected={mail:{folders:['INBOX','SENT']},calendars:['calendar'],calendarWindow:{start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'}};

/** A complete connection lifecycle through real D1 and HTTP, with only the provider network faked. */
export async function captureProviderJourney(provider:Provider):Promise<void>{
 const f=await fixture(provider);try{
 if(provider==='google'){

  assert.equal((await f.request('/providers',undefined,'')).status,401);
  const signed=await f.app.request('https://orbit.test/api/v1/capture/oauth/google/start',{method:'POST',headers:{origin:'https://orbit.test',authorization:'Bearer external-client','X-Orbit-Signature':'source-signature','content-type':'application/json'},body:'{}'});assert.equal(signed.status,401);
  const start=await f.start(),second=await f.deps.auth.createSession(f.operator),cookie=`__Host-orbit_session=${second.token}`;
  assert.match((await f.callback(start,cookie)).headers.get('location')!,/error=/);assert.equal(f.state.tokens,0);
  const wrong=await f.request(`/oauth/microsoft/callback?state=${start.searchParams.get('state')}&code=test`);assert.match(wrong.headers.get('location')!,/error=/);assert.equal(f.state.tokens,0);
  const origin=await f.app.request('https://evil.test/api/v1/capture/oauth/google/start',{method:'POST',headers:{cookie:f.cookie,origin:'https://evil.test','content-type':'application/json'},body:JSON.stringify({clientId:'test-client',clientSecret:'test-secret',name:'Name'})});assert.equal(origin.status,403);
  const response=await f.callback(start);assert.match(response.headers.get('location')!,/connected=/);assert.equal(f.state.tokens,1);assert.match((await f.callback(start)).headers.get('location')!,/error=/);assert.equal(f.state.tokens,1);
  const id=new URL(response.headers.get('location')!,'https://orbit.test').searchParams.get('connected')!;
  const stored=await f.db.prepare('SELECT ciphertext FROM capture_credentials WHERE source_id=?').bind(id).first<string>('ciphertext');assert.ok(stored&&!stored.includes('test-secret')&&!stored.includes('access-'));
  const archive=JSON.stringify(await exported({...f,request:(path:string,init:RequestInit={})=>f.app.request('https://orbit.test'+path,{...init,headers:{cookie:f.cookie,origin:'https://orbit.test',...init.headers}})},true));assert.ok(!archive.includes(stored!)&&!archive.includes('test-secret')&&!archive.includes('access-'),'native credentials never travel');
  const status=await (await f.request('/sources')).text();assert.ok(!status.includes('test-secret')&&!status.includes('access-')&&!status.includes('refresh-'));

  const expired=await f.start();await f.db.prepare('UPDATE capture_oauth SET expires_at=0').run();assert.match((await f.callback(expired)).headers.get('location')!,/error=/);
  const denied=await f.start();f.state.scope='https://www.googleapis.com/auth/gmail.readonly';assert.match((await f.callback(denied)).headers.get('location')!,/error=/);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials').first('n'),1);
  const pending=await f.start(id);assert.equal((await f.request(`/sources/${id}/disconnect`,{confirmed:true})).status,200);assert.match((await f.callback(pending)).headers.get('location')!,/error=/);
  const collaborator=createId();await f.db.prepare('INSERT INTO access_collaborators VALUES(?,?)').bind(collaborator,new Date().toISOString()).run();await f.deps.auth.ensureOperator({id:collaborator,email:'collaborator@orbit.test',displayName:'Analyst'});const restricted=await f.deps.auth.createSession(collaborator);assert.equal((await f.request('/providers',undefined,`__Host-orbit_session=${restricted.token}`)).status,403);

 }
 f.state.scope=scopes[provider].join(' ');
 {
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

 }
 if(provider==='microsoft')await reviewMailAssociations(f);
 if(provider==='microsoft'){
 const id=await f.connect();await f.request(`/sources/${id}/scope`,selected);
 for(const link of ['https://evil.test/v1.0/me/mailFolders/INBOX/messages/delta','https://graph.microsoft.com/v1.0/users/other/mailFolders/INBOX/messages/delta','https://graph.microsoft.com/v1.0/me/mailFolders/OTHER/messages/delta','https://graph.microsoft.com/v1.0/me/calendars/OTHER/calendarView/delta']){
  f.state.unsafeLink=link;const before=f.state.reads.length;const response=await f.request(`/sources/${id}/sync`,{});assert.equal(response.status,200);assert.equal((await response.json() as any).summary.halted,'unavailable');assert.ok(!f.state.reads.slice(before).includes(link));
 }
 f.state.unsafeLink='';for(const mode of ['malformed','redirect'] as const){f.state[mode]=true;const before=await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor');const response=await f.request(`/sources/${id}/sync`,{});assert.equal((await response.json() as any).summary.halted,'unavailable');assert.equal(await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor'),before);f.state[mode]=false;}

 }
 {
  const tokens=f.state.tokens;f.state.incremental=false;f.state.total=25;f.state.tombstones=false;
  const id=await f.connect();await f.request(`/sources/${id}/scope`,selected);
  const expire=async()=>{const row=await f.db.prepare('SELECT ciphertext FROM capture_credentials WHERE source_id=?').bind(id).first<string>('ciphertext');const value=JSON.parse(await security.open(row!));value.expiresAt=0;await f.db.prepare('UPDATE capture_credentials SET ciphertext=? WHERE source_id=?').bind(await security.seal(JSON.stringify(value)),id).run();};
  await expire();await f.drain(id);assert.equal(f.state.tokens,tokens+2);await f.drain(id);assert.equal(f.state.tokens,tokens+2);
  f.state.early401=true;await f.drain(id);assert.equal(f.state.tokens,tokens+3,'one early access expiry refreshes durably');
  await expire();let release!:()=>void,entered!:()=>void;const ready=new Promise<void>(r=>entered=r),wait=new Promise<void>(r=>release=r);f.state.pause=async url=>{if(url.endsWith('/token')){entered();await wait;}};
  const syncing=f.request(`/sources/${id}/sync`,{});await ready;assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);
  assert.equal((await f.request(`/sources/${id}/disconnect`,{confirmed:true})).status,200);const reads=f.state.reads.length;release();assert.equal((await syncing).status,409);assert.equal(f.state.reads.length,reads);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials WHERE source_id=?').bind(id).first('n'),0);
  f.state.pause=undefined;await f.connect(id);const pending=await f.start(id);let callbackRelease!:()=>void,callbackEntered!:()=>void;const callbackReady=new Promise<void>(r=>callbackEntered=r),callbackWait=new Promise<void>(r=>callbackRelease=r);f.state.pause=async url=>{if(url.endsWith('/token')){callbackEntered();await callbackWait;}};
  const callback=f.callback(pending);await callbackReady;await f.request(`/sources/${id}/disconnect`,{confirmed:true});callbackRelease();assert.match((await callback).headers.get('location')!,/error=/);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials WHERE source_id=?').bind(id).first('n'),0);
  f.state.pause=undefined;const nativePending=await f.start();let nativeRelease!:()=>void,nativeEntered!:()=>void;const nativeReady=new Promise<void>(r=>nativeEntered=r),nativeWait=new Promise<void>(r=>nativeRelease=r);f.state.pause=async url=>{if(url.endsWith('/token')){nativeEntered();await nativeWait;}};
  const nativeCallback=f.callback(nativePending);await nativeReady;
  if(provider==='google')await f.db.prepare('UPDATE sessions SET revoked_at=? WHERE operator_id=?').bind(new Date().toISOString(),f.operator).run();else{await assert.rejects(f.db.prepare('INSERT INTO access_collaborators VALUES(?,?)').bind(f.operator,new Date().toISOString()).run(),/NATIVE_OPERATOR_CLASS_IMMUTABLE/);await f.db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(f.operator).run();}
  nativeRelease();assert.match((await nativeCallback).headers.get('location')!,/error=/);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials WHERE source_id=?').bind(id).first('n'),0);
  assert.equal((await f.request('/providers')).status,401);

 }
 }finally{await f.dispose();}
}
