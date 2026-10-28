import assert from 'node:assert/strict';
import {providerFixture,captureFixtureSecurity as security} from './capture-provider-fixture';
import {identityResponse} from '../../src/core/features/identity';
import {identityBindings} from './app';
const selected={mail:{folders:['INBOX','SENT']},calendars:['calendar'],calendarWindow:{start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'}};
type SourceFixture=Awaited<ReturnType<typeof providerFixture>>;

export async function sourceRefreshAndDisconnect(f:SourceFixture) {

  const beforeTokens=f.state.tokens;
  const id=await f.connect();await f.request(`/sources/${id}/scope`,selected);
  const expire=async()=>{const row=await f.db.prepare('SELECT ciphertext FROM capture_credentials WHERE source_id=?').bind(id).first<string>('ciphertext');const value=JSON.parse(await security.open(row!));value.expiresAt=0;await f.db.prepare('UPDATE capture_credentials SET ciphertext=? WHERE source_id=?').bind(await security.seal(JSON.stringify(value)),id).run();};
  await expire();await f.drain(id);assert.equal(f.state.tokens,beforeTokens+2);await f.drain(id);assert.equal(f.state.tokens,beforeTokens+2);
  f.state.early401=true;await f.drain(id);assert.equal(f.state.tokens,beforeTokens+3,'one early access expiry refreshes durably');
  await expire();let release!:()=>void,entered!:()=>void;const ready=new Promise<void>(r=>entered=r),wait=new Promise<void>(r=>release=r);f.state.pause=async url=>{if(url.endsWith('/token')){entered();await wait;}};
  const syncing=f.request(`/sources/${id}/sync`,{});await ready;assert.equal((await f.request(`/sources/${id}/sync`,{})).status,409);
  assert.equal((await f.request(`/sources/${id}/disconnect`,{confirmed:true})).status,200);const reads=f.state.reads.length;release();assert.equal((await syncing).status,409);assert.equal(f.state.reads.length,reads);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials WHERE source_id=?').bind(id).first('n'),0);
  f.state.pause=undefined;await f.connect(id);const pending=await f.start(id);let callbackRelease!:()=>void,callbackEntered!:()=>void;const callbackReady=new Promise<void>(r=>callbackEntered=r),callbackWait=new Promise<void>(r=>callbackRelease=r);f.state.pause=async url=>{if(url.endsWith('/token')){callbackEntered();await callbackWait;}};
  const callback=f.callback(pending);await callbackReady;await f.request(`/sources/${id}/disconnect`,{confirmed:true});callbackRelease();assert.match((await callback).headers.get('location')!,/error=/);assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials WHERE source_id=?').bind(id).first('n'),0);

  f.state.pause=undefined;

}
export async function sourceUnsafeCursor(f:SourceFixture,id:string) {

 for(const link of ['https://evil.test/v1.0/me/mailFolders/INBOX/messages/delta','https://graph.microsoft.com/v1.0/users/other/mailFolders/INBOX/messages/delta','https://graph.microsoft.com/v1.0/me/mailFolders/OTHER/messages/delta','https://graph.microsoft.com/v1.0/me/calendars/OTHER/calendarView/delta']){
  f.state.unsafeLink=link;const before=f.state.reads.length;const response=await f.request(`/sources/${id}/sync`,{});assert.equal(response.status,200);assert.equal((await response.json() as any).summary.halted,'unavailable');assert.ok(!f.state.reads.slice(before).includes(link));
 }
 f.state.unsafeLink='';for(const mode of ['malformed','redirect'] as const){f.state[mode]=true;const before=await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor');const response=await f.request(`/sources/${id}/sync`,{});assert.equal((await response.json() as any).summary.halted,'unavailable');assert.equal(await f.db.prepare('SELECT cursor FROM capture_sources WHERE id=?').bind(id).first('cursor'),before);f.state[mode]=false;}
 
}

export async function sourceNativeRevocation(f:SourceFixture) {
 const before=await f.db.prepare('SELECT count(*) n FROM capture_credentials').first('n'),pending=await f.start();
 let release!:()=>void,entered!:()=>void;const ready=new Promise<void>(resolve=>entered=resolve),waiting=new Promise<void>(resolve=>release=resolve);
 f.state.pause=async url=>{if(url.endsWith('/token')){entered();await waiting;}};
 const callback=f.callback(pending);await ready;
 try {
  const request=new Request('https://orbit.test/auth/signout',{method:'POST',headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams()});
  assert.equal((await identityResponse(request,identityBindings(f.db,request),{ownerClaimed:async()=>true}))!.status,303);
 } finally {release();}
 assert.match((await callback).headers.get('location')!,/error=/);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials').first('n'),before,'a pending provider answer cannot revive authority after native sign-out');
 assert.equal((await f.request('/providers')).status,401);f.state.pause=undefined;
}
