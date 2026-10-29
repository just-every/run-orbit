import {delegationReplayRace} from '../support/delegation-replay-race';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {proveApiCredentials} from '../support/api-credentials-proof';
import {createApp} from '../support/app';
import {authorityFixture} from './authority-fixture';
import {challenge} from '../../src/core/features/delegation/token';
import {random} from '../../src/core/features/delegation/protocol';

const target='opportunities/opp/handoffs/task',schema='crm.handoff-state/1';
test('API-002 native credential lifecycle and delegation D1 reject ambient cookies, scope escalation, expiration, disable and revocation on every read and write; DELEGATE-001 consent, atomic handoff replay and current state preserve selected authority',async()=>{
 const fixture=await isolatedDatabase(),race=delegationReplayRace(fixture.db),db=race.db;
 try{
  const f=await authorityFixture(db);
  await proveApiCredentials(db,'owner',f.cookie,'stage');
  const verifier=random(),consent={client_id:'slate',redirect_uri:'https://slate.test/callback',response_type:'code',state:random(),code_challenge:await challenge(verifier),code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read crm.handoff.write',targets:JSON.stringify(['opportunities/opp'])};
  const exchange=(body:Record<string,string>)=>f.api.request('https://orbit.test/token',{method:'POST',body:new URLSearchParams(body)});
  assert.equal((await f.native.request('https://orbit.test/authorize?'+new URLSearchParams({...consent,redirect_uri:'https://foreign.test'}),{headers:{Cookie:f.cookie}})).status,400);
  const codes=await db.prepare('SELECT count(*) FROM delegation_codes').first('count(*)');
  assert.equal((await f.native.request('https://orbit.test/authorize?'+new URLSearchParams(consent),{headers:{Cookie:f.cookie}})).status,200);
  assert.equal(await db.prepare('SELECT count(*) FROM delegation_codes').first('count(*)'),codes,'GET consent does not issue authority');
  assert.equal((await f.native.request('https://orbit.test/authorize',{method:'POST',headers:{Cookie:f.cookie,Origin:'https://foreign.test'},body:new URLSearchParams(consent)})).status,403);
  const approved=await f.form('/authorize',consent);assert.equal(approved.status,303);
  assert.equal((await f.form('/authorize',consent)).status,400,'consent state is one-use');
  const tokenInput={grant_type:'authorization_code',client_id:'slate',redirect_uri:consent.redirect_uri,code:new URL(approved.headers.get('Location')!).searchParams.get('code')!,code_verifier:verifier};
  assert.equal((await exchange({...tokenInput,code_verifier:random()})).status,401);
  const exchanged=await exchange(tokenInput);assert.equal(exchanged.status,200);const token=(await exchanged.json()).access_token as string;
  assert.equal((await exchange(tokenInput)).status,401);
  const request=(path:string,body?:unknown,extension?:string)=>f.api.request('https://orbit.test'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(extension?{'X-RER-Record-State-Schema':extension}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  assert.ok(!(await db.prepare('SELECT * FROM delegation_grants').all()).results.some(row=>JSON.stringify(row).includes(token)),'only a verifier remains in storage');
  const identity=await(await request('/identity')).json();assert.equal(identity.principalId,'owner');assert.deepEqual(identity.capabilities.operations,['orbit.handoff.upsert']);assert.equal('recordStateSchemas' in identity.capabilities,false);
  assert.deepEqual((await(await request('/identity',undefined,schema)).json()).capabilities.recordStateSchemas,[schema]);
  assert.equal((await request('/identity',undefined,'unknown/1')).status,422);
  const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}});
  for(const headers of [{Authorization:'Bearer '+token,Cookie:f.cookie},{'X-Slack-User':'owner',Cookie:f.cookie}])assert.equal((await app.request('https://orbit.test/api/rest/v1/deals',{headers})).status,401);

  const publicApp=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}});
  assert.equal((await publicApp.request('https://orbit.test/delegation/clients',{method:'POST',headers:{Cookie:f.cookie,Origin:'https://orbit.test'},body:new URLSearchParams({id:'synthetic-orbit-1',redirect_uri:'https://orbit.test/delegation/callback'})})).status,303);
  const connect=(kind:string)=>publicApp.request('https://orbit.test/delegation/connect?'+new URLSearchParams({client:'synthetic-orbit-1',kind}),{headers:{Cookie:f.cookie}});
  for(const kind of ['opportunities','contacts','companies'])assert.equal((await connect(kind)).status,200,kind);
  const inherited=['constructor','toString','__proto__','hasOwnProperty','valueOf'],refusals=[];
  for(const kind of inherited){
   const response=await connect(kind),body=await response.text();
   assert.equal(response.headers.get('Cache-Control'),'no-store',kind);
   assert.doesNotMatch(body,/\bbinding\b|\bstack\b|D1_ERROR|SQLITE|\[native code\]|\b(?:Type|Reference|Syntax)Error\b|\bat\s+\S+\s+\(/i,kind);
   assert.equal(JSON.parse(body).error.code,'INVALID_REQUEST',kind);
   refusals.push(response.status);
  }
  assert.deepEqual(refusals,inherited.map(()=>400),'Inherited record kinds take the normal invalid request path');
  assert.equal((await f.api.request('https://orbit.test/identity',{headers:{Cookie:f.cookie}})).status,401);
  assert.equal((await request('/evidence?target=contacts/private')).status,404);
  assert.equal((await request('/audience?operation=outreach.send&target='+target)).status,422);
  assert.equal((await f.form('/authorize',{account_id:'other'})).status,400);
  async function effect(key:string){
   const check=await request('/check?target='+target),audience=await request('/audience?operation=orbit.handoff.upsert&target='+target);assert.equal(check.status,200);assert.equal(audience.status,200);
   return {operationKey:key,operation:'orbit.handoff.upsert',target,expectedRevision:(await check.json()).revision,expectedAudienceRevision:(await audience.json()).audienceRevision,content:{title:'Customer onboarding',description:'Arrange the internal follow-up',assigneeId:'peer' as string|null,dueAt:null,status:'open'}};
  }
  const read=await f.grant('crm.evidence.read');assert.equal((await read.request('/effects',await effect('read-only'))).status,403);
  const input=await effect('atomic');
  const counts=async()=>Promise.all(['handoff_tasks','handoff_contacts','delegation_receipts','delegation_guards'].map(table=>db.prepare(`SELECT count(*) FROM ${table}`).first('count(*)')));
  const before=await counts();
  await db.exec("CREATE TRIGGER fail_receipt BEFORE INSERT ON delegation_receipts BEGIN SELECT RAISE(ABORT,'receipt failure'); END;");
  assert.equal((await request('/effects',input)).status,503,'failure to retain the receipt refuses the whole public write');assert.deepEqual(await counts(),before);
  assert.equal(await db.prepare("SELECT count(*) FROM timeline_entries WHERE source='orbit-handoff'").first('count(*)'),0);
  await db.exec('DROP TRIGGER fail_receipt');
  race.start();
  const replay=await Promise.all([request('/effects',input),request('/effects',input)]);race.stop();assert.deepEqual(replay.map(r=>r.status),[200,200]);
  const committed=await replay[0].json();assert.deepEqual((await(await request('/effects/atomic')).json()).receipt,committed.receipt);
  assert.deepEqual(await counts(),[1,1,1,0]);assert.equal(await db.prepare("SELECT count(*) FROM timeline_entries WHERE source='orbit-handoff'").first('count(*)'),1);
  assert.equal((await request('/effects',{...input,content:{...input.content,title:'Different'}})).status,409);
  assert.equal((await request('/effects',{...input,operationKey:'mail',content:{...input.content,recipient:'customer@example.test',subject:'Hi',body:'Send'}})).status,400);
  // The human edits the same handoff. Its live read state changes; its original receipt does not.
  for(const status of ['completed','cancelled','open']){
   const update={...await effect('native-'+status),content:{...input.content,title:'Native '+status,assigneeId:status==='cancelled'?null:'owner',status}};
   const changed=await f.native.request('https://orbit.test/handoffs',{method:'POST',headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify(update)});assert.equal(changed.status,200,await changed.clone().text());
   const recovered=await(await request('/effects/atomic')).json();assert.deepEqual(recovered.receipt,committed.receipt);assert.deepEqual(recovered.observed.content,update.content);
   for(const endpoint of ['evidence','check']){
    const response=await request('/'+endpoint+'?target='+target,undefined,schema);assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
    const state=await response.json(),legacy=await(await request('/'+endpoint+'?target='+target)).json();assert.deepEqual(state.recordState,{schema,kind:'crm.handoff',state:status});assert.equal(state.revision,recovered.observed.revision);assert.equal('recordState' in legacy,false);assert.equal(legacy.revision,state.revision);assert.ok(Math.abs(Date.now()-Date.parse(state.observedAt))<10000);
   }
  }
  assert.equal((await request('/effects',{...input,operationKey:'stale'})).status,409);
  const priorAudience=await effect('audience');await f.auth.ensureOperator({id:'new-peer',email:'new@example.test',displayName:'New'});assert.equal((await request('/effects',priorAudience)).status,409);
  const nativeList=await f.native.request('https://orbit.test/handoffs/opp',{headers:{Cookie:f.cookie}});assert.equal((await nativeList.json()).tasks[0].task.title,'Native open');
  for(const path of ['/evidence?target=opportunities/opp','/check?target=opportunities/opp/handoffs/absent','/evidence?target=opportunities/foreign/handoffs/task'])assert.equal((await request(path,undefined,schema)).status,path.includes('target=opportunities/opp')&&!path.includes('/handoffs')?422:404);
  assert.equal(await db.prepare('SELECT count(*) FROM outbound_messages').first('count(*)'),0);
  const deniedInput=await effect('denied');
  for(const mode of ['expired','revoked','removed','disabled']){
   const grant=await f.grant();
   if(mode==='expired')await db.prepare("UPDATE delegation_grants SET expires_at='2000-01-01' WHERE id=?").bind(grant.id).run();
   if(mode==='revoked')assert.equal((await f.form('/grants/'+grant.id+'/revoke',{})).status,303);
   if(mode==='removed')await db.prepare("UPDATE operators SET status='removed' WHERE id='owner'").run();
   if(mode==='disabled')assert.equal((await f.form('/clients/slate/disable',{})).status,303);
   for(const path of ['/identity','/check?target='+target,'/evidence?target='+target,'/audience?target='+target,'/effects/atomic'])assert.equal((await grant.request(path)).status,401,mode+' '+path);
   assert.equal((await grant.request('/effects',deniedInput)).status,401);
   if(mode==='removed')await db.prepare("UPDATE operators SET status='active' WHERE id='owner'").run();
  }
 }finally{await fixture.dispose();}
});
