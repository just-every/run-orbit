import {providerFixture,captureFixtureSecurity as security} from './capture-provider-fixture';
import assert from 'node:assert/strict';
import {createId} from '../../src/core/shared/ids';
import {foldArchiveCatalog as archiveCatalog} from '../../src/core/features/records/archive-fold-catalog';
const selected={mail:{folders:['INBOX','SENT']},calendars:['calendar'],calendarWindow:{start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'}};




type SourceFixture=Awaited<ReturnType<typeof providerFixture>>;

export async function sourceConsent(f:SourceFixture) {

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
  const originalScope=f.state.scope;
  const denied=await f.start();f.state.scope='https://www.googleapis.com/auth/gmail.readonly';assert.match((await f.callback(denied)).headers.get('location')!,/error=/);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials').first('n'),1);
  f.state.scope=originalScope;
  const pending=await f.start(id);assert.equal((await f.request(`/sources/${id}/disconnect`,{confirmed:true})).status,200);assert.match((await f.callback(pending)).headers.get('location')!,/error=/);
  const collaborator=createId();await f.db.prepare('INSERT INTO access_collaborators VALUES(?,?)').bind(collaborator,new Date().toISOString()).run();await f.deps.auth.ensureOperator({id:collaborator,email:'collaborator@orbit.test',displayName:'Analyst'});const restricted=await f.deps.auth.createSession(collaborator);assert.equal((await f.request('/providers',undefined,`__Host-orbit_session=${restricted.token}`)).status,403);
 
}
