import assert from 'node:assert/strict';
import type {fixture} from './fixture';
import {FormService as PriorFormService} from './prior-forms/service';
import {FormService} from '../../src/core/features/forms/service';

/** Publish through the prior service/compiler, then let current code read the same store. */
export async function legacyPublication(f:Awaited<ReturnType<typeof fixture>>,slug='legacy-inquiry'){
 const prior=new PriorFormService(f.db),saved=await prior.save(await f.nativeContext(),{form:{title:'Retained production enquiries',fields:[{id:'name',label:'Name',required:true},{id:'email',label:'Email',required:true},{id:'message',label:'Message',required:false}],consentWording:null},landing:{title:'Production consultation',heading:'Discuss your production rollout',paragraphs:['Tell us who to contact about your enquiry.']}}),compiled=await prior.compile(await f.nativeContext(),{formId:saved.id,revision:saved.revision,reviewedHash:saved.hash,slug,maxRecords:10,expiresAt:new Date(Date.now()+86400000).toISOString()});
 await prior.approve(await f.nativeContext(),compiled.operationId,{artifactHash:compiled.hash,formRevision:saved.revision});await prior.publish(await f.nativeContext(),compiled.operationId);
 assert.equal(compiled.html.includes('id="inquiry-disclosure"'),false);
 const forms=new FormService(f.db);assert.equal(await forms.publicDocument(slug),compiled.html,'the upgrade serves the approved historical artifact unchanged');
 return{forms,saved,compiled,slug};
}
