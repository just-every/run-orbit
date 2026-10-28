import assert from 'node:assert/strict';
import {eml} from './capture-fixture';
import {capturePrivacyFixture} from './capture-privacy-fixture';


export async function providerErasure() {

 const f=await capturePrivacyFixture();
 try {
  const id=await f.connect();await f.drain(id);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),1);
  assert.equal((await f.request(`records/contact/${f.ana}`,{confirmed:true},'DELETE')).status,200);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0);
  assert.ok(await f.db.prepare('SELECT 1 FROM companies WHERE id=?').bind(f.company).first(),'company-domain eligibility remains');
  f.state.expireHistory=true;await f.drain(id);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0,'expired Gmail history must not resurrect an erased original');
  f.state.expireHistory=true;f.crash();assert.equal((await f.request(`capture/sources/${id}/sync`,{})).status,500);
  await f.reopen();await f.drain(id);
  await f.connect(id);await f.drain(id);
  const replacement=await f.connect();await f.drain(replacement);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),0,'reopen, reconnect and a new source retain the erasure barrier');
  const fresh=eml({From:'Ana <ana@acme.example>',To:'seller@orbit.test',Date:new Date(Date.now()+2000).toUTCString(),Subject:'New evidence after erasure','Message-ID':'<new-after-erasure@acme.example>'},'A new request after erasure.');
  assert.equal((await f.upload([{name:'fresh.eml',text:fresh}])).status,201);
  assert.equal(await f.db.prepare('SELECT count(*) FROM capture_items').first('count(*)'),1,'new evidence at the retained company is still eligible');
  const proposal=await f.db.prepare("SELECT id FROM capture_proposals WHERE kind='create_contact' AND proposed_value='ana@acme.example'").first<{id:string}>();assert.ok(proposal);
  assert.equal((await f.request(`capture/proposals/${proposal.id}/accept`,{})).status,200);
  assert.equal(await f.db.prepare("SELECT contactability FROM contacts WHERE email_key='ana@acme.example'").first('contactability'),'do_not_contact','capture never grants contact permission');
  const contact=(await f.db.prepare("SELECT id FROM contacts WHERE email_key='ana@acme.example'").first<{id:string}>())!;
  const concurrent=fresh.replace('new-after-erasure@','new-in-flight@').replace(/^Date:[^\r\n]+/m,`Date: ${new Date(Date.now()+120000).toUTCString()}`);
  const pause=f.pauseCommit();const uploading=f.upload([{name:'new-raced.eml',text:concurrent}]);await pause.ready;
  try{assert.equal((await f.request(`records/contact/${contact.id}`,{confirmed:true},'DELETE')).status,200);}finally{pause.release();}
  assert.equal((await uploading).status,409,'fresh evidence cannot commit a stale contact resolution after erasure');
  assert.equal((await f.upload([{name:'new-retried.eml',text:concurrent}])).status,201,'a fresh retry resolves the retained company');
 }finally{await f.dispose();}

}
