import assert from 'node:assert/strict';
import {fixture} from './fixture';
import {legacyPublication} from './forms-legacy-publication';
import {createApp,TEST_SESSION_SECRET} from '../../tests/support/app';
import {inquiryDisclosure} from '../../src/core/features/forms/contact-basis';

/** Old publication, current anonymous HTTP admission and authenticated readback. */
export async function formsLegacyBasisJourney(){
 const f=await fixture();try{
  const p=await legacyPublication(f),app=createApp({database:f.db,formAbuse:{secret:TEST_SESSION_SECRET},assets:{fetch:async()=>new Response(null,{status:404})}}),origin='https://orbit.test',headers={Origin:origin,'Content-Type':'application/json'},key=crypto.randomUUID();
  const page=await app.request(`${origin}/p/${p.slug}`);assert.equal(page.status,200);assert.equal(await page.text(),p.compiled.html);assert.equal(p.compiled.html.includes(inquiryDisclosure),false);
  const challenge=await app.request(`${origin}/api/public/forms/${p.slug}/challenge`,{method:'POST',headers,body:JSON.stringify({idempotencyKey:key})});assert.equal(challenge.status,200);const {token}=await challenge.json() as {token:string};await new Promise(resolve=>setTimeout(resolve,2100));
  const input={revision:p.saved.revision,operationId:p.compiled.operationId,idempotencyKey:key,fillToken:token,honeypot:'',values:{name:'Legacy inquiry person',email:'legacy-native@manufacturer.test',message:'Please discuss our production rollout.'}};
  const submitted=await app.request(`${origin}/api/public/forms/${p.slug}`,{method:'POST',headers,body:JSON.stringify(input)});assert.equal(submitted.status,200,await submitted.clone().text());const receipt=await submitted.json() as {submissionId:string};
  const read=async(path:string)=>{const response=await app.request(`${origin}${path}`,{headers:{Cookie:f.cookie}});assert.equal(response.status,200);return response.json() as Promise<any>;};
  const rows=await read(`/api/v2/workspaces/workspace/forms/${p.saved.id}/submissions`),submission=rows.find((row:any)=>row.id===receipt.submissionId),detail=await read(`/api/v1/records/contact/${submission.contact_id}`),signal=await f.db.prepare('SELECT payload_json FROM signals WHERE id=?').bind(submission.signal_id).first<string>('payload_json');
  assert.ok(signal);console.log(`PROBE FORM-003 legacy observed: ${JSON.stringify({pageStatus:page.status,submitStatus:submitted.status,artifactContainsDisclosure:false,basis:submission.contact_basis,contactability:detail.record.contactability})}`);
  assert.equal(submission.contact_basis,null,'a retained page without a disclosure records no accepted inquiry basis');
  assert.equal(detail.record.contactability,'do_not_contact','an undisclosed inquiry basis never grants contactability');
  assert.equal(JSON.parse(signal!).contactBasis,null,'no inferred wording is persisted in the submission signal');
  for(const value of [rows,detail,JSON.parse(signal!)])assert.equal(JSON.stringify(value).includes(inquiryDisclosure),false,'unshown disclosure is absent from authenticated evidence');
  const replay=await app.request(`${origin}/api/public/forms/${p.slug}`,{method:'POST',headers,body:JSON.stringify(input)});assert.equal(replay.status,200);assert.equal((await replay.json() as any).submissionId,receipt.submissionId);assert.deepEqual(await read(`/api/v2/workspaces/workspace/forms/${p.saved.id}/submissions`),rows);
  assert.equal(await p.forms.publicDocument(p.slug),p.compiled.html);assert.equal(await f.db.prepare('SELECT count(*) n FROM consent_events').first('n'),0);
 }finally{await f.close();}
}
