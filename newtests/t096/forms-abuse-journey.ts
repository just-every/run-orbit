import assert from 'node:assert/strict';
import {createApp,TEST_SESSION_SECRET} from '../../tests/support/app';
import {createPublicFormRoutes} from '../../src/core/features/forms/public-routes';
import {fixture} from './fixture';
import {publication} from './publication-fixture';
import {TestDataRepository} from '../../tests/support/record-data';

export async function formAbuseJourney(f:Awaited<ReturnType<typeof fixture>>,p:Awaited<ReturnType<typeof publication>>,publicForms:ReturnType<typeof createPublicFormRoutes>){
 const origin='https://orbit.test',headers={'Content-Type':'application/json',Origin:origin},app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},formAbuse:{secret:TEST_SESSION_SECRET}}),base=`/api/v2/workspaces/workspace/forms/${p.saved.id}/spam`;
 const operator=(path:string,method='GET')=>app.request(origin+path,{method,headers:{...headers,Cookie:f.cookie},...(method==='GET'?{}:{body:'{}'})});
 const post=(input:unknown,network?:string)=>{const request=new Request(origin+'/'+p.slug,{method:'POST',headers:{...headers,...(network?{'CF-Connecting-IP':network}:{})},body:JSON.stringify(input)});if(network)Object.defineProperty(request,'cf',{value:{colo:'TEST'}});return publicForms.fetch(request);};
 const input=(email:string)=>({revision:p.saved.revision,operationId:p.compiled.operationId,idempotencyKey:crypto.randomUUID(),values:{name:'Actual enquiry',email},consent:true});
 const bot={...input('held-bot@example.test'),honeypot:'spam-link'};
 assert.equal((await post(bot)).status,400);
 const fast=input('held-fast@example.test'),challenge=await publicForms.request(origin+'/'+p.slug+'/challenge',{method:'POST',headers,body:JSON.stringify({idempotencyKey:fast.idempotencyKey})});assert.equal(challenge.status,200);const token=(await challenge.json() as {token:string}).token;
 assert.equal((await post({...fast,fillToken:token})).status,400);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM marketing_form_submissions').first('n'),0);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM contacts').first('n'),0);
 let rows=await(await operator(base)).json() as any[];assert.ok(rows.some(row=>row.reason==='honeypot'));assert.ok(rows.some(row=>row.reason==='fill_time'));assert.ok(rows.some(row=>row.reason==='origin'));assert.ok(rows.some(row=>row.reason==='body_size'));
 const held=rows.find(row=>JSON.parse(row.values_json).email==='held-bot@example.test');assert.ok(held);
 const count=rows.length;assert.equal((await post(bot)).status,400);assert.equal((await(await operator(base)).json() as any[]).length,count,'refused replay keeps one decision');
 const released=await Promise.all([operator(`${base}/${held.id}/release`,'POST'),operator(`${base}/${held.id}/release`,'POST')]);for(const response of released)assert.equal(response.status,200,await response.clone().text());const receipts=await Promise.all(released.map(response=>response.json())) as any[];assert.equal(receipts[0].submissionId,receipts[1].submissionId);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM marketing_form_submissions').first('n'),1);assert.equal(await f.db.prepare('SELECT count(*) n FROM consent_events').first('n'),1);assert.equal((await post(bot)).status,200,'public replay returns the released receipt');
 rows=await(await operator(base)).json() as any[];const tooFast=rows.find(row=>row.reason==='fill_time');assert.equal((await operator(`${base}/${tooFast.id}`,'DELETE')).status,200);assert.ok((await operator(`${base}/${tooFast.id}/release`,'POST')).status>=400);rows=await(await operator(base)).json() as any[];assert.equal(rows.find(row=>row.id===tooFast.id).values_json,'{}');
 const normal=input('normal-enquiry@example.test'),normalChallenge=await publicForms.request(origin+'/'+p.slug+'/challenge',{method:'POST',headers,body:JSON.stringify({idempotencyKey:normal.idempotencyKey})}),normalToken=(await normalChallenge.json() as {token:string}).token;
 await new Promise(resolve=>setTimeout(resolve,2100));assert.equal((await post({...normal,fillToken:normalToken,honeypot:''})).status,200);
 assert.equal((await post({...normal,fillToken:'expired-token',turnstileToken:'consumed-token'})).status,200,'accepted retries do not reverify expiring challenge tokens');
 let limited=false;for(let i=0;i<50&&!limited;i++){const response=await post({...input('held-rate@example.test'),honeypot:'bot'});limited=response.status===429;}assert.ok(limited,'a network flood is refused');
 // Distinct edge networks still share the form budget. Refused bots create no customers.
 let formLimited=false;for(let i=0;i<60&&!formLimited;i++){const response=await post({...input('held-form-rate@example.test'),honeypot:'bot'},`203.0.113.${i+1}`);formLimited=response.status===429;}assert.ok(formLimited,'a distributed flood is refused by the form budget');
 assert.equal(await f.db.prepare('SELECT count(*) n FROM contacts').first('n'),2);assert.equal(await f.db.prepare('SELECT count(*) n FROM outbound_messages').first('n'),0);
 const erased=await f.records.save('contact',{name:'Erase quarantine',email:'held-rate@example.test'},f.operator.operatorId);await new TestDataRepository(f.db).remove('contact',erased.id,f.operator.operatorId);rows=await(await operator(base)).json() as any[];assert.ok(rows.filter(row=>row.reason==='rate_limit').every(row=>!row.values_json.includes('held-rate@example.test')),'contact erasure clears matching held payloads');
 const saved=await p.forms.save(await f.context(),{form:{title:'Verified enquiries',fields:[{id:'name',label:'Name',required:true},{id:'email',label:'Email',required:true}],consentWording:null,turnstileSiteKey:'public-test-site-key'},landing:{title:'Verified enquiries',heading:'Contact sales',paragraphs:['Send your enquiry.']}}),compiled=await p.forms.compile(await f.context(),{formId:saved.id,revision:saved.revision,reviewedHash:saved.hash,slug:'verified-enquiry',maxRecords:10,expiresAt:new Date(Date.now()+86400000).toISOString()});
 await p.forms.approve(await f.context(),compiled.operationId,{artifactHash:compiled.hash,formRevision:saved.revision});await p.forms.publish(await f.context(),compiled.operationId);
 let valid=false,calls=0;
 const verified=createPublicFormRoutes(f.db,{secret:TEST_SESSION_SECRET,turnstileSecret:TEST_SESSION_SECRET,fetch:async(url,init)=>{assert.equal(String(url),'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal(init?.method,'POST');calls++;return Response.json({success:true,action:valid?'orbit_form':'wrong-action',hostname:'orbit.test'});}});
 const attempts=await Promise.all([0,1].map(async()=>{const value={revision:saved.revision,operationId:compiled.operationId,idempotencyKey:crypto.randomUUID(),values:{name:'Verified person',email:'normal-enquiry@example.test'},turnstileToken:'single-use-edge-token'},response=await verified.request(origin+'/verified-enquiry/challenge',{method:'POST',headers,body:JSON.stringify({idempotencyKey:value.idempotencyKey})});return {...value,fillToken:(await response.json() as {token:string}).token};}));await new Promise(resolve=>setTimeout(resolve,2100));
 const verifyPost=(value:unknown)=>{const request=new Request(origin+'/verified-enquiry',{method:'POST',headers:{...headers,'CF-Connecting-IP':'198.51.100.1'},body:JSON.stringify(value)});Object.defineProperty(request,'cf',{value:{colo:'TEST'}});return verified.fetch(request);};
 assert.equal((await verifyPost(attempts[0])).status,400,'a challenge for another action is refused');valid=true;assert.equal((await verifyPost(attempts[1])).status,200);const called=calls;assert.equal((await verifyPost({...attempts[1],turnstileToken:'already-consumed'})).status,200);assert.equal(calls,called,'accepted replays never resubmit a one-use provider token');
 const heldPayloads=(await f.db.prepare('SELECT intake_json FROM form_spam').all<{intake_json:string}>()).results;assert.ok(heldPayloads.every(row=>!row.intake_json.includes('fillToken')&&!row.intake_json.includes('turnstileToken')),'quarantine excludes transport credentials');
 assert.ok((await f.db.prepare('SELECT bucket FROM public_rate_limits').all<{bucket:string}>()).results.every(row=>!row.bucket.includes('203.0.113.')&&!row.bucket.includes('198.51.100.')),'rate buckets retain no raw network address');

}
