import assert from 'node:assert/strict';
import {launchFixture} from './launch-fixture';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {nativeId} from '../../src/core/features/imports/source';
import {json} from './crm-import-flow';
import {createId} from '../../src/core/shared/ids';
import {importCopies} from './crm-import-privacy';
import {salesforceNetwork,sfOrg,sfOwner,sfAccount,sfPerson,sfMailbox} from './salesforce-network';
import {readCurrentArchive} from './current-archive';
export async function salesforceApiFlow(){
 const f=await launchFixture(),network=salesforceNetwork(),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'3a'.repeat(32)})!;
 let cookie='';
 const request=(path:string,method='GET',body?:unknown,overrideCookie=cookie)=>createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:security,captureOrigin:'https://orbit.test',captureFetch:network.fetcher}).request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:overrideCookie,Origin:'https://orbit.test','Content-Type':'application/json'},...body===undefined?{}:{body:JSON.stringify(body)}});
 const call=async(path:string,method='GET',body?:unknown)=>json(await request(path,method,body));
 const session=await createDependencies(f.db).auth.createSession(f.actor);cookie=`__Host-orbit_session=${session.token}`;
 const start=()=>call('imports/salesforce/oauth/start','POST',{clientId:'synthetic-orbit-1',clientSecret:'synthetic-orbit-2',sandbox:true,confirmedReadOnly:true});
 const callback=(state:string,code:string,overrideCookie=cookie)=>request(`imports/salesforce/oauth/callback?state=${encodeURIComponent(state)}&code=${code}`,'GET',undefined,overrideCookie);
 const accepted=async(state:string,code:string)=>{const response=await callback(state,code);assert.equal(response.status,303);assert.equal(response.headers.get('Location'),'/app/settings/data/import?salesforce=connected');};
 const refused=async(state:string,code:string,overrideCookie=cookie)=>{const response=await callback(state,code,overrideCookie);assert.equal(response.status,303);assert.match(response.headers.get('Location')!,/salesforceError=/);};
 try{
  assert.equal((await request('imports/salesforce/oauth/start','POST',{clientId:'synthetic-orbit-1',clientSecret:'synthetic-orbit-2',sandbox:true,confirmedReadOnly:true})).status,403,'A full operator cannot mint owner connection authority');
  await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
  assert.equal((await request('imports/salesforce/oauth/start','POST',{clientId:'synthetic-orbit-1',clientSecret:'synthetic-orbit-2',sandbox:true,confirmedReadOnly:false})).status,400);
  const expired=new URL((await start()).authorizationUrl);await f.db.prepare('UPDATE crm_import_salesforce_oauth SET expires_at=0').run();await refused(expired.searchParams.get('state')!,'synthetic-orbit-expired');
  const other=createId();await createDependencies(f.db).auth.ensureOperator({id:other,email:'synthetic-orbit-other'+'@'+'example.test',displayName:'Contact owner'});const otherSession=await createDependencies(f.db).auth.createSession(other);
  const pending=await start(),url=new URL(pending.authorizationUrl);assert.equal(url.origin,'https://test.salesforce.com');assert.equal(url.searchParams.get('scope'),'api refresh_token');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.ok(url.searchParams.get('code_challenge'));
  const raw=JSON.stringify((await f.db.prepare('SELECT * FROM crm_import_salesforce_oauth').all()).results);assert.ok(!raw.includes('synthetic-orbit-2'));assert.ok(!raw.includes(url.searchParams.get('state')!));
  const secondSession=await createDependencies(f.db).auth.createSession(f.actor),secondCookie=`__Host-orbit_session=${secondSession.token}`;
  await refused(url.searchParams.get('state')!,'synthetic-orbit-code-1',secondCookie);await refused('unknown-state','synthetic-orbit-code-1');assert.equal(network.calls.length,0);
  await accepted(url.searchParams.get('state')!,'synthetic-orbit-code-1');await refused(url.searchParams.get('state')!,'synthetic-orbit-code-1');
  const replay=new URL((await start()).authorizationUrl);await refused(replay.searchParams.get('state')!,'synthetic-orbit-code-1');assert.equal(network.calls.length,1,'Code replay is refused before a provider request');
  network.grant('api refresh_token full');const broad=new URL((await start()).authorizationUrl);await refused(broad.searchParams.get('state')!,'synthetic-orbit-code-2');network.grant('api');const missing=new URL((await start()).authorizationUrl);await refused(missing.searchParams.get('state')!,'synthetic-orbit-code-missing-grant');network.grant('api refresh_token');
  assert.equal(await f.db.prepare('SELECT count(*) n FROM crm_import_salesforce_connections').first('n'),1);
  const config=await call('imports/salesforce'),connection=config.connections[0];assert.equal(connection.org_id,sfOrg);assert.ok(!JSON.stringify(config).includes('synthetic-orbit-3'));assert.ok(!JSON.stringify(config).includes('ciphertext'));
  const sealed=await f.db.prepare('SELECT ciphertext FROM crm_import_salesforce_connections WHERE id=?').bind(connection.id).first<string>('ciphertext');assert.ok(sealed&&!sealed.includes('synthetic-orbit-3'));assert.equal(JSON.parse(await security.open(sealed!)).refreshToken,'synthetic-orbit-4');
  const callsBeforeWrongKey=network.calls.length,wrongKeyApp=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'9a'.repeat(32)}),captureOrigin:'https://orbit.test',captureFetch:network.fetcher});assert.equal((await wrongKeyApp.request(`https://orbit.test/api/v1/imports/salesforce/connections/${connection.id}/pulls`,{method:'POST',headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:'{}'})).status,409);assert.equal(network.calls.length,callsBeforeWrongKey);
  network.expireNextRead();let pull=await call(`imports/salesforce/connections/${connection.id}/pulls`,'POST',{});assert.equal(network.refreshes,1);assert.ok(await f.db.prepare("SELECT id FROM audit_entries WHERE action='salesforce.connected'").first());
  assert.ok(pull.metadata.diagnostics.some((d:any)=>d.source==='Contact.Phone'&&d.exportStep.includes('Id')));assert.ok(pull.metadata.diagnostics.some((d:any)=>d.source==='Account.Address__c'&&d.reason.includes('Unsupported')));assert.ok(pull.metadata.diagnostics.some((d:any)=>d.source==='Salesforce Flow'));
  assert.equal((await request(`imports/salesforce/pulls/${pull.id}/dry-run`,'POST',{owners:{}})).status,409);
  pull=await call(`imports/salesforce/pulls/${pull.id}/advance`,'POST',{});assert.equal(pull.page,1);assert.equal(pull.read.Account,1);const cursor=pull.cursor;network.failNextPage();
  assert.equal((await request(`imports/salesforce/pulls/${pull.id}/advance`,'POST',{})).status,409);assert.equal((await call(`imports/salesforce/pulls/${pull.id}`)).cursor,cursor);
  await f.restart();pull=await call(`imports/salesforce/pulls/${pull.id}`);assert.equal(pull.state,'stopped');assert.equal(pull.read.Account,1);
  while(pull.state!=='ready')pull=await call(`imports/salesforce/pulls/${pull.id}/advance`,'POST',{});
  assert.deepEqual(pull.counts,{Account:2,Contact:12});assert.deepEqual(pull.read,{Account:2,Contact:12});assert.equal(pull.page,4);
  assert.equal((await request(`imports/salesforce/pulls/${pull.id}`,'GET',undefined,`__Host-orbit_session=${otherSession.token}`)).status,403);
  assert.equal((await request(`imports/salesforce/pulls/${pull.id}/dry-run`,'POST',{owners:{}})).status,400);
  const owners={[`Account OwnerId ${sfOwner}`]:f.actor,[`Contact OwnerId ${sfOwner}`]:other};
  const invalid={...owners,[`Contact OwnerId ${sfOwner}`]:createId()};assert.equal((await request(`imports/salesforce/pulls/${pull.id}/dry-run`,'POST',{owners:invalid})).status,409);
  let review=await call(`imports/salesforce/pulls/${pull.id}/dry-run`,'POST',{owners,customFields:{Contact:['Loyalty__c']}});assert.equal(review.counts.rejected,0);assert.equal(review.counts.input,14);assert.equal(review.salesforce.associations,11);assert.equal(review.owners.length,2);
  assert.equal(await f.db.prepare('SELECT count(*) n FROM contacts').first('n'),0);assert.equal((await request(`imports/${review.id}/apply`,'POST',{fingerprint:review.fingerprint,confirmed:false})).status,400);
  const finish=async(id:string,fingerprint:string,verb='apply')=>{let result:any;for(let i=0;i<100;i++){result=await call(`imports/${id}/${verb}`,'POST',{confirmed:true,...verb==='apply'?{fingerprint}:{}});if(!['queued','applying','undoing','rolling_back'].includes(result.job?.state))return result;}throw new Error('Import did not finish');};
  await f.db.prepare("UPDATE access_memberships SET status='removed' WHERE operator_id=?").bind(other).run();assert.equal((await request(`imports/${review.id}/apply`,'POST',{confirmed:true,fingerprint:review.fingerprint})).status,409);assert.equal(await f.db.prepare('SELECT count(*) n FROM contacts').first('n'),0);await f.db.prepare("UPDATE access_memberships SET status='active' WHERE operator_id=?").bind(other).run();
  let applied=await call(`imports/${review.id}/apply`,'POST',{confirmed:true,fingerprint:review.fingerprint});assert.equal(applied.job.state,'applying');assert.ok(applied.job.checkpoint>0);
  await f.restart();applied=await finish(review.id,review.fingerprint);assert.equal(applied.job.state,'completed');
  const namespace=`orbit:salesforce:${sfOrg}`,company=nativeId(namespace,'company',sfAccount),person=nativeId(namespace,'contact',sfPerson(0));
  assert.equal(await f.db.prepare('SELECT count(*) n FROM companies').first('n'),2);assert.equal(await f.db.prepare('SELECT count(*) n FROM contacts').first('n'),12);assert.equal(await f.db.prepare('SELECT count(*) n FROM contacts WHERE company_id IS NOT NULL').first('n'),11);
  const nativeCompanies=(await call('records/company')).records,nativeContacts=(await call('records/contact')).records;
  assert.equal(nativeCompanies.length,2);assert.equal(nativeContacts.length,12);
  const sourceOf=(record:any)=>JSON.parse(JSON.parse(record.custom_fields_json).import_source).sourceId;
  assert.deepEqual(nativeCompanies.map(sourceOf).sort(),network.accounts.map(record=>record.Id).sort());assert.deepEqual(nativeContacts.map(sourceOf).sort(),network.contacts.map(record=>record.Id).sort());
  const companyIds=new Map(nativeCompanies.map((record:any)=>[sourceOf(record),record.id]));
  for(const expected of network.contacts){const actual=nativeContacts.find((record:any)=>sourceOf(record)===expected.Id);assert.equal(actual.email,expected.Email);assert.equal(actual.company_id,expected.AccountId?companyIds.get(expected.AccountId):null);}
  const read=await call(`records/contact/${person}`);assert.equal(read.ownership.ownerId,other);assert.equal((await call(`records/company/${company}`)).ownership.ownerId,f.actor);assert.equal(read.record.company_id,company);assert.equal(read.record.contactability,'do_not_contact');assert.equal(JSON.parse(read.record.custom_fields_json).Loyalty__c,4);assert.equal(JSON.parse(JSON.parse(read.record.custom_fields_json).import_source).sourceId,sfPerson(0));
  assert.equal(await f.db.prepare("SELECT owner_id FROM record_ownership WHERE record_type='company' AND record_id=?").bind(company).first('owner_id'),f.actor);assert.equal(await f.db.prepare("SELECT owner_id FROM record_ownership WHERE record_type='contact' AND record_id=?").bind(person).first('owner_id'),other);
  const snapshot=JSON.stringify((await f.db.prepare('SELECT id,name,email,company_id,custom_fields_json FROM contacts ORDER BY id').all()).results);
  const rerun=await call(`imports/salesforce/pulls/${pull.id}/dry-run`,'POST',{owners,customFields:{Contact:['Loyalty__c']}});await finish(rerun.id,rerun.fingerprint);assert.equal(JSON.stringify((await f.db.prepare('SELECT id,name,email,company_id,custom_fields_json FROM contacts ORDER BY id').all()).results),snapshot);await finish(rerun.id,rerun.fingerprint,'undo');
  await call(`records/contact/${person}`,'PUT',{name:'Later native edit preserved'});
  const undone=await finish(review.id,review.fingerprint,'undo');assert.equal((await call(`records/contact/${person}`)).record.name,'Later native edit preserved');assert.ok(undone.undo.dispositions.some((d:any)=>d.disposition==='retained'));assert.ok((await call(`imports/${review.id}`)).diagnostics.some((d:any)=>d.code==='salesforce-reconciliation'));
  // A fresh supported pull contains personal source copies before native erasure.
  pull=await call(`imports/salesforce/connections/${connection.id}/pulls`,'POST',{});while(pull.state!=='ready')pull=await call(`imports/salesforce/pulls/${pull.id}/advance`,'POST',{});
  review=await call(`imports/salesforce/pulls/${pull.id}/dry-run`,'POST',{owners,customFields:{Contact:['Loyalty__c']}});assert.equal((await request(`imports/${review.id}/apply`,'POST',{confirmed:true,fingerprint:review.fingerprint})).status,409);assert.equal((await call(`records/contact/${person}`)).record.name,'Later native edit preserved');
  assert.ok(JSON.stringify((await f.db.prepare('SELECT body FROM crm_import_salesforce_pages').all()).results).includes(sfMailbox(0)));
  await call(`records/contact/${person}`,'DELETE',{confirmed:true});assert.equal(await f.db.prepare('SELECT count(*) n FROM crm_import_salesforce_pages').first('n'),0);assert.equal((await call(`imports/salesforce/pulls/${pull.id}`)).state,'withdrawn');assert.equal((await request(`imports/salesforce/pulls/${pull.id}/advance`,'POST',{})).status,409);assert.ok(!(await importCopies(f.db)).includes(sfMailbox(0)));
  let exported=await call('records/archive/exports','POST',{});for(let i=0;i<800&&exported.state!=='ready';i++)exported=await call(`records/archive/exports/${exported.id}/advance`,'POST',{});assert.equal(exported.state,'ready');
  const archive=await readCurrentArchive(await request(`records/archive/exports/${exported.id}/download`));assert.ok(archive.manifest.tables.every((t:any)=>!t.name.startsWith('crm_import_')));assert.ok(!JSON.stringify(archive).includes('synthetic-orbit-3'));assert.ok(!JSON.stringify(archive).includes(sfMailbox(0)));
  const destination=await launchFixture();try{
   let restored=await json(await destination.request('records/archive/imports','POST',{manifest:archive.manifest,confirmed:true}));for(const part of archive.parts)await json(await destination.request(`records/archive/imports/${restored.id}/parts/${part.index}`,'PUT',part));for(let i=0;i<1000&&restored.state!=='complete';i++)restored=await json(await destination.request(`records/archive/imports/${restored.id}/finalize`,'POST',{}));assert.equal(restored.state,'complete');
   const freshSession=await createDependencies(destination.db).auth.createSession(f.actor),restoredApp=createApp({database:destination.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:security,captureOrigin:'https://orbit.test',captureFetch:network.fetcher});const restoredRequest=(path:string,method='GET',body?:unknown)=>restoredApp.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${freshSession.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...method==='POST'?{body:JSON.stringify(body??{})}:{}});const beforeRestoredAuthority=network.calls.length;assert.deepEqual((await json(await restoredRequest('imports/salesforce'))).connections,[]);assert.equal((await restoredRequest(`imports/salesforce/pulls/${pull.id}/advance`,'POST')).status,404);
   assert.equal((await restoredRequest(`imports/${review.id}/apply`,'POST',{confirmed:true,fingerprint:review.fingerprint})).status,404,'A source installation review cannot authorize Apply after restore');assert.equal(network.calls.length,beforeRestoredAuthority,'Restored pull and review replays make no provider request');
   assert.equal(await destination.db.prepare('SELECT count(*) n FROM contacts').first('n'),0);assert.ok(await destination.db.prepare('SELECT id FROM companies WHERE id=?').bind(company).first());for(const table of ['connections','oauth','pulls'])assert.equal(await destination.db.prepare(`SELECT count(*) n FROM crm_import_salesforce_${table}`).first('n'),0);
  }finally{await destination.dispose();}
  const pullCount=await f.db.prepare('SELECT count(*) n FROM crm_import_salesforce_pulls').first('n');network.revoke();assert.equal((await request(`imports/salesforce/connections/${connection.id}/pulls`,'POST',{})).status,409);assert.equal(await f.db.prepare('SELECT count(*) n FROM crm_import_salesforce_pulls').first('n'),pullCount);
  const revoked=new URL((await start()).authorizationUrl);await createDependencies(f.db).auth.revoke(session.id);assert.equal((await callback(revoked.searchParams.get('state')!,'synthetic-orbit-code-3')).status,401);
  cookie=secondCookie;await call(`imports/salesforce/connections/${connection.id}/disconnect`,'POST',{confirmed:true});assert.equal((await request(`imports/salesforce/pulls/${pull.id}/advance`,'POST',{})).status,404);
  assert.equal(await f.db.prepare('SELECT count(*) n FROM crm_import_salesforce_connections').first('n'),0);
 }finally{await f.dispose();}
}
