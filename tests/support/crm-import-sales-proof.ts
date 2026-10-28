import assert from 'node:assert/strict';
import {createId} from '../../src/core/shared/ids';
import {createDependencies} from './dependencies';
import {defaultSalesProfile} from '../../src/core/features/teams/policy';
import {json,finish} from './crm-import-flow';
import {nativeId} from '../../src/core/features/imports/source';
export async function scopedImportFlow(f:any){
 const actor=createId(),deps=createDependencies(f.db);await deps.auth.ensureOperator({id:actor,email:'scoped-import'+'@'+'example.test',displayName:'Scoped importer'});const session=await deps.auth.createSession(actor);
 const profile={...defaultSalesProfile('seller'),fields:['*'],permissions:['import']};
 await f.db.prepare('INSERT INTO sales_roles VALUES(?,?,?,?,?,0)').bind(actor,profile.role,profile.scope,JSON.stringify(profile.fields),JSON.stringify(profile.permissions)).run();
 const scoped={request:(path:string,method='GET',body?:unknown)=>f.request(path,method,body,{Cookie:'__Host-orbit_session='+session.token})};
 const source={vendor:'csv',account:'Assigned import',owners:{rep:actor},files:[{kind:'contact',name:'owned.csv',csv:'id,email,name,owner,permission\r\nnew,assigned-import'+'@'+'example.test,Assigned contact,rep,subscribed',mapping:{id:'id',email:'email',name:'name',owner:'owner',permission:'permission'},separator:';'}],stages:{}};
 const withoutOwner=structuredClone(source);withoutOwner.owners={rep:''};assert.equal((await scoped.request('imports/dry-run','POST',withoutOwner)).status,400);
 const unmapped=structuredClone(source);delete (unmapped as any).owners;assert.equal((await scoped.request('imports/dry-run','POST',unmapped)).status,403);
 const dry=await json(await scoped.request('imports/dry-run','POST',source)),id=nativeId('orbit:csv:Assigned import','contact','new');
 assert.equal(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(id).first(),null);
 await finish(scoped,dry);assert.equal((await f.db.prepare("SELECT owner_id FROM record_ownership WHERE record_type='contact' AND record_id=?").bind(id).first<any>()).owner_id,actor);
 const replay=await json(await scoped.request('imports/dry-run','POST',source));await finish(scoped,replay);await finish(scoped,replay,'undo');assert.ok(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(id).first());
 const hidden=await f.customer('outside-import'+'@'+'example.test'),before=await f.db.prepare('SELECT contactability,contactability_revision FROM contacts WHERE id=?').bind(hidden.contactId).first();
 const unsafe={vendor:'csv',account:'Outside import',files:[{kind:'contact',name:'stops.csv',csv:'id,email,name,dnc\r\nother,'+hidden.email+',Hidden customer,true',mapping:{id:'id',email:'email',name:'name',dnc:'dnc'},separator:';'}]};
 const denied=await scoped.request('imports/dry-run','POST',unsafe);assert.equal(denied.status,403);assert.deepEqual(await f.db.prepare('SELECT contactability,contactability_revision FROM contacts WHERE id=?').bind(hidden.contactId).first(),before);assert.equal((await denied.text()).includes(hidden.contactId),false);
 await f.db.prepare("UPDATE sales_roles SET fields_json='[]' WHERE operator_id=?").bind(actor).run();assert.equal((await scoped.request(`imports/${dry.id}`)).status,403);assert.equal((await scoped.request(`imports/${dry.id}/undo`,'POST',{confirmed:true})).status,403);assert.ok(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(id).first());
 await f.db.prepare("UPDATE sales_roles SET fields_json='[\"*\"]' WHERE operator_id=?").bind(actor).run();await finish(scoped,dry,'undo');assert.equal(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(id).first(),null);assert.equal(await f.db.prepare("SELECT owner_id FROM record_ownership WHERE record_type='contact' AND record_id=?").bind(id).first(),null);
 const namelessMailbox={...source,account:'Assigned without mailbox',files:[{...source.files[0],csv:'id,name,owner\r\nanonymous,Imported named person,rep',mapping:{id:'id',name:'name',owner:'owner'}}]};
 const noMail=await json(await scoped.request('imports/dry-run','POST',namelessMailbox)),noMailId=nativeId('orbit:csv:Assigned without mailbox','contact','anonymous');await finish(scoped,noMail);
 await json(await f.request('records/contact/'+noMailId,'DELETE',{confirmed:true}));assert.equal(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(noMailId).first(),null);assert.equal(await f.db.prepare("SELECT owner_id FROM record_ownership WHERE record_type='contact' AND record_id=?").bind(noMailId).first(),null);assert.equal((await json(await scoped.request('imports/'+noMail.id))).sourceWithdrawn,true);
 await f.db.prepare("UPDATE sales_roles SET permissions_json='[]' WHERE operator_id=?").bind(actor).run();assert.equal((await scoped.request('imports/dry-run','POST',source)).status,403);
}
