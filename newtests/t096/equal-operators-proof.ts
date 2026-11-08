import assert from 'node:assert/strict';
import {createApp} from '../../tests/support/app';
import {createDependencies} from '../../tests/support/dependencies';
import {createId} from '../../src/core/shared/ids';
import {collaboratorLanding} from '../../src/core/features/access/collaborator-home';
import {collaborator,nativeRecord,signIn,type fixture} from './fixture';

type Fixture=Awaited<ReturnType<typeof fixture>>;
type Door={name:string;method:string;path:string;body?:unknown;ok:number};
const origin='https://orbit.test';
const pages=['/app/settings/team','/app/settings/data','/app/settings','/app/contacts','/app/companies','/app/reports','/app/brief'];

/** TEAM-001 through the HTTP and page doors: two full operators reach every record, field and action,
 * including records the other created and a record restricted to its owner; a Guest and a Seller
 * collaborator are refused everything outside their share by the server, and nothing changes. */
export async function equalOperatorsProof(f:Fixture){
 const app=createApp({database:f.db,assets:{fetch:async()=>new Response('')}});
 const peerId=createId();await createDependencies(f.db).auth.ensureOperator({id:peerId,email:'second-operator@fold.test',displayName:'Second operator'});const peer=await signIn(f.db,'second-operator@fold.test');
 const guest=await collaborator(f,'guest'),seller=await collaborator(f,'seller');
 const call=(cookie:string,door:Door)=>app.request(origin+door.path,{method:door.method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(door.body===undefined?{}:{body:JSON.stringify(door.body)})});
 const read=async(cookie:string,path:string)=>{const response=await call(cookie,{name:path,method:'GET',path,ok:200});return{status:response.status,text:await response.text()};};
 await f.db.prepare("UPDATE schema_types SET fields_json=? WHERE name='contact'").bind(JSON.stringify({email:{sensitivity:'private'}})).run();
 // The owner's records: one shared with the Guest (name only), one restricted to the owner with a private email, and a restricted deal. A Seller profile also reads records that are not restricted, with private fields withheld.
 const shared=await nativeRecord(f,'contact',{name:'Equal shared contact',email:'equal-private-shared@customer.test'});
 const hidden=await nativeRecord(f,'contact',{name:'Equal hidden contact',email:'equal-private-hidden@customer.test'});
 const deal=await nativeRecord(f,'opportunity',{title:'Equal owner deal'});
 await f.db.prepare("UPDATE graph_records SET visibility='restricted',owner_id=? WHERE id IN(?,?)").bind(f.nativeOperator.operatorId,hidden.ref.id,deal.ref.id).run();
 await f.admin.grant(await f.nativeContext(),{subjectKind:'operator',subjectId:guest.operator.operatorId,resourceType:'contact',resourceId:shared.ref.id,actions:['graph.read'],fields:['name'],purpose:'Review the name only',expiresAt:null});

 // Every record door a full operator has, aimed at records another person created.
 const doors=(contactId:string,dealId:string,destructive:boolean):Door[]=>[
  {name:'list contacts',method:'GET',path:'/api/v1/records/contact',ok:200},
  {name:'read contact',method:'GET',path:`/api/v1/records/contact/${contactId}`,ok:200},
  {name:'read deal',method:'GET',path:`/api/v1/records/opportunity/${dealId}`,ok:200},
  {name:'search',method:'GET',path:'/api/v1/records/contact?q=Equal',ok:200},
  {name:'edit contact',method:'PATCH',path:`/api/v1/records/contact/${contactId}`,body:{changes:{job_title:'Edited by a peer'},base:{}},ok:200},
  {name:'add note',method:'POST',path:`/api/v1/records/contact/${contactId}/entries`,body:{kind:'note',text:'peer note',occurredAt:new Date(Date.now()-1000).toISOString()},ok:200},
  {name:'close deal',method:'POST',path:`/api/v1/records/opportunity/${dealId}/lifecycle`,body:{state:'won',reason:'peer closed'},ok:200},
  {name:'create contact',method:'POST',path:'/api/v1/records/contact',body:{name:'Created through the door',email:`created-${createId().toLowerCase()}@customer.test`},ok:201},
  {name:'connected products',method:'GET',path:'/api/v1/settings/products',ok:200},
  {name:'sending limits',method:'GET',path:'/api/v1/settings/sending',ok:200},
  {name:'access administration',method:'GET',path:'/api/v2/access/workspaces/workspace/administration',ok:200},
  {name:'invite a collaborator',method:'POST',path:'/api/v2/access/workspaces/workspace/invitations',body:{email:`${createId().toLowerCase()}@invited.test`,role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()},ok:200},
  ...(destructive?[{name:'delete contact',method:'DELETE',path:`/api/v1/records/contact/${contactId}`,body:{confirmed:true},ok:200}]:[])];
 const refusedStatuses=[401,403,404];

 // Fingerprint of everything a refused request must not touch.
 const state=async()=>JSON.stringify(await Promise.all(['contacts','opportunities','timeline_entries','access_invitations','access_grants','graph_records'].map(t=>f.db.prepare(`SELECT count(*) n,coalesce(max(updated_at),'') u FROM ${t}`).first().catch(()=>null))));

 // 1. The second full operator does everything on the owner's records, the restricted one included.
 for(const door of doors(hidden.ref.id,deal.ref.id,false)){const response=await call(peer.cookie,door);assert.equal(response.status,door.ok,`${door.name} for the second full operator: ${await response.clone().text()}`);}
 const asPeer=await read(peer.cookie,`/api/v1/records/contact/${hidden.ref.id}`);assert.ok(asPeer.text.includes('equal-private-hidden@customer.test'),'the second full operator reads the private field of a record restricted to the owner');
 assert.ok((await read(peer.cookie,'/api/v1/records/contact')).text.includes('Equal hidden contact'),'the second full operator lists the owner-restricted record');
 // 2. The owner does the same on a record the second operator created, then deletes it.
 const made=await call(peer.cookie,{name:'peer creates',method:'POST',path:'/api/v1/records/contact',body:{name:'Equal peer contact',email:'equal-peer@customer.test'},ok:201});assert.equal(made.status,201);const peerContact=(await made.json() as {id:string}).id;
 const peerDeal=await nativeRecord(f,'opportunity',{title:'Equal peer deal'});
 for(const door of doors(peerContact,peerDeal.ref.id,true)){const response=await call(f.cookie,door);assert.equal(response.status,door.ok,`${door.name} for the owner: ${await response.clone().text()}`);}
 assert.equal((await read(f.cookie,`/api/v1/records/contact/${peerContact}`)).status,404,'the deleted contact is gone for both operators');
 assert.equal((await read(peer.cookie,`/api/v1/records/contact/${peerContact}`)).status,404);

 // 3. A Guest and a Seller collaborator are refused records, fields and actions outside the share.
 const before=await state(),target=doors(hidden.ref.id,deal.ref.id,true).filter(door=>!['list contacts','search','create contact'].includes(door.name));
 for(const person of [guest,seller])for(const door of target){const response=await call(person.cookie,door);assert.ok(refusedStatuses.includes(response.status),`${door.name} must be refused for a collaborator, got ${response.status}`);const body=await response.text();assert.equal(body.includes('equal-private-hidden@customer.test'),false,`${door.name} leaks the hidden record`);}
 assert.equal(await state(),before,'refused collaborator requests change nothing');
 const create=await call(seller.cookie,{name:'create',method:'POST',path:'/api/v1/records/contact',body:{name:'Collaborator-made',email:'collab-made@customer.test'},ok:201});assert.equal(create.status,403,'a collaborator cannot create a record');
 for(const person of [guest,seller]){const list=await read(person.cookie,'/api/v1/records/contact');assert.equal(list.text.includes('Equal hidden contact'),false,'the owner-restricted record is absent from a collaborator list');assert.equal(list.text.includes('equal-private-hidden@customer.test'),false);}
 // The share itself is served, and only to the extent shared: the Guest sees the name, never the private email.
 const sharedRead=await read(guest.cookie,`/api/v2/workspaces/workspace/records/contact/${shared.ref.id}`);assert.equal(sharedRead.status,200);assert.ok(sharedRead.text.includes('Equal shared contact'));assert.equal(sharedRead.text.includes('equal-private-shared@customer.test'),false);
 const sellerRead=await read(seller.cookie,`/api/v1/records/contact/${shared.ref.id}`);assert.equal(sellerRead.status,200);assert.equal(sellerRead.text.includes('equal-private-shared@customer.test'),false,'a private field is withheld from a collaborator who may read the record');
 const hiddenRead=await read(guest.cookie,`/api/v2/workspaces/workspace/records/contact/${hidden.ref.id}`);assert.ok(refusedStatuses.includes(hiddenRead.status));assert.equal(hiddenRead.text.includes('Equal hidden contact'),false);
 // 4. The page door: full operators open every owner page; a collaborator is sent to Shared records.
 for(const path of pages){assert.equal(await collaboratorLanding(f.db,f.nativeOperator.operatorId,path),null,`${path} opens for the owner`);assert.equal(await collaboratorLanding(f.db,peerId,path),null,`${path} opens for the second full operator`);assert.equal(await collaboratorLanding(f.db,guest.operator.operatorId,path),'/app/shared-records',`${path} is refused to a Guest`);}
}
