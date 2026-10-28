import {publicationAvailabilityJourney} from './forms-publication-availability';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture,collaborator} from './fixture';
import {createApp,TEST_SESSION_SECRET} from '../../tests/support/app';
import {createPublicFormRoutes} from '../../src/core/features/forms/public-routes';
import {publication} from './publication-fixture';
import {submitForm} from './form-submit';
import {formAbuseJourney} from './forms-abuse-journey';
import {formsMappedJourney} from './forms-mapped-journey';

test('FORM-001 DATA-003 public intake refuses abuse, preserves consent and existing customers, reviews mapped changes and carries custody through erasure',async()=>{
 const f=await fixture();
 try{
  const p=await publication(f),publicForms=createPublicFormRoutes(f.db,{secret:TEST_SESSION_SECRET});
  for(const [headers,body,status] of [
   [{'Content-Type':'application/json',Origin:'https://other.test'},'{}',403],
   [{'Content-Type':'application/json',Origin:'https://orbit.test','Content-Encoding':'gzip'},'{}',415],
   [{'Content-Type':'application/json',Origin:'https://orbit.test'},' '.repeat(17000),413],
  ] as const){const response=await publicForms.request(`https://orbit.test/${p.slug}`,{method:'POST',headers,body});assert.equal(response.status,status);}
  await formAbuseJourney(f,p,publicForms);
  const app=createApp({database:f.db,formAbuse:{secret:TEST_SESSION_SECRET},assets:{fetch:async()=>{throw Error('HTTP form journey');}}});
  const call=async(path:string,method='GET',body?:unknown,cookie=f.cookie,status=200)=>{
   const response=await app.request('https://orbit.test'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
   assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;
  };
  // A failed durable consent write leaves the whole enquiry absent; the same visitor can retry it once.
  const atomic={revision:p.saved.revision,operationId:p.compiled.operationId,idempotencyKey:crypto.randomUUID(),values:{name:'Atomic buyer',email:'atomic@consent.test'},consent:true};
  const counts=async()=>Promise.all(['contacts','signals','marketing_form_submissions','consent_events'].map(table=>f.db.prepare(`SELECT count(*) n FROM ${table}`).first<number>('n'))),beforeFailure=await counts();
  await f.db.prepare("CREATE TRIGGER fail_capture_consent BEFORE INSERT ON consent_events BEGIN SELECT RAISE(ABORT,'capture consent storage failure');END").run();
  try{await assert.rejects(submitForm(p.forms,p.slug,atomic));assert.deepEqual(await counts(),beforeFailure);}finally{await f.db.prepare('DROP TRIGGER fail_capture_consent').run();}
  const concurrent=await Promise.all([submitForm(p.forms,p.slug,atomic),submitForm(p.forms,p.slug,atomic)]);
  assert.equal(concurrent[0].submissionId,concurrent[1].submissionId);assert.deepEqual(await counts(),beforeFailure.map(value=>value!+1));
  const input={revision:p.saved.revision,operationId:p.compiled.operationId,idempotencyKey:crypto.randomUUID(),values:{name:'New buyer',email:'buyer@consent.test'}};
  const first=await submitForm(p.forms,p.slug,input),contact=await f.db.prepare('SELECT * FROM contacts WHERE email=?').bind(input.values.email).first<any>();
  assert.equal(first.reviewRequired,false);assert.equal(contact.contactability,'do_not_contact');
  const deal=await f.db.prepare('SELECT opportunity_id AS id FROM opportunity_contacts WHERE contact_id=?').bind(contact.id).first<{id:string}>();assert.ok(deal);await call(`/api/v1/records/opportunity/${deal.id}`,'PUT',{title:'Existing buyer deal',stage_id:f.stage,value_cents:1200,contact_ids:[contact.id],primary_contact_id:contact.id});
  const replay=await submitForm(p.forms,p.slug,input);assert.equal(replay.submissionId,first.submissionId);assert.equal(replay.replayed,true);
  await assert.rejects(submitForm(p.forms,p.slug,{...input,values:{name:'Different',email:'other@consent.test'}}));
  const before=await f.db.prepare('SELECT * FROM contacts WHERE id=?').bind(contact.id).first();
  const changedInput={...input,idempotencyKey:crypto.randomUUID(),values:{...input.values,name:'Unreviewed replacement'},consent:true},changed=await submitForm(p.forms,p.slug,changedInput);
  assert.equal(changed.reviewRequired,true);assert.deepEqual(await f.db.prepare('SELECT * FROM contacts WHERE id=?').bind(contact.id).first(),before);
  const signal=await f.db.prepare('SELECT signal_id FROM marketing_form_submissions WHERE id=?').bind(changed.submissionId).first<string>('signal_id');
  assert.deepEqual((await f.db.prepare('SELECT record_type,record_id FROM signal_links WHERE signal_id=? ORDER BY record_type').bind(signal).all()).results,[{record_type:'contact',record_id:contact.id},{record_type:'opportunity',record_id:deal.id}]);
  const detail=await call(`/api/v1/records/opportunity/${deal.id}`);assert.ok(detail.record.score>0);assert.ok(detail.timeline.some((entry:any)=>entry.signal_id===signal||entry.id===signal));
  const consent=await f.db.prepare('SELECT wording,artifact_hash,form_revision FROM consent_events WHERE contact_id=?').bind(contact.id).first<any>();
  const publishedDefinition=JSON.parse((await p.forms.entity(p.saved.id,'form')).body_json);
  assert.deepEqual(consent,{wording:publishedDefinition.form.consentWording,artifact_hash:p.compiled.hash,form_revision:p.saved.revision});
  const evaluations=await f.db.prepare('SELECT count(*) n FROM evaluations WHERE opportunity_id=?').bind(deal.id).first('n');
  const changedReplay=await submitForm(p.forms,p.slug,changedInput);assert.equal(changedReplay.submissionId,changed.submissionId);assert.equal(await f.db.prepare('SELECT count(*) n FROM evaluations WHERE opportunity_id=?').bind(deal.id).first('n'),evaluations);
  assert.equal(await f.db.prepare("SELECT count(*) n FROM evaluations WHERE opportunity_id=? AND status='current'").bind(deal.id).first('n'),1);assert.ok(Number(evaluations)>0);
  await call(`/api/v1/records/opportunity/${deal.id}`,'DELETE',{confirmed:true});await call(`/api/v1/records/contact/${contact.id}`,'DELETE',{confirmed:true});
  await submitForm(p.forms,p.slug,{...input,idempotencyKey:crypto.randomUUID()});
  assert.equal(await f.db.prepare('SELECT contactability FROM contacts WHERE email=?').bind(input.values.email).first('contactability'),'do_not_contact');
  const inquiry=await publication(f,'enquiry-without-checkbox',null),message='Please call about a trial.\nOur team needs <five> seats & onboarding.';
  await submitForm(inquiry.forms,inquiry.slug,{revision:inquiry.saved.revision,operationId:inquiry.compiled.operationId,idempotencyKey:crypto.randomUUID(),values:{name:'Trial buyer',email:'trial@consent.test',message}});
  const trial=await f.db.prepare("SELECT id,contactability FROM contacts WHERE email='trial@consent.test'").first<any>(),trialDetail=await call(`/api/v1/records/contact/${trial.id}`);
  assert.equal(trial.contactability,'contactable');assert.equal(JSON.parse(trialDetail.timeline.find((entry:any)=>entry.kind==='signal.recorded').payload_json).text,message);
  await submitForm(inquiry.forms,inquiry.slug,{revision:inquiry.saved.revision,operationId:inquiry.compiled.operationId,idempotencyKey:crypto.randomUUID(),values:{name:'Untrusted',email:input.values.email,message}});
  assert.equal(await f.db.prepare('SELECT contactability FROM contacts WHERE email=?').bind(input.values.email).first('contactability'),'do_not_contact');
  const viewer=await collaborator(f);await call('/api/v2/workspaces/workspace/forms','POST',{form:{},landing:{}},viewer.cookie,403);
  await call(`/api/v2/workspaces/workspace/forms/publications/${p.compiled.operationId}/withdraw`,'POST',{});
  assert.equal((await app.request(`https://orbit.test/p/${p.slug}`)).status,404);await assert.rejects(submitForm(p.forms,p.slug,{...input,idempotencyKey:crypto.randomUUID()}));
  assert.equal(await f.db.prepare('SELECT count(*) n FROM outbound_messages').first('n'),0);
  await publicationAvailabilityJourney(f);
  await formsMappedJourney(f);
 }finally{await f.close();}
});
