import {chromium,expect} from '/workspace/run-orbit/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const packet=process.env.HOME+'/rer-consolidation/work/ct-judge-orbit-signal004-20261105-1500-sol1/packet';
const log=await readFile('/tmp/orbit-dev.log','utf8');
const open=log.match(/^RER_OPEN (.+)$/m)?.[1];
if(!open)throw new Error('Local owner admission was not available');
const origin=new URL(open).origin;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({baseURL:origin,viewport:{width:1440,height:900}});
const page=await context.newPage();
const startedAt=new Date().toISOString(),observations=[];
let secret='';
async function api(path,method='GET',body){
 const result=await page.evaluate(async({path,method,body})=>{
  const r=await fetch(path,{method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:r.status,body:await r.json()};
 },{path,method,body});
 assert.ok(result.status>=200&&result.status<300,`${method} ${path} status ${result.status}`);
 return result.body;
}
try{
 await page.goto(open,{waitUntil:'networkidle'});
 await page.waitForURL(u=>!u.pathname.startsWith('/__dev/'));
 if(new URL(page.url()).pathname==='/setup'){
  await page.getByLabel('Your name',{exact:true}).fill('Fleet reviewer');
  await page.getByLabel('Business name',{exact:true}).fill('SIGNAL review fixture');
  await page.getByLabel('Time zone',{exact:true}).fill('America/New_York');
  await page.getByLabel('Currency',{exact:true}).fill('USD');
  await page.getByRole('button',{name:'Finish setup',exact:true}).click();
  await page.waitForURL('**/app');
 }
 await page.waitForLoadState('networkidle');
 const inventory=await api('/api/v1/workbench');
 const create=async(title,email)=>api('/api/v1/workbench/opportunities','POST',{title,companyName:title+' company',contactName:title+' contact',email,stageId:inventory.stages[0].id,valueCents:125000});
 const a=await create('Native identity candidate','native@review.example');
 const b=await create('Chosen held-event deal','chosen@review.example');
 const detail=id=>api(`/api/v1/records/opportunity/${id}`);
 const beforeA=await detail(a.id),beforeB=await detail(b.id);
 const source=randomUUID();secret=(await api('/api/v1/sources/'+source,'PUT',{name:'Disposable SIGNAL review source',enabled:true})).secret;
 const occurredAt=new Date(Date.now()-86400000).toISOString();
 async function signed(event){
  const raw=JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000));
  const signature=createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex');
  const r=await context.request.post(origin+'/api/v1/signals/'+source,{headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':signature,'Content-Type':'application/json'},data:raw});
  assert.equal(r.status(),201);return r.json();
 }
 const exactEvent={eventId:randomUUID(),type:'meeting.booked',subject:'Native record ID takes precedence',occurredAt,record:{type:'opportunity',id:a.id},email:'chosen@review.example'};
 const exact=await signed(exactEvent);assert.equal(exact.linked,true);
 const exactA=await detail(a.id),exactB=await detail(b.id);
 assert.equal(exactA.timeline.filter(r=>r.id===exact.id).length,1);assert.deepEqual(exactB,beforeB);
 observations.push('Signed explicit native record ID wins over a different known email; intended deal timeline contains exactly one signal; other populated deal unchanged.');
 const heldEvent={eventId:randomUUID(),type:'meeting.booked',subject:'Held customer meeting for explicit review',occurredAt,email:'unknown@review.example'};
 const held=await signed(heldEvent);assert.equal(held.linked,false);
 assert.deepEqual(await detail(a.id),exactA);assert.deepEqual(await detail(b.id),beforeB);
 await page.goto(origin+'/app/review',{waitUntil:'networkidle'});
 const heldCard=page.locator('#unlinked-'+held.id);
 await expect(heldCard).toContainText(heldEvent.subject);await expect(heldCard).toContainText('No unique record match');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:`${packet}/review-held-${width}.png`,fullPage:true});}
 await page.setViewportSize({width:1440,height:900});
 const anonymous=await browser.newContext();
 const refused=await anonymous.request.post(origin+`/api/v1/sources/unlinked/${held.id}/link`,{headers:{Origin:origin},data:{type:'opportunity',id:b.id}});
 assert.equal(refused.status(),401);await anonymous.close();assert.deepEqual(await detail(a.id),exactA);assert.deepEqual(await detail(b.id),beforeB);
 await heldCard.getByRole('button',{name:'Link to an existing record',exact:true}).click();
 await page.getByLabel('Record type',{exact:true}).selectOption('opportunity');
 await page.getByLabel('Find opportunity',{exact:true}).fill('Chosen held-event deal');
 await expect(page.getByLabel('Select opportunity',{exact:true}).locator('option')).toContainText(['Choose a matching record','Chosen held-event deal']);
 await page.getByLabel('Select opportunity',{exact:true}).selectOption(b.id);
 await page.getByRole('button',{name:'Confirm link',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Linked');await expect(page.locator('#unlinked-'+held.id)).toHaveCount(0);
 const chosen=await detail(b.id),entry=chosen.timeline.filter(r=>r.id===held.id);assert.equal(entry.length,1);assert.equal(entry[0].occurred_at,occurredAt);assert.ok(chosen.record.score>beforeB.record.score);
 assert.deepEqual(await detail(a.id),exactA);
 observations.push('Unknown evidence appears in the populated Review screen without scoring; anonymous link returns 401 and changes neither deal; native search and Confirm link place it once on the chosen timeline at original occurred time and change its score; unselected deal stays unchanged.');
 const repeated=await page.evaluate(async({path,id})=>{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'opportunity',id})});return r.status;},{path:`/api/v1/sources/unlinked/${held.id}/link`,id:b.id});assert.equal(repeated,409);
 const replay=await signed(heldEvent);assert.deepEqual(replay,{id:held.id,replayed:true});assert.deepEqual(await detail(a.id),exactA);assert.deepEqual(await detail(b.id),chosen);
 await page.goto(origin+'/app/opportunities/'+b.id,{waitUntil:'networkidle'});
 await expect(page.getByRole('heading',{name:'Chosen held-event deal',exact:true})).toBeVisible();
 await expect(page.getByText(heldEvent.subject,{exact:true})).toHaveCount(1);
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:`${packet}/linked-timeline-${width}.png`,fullPage:true});}
 observations.push('Repeated review returns 409; identical signed replay returns the same signal identity; both native record readbacks unchanged; rendered chosen timeline shows the meeting subject once.');
 const result={schema:1,source:'a3c15b599bb5f023accb5635970fe4156484b2e7',startedAt,finishedAt:new Date().toISOString(),status:'PASS',executable:'/usr/bin/chromium',launchArgs:['--no-sandbox'],viewports:[1440,390],observations,before:{nativeScore:beforeA.record.score,chosenScore:beforeB.record.score},after:{nativeScore:exactA.record.score,chosenScore:chosen.record.score},providerOperations:0,sourceEdits:0};
 await writeFile(packet+'/browser-receipt.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}catch(error){
 let message=String(error).replaceAll(open,'<private local admission>').replaceAll(secret||'unused-secret','<private local source secret>');
 message=message.replace(/([?#](?:rer-dev|key|token)[^\s]*)/g,'<redacted>');
 const failure={schema:1,source:'a3c15b599bb5f023accb5635970fe4156484b2e7',startedAt,finishedAt:new Date().toISOString(),status:'FAILED',error:message,observations};
 await writeFile(packet+'/browser-receipt.json',JSON.stringify(failure,null,2)+'\n');console.log(JSON.stringify(failure,null,2));process.exitCode=1;
}finally{await browser.close();}
