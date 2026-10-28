import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture,nativeRecord,signIn} from './fixture';
import {onboardEmptyWorkspace} from './owner-onboarding-step';
import {privateEntriesProof} from './private-entries-proof';
import {teamDelegation} from './team-delegation-step';
import {createApp} from '../../tests/support/app';

test('TEAM-001 TEAM-002 an empty owner workspace admits equal peers while invited collaborators obey record, field, relationship and lifecycle boundaries',async()=>{
 const target=await onboardEmptyWorkspace(),f=await fixture(target,'empty-owner@fixture.test');
 try{
  const app=createApp({database:f.db,assets:{fetch:async()=>{throw Error('Native team HTTP journey');}}});
  const access='/api/v2/access/workspaces/workspace',records='/api/v2/workspaces/workspace/records';
  const request=(path:string,method='GET',body?:unknown,cookie=f.cookie)=>app.request('https://orbit.test'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const call=async(path:string,method='GET',body?:unknown,cookie=f.cookie,status=200)=>{const response=await request(path,method,body,cookie);assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
  const peerRecord=await call('/api/v1/settings/operators','POST',{email:'peer@fold.test',displayName:'Native peer'},f.cookie,201),peer=await signIn(f.db,'peer@fold.test');
  const company=await nativeRecord(f,'company',{name:'Visible original',primary_domain:'secretneedle.test',custom_fields:{margin:'nestedsecret',ordinary:'retained source'}}),hidden=await nativeRecord(f,'company',{name:'Private company'}),contact=await nativeRecord(f,'contact',{name:'Shared contact'}),privateContact=await nativeRecord(f,'contact',{name:'Private contact'}),deal=await nativeRecord(f,'opportunity',{title:'Shared opportunity'});
  await f.db.prepare("UPDATE graph_records SET visibility='restricted',owner_id=? WHERE id IN(?,?)").bind(f.nativeOperator.operatorId,hidden.ref.id,privateContact.ref.id).run();
  await f.db.prepare("UPDATE schema_types SET fields_json=? WHERE name='company'").bind(JSON.stringify({primary_domain:{sensitivity:'private'},'custom_fields_json.margin':{sensitivity:'private'}})).run();
  for(const cookie of [f.cookie,peer.cookie]){
   assert.equal((await call(`${records}/company/${company.ref.id}`,'GET',undefined,cookie)).fields.primary_domain,'secretneedle.test');
   assert.equal((await call(`${records}/company/${hidden.ref.id}`,'GET',undefined,cookie)).fields.name,'Private company');
  }
  assert.equal((await request(`${access}/members/${peerRecord.id}`,'PUT',{role:'guest',status:'removed'})).status,400);
  assert.equal((await request(`${access}/invitations`,'POST',{email:peer.operator.email,role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()})).status,403);
  const invitation=await call(`${access}/invitations`,'POST',{email:'seller@collaborator.test',role:'seller',expiresAt:new Date(Date.now()+86400000).toISOString()}),viewer=await signIn(f.db,'seller@collaborator.test');
  assert.deepEqual(await call('/api/v2/access/workspaces','GET',undefined,viewer.cookie),[]);
  assert.equal((await request(`${records}/contact/${contact.ref.id}`,'GET',undefined,viewer.cookie)).status,403);
  await call('/api/v2/access/invitations/accept','POST',{token:invitation.token},viewer.cookie);
  assert.ok((await request('/api/v2/access/invitations/accept','POST',{token:invitation.token},viewer.cookie)).status>=400);
  const visible=await call(`${records}/company/${company.ref.id}`,'GET',undefined,viewer.cookie);assert.equal(visible.fields.primary_domain,undefined);assert.equal(visible.fields.custom_fields_json,undefined);
  assert.equal((await request(`${records}/company/${hidden.ref.id}`,'GET',undefined,viewer.cookie)).status,403);
  for(const query of ['secretneedle','nestedsecret'])assert.deepEqual((await call(`${records}?kind=company&q=${query}`,'GET',undefined,viewer.cookie)).items,[]);
  assert.equal((await call(`${records}?kind=company&q=Visible`,'GET',undefined,viewer.cookie)).items.length,1);
  await call(`${records}/company/${company.ref.id}`,'PUT',{name:'Permitted edit'},viewer.cookie);
  assert.equal((await request(`${records}/company/${company.ref.id}`,'PUT',{primary_domain:'intrusion.test'},viewer.cookie)).status,403);
  assert.equal((await request(`${records}/company/${company.ref.id}`,'PUT',{custom_fields:{margin:'changed'}},viewer.cookie)).status,403);
  for(const [kind,id,patch] of [['contact',contact.ref.id,{company_id:hidden.ref.id}],['opportunity',deal.ref.id,{contact_ids:[privateContact.ref.id]}]] as const)assert.equal((await request(`/api/v1/records/${kind}/${id}`,'PUT',patch,viewer.cookie)).status,403);
  await call(`/api/v1/records/opportunity/${deal.ref.id}`,'PUT',{contact_ids:[contact.ref.id],primary_contact_id:contact.ref.id},viewer.cookie);
  const grant=await call(`${access}/grants`,'POST',{subjectKind:'operator',subjectId:viewer.operator.operatorId,resourceType:'company',resourceId:company.ref.id,actions:['graph.read'],fields:['primary_domain'],purpose:'Review this exact field',expiresAt:null});
  assert.equal((await call(`${records}/company/${company.ref.id}`,'GET',undefined,viewer.cookie)).fields.primary_domain,'secretneedle.test');
  const relatedGrant=await call(`${access}/grants`,'POST',{subjectKind:'operator',subjectId:viewer.operator.operatorId,resourceType:'company',resourceId:hidden.ref.id,actions:['graph.read'],fields:[],purpose:'Associate the selected company',expiresAt:null});
  await call(`/api/v1/records/contact/${contact.ref.id}`,'PUT',{company_id:hidden.ref.id},viewer.cookie);await call(`${access}/grants/${relatedGrant.id}`,'DELETE',{});
  assert.equal((await request(`/api/v1/records/contact/${contact.ref.id}`,'PUT',{company_id:hidden.ref.id},viewer.cookie)).status,403);
  await call(`${access}/grants/${grant.id}`,'DELETE',{});assert.equal((await call(`${records}/company/${company.ref.id}`,'GET',undefined,viewer.cookie)).fields.primary_domain,undefined);
  await call(`${access}/members/${viewer.operator.operatorId}`,'PUT',{role:'analyst',status:'active'});
  assert.equal((await request(`${records}/company/${company.ref.id}`,'PUT',{name:'Analyst intrusion'},viewer.cookie)).status,403);
  await call(`${access}/members/${viewer.operator.operatorId}`,'PUT',{role:'analyst',status:'removed'});
  assert.equal((await request(`${records}/company/${company.ref.id}`,'GET',undefined,viewer.cookie)).status,401);
  assert.equal((await request(`${access}/members/${viewer.operator.operatorId}`,'PUT',{role:'seller',status:'active'})).status,400);
  const returning=await signIn(f.db,viewer.operator.email),again=await call(`${access}/invitations`,'POST',{email:viewer.operator.email,role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()});
  await call('/api/v2/access/invitations/accept','POST',{token:again.token},returning.cookie);
  assert.deepEqual((await call(`${records}?kind=company`,'GET',undefined,returning.cookie)).items,[]);
  await privateEntriesProof(f);
  await teamDelegation(f);
 }finally{await f.close();}
});
