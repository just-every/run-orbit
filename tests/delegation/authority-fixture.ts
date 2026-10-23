import assert from 'node:assert/strict';
import { testAuth } from '../support/test-auth';
import {nativeDelegation} from '../support/app';
import {delegationRoutes} from '../../src/core/features/delegation/routes';
import {random} from '../../src/core/features/delegation/protocol';
import {challenge} from '../../src/core/features/delegation/token';

export async function authorityFixture(db:D1Database){
 const now=new Date().toISOString(),auth=testAuth(db,{now:()=>new Date()});
 await db.prepare("INSERT INTO workspace_settings(id,name,timezone,currency,working_hours_json,stale_interval_days,awaiting_response_working_days,free_mail_domains_json,created_at,updated_at) VALUES('workspace','Delegation proof','UTC','USD','{}',14,5,'[]',?,?)").bind(now,now).run();
 await auth.ensureOperator({id:'owner',email:'owner@example.test',displayName:'Owner'});
 await auth.ensureOperator({id:'peer',email:'peer@example.test',displayName:'Peer'});
 await db.prepare("INSERT INTO pipeline_stages VALUES('stage','New',1,?,?)").bind(now,now).run();
 await db.prepare("INSERT INTO opportunities(id,title,lifecycle,stage_id,value_cents,score,band,queue_state,created_at,updated_at) VALUES('opp','Onboarding','open','stage',0,0,'low','none',?,?)").bind(now,now).run();
 await db.prepare("INSERT INTO contacts(id,name,contactability,created_at,updated_at) VALUES('contact','Customer','contactable',?,?)").bind(now,now).run();
 await db.prepare("INSERT INTO opportunity_contacts(opportunity_id,contact_id,is_primary,created_at) VALUES('opp','contact',1,?)").bind(now).run();
 const session=await auth.createSession('owner'),cookie=`__Host-orbit_session=${session.token}`,native=nativeDelegation(db),api=delegationRoutes(db);
 const form=(path:string,body:Record<string,string>)=>native.request('https://orbit.test'+path,{method:'POST',headers:{Cookie:cookie,Origin:'https://orbit.test'},body:new URLSearchParams(body)});
 assert.equal((await form('/clients',{id:'slate',redirect_uri:'https://slate.test/callback'})).status,303);
 async function grant(scope='crm.evidence.read crm.handoff.write',targets=['opportunities/opp']){
  const verifier=random(),input={client_id:'slate',redirect_uri:'https://slate.test/callback',response_type:'code',state:random(),code_challenge:await challenge(verifier),code_challenge_method:'S256',account_id:'workspace',scope,targets:JSON.stringify(targets)};
  const consent=await form('/authorize',input);assert.equal(consent.status,303,await consent.clone().text());
  const code=new URL(consent.headers.get('Location')!).searchParams.get('code')!;
  const exchange=await api.request('https://orbit.test/token',{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',client_id:'slate',redirect_uri:input.redirect_uri,code,code_verifier:verifier})});
  assert.equal(exchange.status,200);const token=(await exchange.json()).access_token as string;
  const request=(path:string,body?:unknown)=>api.request('https://orbit.test'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const identity=await(await request('/identity')).json();return {request,token,id:identity.grantId as string};
 }
 return {auth,cookie,native,api,form,grant};
}
