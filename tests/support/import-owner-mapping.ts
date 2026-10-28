import assert from 'node:assert/strict';
import {defaultMapping} from '../../src/core/features/imports/contracts';
import {nativeId} from '../../src/core/features/imports/source';
import {readD1ImportOriginals} from '../../src/modules/import-kit/d1/index';
import {erasureContext} from '../../src/core/features/imports/erasure';
import {createDependencies} from './dependencies';
import {json,finish} from './crm-import-flow';
/** Extend the existing import journey: all assertions use authenticated product doors. */
export async function exerciseImportOwnerMapping(f:any){
 const receiver=await json(await f.request('settings/operators','POST',{email:'synthetic-orbit-1@owners.test',displayName:'synthetic-orbit-1'})),deps=createDependencies(f.db),session=await deps.auth.createSession(receiver.id);
 const settings=await json(await f.request('settings')),receiverAccount=settings.operators.find((operator:any)=>operator.id===receiver.id),self=settings.operators.find((operator:any)=>operator.id===f.actor);
 const notices=async(id:string)=>{const response=await f.request('notifications','GET',undefined,id===receiver.id?{Cookie:`__Host-orbit_session=${session.token}`}:{}) ;return(await json(response)).notifications.filter((notice:any)=>notice.kind==='record.assigned');};
 const receiverBefore=(await notices(receiver.id)).length,selfBefore=(await notices(f.actor)).length;
 const existing=await json(await f.request('records/contact','POST',{name:'synthetic-orbit-2',email:'synthetic-orbit-2@owners.test'}));
 const initial=await json(await f.request('records/ownership/review','POST',{kind:'contact',ids:[existing.id],ownerId:f.actor}));await json(await f.request(`records/ownership/${initial.id}/apply`,'POST',{}));
 const contactHeaders=['Record ID','First Name','Email','Contact owner'],companyHeaders=['Record ID','Company name','Company owner'];
 const source:any={vendor:'hubspot',account:'synthetic-orbit-3',files:[
  {kind:'contact',name:'synthetic-orbit-4.csv',csv:[contactHeaders.join(','),`1,synthetic-orbit-5,synthetic-orbit-5@owners.test,${receiverAccount.email}`,'2,synthetic-orbit-6,synthetic-orbit-6@owners.test,Legacy rep','3,synthetic-orbit-7,synthetic-orbit-7@owners.test,Legacy rep','4,synthetic-orbit-8,synthetic-orbit-8@owners.test,Unmatched rep',`5,Incoming replacement,synthetic-orbit-2@owners.test,${receiverAccount.email}`,`6,synthetic-orbit-9,synthetic-orbit-9@owners.test,${self.email}`].join('\r\n'),mapping:defaultMapping('hubspot','contact',contactHeaders),separator:';'},
  {kind:'company',name:'synthetic-orbit-10.csv',csv:[companyHeaders.join(','),`1,synthetic-orbit-11,${receiverAccount.email}`,'2,synthetic-orbit-12,Legacy company rep'].join('\r\n'),mapping:defaultMapping('hubspot','company',companyHeaders),separator:';'}
 ]};
 const unmatched=await json(await f.request('imports/dry-run','POST',source));
 assert.equal(unmatched.unmatchedOwners.find((owner:any)=>owner.kind==='contact'&&owner.value==='Legacy rep').rows,2);
 assert.equal(unmatched.unmatchedOwners.find((owner:any)=>owner.kind==='company'&&owner.value==='Legacy company rep').rows,1);
 const invalid=structuredClone(source);invalid.ownerMappings={contact:{'Legacy rep':'00000000000000000000000000'}};assert.equal((await f.request('imports/dry-run','POST',invalid)).status,409);
 source.ownerMappings={contact:{'Legacy rep':receiver.id},company:{'Legacy company rep':receiver.id}};
 const review=await json(await f.request('imports/dry-run','POST',source));assert.deepEqual(review.unmatchedOwners,[{kind:'contact',value:'Unmatched rep',rows:1}]);
 assert.deepEqual((await json(await f.request(`imports/${review.id}`))).unmatchedOwners,review.unmatchedOwners,'A saved dry run retains unmatched counts');
 await finish(f,review);
 const detail=async(kind:string,id:string)=>json(await f.request(`records/${kind}/${id}`)),namespace=`orbit:hubspot:${source.account}`;
 for(const [kind,id] of [['contact','1'],['contact','2'],['contact','3'],['company','1'],['company','2']]){
  const record=await detail(kind,nativeId(namespace,kind,id));assert.equal(record.ownership.ownerId,receiver.id);
  const history=record.timeline.filter((entry:any)=>entry.kind==='owner.changed');assert.equal(history.length,1);assert.equal(history[0].actor_type,'import');assert.equal(history[0].actor_id,f.actor);const payload=JSON.parse(history[0].payload_json);assert.equal(payload.previous,null);assert.equal(payload.current,receiver.id);assert.ok(Number.isFinite(Date.parse(history[0].occurred_at)));
 }
 assert.equal((await detail('contact',nativeId(namespace,'contact','4'))).ownership.ownerId,null);
 assert.equal((await detail('contact',nativeId(namespace,'contact','6'))).ownership.ownerId,f.actor);
 const retained=await detail('contact',existing.id);assert.equal(retained.ownership.ownerId,f.actor,'An exact email mapping does not replace an assigned native owner');assert.equal(retained.record.name,'synthetic-orbit-2');
 assert.equal((await notices(receiver.id)).length,receiverBefore+1,'One import groups contact and company assignments for each receiving user');
 const grouped=(await notices(receiver.id)).find((notice:any)=>notice.message.includes('synthetic-orbit-5'));for(const name of ['synthetic-orbit-5','synthetic-orbit-6','synthetic-orbit-7','synthetic-orbit-11','synthetic-orbit-12'])assert.ok(grouped.message.includes(name));assert.match(grouped.message,/previous owner: Unassigned/);
 assert.equal(grouped.readAt,null);
 const markedRead=await json(await f.request(`notifications/${grouped.id}/read`,'POST',{}, {Cookie:`__Host-orbit_session=${session.token}`}));assert.equal(markedRead.read,true);
 const readNotice=(await notices(receiver.id)).find((notice:any)=>notice.id===grouped.id);assert.ok(Number.isFinite(Date.parse(readNotice.readAt)),'A grouped import assignment can be marked read through the notification route');
 assert.equal((await notices(f.actor)).length,selfBefore,'Self assignments send no notice');
 const replay=await json(await f.request('imports/dry-run','POST',source));await finish(f,replay);assert.equal((await notices(receiver.id)).length,receiverBefore+1);
 await finish(f,replay,'undo');assert.equal((await detail('contact',nativeId(namespace,'contact','1'))).ownership.ownerId,receiver.id);assert.equal((await notices(receiver.id)).length,receiverBefore+1,'Replay and undo send no new notice');
 await finish(f,review,'undo');assert.equal((await f.request(`records/contact/${nativeId(namespace,'contact','1')}`)).status,404);assert.equal((await detail('contact',existing.id)).ownership.ownerId,f.actor);
 const explicit=structuredClone(source);explicit.account='synthetic-orbit-13';explicit.files=[{...source.files[0],csv:[contactHeaders.join(','),`5,Incoming replacement,synthetic-orbit-2@owners.test,${receiverAccount.email}`].join('\r\n')}];explicit.ownerMappings={contact:{[receiverAccount.email]:receiver.id}};
 const change=await json(await f.request('imports/dry-run','POST',explicit));await finish(f,change);assert.equal((await detail('contact',existing.id)).ownership.ownerId,receiver.id);assert.equal((await detail('contact',existing.id)).record.name,'synthetic-orbit-2');
 const beforeUndo=(await notices(receiver.id)).length;await finish(f,change,'undo');assert.equal((await detail('contact',existing.id)).ownership.ownerId,f.actor,'Import undo restores the exact prior owner');assert.equal((await notices(receiver.id)).length,beforeUndo);
 const eraseSource=structuredClone(explicit);eraseSource.account='synthetic-orbit-14';const erased=await json(await f.request('imports/dry-run','POST',eraseSource));await finish(f,erased);
 await json(await f.request(`records/contact/${existing.id}`,'DELETE',{confirmed:true}));await f.request(`imports/${erased.id}/apply`,'POST',{fingerprint:erased.fingerprint,confirmed:true});assert.equal((await f.request(`records/contact/${existing.id}`)).status,404,'Replayed capture cannot resurrect an erased contact or its ownership');assert.ok(!(await notices(receiver.id)).some((notice:any)=>notice.message.includes('synthetic-orbit-2')),'Erasure removes grouped notices containing the erased record');
 const inactiveSource=structuredClone(explicit);inactiveSource.account='synthetic-orbit-15';inactiveSource.files[0].csv=[contactHeaders.join(','),`7,synthetic-orbit-16,synthetic-orbit-16@owners.test,${receiverAccount.email}`].join('\r\n');
 const privacySource=structuredClone(source);privacySource.account='synthetic-orbit-19';privacySource.files=[{...source.files[0],csv:[contactHeaders.join(','),`8,synthetic-orbit-17,synthetic-orbit-17@owners.test,${receiverAccount.email}`].join('\r\n')},{...source.files[1],csv:[companyHeaders.join(','),`8,synthetic-orbit-18,${receiverAccount.display_name}`].join('\r\n')}];privacySource.ownerMappings={company:{[receiverAccount.display_name]:receiver.id}};
 const privacyReview=await json(await f.request('imports/dry-run','POST',privacySource)),privacyApplied=await finish(f,privacyReview),privacyContext={...erasureContext(f.db,f.actor),namespace:'orbit:hubspot:synthetic-orbit-19'};
 const retainedOriginals=await readD1ImportOriginals(privacyApplied.job.id,privacyContext);assert.ok(retainedOriginals.some(original=>original.original.status==='retained'&&Buffer.from(original.original.base64,'base64').toString('utf8').includes(receiverAccount.email)));assert.ok(retainedOriginals.some(original=>original.original.status==='retained'&&Buffer.from(original.original.base64,'base64').toString('utf8').includes(receiverAccount.display_name)));
 const privacyContact=nativeId('orbit:hubspot:synthetic-orbit-19','contact','8'),privacyCompany=nativeId('orbit:hubspot:synthetic-orbit-19','company','8');
 const unrelated=structuredClone(privacySource);unrelated.account='synthetic-orbit-20';unrelated.files=[{...source.files[0],csv:[contactHeaders.join(','),`9,${receiverAccount.display_name} customer text,synthetic-orbit-20@owners.test,`].join('\r\n')}];unrelated.ownerMappings={};const unrelatedReview=await json(await f.request('imports/dry-run','POST',unrelated));
 const inactiveReview=await json(await f.request('imports/dry-run','POST',inactiveSource)),removal=await json(await f.request(`settings/operators/${receiver.id}/removal-review`));await json(await f.request(`settings/operators/${receiver.id}`,'DELETE',{confirmed:true,handover:{review:removal.review,opportunities:null,tasks:null,handoffs:null,contacts:f.actor,companies:null}}));
 assert.equal((await f.request('imports/dry-run','POST',inactiveSource)).status,409,'Removed operators cannot be explicitly mapped');
 assert.equal((await f.request(`imports/${inactiveReview.id}/apply`,'POST',{fingerprint:inactiveReview.fingerprint,confirmed:true})).status,409,'An owner removed after review is fenced during application');
 assert.equal((await f.request(`records/contact/${nativeId('orbit:hubspot:synthetic-orbit-15','contact','7')}`)).status,404);await finish(f,inactiveReview,'undo');
 const contactBeforeErasure=await detail('contact',privacyContact),companyBeforeErasure=await detail('company',privacyCompany);assert.equal(contactBeforeErasure.ownership.ownerId,f.actor);assert.equal(companyBeforeErasure.ownership.ownerId,null);
 await json(await f.request(`settings/operators/${receiver.id}/erase`,'POST',{confirmed:true}));
 const withdrawn=await json(await f.request(`imports/${privacyReview.id}`));assert.equal(withdrawn.sourceWithdrawn,true);assert.ok(!JSON.stringify(withdrawn).includes(receiverAccount.email));assert.ok(!JSON.stringify(withdrawn).includes(receiverAccount.display_name));
 assert.equal((await f.request(`imports/${privacyReview.id}/apply`,'POST',{fingerprint:privacyReview.fingerprint,confirmed:true})).status,409,'Withdrawn ownership source cannot resume after operator erasure');
 await assert.rejects(readD1ImportOriginals(privacyApplied.job.id,privacyContext),/IMPORT_JOB_RETIRED/,'Raw CSV custody is retired through the Kit public reader');
 const contactAfterErasure=await detail('contact',privacyContact),companyAfterErasure=await detail('company',privacyCompany);assert.equal(contactAfterErasure.record.name,contactBeforeErasure.record.name);assert.equal(contactAfterErasure.ownership.ownerId,f.actor);assert.equal(companyAfterErasure.record.name,companyBeforeErasure.record.name);assert.equal(companyAfterErasure.ownership.ownerId,null);assert.equal(contactAfterErasure.timeline.length,contactBeforeErasure.timeline.length,'Withdrawal preserves native attributed history');assert.equal(companyAfterErasure.timeline.length,companyBeforeErasure.timeline.length);
 assert.ok(!(await json(await f.request(`imports/${unrelatedReview.id}`))).sourceWithdrawn,'Unlinked customer text containing the same name does not select an import for withdrawal');

}
