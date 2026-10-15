import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerDevAdmission} from '@runeditrun/rer/modules/operator-auth/dev-admission';
import {identityResponse} from '../../src/core/features/identity';
import {createId} from '../../src/core/shared/ids';
import {isolatedDatabase} from '../support/isolated-database';
import {createApp} from '../support/app';
import {mailedIdentity} from '../support/email-link';
import {testAuth} from '../support/test-auth';

test('TEAM-002 PUBLIC-004 the owner changes a trial mailbox in Settings, keeps sign-in, and ends old links and sessions',async()=>{
 const fixture=await isolatedDatabase(),db=fixture.db,owner=createId(),stage=createId(),now=new Date().toISOString();
 try {
  await db.prepare("INSERT INTO owner_bootstrap VALUES('initial-owner',?,'owner@orbit.test','Owner','Owner settings','UTC','USD',?,?)").bind(owner,JSON.stringify([{id:stage,name:'New'}]),now).run();
  const auth=testAuth(db),local=await auth.createSession(owner),other=await auth.createSession(owner),outsider=createId();
  await auth.ensureOperator({id:outsider,email:'teammate@example.test',displayName:'Teammate'});
  const teammate=await auth.createSession(outsider),app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}});
  await db.prepare("UPDATE identity_sessions SET kind='dev',proof_at=NULL,proof_version=NULL WHERE session_id=?").bind(local.id).run();
  const request=(token:string,path='settings',method='GET',body?:unknown,origin='https://orbit.test')=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${token}`,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const change={email:'owner@business.example.test',currentEmail:'owner@orbit.test'};
  assert.equal((await request(local.token,'settings/owner','PUT',change)).status,401,'a dev cookie needs the checkout key');
  registerDevAdmission(()=>true);
  assert.equal((await request(local.token)).status,200);
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
  assert.equal((await request(other.token)).status,401,'other owner sessions end');
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

 } finally {registerDevAdmission(null);await fixture.dispose();}
});
