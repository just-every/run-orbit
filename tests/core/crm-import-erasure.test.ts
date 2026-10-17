import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {crmFixture} from '../support/crm-fixtures';
import {json,finish} from '../support/crm-import-flow';
import {importCopies,publicArchive} from '../support/crm-import-privacy';
import {nativeId} from '../../src/core/features/imports/source';

test('RECORD-008 DATA-002 T-098 erasure removes imported personal data from native records, search, archives and decoded custody while preserving later company edits',async()=>{
 const f=await launchFixture();try{
  const source=crmFixture('hubspot',f.stage,3),mailbox='hubspot-0@example.test',companyFile=source.files.find(file=>file.kind==='company')!;
  companyFile.csv=`Record ID,Name,Company domain name,Description,Associated contact email\r\norg-1,Synthetic Company,synthetic.example.test,"Account contact <${mailbox}>",${mailbox}`;
  companyFile.mapping={id:'Record ID',name:'Name',domain:'Company domain name',description:'Description'};
  const dry=await json(await f.request('imports/dry-run','POST',source));await finish(f,dry);
  const namespace=`orbit:hubspot:${source.account}`,person=nativeId(namespace,'contact','person-0'),company=nativeId(namespace,'company','org-1'),deal=nativeId(namespace,'deal','deal-1');
  assert.ok((await importCopies(f.db)).includes(mailbox),'The fixture must exercise retained plaintext and encoded originals');
  const companyBefore=await json(await f.request(`records/company/${company}`));
  assert.ok(!companyBefore.record.custom_fields_json.includes('Associated contact email'),'Unmapped columns stay in private source custody');
  await json(await f.request(`records/company/${company}`,'PUT',{name:'Owner renamed company',primary_domain:companyBefore.record.primary_domain,custom_fields:JSON.parse(companyBefore.record.custom_fields_json)}));
  await json(await f.request(`records/contact/${person}`,'DELETE',{confirmed:true}));
  assert.equal(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(person).first(),null);
  for(const table of ['contacts','companies','opportunities','timeline_entries','graph_records','record_search','timeline_search'])assert.ok(!JSON.stringify((await f.db.prepare(`SELECT * FROM ${table}`).all()).results).toLowerCase().includes(mailbox),table);
  assert.equal((await json(await f.request(`records/company/${company}`))).record.name,'Owner renamed company');
  assert.ok(await f.db.prepare('SELECT id FROM opportunities WHERE id=?').bind(deal).first(),'Erasure preserves the unrelated deal');
  for(const kind of ['company','contact','opportunity'])assert.deepEqual((await json(await f.request(`records/${kind}?q=${encodeURIComponent(mailbox)}`))).records,[]);
  assert.ok(!(await importCopies(f.db)).toLowerCase().includes(mailbox),'Decoded plans and every base64 original must be erased');
  assert.ok(!JSON.stringify(await publicArchive(f)).toLowerCase().includes(mailbox),'The native archive must contain no imported personal copy');
  const status=await json(await f.request(`imports/${dry.id}`));assert.equal(status.sourceWithdrawn,true);assert.equal(status.job.state,'completed');
  assert.equal((await f.request(`imports/${dry.id}/apply`,'POST',{fingerprint:dry.fingerprint,confirmed:true})).status,409);
  await finish(f,dry,'undo');assert.equal((await json(await f.request(`records/company/${company}`))).record.name,'Owner renamed company');
  const recreated=await json(await f.request('records/contact','POST',{name:'New contact',email:mailbox}));assert.equal((await json(await f.request(`records/contact/${recreated.id}`))).record.contactability,'do_not_contact');
 }finally{await f.dispose();}
});

test('RECORD-008 DATA-002 T-098 erasure reaches applied rejected-only uploads with no native target or suppression effect',async()=>{
 const f=await launchFixture();try{
  const mailbox='rejected-person@example.test',contact=await json(await f.request('records/contact','POST',{name:'Existing contact',email:mailbox}));
  const source={vendor:'hubspot',account:'Rejected contacts',files:[{kind:'contact',name:'contacts.csv',csv:`Record ID,Email,Marketing status\r\nrejected-1,${mailbox},subscribed,extra-cell`,mapping:{id:'Record ID',email:'Email',permission:'Marketing status'},separator:';'}],stages:{}};
  const mixed={...source,account:'Rejected contacts alongside a valid company',files:[...source.files,{kind:'company',name:'companies.csv',csv:'ID,Name\r\ncompany-1,Valid unrelated company',mapping:{id:'ID',name:'Name'},separator:';'}]},reviews=[];
  for(const input of [source,mixed]){
   const dry=await json(await f.request('imports/dry-run','POST',input));assert.equal(dry.counts.rejected,1);const rejected=dry.rows.find((row:any)=>row.status==='rejected');assert.match(rejected.reason,/Column count/);assert.ok(rejected.displayName.includes(mailbox));assert.equal(dry.suppressed,0);await finish(f,dry);reviews.push(dry);
   const job=(await json(await f.request(`imports/${dry.id}`))).job.id;
   const original=(await f.db.prepare("SELECT bytes FROM ik_d1_original_chunks WHERE job_id=? AND original_key LIKE '%contact/contacts.csv%' ORDER BY ordinal").bind(job).all<{bytes:string}>()).results.map(row=>row.bytes).join('');
   assert.ok(Buffer.from(original,'base64').toString('utf8').includes(mailbox));
  }
  await json(await f.request(`records/contact/${contact.id}`,'DELETE',{confirmed:true}));
  assert.ok(!(await importCopies(f.db)).includes(mailbox),'Rejected source bytes must be withdrawn, including decoded base64');
  for(const dry of reviews){const status=await json(await f.request(`imports/${dry.id}`));assert.equal(status.sourceWithdrawn,true);assert.equal(status.rows,undefined,'Withdrawn reviews cannot expose rejected-row labels');await finish(f,dry,'undo');}
 }finally{await f.dispose();}
});

test('RECORD-008 DATA-002 T-098 unrelated company import reviews and safe undo remain available after native contact erasure',async()=>{
 const f=await launchFixture();try{
  const source={vendor:'pipedrive',account:'Company move',files:[{kind:'company',name:'companies.csv',csv:'ID,Name,Domain\r\ncompany-1,Unrelated Company,unrelated.example.test',mapping:{id:'ID',name:'Name',domain:'Domain'},separator:';'}],stages:{}};
  const dry=await json(await f.request('imports/dry-run','POST',source));await finish(f,dry);
  const pending=await json(await f.request('imports/dry-run','POST',{...source,account:'Separate pending companies'}));
  const contact=await json(await f.request('records/contact','POST',{name:'Unrelated contact',email:'unrelated-person@example.test'}));await json(await f.request(`records/contact/${contact.id}`,'DELETE',{confirmed:true}));
  const status=await json(await f.request(`imports/${dry.id}`));assert.equal(status.fingerprint,dry.fingerprint);assert.equal(status.job.state,'completed');
  assert.equal((await json(await f.request(`imports/${pending.id}`))).fingerprint,pending.fingerprint);
  await finish(f,dry,'undo');assert.equal(await f.db.prepare('SELECT id FROM companies WHERE id=?').bind(nativeId('orbit:pipedrive:Company move','company','company-1')).first(),null);
 }finally{await f.dispose();}
});
