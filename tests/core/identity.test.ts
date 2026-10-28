import assert from 'node:assert/strict';
import {identityResponse} from '../../src/core/features/identity';
import {identityBindings} from '../support/app';
import {publicDemoIsolation} from '../support/sanity-identity-installation';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {testAuth} from '../support/test-auth';
import {todayApp} from '../support/today-workspace';
import {createId} from '../../src/core/shared/ids';
import {emailLinkLifecycle,formSignOut,sessionStepUp,localPersonaAuthority} from '../support/sanity-identity-session';
import {requireSignInDomains} from '../support/sanity-identity-domains';
import {ownerSuccession} from '../support/sanity-identity-owner';

test('PUBLIC-004 AUTH-5 OPS-001 TEAM-002 native sign-in, domain policy, session proof and owner succession preserve only current human authority',async()=>{
 const fixture=await isolatedDatabase(),opportunity=createId(),now=new Date().toISOString(),auth=testAuth(fixture.db);
 try{
  const origin='https://orbit.test',bindings={...identityBindings(fixture.db,new Request(origin)),OWNER_EMAIL:'synthetic-orbit-owner@example.com',SETUP_TOKEN:'synthetic-orbit-setup-token-0123456789'};
  const claim=(token=bindings.SETUP_TOKEN)=>identityResponse(new Request(origin+'/auth/bootstrap',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token,displayName:'Owner'})}),bindings,{ownerClaimed:async()=>true});
  assert.equal((await claim('synthetic-wrong-setup-token-0123456789'))!.status,403);
  const claimed=await claim();assert.equal(claimed!.status,303);assert.ok(claimed!.headers.get('set-cookie'));
  assert.equal((await claim())!.status,409);
  const owner=(await fixture.db.prepare('SELECT id FROM operators WHERE setup_owner=1').first<{id:string}>())!.id;
  const stage=(await fixture.db.prepare('SELECT id FROM pipeline_stages ORDER BY position LIMIT 1').first<{id:string}>())!.id;
  await fixture.db.prepare("INSERT INTO opportunities(id,title,lifecycle,stage_id,value_cents,score,band,queue_state,created_at,updated_at) VALUES(?,'Step-up','open',?,0,0,'low','none',?,?)").bind(opportunity,stage,now,now).run();
  await publicDemoIsolation(fixture.db);
  const ctx={fixture,owner,opportunity,async operator(email=`${createId().toLowerCase()}@example.test`){const id=createId();await auth.ensureOperator({id,email,displayName:'Identity member'});return{id,email,auth};}};
  await emailLinkLifecycle(ctx);
  await formSignOut(ctx);
  await sessionStepUp(ctx);
  await localPersonaAuthority(ctx);
  await requireSignInDomains(fixture.db,await todayApp(fixture.db,{operatorId:owner,email:'synthetic-orbit-owner@example.com'}));
  await ownerSuccession(ctx);
 }finally{await fixture.dispose();}
});
