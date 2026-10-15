import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomBytes} from 'node:crypto';
import {registerDevAdmission} from '@runeditrun/rer/modules/operator-auth/dev-admission';
import {ownerSigninDigest} from '@runeditrun/rer/internal/modules/operator-auth/owner-signin-grant.mjs';
import {identityResponse} from '../../src/core/features/identity';
import {version} from '../../src/core/features/identity/store';
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

  // Deployment authority can recover the real native owner even without sign-in mail.
  const noMail={...mail.bindings,MAIL_FROM:undefined,SENDGRID_API_KEY:undefined};
  const recover=(request:Request)=>identityResponse(request,noMail,{ownerClaimed:async()=>true});
  async function recoveryGrant(operator=owner,expiry=Date.now()+14*60_000,offset=0){const token=randomBytes(32).toString('base64url'),id=createId();await db.prepare(`INSERT INTO identity_owner_signins(id,token_hash,operator_id,operator_version,created_at,expires_at) SELECT ?,?,o.id,${version('o')}+?,?,? FROM operators o WHERE o.id=?`).bind(id,await ownerSigninDigest(token),offset,Date.now(),expiry,operator).run();return{id,token};}
  for(const bad of [await recoveryGrant(owner,Date.now()-1),await recoveryGrant(outsider),await recoveryGrant(owner,undefined,-1),await recoveryGrant(owner,Date.now()+16*60_000)])assert.equal((await recover(mail.post('/auth/owner-signin',{form:{token:bad.token}})))!.status,400,'expired, non-owner, changed-owner and overlong grants refuse');
  const recovery=await recoveryGrant(),link=`${mail.origin}/auth/owner-signin?token=${recovery.token}`;
  const preview=await recover(new Request(link));
  assert.equal(preview!.status,200);assert.equal(preview!.headers.get('set-cookie'),null,'opening recovery is inert');
  assert.equal(await db.prepare('SELECT consumed_at FROM identity_owner_signins WHERE id=?').bind(recovery.id).first('consumed_at'),null);
  const forged=new Request(mail.origin+'/auth/owner-signin',{method:'POST',headers:{Origin:'https://forged.test','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:recovery.token})});
  assert.equal((await recover(forged))!.status,403);
  const confirmations=await Promise.all([recover(mail.post('/auth/owner-signin',{form:{token:recovery.token}})),recover(mail.post('/auth/owner-signin',{form:{token:recovery.token}}))]);
  const admitted=confirmations.filter(response=>response!.status===303);
  assert.equal(admitted.length,1,'a recovery grant opens one session');assert.equal(admitted[0]!.headers.get('location'),'/app/settings');
  assert.equal(await db.prepare("SELECT count(*) FROM identity_audit WHERE action='owner:signin-link' AND value=?").bind(recovery.id).first('count(*)'),1);
  const recoveredToken=admitted[0]!.headers.get('set-cookie')!.split(';')[0]!.split('=')[1]!;
  assert.equal((await request(recoveredToken,'settings/owner','PUT',{currentEmail:'owner@newbusiness.example.test',email:'owner@recovered.example.test'})).status,200,'the recovered owner can fix their email without mail');
  assert.equal((await request(recoveredToken)).status,200);
 } finally {registerDevAdmission(null);await fixture.dispose();}
});
