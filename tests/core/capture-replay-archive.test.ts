import assert from 'node:assert/strict';
import {test} from 'node:test';
import {captureFixture,fixtureMailbox,eml} from '../support/capture-fixture';
import {launchFixture} from '../support/launch-fixture';
import {localArchiveRoundTrip,uploadRestored} from '../support/capture-privacy-archive';
import {isolatedDatabase} from '../support/isolated-database';
import {json,exported} from '../support/capture-data-archive';

test('CAPTURE-007 DATA-002 both archive paths carry anonymous replay barriers and Records restore retains destination erasure history',async()=>{
 const f=await captureFixture(),target=await launchFixture(),local=await isolatedDatabase();
 try{
  const archiveCall=async(path:string,method:string,body:unknown)=>{const response=await target.request(path,method,body);assert.ok(response.ok,`${path}: ${response.status} ${response.ok?'':await response.text()}`);return response.json() as Promise<any>;};
  const original=fixtureMailbox(f).reply,historicalDate=new Date(Date.now()-60000).toUTCString();
  assert.equal((await f.upload([{name:'original.eml',text:original}])).status,201);
  assert.equal((await f.request(`/api/v1/records/contact/${f.ana}`,{method:'DELETE',headers:json,body:JSON.stringify({confirmed:true})})).status,200);
  const privateRows=()=>f.db.prepare("SELECT entity_id,details_json FROM audit_entries WHERE action IN('capture.erased_item','capture.erased_mailbox')").all<{entity_id:string;details_json:string}>();
  const proofs=(await privateRows()).results;assert.ok(proofs.length>=2);
  assert.ok(proofs.every(proof=>/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(proof.entity_id)&&proof.details_json==='{}'),'only anonymous keyed matching proofs remain');
  const localContact=(await target.records.save('contact',{name:'Erased destination person',email:'destination@acme.example'},target.actor)).id;
  assert.equal((await target.request(`records/contact/${localContact}`,'DELETE',{confirmed:true})).status,200);
  const retained=(await target.db.prepare("SELECT id FROM audit_entries WHERE action='capture.erased_mailbox'").all<{id:string}>()).results;assert.ok(retained.length);
  const archive=await exported(f);
  let imported=await archiveCall('records/archive/imports','POST',{confirmed:true,manifest:archive.manifest});
  for(const part of archive.parts)await archiveCall(`records/archive/imports/${imported.id}/parts/${part.index}`,'PUT',part);
  for(let step=0;step<700&&imported.state!=='complete';step++)imported=await archiveCall(`records/archive/imports/${imported.id}/finalize`,'POST',{});
  assert.equal(imported.state,'complete');
  for(const proof of retained)assert.ok(await target.db.prepare('SELECT 1 FROM audit_entries WHERE id=?').bind(proof.id).first(),'destination erasure remains in force');
  await uploadRestored(target.db,f.operator,original);
  assert.equal(await target.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0,'Records restore keeps erased mail gone');
  const destinationMail=eml({From:'destination@acme.example',To:'seller@orbit.test',Date:historicalDate,Subject:'Destination history','Message-ID':'<destination-history@acme.example>'},'Old destination evidence');
  await uploadRestored(target.db,f.operator,destinationMail);
  assert.equal(await target.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0,'retained destination matching contexts still work');
  await localArchiveRoundTrip(f.db,local.db);
  await uploadRestored(local.db,f.operator,original);
  assert.equal(await local.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0,'CLI portability restore keeps erased mail gone');
 }finally{await f.dispose();await target.dispose();await local.dispose();}
});
