import assert from 'node:assert/strict';
import {fixture,nativeRecord,signIn} from './fixture';
import {createApp} from '../../tests/support/app';
import {createDependencies} from '../../tests/support/dependencies';
import {createId} from '../../src/core/shared/ids';
import {audience,snapshot} from '../../src/core/features/delegation/evidence';
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
async function issue(app:App,cookie:string,targets:string[]){const c=await consent(app,cookie,targets),response=await exchange(app,c.tokenBody);assert.equal(response.status,200);const token=(await response.json() as {access_token:string}).access_token as string,identity=await(await delegated(app,token,'/identity')).json() as {grantId:string};return{...c,token,id:identity.grantId as string};}
async function effect(db:D1Database,target:string,key=random()):Promise<Effect>{const s=await snapshot(db,target,true);return{operationKey:key,operation:'orbit.handoff.upsert',target,expectedRevision:s.revision,expectedAudienceRevision:s.audience.audienceRevision,content:{title:'Private handoff',description:'Internal source details',assigneeId:null,dueAt:null,status:'open'}};}
async function counts(db:D1Database){const result:Record<string,number>={};for(const table of ['delegation_clients','delegation_grants','delegation_codes','handoff_tasks','handoff_contacts','delegation_receipts','delegation_guards'])result[table]=Number(await db.prepare(`SELECT count(*) n FROM ${table}`).first('n'));result.timeline=Number(await db.prepare("SELECT count(*) n FROM timeline_entries WHERE source='orbit-handoff'").first('n'));return result;}
/** Delegated consent belongs to full operators throughout the collaborator lifecycle. */
export async function teamDelegation(f:Fixture){

  const s=await setup(f),p=await peer(f),full=await issue(s.app,f.cookie,s.targets),peerGrant=await issue(s.app,p.cookie,s.targets),beforeAudience=await audience(f.db),expectedIds=beforeAudience.principalIds;
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
   assert.deepEqual(await audience(f.db),beforeAudience);assert.deepEqual((await(await delegated(s.app,full.token,'/audience?target='+s.targets[0])).json() as {principalIds:string[]}).principalIds,expectedIds);
   const list=await(await native(s.app,f.cookie,'/handoffs/'+s.opportunity.ref.id)).json() as {operators:{id:string}[]};assert.deepEqual(list.operators.map((o:{id:string})=>o.id).sort(),expectedIds);
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

}
