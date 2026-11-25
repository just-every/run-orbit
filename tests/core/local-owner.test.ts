import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerDevAdmission} from '@runeditrun/rer/modules/operator-auth/dev-admission';
import {ownerSignin} from '@runeditrun/rer/internal/modules/deploy-kit/owner-signin.mjs';
import {mkdtemp,realpath,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {identityResponse} from '../../src/core/features/identity';
import {createId} from '../../src/core/shared/ids';
import {isolatedDatabase} from '../support/isolated-database';
import {createApp} from '../support/app';
import {mailedIdentity} from '../support/email-link';
import {testAuth} from '../support/test-auth';

test('TEAM-002 PUBLIC-004 owner mailbox changes, mail-off rer signin and setup-owner removal preserve sign-in authority',async()=>{
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

  // Mail off (MAIL_PROVIDER=none): no sign-in mail; rer's own `rer signin` code mints the owner's one-time link
  // through the Cloudflare D1 API (faked here, at the network edge, onto this database) and Orbit's door admits it once.
  const mailOff={...mail.bindings,MAIL_PROVIDER:'none',MAIL_FROM:undefined,SENDGRID_API_KEY:undefined};
  const offAsk=(request:Request)=>identityResponse(request,mailOff,{ownerClaimed:async()=>true});
  const offPage=await offAsk(new Request(mail.origin+'/signin'));
  assert.equal(offPage!.status,200);assert.match(await offPage!.text(),/rer signin/);
  const live={versionId:crypto.randomUUID(),deploymentId:crypto.randomUUID(),etag:'etag-1'},target={accountId:'account',project:'sales-orbit',environment:'production',worker:'sales-orbit-production',origin:mail.origin};
  const stateDir=await realpath(await mkdtemp(join(tmpdir(),'orbit-signin-'))),statePath=join(stateDir,'production.json');
  try {
   await writeFile(statePath,JSON.stringify({version:1,kind:'rer-deploy-owner-state',...target,origin:undefined,owned:{worker:{status:'created'},d1:{DB:{status:'created',id:'orbit-d1'}},r2:{},kv:{},queues:{}},receipt:{provider:live}}));
   const cloudflare={async request(path:string,init?:{body?:{sql:string}}){
    if(path.endsWith('/settings'))return{bindings:[]};
    if(path.endsWith('/deployments'))return{deployments:[{id:live.deploymentId,versions:[{percentage:100,version_id:live.versionId}]}]};
    if(path.endsWith('/versions/'+live.versionId))return{id:live.versionId,resources:{script:{etag:live.etag}}};
    if(path==='/d1/database/orbit-d1/query')return[{success:true,results:(await db.prepare(init!.body!.sql).all()).results}];
    throw Object.assign(new Error('unexpected '+path),{status:404});
   }};
   const minted=await ownerSignin({api:cloudflare,target,statePath}),ownerEmail=await db.prepare('SELECT email FROM operators WHERE id=?').bind(owner).first('email');
   assert.equal(minted.email,ownerEmail,'rer signin names Orbit\'s claimed owner');
   const link=new URL(minted.link),grantToken=link.searchParams.get('token')!;
   assert.equal(link.pathname,'/auth/owner-signin');
   const preview=await offAsk(new Request(link));
   assert.equal(preview!.status,200);assert.equal(preview!.headers.get('set-cookie'),null,'opening the link signs nobody in');
   const used=await Promise.all([offAsk(mail.post('/auth/owner-signin',{form:{token:grantToken}})),offAsk(mail.post('/auth/owner-signin',{form:{token:grantToken}}))]);
   const admitted=used.filter(response=>response!.status===303&&response!.headers.get('set-cookie'));
   assert.equal(admitted.length,1,'the link signs the owner in once');
   const offToken=admitted[0]!.headers.get('set-cookie')!.split(';')[0]!.split('=')[1]!;
   assert.equal(((await(await request(offToken)).json()) as any).owner.email,ownerEmail,'the mail-off session is the owner\'s');
  } finally {await rm(stateDir,{recursive:true,force:true});}

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
  const invitedEmail=['synthetic-orbit-1','example.test'].join('@');
  const invited=await request(nativeToken,'settings/operators','POST',{email:invitedEmail,displayName:'Successor'});
  assert.equal(invited.status,201,await invited.clone().text());
  assert.equal(mail.sent.length,mailBeforeRemovalRequest,'invitations send no email');
  const invitedId=(await invited.json() as {id:string}).id;
  assert.ok(await db.prepare("SELECT 1 FROM audit_entries WHERE action='operator.invited' AND entity_id=? AND actor_id=?").bind(invitedId,owner).first(),'the owner invitation is audited');
  assert.equal((await ask(mail.post('/auth/magic-link',{json:{email:invitedEmail}})))!.status,202);
  assert.equal(mail.sent.length,mailBeforeRemovalRequest+1,'the invited person requests their own link');
  assert.deepEqual(mail.sent.at(-1)!.to,[invitedEmail]);
  const invitedLink=mail.linkIn(mail.sent.at(-1));
  assert.ok(invitedLink,'the requested mail contains a native sign-in link');
  const invitedSignIn=await ask(mail.post('/auth/confirm',{form:{token:new URL(invitedLink).searchParams.get('token')!}}));
  const invitedCookie=invitedSignIn!.headers.get('set-cookie')!.split(';')[0]!,invitedToken=invitedCookie.split('=')[1]!;
  const invitedSession=await ask(new Request(mail.origin+'/auth/session',{headers:{Cookie:invitedCookie}}));
  assert.equal(invitedSession!.status,200);
  const person=(await invitedSession!.json() as {operator:{id:string;email:string;role:string}}).operator;
  assert.deepEqual([person.id,person.email,person.role],[invitedId,invitedEmail,'admin'],'the native session belongs to the invited full operator');
  assert.equal((await request(invitedToken)).status,200,'their email-link cookie opens authenticated Settings');
  assert.equal((await remove(invitedToken,owner)).status,409,'an invited full operator cannot remove the setup owner');
  assert.equal((await request(nativeToken)).status,200,'the refused removal preserves owner authority');
  assert.equal((await remove(nativeToken,invitedId)).status,200);
  assert.equal((await request(invitedToken)).status,401,'removal revokes the actual email-link session');
  const mailBeforeInvitedRemovalRequest=mail.sent.length;
  await ask(mail.post('/auth/magic-link',{json:{email:invitedEmail}}));
  assert.equal(mail.sent.length,mailBeforeInvitedRemovalRequest,'the removed invited person receives no new link');
  const replacement=await request(nativeToken,'settings/operators','POST',{email:['synthetic-orbit-2','example.test'].join('@'),displayName:'Replacement'});
  assert.equal(replacement.status,201,await replacement.clone().text());
  assert.equal(mail.sent.length,mailBeforeInvitedRemovalRequest,'the replacement invitation also sends no email');
  assert.equal((await remove(nativeToken,owner)).status,200,'another active full operator permits self-removal');
  assert.equal((await request(nativeToken)).status,401,'self-removal revokes the asking owner session');
  assert.equal(await db.prepare("SELECT status FROM operators WHERE id=?").bind(owner).first('status'),'removed');
  assert.ok(await db.prepare("SELECT 1 FROM audit_entries WHERE action='operator.removed' AND entity_id=?").bind(owner).first(),'self-removal is audited');

 } finally {registerDevAdmission(null);await fixture.dispose();}
});
