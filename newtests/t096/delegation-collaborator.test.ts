import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture,nativeRecord,signIn} from './fixture';
import {createApp} from '../../tests/support/app';
import {createDependencies} from '../../tests/support/dependencies';
import {createId} from '../../src/core/shared/ids';
import {audience,snapshot} from '../../src/core/features/delegation/evidence';
import {bearer,guard} from '../../src/core/features/delegation/authority';
import {challenge} from '../../src/core/features/delegation/token';
import {hash,random,type Effect} from '../../src/core/features/delegation/protocol';

type Fixture=Awaited<ReturnType<typeof fixture>>;
const origin='https://orbit.test',prefix='/api/delegation/v1';
function application(db:D1Database){return createApp({database:db,assets:{fetch:async()=>{throw new Error('Delegation API proof does not request assets');}}});}
type App=ReturnType<typeof application>;
function native(app:App,cookie:string,path:string,body?:Record<string,string>|Effect){
 const form=body!==undefined&&!('operationKey' in body);
 return app.request(origin+'/delegation'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:origin,...(body!==undefined&&!form?{'Content-Type':'application/json'}:{})},...(body===undefined?{}:{body:form?new URLSearchParams(body as Record<string,string>):JSON.stringify(body)})});
}
function delegated(app:App,token:string,path:string,body?:unknown){return app.request(origin+prefix+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function denied(response:Response,status:number,code:string){assert.equal(response.status,status);assert.equal(response.headers.get('Location'),null);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual(await response.json(),{error:{code,message:code}});}
async function peer(f:Fixture){const id=createId(),auth=createDependencies(f.db).auth;await auth.ensureOperator({id,email:id.toLowerCase()+'@native.test',displayName:'Equal native peer'});const session=await auth.createSession(id);return{id,cookie:'__Host-orbit_session='+session.token};}
async function setup(f:Fixture){const app=application(f.db),contact=await nativeRecord(f,'contact',{name:'Restricted source',email:'private-source@customer.test'}),opportunity=await nativeRecord(f,'opportunity',{title:'Internal onboarding',contact_ids:[contact.ref.id],primary_contact_id:contact.ref.id});await f.db.prepare("UPDATE graph_records SET visibility='restricted',owner_id=? WHERE id=? AND kind='contact'").bind(f.nativeOperator.operatorId,contact.ref.id).run();await f.db.prepare("UPDATE schema_types SET fields_json=? WHERE name='contact'").bind(JSON.stringify({email:{sensitivity:'private'}})).run();assert.equal((await native(app,f.cookie,'/clients',{id:'reader',redirect_uri:'https://reader.test/callback'})).status,303);return{app,contact,opportunity,targets:['contacts/'+contact.ref.id,'opportunities/'+opportunity.ref.id],target:'opportunities/'+opportunity.ref.id+'/handoffs/task'};}
async function consent(app:App,cookie:string,targets:string[]){const verifier=random(),input={client_id:'reader',redirect_uri:'https://reader.test/callback',response_type:'code',state:random(),code_challenge:await challenge(verifier),code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read crm.handoff.write',targets:JSON.stringify(targets)};const response=await native(app,cookie,'/authorize',input);assert.equal(response.status,303,await response.clone().text());const code=new URL(response.headers.get('Location')!).searchParams.get('code')!;return{input,code,tokenBody:{grant_type:'authorization_code',client_id:'reader',redirect_uri:input.redirect_uri,code,code_verifier:verifier}};}
function exchange(app:App,body:Record<string,string>){return app.request(origin+prefix+'/token',{method:'POST',body:new URLSearchParams(body)});}
async function issue(app:App,cookie:string,targets:string[]){const c=await consent(app,cookie,targets),response=await exchange(app,c.tokenBody);assert.equal(response.status,200);const token=(await response.json()).access_token as string,identity=await(await delegated(app,token,'/identity')).json();return{...c,token,id:identity.grantId as string};}
async function effect(db:D1Database,target:string,key=random()):Promise<Effect>{const s=await snapshot(db,target,true);return{operationKey:key,operation:'orbit.handoff.upsert',target,expectedRevision:s.revision,expectedAudienceRevision:s.audience.audienceRevision,content:{title:'Private handoff',description:'Internal source details',assigneeId:null,dueAt:null,status:'open'}};}
async function counts(db:D1Database){const result:Record<string,number>={};for(const table of ['delegation_clients','delegation_grants','delegation_codes','handoff_tasks','handoff_contacts','delegation_receipts','delegation_guards'])result[table]=Number(await db.prepare(`SELECT count(*) n FROM ${table}`).first('n'));result.timeline=Number(await db.prepare("SELECT count(*) n FROM timeline_entries WHERE source='orbit-handoff'").first('n'));return result;}
// These hooks execute the real D1 statements. They insert a concurrent durable
// authority transition at dispatch/read release; they do not simulate DB results.
function intercept(db:D1Database,hooks:{beforeBatch?:()=>Promise<void>;afterBatch?:()=>Promise<void>;beforeFirst?:(sql:string)=>Promise<void>}){
 return new Proxy(db,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{await hooks.beforeBatch?.();const result=await target.batch(statements);await hooks.afterBatch?.();return result;};if(key==='prepare')return(sql:string)=>{const wrap=(statement:D1PreparedStatement):D1PreparedStatement=>new Proxy(statement,{get(value,property){if(property==='bind')return(...bindings:unknown[])=>wrap(value.bind(...bindings));if(property==='first')return async(...args:any[])=>{await hooks.beforeFirst?.(sql);return value.first(...args);};const member=Reflect.get(value,property);return typeof member==='function'?member.bind(value):member;}});return wrap(target.prepare(sql));};const member=Reflect.get(target,key);return typeof member==='function'?member.bind(target):member;}});
}
async function restoredCollaboratorClass(db:D1Database,id:string){
 // Only restoration may change an existing class. Exercise that real installed
 // trigger boundary without weakening or removing the class-immutability trigger.
 await assert.rejects(db.prepare('INSERT INTO access_collaborators VALUES(?,?)').bind(id,new Date().toISOString()).run(),/NATIVE_OPERATOR_CLASS_IMMUTABLE/);
 await db.batch([db.prepare("INSERT INTO runtime_controls VALUES('restore','delegation-class-test')"),db.prepare('INSERT INTO access_collaborators VALUES(?,?)').bind(id,new Date().toISOString()),db.prepare("DELETE FROM runtime_controls WHERE name='restore'")]);
}

test('native delegation denies pending, accepted, profiled, removed and re-invited collaborators while equal peers retain raw authority',async()=>{
 const f=await fixture();try{
  const s=await setup(f),p=await peer(f),full=await issue(s.app,f.cookie,s.targets),peerGrant=await issue(s.app,p.cookie,s.targets),expectedIds=[f.nativeOperator.operatorId,p.id].sort(),beforeAudience=await audience(f.db);
  for(const cookie of [f.cookie,p.cookie])assert.equal((await native(s.app,cookie,'/settings')).status,200);
  for(const token of [full.token,peerGrant.token]){const source=await delegated(s.app,token,'/evidence?target='+s.targets[0]);assert.equal(source.status,200);assert.ok((await source.text()).includes('private-source@customer.test'));}
  const invite=await f.admin.invite(await f.nativeContext(),{email:'pending@collaborator.test',role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()});let session=await signIn(f.db,'pending@collaborator.test');const id=session.operator.operatorId;
  // Synthetic legacy grants model authority issued by the prior vulnerable code.
  const stale=await issue(s.app,f.cookie,s.targets);await f.db.prepare('UPDATE delegation_grants SET principal_id=? WHERE id=?').bind(id,stale.id).run();
  async function checkClass(label:string){
   const input=await effect(f.db,s.target,label),before=await counts(f.db),params={...full.input,state:random()};
   for(const [path,body] of [['/settings',undefined],['/authorize?'+new URLSearchParams(params),undefined],['/handoffs/'+s.opportunity.ref.id,undefined],['/clients',{id:'forbidden-'+label,redirect_uri:'https://blocked.test/callback'}],['/clients/reader/disable',{}],['/grants/'+full.id+'/revoke',{}],['/authorize',params],['/handoffs',input]] as const)await denied(await native(s.app,session.cookie,path,body),403,'SCOPE_DENIED');
   for(const path of ['/identity','/evidence?target='+s.targets[0],'/check?target='+s.targets[0],'/audience?target='+s.targets[0],'/effects/previous'])await denied(await delegated(s.app,stale.token,path),401,'DELEGATION_INVALID');
   await denied(await delegated(s.app,stale.token,'/effects',input),401,'DELEGATION_INVALID');await denied(await delegated(s.app,stale.token,'/revoke',{}),401,'DELEGATION_INVALID');
   assert.deepEqual(await counts(f.db),before);assert.equal(await f.db.prepare("SELECT enabled FROM delegation_clients WHERE id='reader'").first('enabled'),1);assert.equal(await f.db.prepare('SELECT revoked_at FROM delegation_grants WHERE id=?').bind(full.id).first('revoked_at'),null);
   assert.deepEqual(await audience(f.db),beforeAudience);assert.deepEqual((await(await delegated(s.app,full.token,'/audience?target='+s.targets[0])).json()).principalIds,expectedIds);
   const list=await(await native(s.app,f.cookie,'/handoffs/'+s.opportunity.ref.id)).json();assert.deepEqual(list.operators.map((o:{id:string})=>o.id).sort(),expectedIds);
  }
  assert.deepEqual(await f.access.listWorkspaces(session.operator),[]);await checkClass('pending');
  const code=await consent(s.app,f.cookie,s.targets),grantId=await f.db.prepare('SELECT grant_id FROM delegation_codes WHERE hash=?').bind(await hash(code.code)).first<string>('grant_id');await f.db.prepare('UPDATE delegation_grants SET principal_id=? WHERE id=?').bind(id,grantId).run();await denied(await exchange(s.app,code.tokenBody),401,'DELEGATION_INVALID');assert.equal(await f.db.prepare('SELECT token_hash FROM delegation_grants WHERE id=?').bind(grantId).first('token_hash'),null);assert.equal(await f.db.prepare('SELECT consumed_at FROM delegation_codes WHERE hash=?').bind(await hash(code.code)).first('consumed_at'),null);
  await f.admin.accept(session.operator,invite.token);await checkClass('accepted');
  assert.equal((await s.app.request(origin+'/api/v1/records/contact/'+s.contact.ref.id,{headers:{Cookie:session.cookie}})).status,403);
  await f.admin.setMembership(await f.nativeContext(),id,'seller','active');await f.admin.setRoleBundle(await f.nativeContext(),'seller',['graph.read','legacy.read'],['*']);await f.admin.grant(await f.nativeContext(),{subjectKind:'operator',subjectId:id,resourceType:'contact',resourceId:s.contact.ref.id,actions:['graph.read'],fields:['email'],purpose:'One explicit field',expiresAt:null});await checkClass('profiled');
  await f.admin.setMembership(await f.nativeContext(),id,'seller','removed');assert.ok(await f.db.prepare('SELECT revoked_at FROM delegation_grants WHERE id=?').bind(stale.id).first('revoked_at'));assert.equal(await createDependencies(f.db).auth.authenticate(session.cookie),undefined);
  const fresh=await createDependencies(f.db).auth.createSession(id);session={cookie:'__Host-orbit_session='+fresh.token,operator:session.operator};session.operator=(await createDependencies(f.db).auth.authenticate(session.cookie))!;await checkClass('removed');
  const again=await f.admin.invite(await f.nativeContext(),{email:session.operator.email,role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()});await f.admin.accept(session.operator,again.token);await checkClass('reinvited');assert.ok(await f.db.prepare('SELECT revoked_at FROM delegation_grants WHERE id=?').bind(stale.id).first('revoked_at'));
  const old=await effect(f.db,s.target,'audience-change');await peer(f);assert.notEqual((await audience(f.db)).audienceRevision,beforeAudience.audienceRevision);await denied(await delegated(s.app,full.token,'/effects',old),409,'AUDIENCE_CHANGED');
  assert.equal((await delegated(s.app,full.token,'/effects',await effect(f.db,s.target,'owner-effect'))).status,200);assert.equal((await delegated(s.app,peerGrant.token,'/effects',await effect(f.db,s.target,'peer-effect'))).status,200);
  await f.db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(p.id).run();await denied(await delegated(s.app,peerGrant.token,'/identity'),401,'DELEGATION_INVALID');assert.equal(await f.db.prepare('SELECT count(*) n FROM outbound_messages').first('n'),0);
 }finally{await f.close();}
});

test('collaborator removal revokes delegation in the same transaction as membership, sessions and record grants',async()=>{
 const f=await fixture();try{
  const s=await setup(f),invitation=await f.admin.invite(await f.nativeContext(),{email:'remove@collaborator.test',role:'seller',expiresAt:new Date(Date.now()+86400000).toISOString()}),viewer=await signIn(f.db,'remove@collaborator.test');await f.admin.accept(viewer.operator,invitation.token);const id=viewer.operator.operatorId,g=await issue(s.app,f.cookie,s.targets);await f.db.prepare('UPDATE delegation_grants SET principal_id=? WHERE id=?').bind(id,g.id).run();const recordGrant=await f.admin.grant(await f.nativeContext(),{subjectKind:'operator',subjectId:id,resourceType:'contact',resourceId:s.contact.ref.id,actions:['graph.read'],fields:['email'],purpose:'Removal proof',expiresAt:null});
  await f.db.exec("CREATE TRIGGER delegation_removal_failure BEFORE UPDATE OF revoked_at ON delegation_grants BEGIN SELECT RAISE(ABORT,'removal proof failure'); END;");await assert.rejects(f.admin.setMembership(await f.nativeContext(),id,'seller','removed'),/removal proof failure/);
  assert.equal(await f.db.prepare('SELECT status FROM access_memberships WHERE operator_id=?').bind(id).first('status'),'active');assert.ok(await createDependencies(f.db).auth.authenticate(viewer.cookie));for(const [table,key,value] of [['delegation_grants','id',g.id],['access_grants','id',recordGrant.id],['access_invitations','id',invitation.id]])assert.equal(await f.db.prepare(`SELECT revoked_at FROM ${table} WHERE ${key}=?`).bind(value).first('revoked_at'),null);
  await f.db.exec('DROP TRIGGER delegation_removal_failure');await f.admin.setMembership(await f.nativeContext(),id,'seller','removed');assert.equal(await f.db.prepare('SELECT status FROM access_memberships WHERE operator_id=?').bind(id).first('status'),'removed');assert.equal(await createDependencies(f.db).auth.authenticate(viewer.cookie),undefined);for(const [table,value] of [['delegation_grants',g.id],['access_grants',recordGrant.id],['access_invitations',invitation.id]])assert.ok(await f.db.prepare(`SELECT revoked_at FROM ${table} WHERE id=?`).bind(value).first('revoked_at'));
 }finally{await f.close();}
});

test('native delegation administration, consent and handoff commit fence the current full class atomically',async()=>{
 const f=await fixture();try{
  const s=await setup(f),ownerGrant=await issue(s.app,f.cookie,s.targets);
  for(const operation of ['register','disable','revoke','authorize','handoff']){
   const p=await peer(f),c=await consent(s.app,p.cookie,s.targets),input=await effect(f.db,s.target),before=await counts(f.db);let fired=false;
   const db=intercept(f.db,{beforeBatch:async()=>{if(!fired){fired=true;await restoredCollaboratorClass(f.db,p.id);}}}),app=application(db);
   const path=operation==='register'?'/clients':operation==='disable'?'/clients/reader/disable':operation==='revoke'?'/grants/'+ownerGrant.id+'/revoke':operation==='authorize'?'/authorize':'/handoffs';
   const body=operation==='register'?{id:'race-'+operation,redirect_uri:'https://race.test/callback'}:operation==='authorize'?{...c.input,state:random()}:operation==='handoff'?input:{};
   await denied(await native(app,p.cookie,path,body),operation==='handoff'?409:403,operation==='handoff'?'REVISION_CONFLICT':'SCOPE_DENIED');assert.equal(fired,true);assert.deepEqual(await counts(f.db),before);assert.equal(await f.db.prepare("SELECT enabled FROM delegation_clients WHERE id='reader'").first('enabled'),1);assert.equal(await f.db.prepare('SELECT revoked_at FROM delegation_grants WHERE id=?').bind(ownerGrant.id).first('revoked_at'),null);
   const fresh=await snapshot(f.db,s.target,true);await assert.rejects(f.db.batch([guard(f.db,random(),fresh.epoch,undefined,p.id)]),/delegation_guards/);
  }
 }finally{await f.close();}
});

test('token exchange and delegated effect commit reject class changes and stale bearer credentials at dispatch',async()=>{
 const f=await fixture();try{
  const s=await setup(f),p=await peer(f),c=await consent(s.app,p.cookie,s.targets);let fired=false;
  const tokenDb=intercept(f.db,{beforeBatch:async()=>{if(!fired){fired=true;await restoredCollaboratorClass(f.db,p.id);}}});await denied(await exchange(application(tokenDb),c.tokenBody),401,'DELEGATION_INVALID');assert.equal(fired,true);const failed=await f.db.prepare('SELECT g.token_hash,c.consumed_at FROM delegation_grants g JOIN delegation_codes c ON c.grant_id=g.id WHERE c.hash=?').bind(await hash(c.code)).first<{token_hash:string|null;consumed_at:string|null}>();assert.deepEqual(failed,{token_hash:null,consumed_at:null});
  for(const mode of ['class','token']){
   const actor=await peer(f),g=await issue(s.app,actor.cookie,s.targets),captured=await bearer(f.db,new Request('https://orbit.test/api/delegation/v1/identity',{headers:{Authorization:'Bearer '+g.token}})),input=await effect(f.db,s.target),before=await counts(f.db);let changed=false;
   const db=intercept(f.db,{beforeBatch:async()=>{if(!changed){changed=true;if(mode==='class')await restoredCollaboratorClass(f.db,actor.id);else await f.db.prepare('UPDATE delegation_grants SET token_hash=? WHERE id=?').bind(await hash(random()),g.id).run();}}});await denied(await delegated(application(db),g.token,'/effects',input),409,'REVISION_CONFLICT');assert.equal(changed,true);assert.deepEqual(await counts(f.db),before);if(mode==='class'){const fresh=await snapshot(f.db,s.target,true);await assert.rejects(f.db.batch([guard(f.db,random(),fresh.epoch,captured,actor.id)]),/delegation_guards/);}
  }
  const g=await issue(s.app,f.cookie,s.targets);let lookedUp=false;const db=intercept(f.db,{beforeFirst:async sql=>{if(sql.startsWith('SELECT g.*')&&!lookedUp){lookedUp=true;await f.db.prepare('UPDATE delegation_grants SET token_hash=? WHERE id=?').bind(await hash(random()),g.id).run();}}});await assert.rejects(bearer(db,new Request('https://orbit.test/api/delegation/v1/identity',{headers:{Authorization:'Bearer '+g.token}})),/DELEGATION_INVALID/);assert.equal(lookedUp,true);
 }finally{await f.close();}
});

test('native and bearer reads, receipts, exact replays and token/effect responses recheck current class at release',async()=>{
 const f=await fixture();try{
  const s=await setup(f);
  for(const endpoint of ['identity','evidence','check','audience','receipt','replay']){
   const p=await peer(f),g=await issue(s.app,p.cookie,s.targets),input=await effect(f.db,s.target,'release-'+endpoint);assert.equal((await delegated(s.app,g.token,'/effects',input)).status,200);let reads=0,fired=false;
   const db=intercept(f.db,{beforeFirst:async sql=>{if(sql.startsWith('SELECT g.*')&&++reads===(endpoint==='receipt'?3:endpoint==='replay'?4:2)){fired=true;await restoredCollaboratorClass(f.db,p.id);}}});const path=endpoint==='identity'?'/identity':endpoint==='receipt'?'/effects/'+input.operationKey:endpoint==='replay'?'/effects':'/'+endpoint+'?target='+s.targets[0];await denied(await delegated(application(db),g.token,path,endpoint==='replay'?input:undefined),401,'DELEGATION_INVALID');assert.equal(fired,true,endpoint);
  }
  for(const endpoint of ['settings','authorize','handoffs']){
   const p=await peer(f),c=await consent(s.app,p.cookie,s.targets);let reads=0,fired=false;const db=intercept(f.db,{beforeFirst:async sql=>{if(sql.startsWith('SELECT EXISTS(SELECT 1 FROM operators o')&&++reads===2){fired=true;await restoredCollaboratorClass(f.db,p.id);}}});const path=endpoint==='settings'?'/settings':endpoint==='authorize'?'/authorize?'+new URLSearchParams({...c.input,state:random()}):'/handoffs/'+s.opportunity.ref.id;await denied(await native(application(db),p.cookie,path),403,'SCOPE_DENIED');assert.equal(fired,true,endpoint);
  }
  for(const operation of ['token','effect','consent']){
   const p=await peer(f),c=await consent(s.app,p.cookie,s.targets),g=operation==='effect'?await issue(s.app,p.cookie,s.targets):undefined,input=await effect(f.db,s.target,'committed-release');let fired=false;const db=intercept(f.db,{afterBatch:async()=>{if(!fired){fired=true;await restoredCollaboratorClass(f.db,p.id);}}});await denied(operation==='token'?await exchange(application(db),c.tokenBody):operation==='consent'?await native(application(db),p.cookie,'/authorize',{...c.input,state:random()}):await delegated(application(db),g!.token,'/effects',input),operation==='consent'?403:401,operation==='consent'?'SCOPE_DENIED':'DELEGATION_INVALID');assert.equal(fired,true);
  }
 }finally{await f.close();}
});
