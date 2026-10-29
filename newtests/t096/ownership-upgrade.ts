import assert from 'node:assert/strict';
import {nativeId} from '../../src/core/features/imports/source';
import {exactMainDatabase,ownershipStartingMain,legacyOwnershipMain} from './main-fixture';
import {createId} from '../../src/core/shared/ids';
import {createApp} from '../../tests/support/app';
import {signIn,fixture} from './fixture';
import {archiveHttp,httpArchive,httpRestore} from './archive-http-proof';
import {localArchiveRoundTrip} from '../../tests/support/capture-privacy-archive';
import {isolatedDatabase} from '../../tests/support/isolated-database';

export async function assertUpgradedOwnership(db:D1Database,cookie:string,contact:string,company:string,owner:string,legacy=false) {
 const app=createApp({database:db,assets:{fetch:async()=>new Response('')}});
 async function call(path:string,method='GET',body?:unknown) {
  const response=await app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const result=await response.json() as any;assert.ok(response.ok,JSON.stringify(result));return result;
 }
 for(const [kind,id]of [['contact',contact],['company',company]]) {
  assert.equal((await call(`records/${kind}/${id}`)).ownership.ownerId,legacy?owner:null);
  const review=await call('records/ownership/review','POST',{kind,ids:[id],ownerId:legacy?null:owner});
  await call(`records/ownership/${review.id}/apply`,'POST',{});
  assert.equal((await call(`records/${kind}/${id}`)).ownership.ownerId,legacy?null:owner);
 }
 if(legacy)return;
 const operator=await db.prepare('SELECT email FROM operators WHERE id=?').bind(owner).first<{email:string}>();
 const source={vendor:'hubspot',account:'Synthetic upgraded owners',files:[{kind:'contact',name:'contacts.csv',csv:`Record ID,First Name,Email,Contact owner\r\n722,Upgraded imported contact,synthetic-orbit-722@ownership.test,${operator!.email}`,mapping:{id:'Record ID',first_name:'First Name',email:'Email',owner:'Contact owner'}}]};
 const review=await call('imports/dry-run','POST',source);let imported;do{imported=await call(`imports/${review.id}/apply`,'POST',{confirmed:true,fingerprint:review.fingerprint});}while(['queued','applying'].includes(imported.job.state));assert.equal(imported.job.state,'completed');
 const importedContact=nativeId('orbit:hubspot:Synthetic upgraded owners','contact','722');assert.equal((await call(`records/contact/${importedContact}`)).ownership.ownerId,owner);
 const archive=await httpArchive(archiveHttp(app,()=>cookie)),target=await fixture();
 try {
  let restoredCookie=target.cookie;const restored=createApp({database:target.db,assets:{fetch:async()=>new Response('')}});
  await httpRestore(archiveHttp(restored,()=>restoredCookie),archive);
  restoredCookie=(await signIn(target.db,'owner@fold.test')).cookie;
  for(const [kind,id]of [['contact',contact],['company',company],['contact',importedContact]]) {
   const response=await restored.request(`https://orbit.test/api/v1/records/${kind}/${id}`,{headers:{Cookie:restoredCookie}});
   assert.equal(response.status,200);const record=await response.json() as any;
   assert.equal(record.ownership.ownerId,owner);assert.equal(record.timeline.filter((entry:any)=>entry.kind==='owner.changed').length,1);
  }
  const local=await isolatedDatabase();
  try {
   await localArchiveRoundTrip(target.db,local.db);
   assert.deepEqual((await local.db.prepare('SELECT * FROM record_ownership ORDER BY record_type,record_id').all()).results,(await target.db.prepare('SELECT * FROM record_ownership ORDER BY record_type,record_id').all()).results);
   assert.deepEqual((await local.db.prepare('SELECT * FROM record_ownership_history ORDER BY id').all()).results,(await target.db.prepare('SELECT * FROM record_ownership_history ORDER BY id').all()).results);
  } finally {await local.dispose();}
  const erased=await restored.request(`https://orbit.test/api/v1/records/contact/${contact}`,{method:'DELETE',headers:{Cookie:restoredCookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({confirmed:true})});
  assert.equal(erased.status,200,await erased.text());
  const fresh=await httpArchive(archiveHttp(restored,()=>restoredCookie));
  assert.ok(!JSON.stringify(fresh.parts).includes(contact),'Erased contact has no ownership/history/review copy');
  assert.equal(await target.db.prepare("SELECT owner_id FROM record_ownership WHERE record_type='company' AND record_id=?").bind(company).first('owner_id'),owner);
 } finally {await target.close();}
}

export async function ownershipStartingUpgrades() {
 for(const commit of [ownershipStartingMain,legacyOwnershipMain]) {
  const target=await exactMainDatabase(commit);
  try {
   const db=target.db,owner=createId(),stage=createId(),contact=createId(),company=createId(),now=new Date().toISOString(),legacy=commit===legacyOwnershipMain;
   await db.prepare('INSERT INTO owner_bootstrap VALUES(?,?,?,?,?,?,?,?,?)').bind('initial-owner',owner,'owner@fold.test','Upgrade owner','Existing sales','UTC','USD',JSON.stringify([{id:stage,name:'Discovery'}]),now).run();
   await db.prepare("INSERT INTO companies(id,name,created_at,updated_at) VALUES(?,'Existing account',?,?)").bind(company,now,now).run();
   await db.prepare("INSERT INTO contacts(id,name,email,email_key,company_id,contactability,created_at,updated_at) VALUES(?,'Existing buyer','synthetic-orbit-buyer@ownership.test','synthetic-orbit-buyer@ownership.test',?,'contactable',?,?)").bind(contact,company,now,now).run();
   if(legacy)for(const table of ['contacts','companies'])await db.prepare(`UPDATE ${table} SET owner_id=?`).bind(owner).run();
   const before={contact:await db.prepare('SELECT * FROM contacts WHERE id=?').bind(contact).first(),company:await db.prepare('SELECT * FROM companies WHERE id=?').bind(company).first()};
   await target.migrateFold();
   assert.deepEqual(await target.db.prepare('SELECT * FROM contacts WHERE id=?').bind(contact).first(),before.contact);
   assert.deepEqual(await target.db.prepare('SELECT * FROM companies WHERE id=?').bind(company).first(),before.company);
   const cookie=(await signIn(target.db,'owner@fold.test')).cookie;
   await assertUpgradedOwnership(target.db,cookie,contact,company,owner,legacy);
   assert.deepEqual((await target.db.prepare('PRAGMA foreign_key_check').all()).results,[]);
  } finally {await target.dispose();}
 }
}
