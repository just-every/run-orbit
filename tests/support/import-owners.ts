import {createDependencies} from './dependencies';
import assert from 'node:assert/strict';
import {defaultMapping} from '../../src/core/features/imports/contracts';
import {nativeId} from '../../src/core/features/imports/source';
import {json,finish} from './crm-import-flow';

/** Ownership uses the same saved dry run and guarded import reversal as customer data. */
export async function importOwnerFlow(f:any){
 const owner=await json(await f.request('settings/operators','POST',{email:'synthetic-orbit-716@ownership.test',displayName:'Import receiving rep'}));
 const contactHeaders=['Record ID','First Name','Email','Contact owner'],companyHeaders=['Record ID','Company name','Company owner'];
 const source={vendor:'hubspot',account:'Synthetic owner mapping',files:[
  {kind:'contact',name:'contacts.csv',csv:[contactHeaders.join(','),'716,Synthetic contact,synthetic-orbit-717@ownership.test,synthetic-orbit-716@ownership.test','718,Unmatched contact,synthetic-orbit-718@ownership.test,Former rep','719,Second unmatched contact,synthetic-orbit-719@ownership.test,Former rep'].join('\r\n'),mapping:defaultMapping('hubspot','contact',contactHeaders)},
  {kind:'company',name:'companies.csv',csv:[companyHeaders.join(','),'720,Synthetic company,Former rep'].join('\r\n'),mapping:defaultMapping('hubspot','company',companyHeaders)}
 ]};
 const preview=await json(await f.request('imports/dry-run','POST',source));
 assert.equal(preview.owners.find((item:any)=>item.value==='Former rep').count,3);assert.equal(preview.owners.find((item:any)=>item.value==='Former rep').ownerId,null);
 assert.equal(preview.owners.find((item:any)=>item.value==='synthetic-orbit-716@ownership.test').ownerId,owner.id);
 await finish(f,preview);
 const unowned=nativeId('orbit:hubspot:Synthetic owner mapping','contact','718');assert.equal((await json(await f.request(`records/contact/${unowned}`))).ownership.ownerId,null);
 await finish(f,preview,'undo');
 const unmapped=await json(await f.request(`imports/${preview.id}`));assert.deepEqual(unmapped.owners,preview.owners);
 const mapped={...source,owners:{'Former rep':owner.id}},review=await json(await f.request('imports/dry-run','POST',mapped));
 assert.notEqual(review.fingerprint,preview.fingerprint);assert.equal(review.owners.find((item:any)=>item.value==='Former rep').ownerId,owner.id);
 await finish(f,review);
 const receiver=await createDependencies(f.db).auth.createSession(owner.id),receiverCookie={Cookie:`__Host-orbit_session=${receiver.token}`};
 const notices=()=>f.request('notifications','GET',undefined,receiverCookie).then(json).then(result=>result.notifications.filter((item:any)=>item.kind==='record.assigned'&&item.message.startsWith('CSV import')));
 const initialNotices=await notices();assert.equal(initialNotices.length,2);const notice=initialNotices.find((item:any)=>item.message.includes('Synthetic company'));assert.ok(notice);assert.match(notice.message,/Unmatched contact/);assert.match(notice.message,/previous owner: Unassigned/);assert.match(notice.message,/Launch operator/);
 const namespace='orbit:hubspot:Synthetic owner mapping',contact=nativeId(namespace,'contact','716'),company=nativeId(namespace,'company','720');
 for(const [kind,id] of [['contact',contact],['company',company]]){const detail=await json(await f.request(`records/${kind}/${id}`));assert.equal(detail.ownership.ownerId,owner.id);const history=detail.timeline.filter((entry:any)=>entry.kind==='owner.changed');assert.equal(history.length,1);assert.equal(history[0].actor_type,'source');assert.equal(history[0].actor_id,f.actor);assert.equal(history[0].source,'import');assert.equal(JSON.parse(history[0].payload_json).reason,'CSV import');}
 const replay=await json(await f.request('imports/dry-run','POST',mapped));await finish(f,replay);await finish(f,replay,'undo');assert.equal((await notices()).length,initialNotices.length);assert.equal((await json(await f.request(`records/contact/${contact}`))).timeline.filter((entry:any)=>entry.kind==='owner.changed').length,1);
 await finish(f,review,'undo');assert.equal(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(contact).first(),null);assert.equal(await f.db.prepare('SELECT id FROM companies WHERE id=?').bind(company).first(),null);
 // Existing records retain their fields; explicitly mapped ownership has its own before-image.
 const native=await json(await f.request('records/contact','POST',{name:'Prior owner contact',email:'synthetic-orbit-717@ownership.test'}));
 const prior=await json(await f.request('records/ownership/review','POST',{kind:'contact',ids:[native.id],ownerId:f.actor}));await json(await f.request(`records/ownership/${prior.id}/apply`,'POST',{}));
 const stale=await json(await f.request('records/ownership/review','POST',{kind:'contact',ids:[native.id],ownerId:owner.id}));
 const changed=await json(await f.request('imports/dry-run','POST',mapped));await finish(f,changed);assert.equal((await json(await f.request(`records/contact/${native.id}`))).ownership.ownerId,owner.id);
 await finish(f,changed,'undo');assert.equal((await json(await f.request(`records/contact/${native.id}`))).ownership.ownerId,f.actor);
 const staleResult=await json(await f.request(`records/ownership/${stale.id}/apply`,'POST',{}));assert.match(staleResult.items[0].failure,/Record changed/);
 const oldUndo=await json(await f.request(`records/ownership/${prior.id}/undo`,'POST',{}));assert.match(oldUndo.items[0].failure,/Record changed/);
 const selfSource={...mapped,account:'Synthetic self assignment',owners:{'Former rep':f.actor},files:[{...source.files[0],csv:contactHeaders.join(',')+'\r\n727,Self assigned contact,synthetic-orbit-727@ownership.test,Former rep'}]},selfBefore=(await json(await f.request('notifications'))).notifications.length;
 const self=await json(await f.request('imports/dry-run','POST',selfSource));await finish(f,self);assert.equal((await json(await f.request('notifications'))).notifications.length,selfBefore);await finish(f,self,'undo');assert.equal((await json(await f.request('notifications'))).notifications.length,selfBefore);
 const guarded=await json(await f.request('imports/dry-run','POST',mapped));await finish(f,guarded);
 const edit=await json(await f.request('records/ownership/review','POST',{kind:'contact',ids:[native.id],ownerId:null}));await json(await f.request(`records/ownership/${edit.id}/apply`,'POST',{}));
 const retained=await finish(f,guarded,'undo');assert.ok(retained.undo.dispositions.some((item:any)=>item.targetKind==='contact-owner'&&item.disposition==='retained'));assert.equal((await json(await f.request(`records/contact/${native.id}`))).ownership.ownerId,null);
 const privacySource={...mapped,account:'Synthetic owner privacy',files:[{...source.files[0],csv:contactHeaders.join(',')+'\r\n721,Private import,synthetic-orbit-721@ownership.test,Former rep'}]};
 const privacy=await json(await f.request('imports/dry-run','POST',privacySource));await finish(f,privacy);const privateId=nativeId('orbit:hubspot:Synthetic owner privacy','contact','721');
 await json(await f.request(`records/contact/${privateId}`,'DELETE',{confirmed:true}));assert.equal(await f.db.prepare('SELECT id FROM crm_import_targets WHERE id=?').bind(privateId).first(),null);assert.equal(await f.db.prepare('SELECT id FROM record_ownership_history WHERE record_id=?').bind(privateId).first(),null);assert.ok(!(await notices()).some((item:any)=>item.message.includes('Private import')));
 await f.db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(owner.id).run();assert.equal((await f.request('imports/dry-run','POST',mapped)).status,409);
 await json(await f.request(`settings/operators/${owner.id}/erase`,'POST',{confirmed:true}));
 assert.equal((await json(await f.request(`imports/${guarded.id}`))).sourceWithdrawn,true);
 const copies=JSON.stringify((await f.db.prepare('SELECT original_json FROM crm_import_targets').all()).results);assert.ok(!copies.includes('Import receiving rep'));assert.ok(!copies.includes('synthetic-orbit-716@ownership.test'));
 assert.ok(!(await f.db.prepare("SELECT id FROM notifications WHERE message LIKE '%Import receiving rep%'").first()));
}
