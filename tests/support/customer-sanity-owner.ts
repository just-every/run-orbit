import assert from 'node:assert/strict';
import {registerDevAdmission} from '@runeditrun/rer/modules/operator-auth/dev-admission';
import {identityResponse} from '../../src/core/features/identity';
import {createId} from '../../src/core/shared/ids';
import {isolatedDatabase} from './isolated-database';
import {createApp,identityBindings} from './app';
import {mailedIdentity} from './email-link';
import {testAuth} from './test-auth';

import {editorConfigurationResponse} from '../../src/core/features/editor/server';
import type {PlatformBindings} from '../../src/core/platform/assets';
import {publicDemoJourney} from './customer-sanity-public-demo';

export async function nativeOwnerJourney() {

 const fixture=await isolatedDatabase(),db=fixture.db,now=new Date().toISOString();
 try {
  const install={...identityBindings(db,new Request('https://orbit.test')),OWNER_EMAIL:'owner@orbit.test',SETUP_TOKEN:'test-only-setup-key-0123456789abcdef'};
  const claim=(token=install.SETUP_TOKEN)=>identityResponse(new Request('https://orbit.test/auth/bootstrap',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://orbit.test','CF-Connecting-IP':'192.0.2.20'},body:JSON.stringify({token,displayName:'Owner'})}),install,{ownerClaimed:async()=>true});
  assert.equal((await claim('wrong-setup-key-0123456789abcdef0123'))!.status,403);
  const claimed=await claim();assert.equal(claimed!.status,303);assert.match(claimed!.headers.get('set-cookie')!,/^__Host-orbit_session=/);assert.equal((await claim())!.status,409);
  const owner=(await db.prepare('SELECT id FROM operators WHERE setup_owner=1').first<{id:string}>())!.id;
  const auth=testAuth(db),local=await auth.createSession(owner),other=await auth.createSession(owner),outsider=createId();
  await auth.ensureOperator({id:outsider,email:'teammate@example.test',displayName:'Teammate'});
  const teammate=await auth.createSession(outsider),app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}});
  await db.prepare("UPDATE identity_sessions SET kind='dev',proof_at=NULL,proof_version=NULL WHERE session_id=?").bind(local.id).run();
  const request=(token:string,path='settings',method='GET',body?:unknown,origin='https://orbit.test')=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${token}`,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  await publicDemoJourney(db);
  const deployment={sourceSha:'test-only-source',fingerprint:'test-only-fingerprint',versionId:'test-only-version'};
  const health=await createApp({database:db,deployment,assets:{fetch:async()=>new Response(null,{status:404})}}).request('https://orbit.test/health');assert.equal(health.status,200);assert.deepEqual((await health.json()).deployment,deployment);
  const editorBindings={...install,RER_MANAGEMENT_ORIGIN:'https://management.example.test',RER_INSTALLATION_ID:'test-installation'} as PlatformBindings;
  const editor=(token='')=>editorConfigurationResponse(new Request('https://orbit.test/api/editor/config',{headers:{Cookie:token?'__Host-orbit_session='+token:''}}),editorBindings);
  assert.equal((await editor()).status,403);assert.equal((await editor(teammate.token)).status,403);
  const admission=await editor(other.token);assert.equal(admission.status,200);assert.match(admission.headers.get('Cache-Control')!,/no-store/);const grant=await admission.json() as any;assert.equal(grant.config.managementOrigin,editorBindings.RER_MANAGEMENT_ORIGIN);assert.ok(grant.expiresAt>Date.now());
  const change={email:'owner@business.example.test',currentEmail:'owner@orbit.test'};
  assert.equal((await request(local.token,'settings/owner','PUT',change)).status,401,'a dev cookie needs the checkout key');
  registerDevAdmission(()=>true);
  assert.equal((await request(local.token)).status,200);
  const modeResponse=await app.request('https://orbit.test/api/v1/settings',{headers:{Cookie:`__Host-orbit_session=${local.token}`}}, {AUTH_LOCAL:'true'});
  assert.equal((await modeResponse.json() as {local:boolean}).local,true);
  assert.equal((await (await request(local.token)).json() as {local:boolean}).local,false);
  assert.equal((await request(teammate.token,'settings/owner','PUT',change)).status,403,'an operator cannot change the owner');
  assert.equal((await request(local.token,'settings/owner','PUT',change,'https://forged.test')).status,403);
  assert.equal((await request(local.token,'settings/owner','PUT',{...change,email:'bad'})).status,400);
  assert.equal((await request(local.token,'settings/owner','PUT',{...change,email:'teammate@example.test'})).status,409);
  assert.equal((await request(local.token,'settings/owner','PUT',{...change,currentEmail:'stale@example.test'})).status,409);

  const mail=mailedIdentity(db),ask=(request:Request)=>identityResponse(request,mail.bindings,{ownerClaimed:async()=>true,mailSender:mail.mailSender});
  await ask(mail.post('/auth/magic-link',{json:{email:change.currentEmail}}));
  const pendingToken=new URL(mail.linkIn(mail.sent[0])!).searchParams.get('token')!;
  const updated=await request(local.token,'settings/owner','PUT',change);
  assert.equal(updated.status,200,await updated.clone().text());
  const settings=await(await request(local.token)).json() as any;
  assert.equal(settings.owner.email,change.email);assert.equal(settings.owner.editable,true);
  assert.equal(await db.prepare('SELECT email FROM owner_bootstrap WHERE owner_id=?').bind(owner).first('email'),change.email,'archives retain the chosen owner');
  assert.equal((await request(other.token)).status,401,'other owner sessions end');assert.equal((await editor(other.token)).status,403,'owner authority changes also withdraw editor grants');
  assert.equal((await ask(mail.post('/auth/confirm',{form:{token:pendingToken}})))!.headers.get('set-cookie'),null,'old mailbox links end');
  const count=mail.sent.length;
  await ask(mail.post('/auth/magic-link',{json:{email:change.currentEmail}}));
  assert.equal(mail.sent.length,count,'the old mailbox no longer gets sign-in mail');
  await ask(mail.post('/auth/magic-link',{json:{email:change.email}}));
  assert.equal(mail.sent.length,count+1);
  const token=new URL(mail.linkIn(mail.sent.at(-1))!).searchParams.get('token')!;
  const signedIn=await ask(mail.post('/auth/confirm',{form:{token}}));
  const nativeCookie=signedIn!.headers.get('set-cookie')!.split(';')[0]!,nativeToken=nativeCookie.split('=')[1]!;
  assert.equal((await request(nativeToken)).status,200,'the new mailbox signs in through the normal email link');
  assert.equal((await request(nativeToken,'settings/owner','PUT',{currentEmail:change.email,email:'owner@newbusiness.example.test'})).status,200,'a native owner with fresh email proof can also correct their address');
  assert.equal((await request(nativeToken)).status,200,'the asking native session stays valid');
  assert.equal((await request(local.token)).status,401,'the previous dev session is revoked');

  const remove=(token:string,id:string)=>request(token,`settings/operators/${id}`,'DELETE',{confirmed:true});
  const otherRemovingOwner=await remove(teammate.token,owner);
  assert.equal(otherRemovingOwner.status,409);
  assert.match((await otherRemovingOwner.json() as {error:string}).error,/Only the setup operator can remove themselves/);
  assert.equal((await request(nativeToken)).status,200,'a refused removal keeps the owner active');
  assert.equal((await remove(nativeToken,outsider)).status,200);
  assert.equal((await request(teammate.token)).status,401,'removal revokes the invited operator session');
  const mailBeforeRemovalRequest=mail.sent.length;
  await ask(mail.post('/auth/magic-link',{json:{email:'teammate@example.test'}}));
  assert.equal(mail.sent.length,mailBeforeRemovalRequest,'removed operators receive no new sign-in link');
  const lastOwner=await remove(nativeToken,owner);
  assert.equal(lastOwner.status,409);
  assert.match((await lastOwner.json() as {error:string}).error,/Establish another active administrator/);
  const invited=await request(nativeToken,'settings/operators','POST',{email:'successor@example.test',displayName:'Successor'});
  assert.equal(invited.status,201,await invited.clone().text());
  assert.equal(mail.sent.length,mailBeforeRemovalRequest,'invitations send no email');
  assert.equal((await remove(nativeToken,owner)).status,200,'another active full operator permits self-removal');
  assert.equal((await request(nativeToken)).status,401,'self-removal revokes the asking owner session');
  assert.equal(await db.prepare("SELECT status FROM operators WHERE id=?").bind(owner).first('status'),'removed');
  assert.ok(await db.prepare("SELECT 1 FROM audit_entries WHERE action='operator.removed' AND entity_id=?").bind(owner).first(),'self-removal is audited');

 } finally {registerDevAdmission(null);await fixture.dispose();}

}
