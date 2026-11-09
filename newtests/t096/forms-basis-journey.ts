import assert from 'node:assert/strict';
import {fixture,collaborator} from './fixture';
import {publication} from './publication-fixture';
import {submitForm} from './form-submit';
import {createApp,TEST_SESSION_SECRET} from '../../tests/support/app';
import {undisclosedInquiry} from './undisclosed-inquiry-fixture';

/** Operator readback, anonymous replay and erasure use the real HTTP services. */
export async function formsBasisJourney(){
 const f=await fixture();try{
  const app=createApp({database:f.db,formAbuse:{secret:TEST_SESSION_SECRET},assets:{fetch:async()=>new Response(null,{status:404})}}),base='/api/v2/workspaces/workspace/forms';
  const call=async(path:string,method='GET',body?:unknown)=>{const response=await app.request(`https://orbit.test${path}`,{method,headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(response.status,200,await response.clone().text());return response.json() as Promise<any>;};
  const marketing=await publication(f,'basis-marketing'),values={name:'Morgan Chen',email:['synthetic-orbit-basis','manufacturer.test'].join('@')},input={revision:marketing.saved.revision,operationId:marketing.compiled.operationId,idempotencyKey:crypto.randomUUID(),values,consent:true};
  const before=Date.now(),accepted=await submitForm(marketing.forms,marketing.slug,input),after=Date.now();
  let rows=await call(`${base}/${marketing.saved.id}/submissions`),submission=rows.find((row:any)=>row.id===accepted.submissionId),basis=submission.contact_basis;
  assert.deepEqual({...basis,occurredAt:undefined},{kind:'marketing',wording:marketing.saved.form.consentWording,accepted:true,formRevision:marketing.saved.revision,artifactHash:marketing.compiled.hash,occurredAt:undefined});
  assert.ok(Date.parse(basis.occurredAt)>=before&&Date.parse(basis.occurredAt)<=after);
  const detail=await call(`/api/v1/records/contact/${submission.contact_id}`);assert.equal(detail.record.contactability,'contactable');
  await submitForm(marketing.forms,marketing.slug,input);assert.deepEqual(await call(`${base}/${marketing.saved.id}/submissions`),rows,'replay preserves the original basis and time');
  await assert.rejects(submitForm(marketing.forms,marketing.slug,{...input,consent:false}));
  const unticked=await submitForm(marketing.forms,marketing.slug,{...input,idempotencyKey:crypto.randomUUID(),values:{...values,email:['synthetic-orbit-no-consent','manufacturer.test'].join('@')},consent:false});
  const noConsent=(await call(`${base}/${marketing.saved.id}/submissions`)).find((row:any)=>row.id===unticked.submissionId);assert.equal(noConsent.contact_basis.accepted,false);assert.equal(noConsent.contact_basis.wording,basis.wording);assert.equal((await call(`/api/v1/records/contact/${noConsent.contact_id}`)).record.contactability,'do_not_contact');
  await call(`/api/v1/records/contact/${submission.contact_id}`,'PATCH',{changes:{contactability:'do_not_contact'},base:{contactability:'contactable'}});
  await submitForm(marketing.forms,marketing.slug,{...input,idempotencyKey:crypto.randomUUID(),values:{...values,name:'Unreviewed replacement'}});
  const stopped=await call(`/api/v1/records/contact/${submission.contact_id}`);assert.equal(stopped.record.name,values.name);assert.equal(stopped.record.contactability,'do_not_contact');
  const proposals=(await call(`/api/v1/capture/proposals?recordType=contact&recordId=${submission.contact_id}`)).proposals;assert.ok(proposals.some((proposal:any)=>proposal.field==='name'&&proposal.proposed_value==='Unreviewed replacement'&&proposal.current_value===values.name));
  const inquiry=await publication(f,'basis-inquiry',null),document=await inquiry.forms.publicDocument(inquiry.slug),disclosure=document.match(/<p id="inquiry-disclosure">([^<]+)<\/p>/)?.[1];assert.ok(disclosure,'the reviewed public page discloses the follow-up basis');
  const inquiryInput={revision:inquiry.saved.revision,operationId:inquiry.compiled.operationId,idempotencyKey:crypto.randomUUID(),values:{name:'Jordan Reyes',email:['synthetic-orbit-inquiry','manufacturer.test'].join('@'),message:'Please discuss our production rollout.'}},requested=await submitForm(inquiry.forms,inquiry.slug,inquiryInput),request=(await call(`${base}/${inquiry.saved.id}/submissions`)).find((row:any)=>row.id===requested.submissionId);
  assert.deepEqual({...request.contact_basis,occurredAt:undefined},{kind:'inquiry',wording:disclosure,accepted:true,formRevision:inquiry.saved.revision,artifactHash:inquiry.compiled.hash,occurredAt:undefined});assert.ok(Number.isFinite(Date.parse(request.contact_basis.occurredAt)));assert.equal((await call(`/api/v1/records/contact/${request.contact_id}`)).record.contactability,'contactable');
  await submitForm(inquiry.forms,inquiry.slug,{...inquiryInput,idempotencyKey:crypto.randomUUID(),values});assert.equal((await call(`/api/v1/records/contact/${submission.contact_id}`)).record.contactability,'do_not_contact');
  const legacy=await undisclosedInquiry(f),legacyPage=await app.request(`https://orbit.test/p/${legacy.slug}`);assert.equal(legacyPage.status,200);assert.equal(await legacyPage.text(),legacy.compiled.html);
  const legacyInput={revision:legacy.saved.revision,operationId:legacy.compiled.operationId,idempotencyKey:crypto.randomUUID(),values:{name:'Avery Patel',email:['synthetic-orbit-existing-inquiry','manufacturer.test'].join('@')}},legacyReceipt=await submitForm(legacy.forms,legacy.slug,legacyInput);
  const legacyRows=await call(`${base}/${legacy.saved.id}/submissions`),legacySubmission=legacyRows.find((row:any)=>row.id===legacyReceipt.submissionId);
  assert.equal(legacySubmission.contact_basis,null,'an existing artifact without disclosure cannot acquire accepted wording on upgrade');
  assert.equal((await call(`/api/v1/records/contact/${legacySubmission.contact_id}`)).record.contactability,'do_not_contact');
  await submitForm(legacy.forms,legacy.slug,legacyInput);assert.deepEqual(await call(`${base}/${legacy.saved.id}/submissions`),legacyRows,'replay preserves the absence of disclosure evidence');
  assert.equal(await legacy.forms.publicDocument(legacy.slug),legacy.compiled.html,'capture does not rewrite the approved artifact');
  const guest=await collaborator(f),denied=await app.request(`https://orbit.test${base}/${marketing.saved.id}/submissions`,{headers:{Cookie:guest.cookie}});assert.equal(denied.status,403);
  const anonymous=await app.request(`https://orbit.test${base}/${marketing.saved.id}/submissions`);assert.equal(anonymous.status,401);
  await call(`/api/v1/records/contact/${submission.contact_id}`,'DELETE',{confirmed:true});
  rows=await call(`${base}/${marketing.saved.id}/submissions`);const erased=rows.find((row:any)=>row.id===submission.id);assert.equal(erased.contact_id,null);assert.equal(erased.contact_basis,null);assert.equal(erased.values_json,'{}');
  await submitForm(marketing.forms,marketing.slug,input);assert.deepEqual(await call(`${base}/${marketing.saved.id}/submissions`),rows,'replaying an erased capture cannot restore its identity or contact basis');
  const search=await call(`/api/v1/records/contact?q=${encodeURIComponent(values.email)}`);assert.equal(search.records.filter((row:any)=>row.email===values.email).length,0);
  await marketing.forms.withdraw(await f.nativeContext(),marketing.compiled.operationId);await assert.rejects(submitForm(marketing.forms,marketing.slug,{...input,idempotencyKey:crypto.randomUUID()}));
  console.log('PROBE FORM-003 2: public checkbox and inquiry submissions -> authenticated wording, revision and time; unchecked contact stopped, prior stop preserved; anonymous read denied and erased replay stays erased');
 }finally{await f.close();}
}
