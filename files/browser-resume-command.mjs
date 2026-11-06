import {chromium,expect} from '/workspace/run-orbit/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const packet=process.env.HOME+'/rer-consolidation/work/ct-judge-orbit-signal004-20261105-1500-sol1/packet';
const open=(await readFile('/tmp/orbit-dev.log','utf8')).match(/^RER_OPEN (.+)$/m)?.[1];const origin=new URL(open).origin;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({baseURL:origin,viewport:{width:1440,height:900}});const page=await context.newPage();
const startedAt=new Date().toISOString(),observations=[];
try{
 await page.goto(open,{waitUntil:'networkidle'});await page.waitForURL(u=>!u.pathname.startsWith('/__dev/'));
 const api=async(path,method='GET',body)=>page.evaluate(async({path,method,body})=>{const r=await fetch(path,{method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};},{path,method,body});
 const records=await api('/api/v1/records/opportunity');assert.equal(records.status,200);
 const a=records.body.records.find(r=>r.title==='Native identity candidate'),b=records.body.records.find(r=>r.title==='Chosen held-event deal');assert.ok(a&&b);
 const held=(await api('/api/v1/sources/unlinked')).body.signals.find(r=>r.subject==='Held customer meeting for explicit review');assert.ok(held);
 const detail=async id=>{const r=await api('/api/v1/records/opportunity/'+id);assert.equal(r.status,200);return r.body;};
 const beforeA=await detail(a.id),beforeB=await detail(b.id);assert.equal(beforeB.record.score,0);
 await page.goto(origin+'/app/review',{waitUntil:'networkidle'});
 await page.locator('#unlinked-'+held.id).getByRole('button',{name:'Link to an existing record',exact:true}).click();
 // HTML labels enclose option text, so use the label's stable visible prefix.
 const type=page.locator('select[name="type"]');await expect(type).toBeVisible();await type.selectOption('opportunity');
 await page.getByRole('searchbox',{name:/^Find opportunity/}).fill('Chosen held-event deal');
 const selection=page.locator('select[name="id"]');await expect(selection.locator('option[value="'+b.id+'"]')).toHaveCount(1);await selection.selectOption(b.id);
 const linkResponse=page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/sources/unlinked/${held.id}/link`&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Confirm link',exact:true}).click();assert.equal((await linkResponse).status(),200);
 await expect(page.locator('#unlinked-'+held.id)).toHaveCount(0);
 const chosen=await detail(b.id),entries=chosen.timeline.filter(r=>r.id===held.id);assert.equal(entries.length,1);assert.equal(entries[0].occurred_at,held.occurred_at);assert.ok(chosen.record.score>0);assert.deepEqual(await detail(a.id),beforeA);
 const repeated=await api(`/api/v1/sources/unlinked/${held.id}/link`,'POST',{type:'opportunity',id:b.id});assert.equal(repeated.status,409);assert.deepEqual(await detail(b.id),chosen);assert.deepEqual(await detail(a.id),beforeA);
 observations.push('Resumed the same populated held event after a selector-only timeout: native existing-record button, opportunity type, native search, record selection and Confirm link return 200; the held queue removes the event.');
 observations.push('Chosen deal readback contains the signal exactly once at original occurred time and score rises from 0; unselected native-ID deal unchanged. Repeated native review returns 409 and changes neither record. Exact evaluation count and signed replay isolation are executed in the focused D1 journey.');
 await page.goto(origin+'/app/opportunities/'+b.id,{waitUntil:'networkidle'});await expect(page.getByRole('heading',{name:'Chosen held-event deal',exact:true})).toBeVisible();await expect(page.getByText(held.subject,{exact:true})).toHaveCount(1);
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:`${packet}/linked-timeline-${width}.png`,fullPage:true});}
 const receipt={schema:1,source:'a3c15b599bb5f023accb5635970fe4156484b2e7',startedAt,finishedAt:new Date().toISOString(),status:'PASS',continuedFrom:'browser-initial-receipt.json',fixtureRecreated:false,selectorCorrection:'select[name="type"] replaces exact nested-label lookup',executable:'/usr/bin/chromium',launchArgs:['--no-sandbox'],viewports:[1440,390],observations,before:{chosenScore:beforeB.record.score,unselectedScore:beforeA.record.score},after:{chosenScore:chosen.record.score,unselectedScore:(await detail(a.id)).record.score},providerOperations:0,sourceEdits:0};await writeFile(packet+'/browser-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}catch(error){const receipt={schema:1,status:'FAILED',source:'a3c15b599bb5f023accb5635970fe4156484b2e7',startedAt,finishedAt:new Date().toISOString(),error:String(error).replaceAll(open,'<private local admission>'),observations};await writeFile(packet+'/browser-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));process.exitCode=1;}finally{await browser.close();}
