import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {exercise} from './scenario';
import { testAuth } from '../support/test-auth';
import {nativeDelegation} from '../support/app';
import {delegationRoutes} from '../../src/core/features/delegation/routes';
import {snapshot} from '../../src/core/features/delegation/evidence';
import {random} from '../../src/core/features/delegation/protocol';
import {challenge} from '../../src/core/features/delegation/token';
const schema='crm.handoff-state/1',target='opportunities/opp/handoffs/handoff';
test('negotiated read-only current handoff states preserve legacy evidence and immutable write receipts on real D1',async()=>{
 const f=await isolatedDatabase();try{
  const db=f.db;await exercise(db);await db.prepare("UPDATE operators SET status='active' WHERE id='operator'").run();
  const auth=testAuth(db,{now:()=>new Date()}),native=nativeDelegation(db),api=delegationRoutes(db),session=await auth.createSession('operator');
  const verifier=random(),body={client_id:'slate',redirect_uri:'https://slate.test/callback',response_type:'code',state:random(),code_challenge:await challenge(verifier),code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read',targets:JSON.stringify([target])};
  const consent=await native.request('https://orbit.test/authorize',{method:'POST',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});assert.equal(consent.status,303);
  const code=new URL(consent.headers.get('Location')!).searchParams.get('code')!;
  const exchange=await api.request('https://orbit.test/token',{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',client_id:'slate',redirect_uri:body.redirect_uri,code,code_verifier:verifier})});assert.equal(exchange.status,200);const token=(await exchange.json()).access_token;
  const request=(path:string,extension:string|undefined=schema)=>api.request('https://orbit.test'+path,{headers:{Authorization:`Bearer ${token}`,...(extension?{'X-RER-Record-State-Schema':extension}:{})}});
  const legacyIdentity=await (await request('/identity','')).json(),identity=await (await request('/identity')).json();assert.equal('recordStateSchemas'in legacyIdentity.capabilities,false);assert.deepEqual(identity.capabilities.recordStateSchemas,[schema]);assert.deepEqual(identity.capabilities.operations,[]);
  const historic=(await db.prepare("SELECT receipt_json FROM delegation_receipts WHERE operation_key='operation-1'").first<{receipt_json:string}>())!.receipt_json;
  for(const state of ['open','completed','cancelled']){
   const s=await snapshot(db,target);const response=await native.request('https://orbit.test/handoffs',{method:'POST',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({operationKey:'state-'+state,operation:'orbit.handoff.upsert',target,expectedRevision:s.revision,expectedAudienceRevision:s.audience.audienceRevision,content:{title:'Native handoff',description:'Edited by native operator',assigneeId:null,dueAt:null,status:state}})});assert.equal(response.status,200,await response.clone().text());
   for(const endpoint of ['evidence','check']){const r=await request('/'+endpoint+'?target='+target);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');const value=await r.json();assert.deepEqual(value.recordState,{schema,kind:'crm.handoff',state});assert.equal(value.revision,(await snapshot(db,target)).revision);assert.ok(Math.abs(Date.now()-Date.parse(value.observedAt))<10000);const legacy=await (await request('/'+endpoint+'?target='+target,'')).json();assert.equal('recordState'in legacy,false);assert.deepEqual(Object.keys(value).filter(k=>k!=='recordState'),Object.keys(legacy));}
  }
  assert.equal((await db.prepare("SELECT receipt_json FROM delegation_receipts WHERE operation_key='operation-1'").first<{receipt_json:string}>())!.receipt_json,historic);
  assert.equal((await request('/identity','unknown/1')).status,422);
  for(const path of ['/evidence?target=opportunities/opp','/check?target=opportunities/opp/handoffs/absent','/evidence?target=opportunities/foreign/handoffs/handoff'])assert.equal((await request(path)).status,404);
  const write=await api.request('https://orbit.test/effects',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({operationKey:'forbidden',operation:'orbit.handoff.upsert',target,expectedRevision:'a'.repeat(64),expectedAudienceRevision:'a'.repeat(64),content:{title:'Denied',description:'',assigneeId:null,dueAt:null,status:'open'}})});assert.equal(write.status,403);
  await db.prepare("UPDATE delegation_grants SET targets_json=? WHERE token_hash IS NOT NULL AND scopes_json='[\"crm.evidence.read\"]'").bind(JSON.stringify(['opportunities/opp'])).run();assert.equal((await request('/evidence?target=opportunities/opp')).status,422);assert.equal((await request('/check?target=opportunities/opp/handoffs/absent')).status,404);
  await db.prepare("UPDATE delegation_grants SET expires_at='2000-01-01T00:00:00Z'").run();assert.equal((await request('/evidence?target='+target)).status,401);
 }finally{await f.dispose();}
});

test('typed snapshot state and revision share one row; post-read grant and installation epoch changes deny disclosure',async()=>{
 const f=await isolatedDatabase();try{
  const {authorityFixture}=await import('./authority-fixture');const a=await authorityFixture(f.db),g=await a.grant();const target='opportunities/opp/handoffs/race';const before=await snapshot(f.db,target,true);
  assert.equal((await a.native.request('https://orbit.test/handoffs',{method:'POST',headers:{Cookie:a.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({operationKey:'native-race-setup',operation:'orbit.handoff.upsert',target,expectedRevision:before.revision,expectedAudienceRevision:before.audience.audienceRevision,content:{title:'Race source',description:'',assigneeId:null,dueAt:null,status:'open'}})})).status,200);
  let hook=async()=>{},fired=false;
  const wrapped={prepare(sql:string){const statement=f.db.prepare(sql);const wrap=(value:D1PreparedStatement):D1PreparedStatement=>new Proxy(value,{get(object,key){if(key==='bind')return(...values:unknown[])=>wrap(object.bind(...values));if(key==='first')return async(...args:any[])=>{const result=await object.first(...args);if(sql.startsWith('SELECT * FROM handoff_tasks WHERE id=')&&!fired){fired=true;await hook();}return result;};const result=Reflect.get(object,key);return typeof result==='function'?result.bind(object):result;}});return wrap(statement);},batch:f.db.batch.bind(f.db)} as D1Database;
  const api=delegationRoutes(wrapped),read=()=>api.request('https://orbit.test/evidence?target='+target,{headers:{Authorization:'Bearer '+g.token,'X-RER-Record-State-Schema':schema}});
  const exact=await snapshot(f.db,target);const response=await read();assert.equal(response.status,200);const observed=await response.json();assert.equal(observed.recordState.state,'open');assert.equal(JSON.parse(observed.text).handoff.status,'open');assert.equal(observed.revision,exact.revision);
  fired=false;hook=async()=>{await f.db.prepare("UPDATE handoff_tasks SET status='cancelled' WHERE id='race'").run();};assert.equal((await read()).status,409);assert.notEqual(exact.revision,(await snapshot(f.db,target)).revision);
  fired=false;hook=async()=>{await f.db.prepare('UPDATE delegation_installation SET epoch=epoch+1').run();};assert.equal((await read()).status,409);
  fired=false;hook=async()=>{await f.db.prepare('UPDATE delegation_grants SET revoked_at=? WHERE id=?').bind(new Date().toISOString(),g.id).run();};const denied=await read();assert.equal(denied.status,409);assert.equal((await denied.text()).includes('Race source'),false);
 }finally{await f.dispose();}
});
