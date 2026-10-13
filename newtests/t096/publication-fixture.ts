import assert from 'node:assert/strict';
import {fixture} from './fixture';
import {FormService} from '../../src/core/features/forms/service';
export async function publication(f:Awaited<ReturnType<typeof fixture>>,slug='inquiry'){
 const forms=new FormService(f.db),saved=await forms.save(await f.context(),{form:{title:'Contact us',fields:[{id:'name',label:'Name',required:true},{id:'email',label:'Email',required:true}],consentWording:'Send product updates by email'},landing:{title:'Talk with us',heading:'Contact us',paragraphs:['Tell us how to contact you.']}}),compiled=await forms.compile(await f.context(),{formId:saved.id,revision:saved.revision,reviewedHash:saved.hash,slug,maxRecords:10,expiresAt:new Date(Date.now()+86400000).toISOString()});await assert.rejects(forms.publicDocument(slug));await forms.approve(await f.context(),compiled.operationId,{artifactHash:compiled.hash,formRevision:compiled.formRevision});await forms.publish(await f.context(),compiled.operationId);return{forms,saved,compiled,slug};
}
