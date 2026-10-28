import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {createApp} from '../support/app';
import {proveApiCredentials} from '../support/api-credentials-proof';
import {agentBriefJourney} from '../support/customer-sanity-agent-brief';
import {authorityFixture} from './authority-fixture';
import {snapshot} from '../../src/core/features/delegation/evidence';
import {random,hash} from '../../src/core/features/delegation/protocol';
import {challenge} from '../../src/core/features/delegation/token';

const target='opportunities/opp/handoffs/task',schema='crm.handoff-state/1';
async function effect(db:D1Database,key:string){const current=await snapshot(db,target,true);return {operationKey:key,operation:'orbit.handoff.upsert',target,expectedRevision:current.revision,expectedAudienceRevision:current.audience.audienceRevision,content:{title:'Follow up internally',description:'Arrange customer onboarding',assigneeId:'peer',dueAt:null,status:'open'}};}

test('API-001 DELEGATE-001 native credentials and consented application authority allow only current selected operations, preserve receipts and stop immediately on revocation',async context=>{
 const fixture=await isolatedDatabase(),db=fixture.db;
 try {
  const f=await authorityFixture(db);
  await proveApiCredentials(db,'owner',f.cookie,'stage');
  const verifier=random(),input={client_id:'slate',redirect_uri:'https://slate.test/callback',response_type:'code',state:random(),code_challenge:await challenge(verifier),code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read crm.handoff.write',targets:JSON.stringify(['opportunities/opp'])};
  const view=await f.native.request('https://orbit.test/authorize?'+new URLSearchParams(input),{headers:{Cookie:f.cookie}});
  assert.equal(view.status,200);assert.equal(await db.prepare('SELECT count(*) n FROM delegation_codes').first('n'),0,'consent preview mints nothing');
  assert.equal((await f.form('/clients',{id:'foreign',redirect_uri:'https://foreign.test/callback'})).status,303);
  assert.equal((await f.native.request('https://orbit.test/authorize?'+new URLSearchParams({...input,redirect_uri:'https://foreign.test'}),{headers:{Cookie:f.cookie}})).status,400);
  const consent=await f.form('/authorize',input);assert.equal(consent.status,303);assert.equal((await f.form('/authorize',input)).status,400,'a consent state is one use');
  const code=new URL(consent.headers.get('location')!).searchParams.get('code')!,tokenBody={grant_type:'authorization_code',client_id:'slate',redirect_uri:input.redirect_uri,code,code_verifier:verifier};
  const exchange=(body:Record<string,string>)=>f.api.request('https://orbit.test/token',{method:'POST',body:new URLSearchParams(body)});
  assert.equal((await exchange({...tokenBody,code_verifier:random()})).status,401);
  const response=await exchange(tokenBody);assert.equal(response.status,200);const token=(await response.json()).access_token as string;assert.equal((await exchange(tokenBody)).status,401);
  assert.equal(await db.prepare('SELECT token_hash FROM delegation_grants WHERE token_hash=?').bind(await hash(token)).first('token_hash'),await hash(token));
  const request=(path:string,body?:unknown,typed=false)=>f.api.request('https://orbit.test'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(typed?{'X-RER-Record-State-Schema':schema}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const identity=await(await request('/identity')).json(),read=await f.grant('crm.evidence.read');
  assert.equal(identity.principalId,'owner');assert.deepEqual(identity.capabilities.operations,['orbit.handoff.upsert']);
  assert.equal('recordStateSchemas' in identity.capabilities,false);
  assert.deepEqual((await(await request('/identity',undefined,true)).json()).capabilities.recordStateSchemas,[schema]);
  const publicApp=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}});
  assert.equal((await publicApp.request('https://orbit.test/delegation/clients',{method:'POST',headers:{Cookie:f.cookie,Origin:'https://orbit.test'},body:new URLSearchParams({id:'synthetic-orbit-1',redirect_uri:'https://orbit.test/delegation/callback'})})).status,303);
  // Use the browser's ordinary Accept negotiation for both valid selection and refusals.
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
  assert.equal((await publicApp.request('https://orbit.test/api/rest/v1/deals',{headers:{Authorization:'Bearer '+token,Cookie:f.cookie}})).status,401,'a delegation grant cannot act as an API credential');
  assert.equal((await publicApp.request('https://orbit.test/api/rest/v1/deals',{headers:{'X-Slack-User':'owner',Cookie:f.cookie}})).status,401);
  assert.equal((await f.api.request('https://orbit.test/identity',{headers:{Cookie:f.cookie}})).status,401);
  assert.equal((await request('/evidence?target=contacts/private')).status,404);
  assert.equal((await read.request('/effects',await effect(db,'read-only'))).status,403);
  assert.equal((await request('/check?target='+target)).status,200);
  assert.equal((await request('/audience?operation=orbit.handoff.upsert&target='+target)).status,200);
  assert.equal((await request('/audience?operation=outreach.send&target='+target)).status,422);
  assert.equal((await f.form('/authorize',{account_id:'other'})).status,400);
  const command=await effect(db,'committed');
  const beforeTasks=Number(await db.prepare('SELECT count(*) n FROM handoff_tasks').first('n'));
  await db.prepare("CREATE TRIGGER fail_receipt BEFORE INSERT ON delegation_receipts BEGIN SELECT RAISE(ABORT,'receipt failure'); END").run();
  assert.ok((await request('/effects',command)).status>=500);
  assert.equal(await db.prepare('SELECT count(*) n FROM handoff_tasks').first('n'),beforeTasks,'a failed command leaves no task or receipt');
  assert.equal(await db.prepare("SELECT count(*) n FROM delegation_receipts WHERE operation_key='committed'").first('n'),0);
  await db.prepare('DROP TRIGGER fail_receipt').run();
  const committed=await Promise.all([request('/effects',command),request('/effects',command)]);assert.deepEqual(committed.map(item=>item.status),[200,200]);
  const receipt=(await committed[0]!.json()).receipt;
  assert.deepEqual((await(await request('/effects/committed')).json()).receipt,receipt,'a lost answer is recovered from the durable receipt');
  assert.equal(await db.prepare('SELECT count(*) n FROM handoff_tasks').first('n'),beforeTasks+1);
  assert.equal((await request('/effects',{...command,content:{...command.content,title:'Changed'}})).status,409);
  assert.equal((await request('/effects',{...command,operationKey:'mail',content:{...command.content,recipient:'customer@example.test',subject:'Hi',body:'Send'}})).status,400);
  const beforeMessages=await db.prepare('SELECT count(*) n FROM outbound_messages').first('n');
  for(const state of ['completed','cancelled','open']){
   const update={...await effect(db,'native-'+state),content:{...command.content,title:'Native '+state,status:state}};
   const saved=await f.native.request('https://orbit.test/handoffs',{method:'POST',headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify(update)});assert.equal(saved.status,200,await saved.clone().text());
   for(const endpoint of ['evidence','check']){
    const typed=await request('/'+endpoint+'?target='+target,undefined,true);assert.equal(typed.status,200);assert.equal(typed.headers.get('Cache-Control'),'no-store');const observed=await typed.json();
    assert.deepEqual(observed.recordState,{schema,kind:'crm.handoff',state});assert.equal(observed.revision,(await snapshot(db,target)).revision);assert.ok(Math.abs(Date.now()-Date.parse(observed.observedAt))<10000);
    const legacy=await(await request('/'+endpoint+'?target='+target)).json();assert.equal('recordState' in legacy,false);assert.deepEqual(Object.keys(observed).filter(key=>key!=='recordState'),Object.keys(legacy));
   }
   const recovered=await(await request('/effects/committed')).json();assert.deepEqual(recovered.receipt,receipt);assert.deepEqual(recovered.observed.content,update.content);
  }
  assert.equal(await db.prepare('SELECT count(*) n FROM outbound_messages').first('n'),beforeMessages,'handoff changes never approve or send mail');
  assert.equal((await request('/effects',{...command,operationKey:'stale'})).status,409);
  const audience=await effect(db,'audience');await f.auth.ensureOperator({id:'new-peer',email:'new@example.test',displayName:'New'});assert.equal((await request('/effects',audience)).status,409);
  const unsupported=await f.api.request('https://orbit.test/identity',{headers:{Authorization:'Bearer '+token,'X-RER-Record-State-Schema':'unknown/1'}});assert.equal(unsupported.status,422);
  for(const mode of ['expired','revoked','disabled']){
   const grant=await f.grant();
   if(mode==='expired')await db.prepare("UPDATE delegation_grants SET expires_at='2000-01-01' WHERE id=?").bind(grant.id).run();
   if(mode==='revoked')assert.equal((await f.form('/grants/'+grant.id+'/revoke',{})).status,303);
   if(mode==='disabled')assert.equal((await f.form('/clients/slate/disable',{})).status,303);
   for(const path of ['/identity','/check?target='+target,'/evidence?target='+target,'/audience?target='+target,'/effects/committed'])assert.equal((await grant.request(path)).status,401,mode+' '+path);
   assert.equal((await grant.request('/effects',await effect(db,mode))).status,401);
  }
  // One public request budget spans token exchange and bearer reads; visitor addresses are never stored clear.
  context.mock.timers.enable({apis:['Date'],now:Date.now()});
  const ip='192.0.2.155',headers={'CF-Connecting-IP':ip};let limited:Response|undefined;
  for(let n=0;n<1000;n++){const result=await publicApp.request('https://orbit.test/api/delegation/v1/identity',{headers});if(result.status===429){limited=result;break;}assert.equal(result.status,401);}
  assert.ok(limited);assert.ok(limited.headers.get('Retry-After'));
  assert.equal((await publicApp.request('https://orbit.test/api/delegation/v1/token',{method:'POST',headers})).status,429);
  assert.ok((await db.prepare('SELECT bucket FROM public_rate_limits').all<{bucket:string}>()).results.every(row=>!row.bucket.includes(ip)));
  context.mock.timers.setTime(Date.now()+120000);assert.equal((await publicApp.request('https://orbit.test/api/delegation/v1/identity',{headers})).status,401);
 } finally {context.mock.timers.reset();await fixture.dispose();}
});

test('BRIEF-005 OUT-001 SIGNAL-009 selected evidence becomes a cited internal handoff, a person accepts it and revocation ends access without granting outreach authority',agentBriefJourney);
