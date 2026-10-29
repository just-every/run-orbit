import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const evidence=resolve(process.env.ORBIT_VIEWPORT_EVIDENCE??'.orbit-viewport-evidence');
const viewports=[{name:'320',width:320,height:844},{name:'390',width:390,height:844},{name:'430',width:430,height:932},{name:'desktop',width:1280,height:900},{name:'1440',width:1440,height:900}];
const companyName='Northstar Fleet Systems, account 6A4B7C8D9E0F1A2B3C4D5E6F';
const opportunityTitle='Northstar fleet expansion for western territories and regional service coverage';
const taskTitle='Confirm regional delivery and installation schedule for account 6A4B7C8D9E0F1A2B3C4D5E6F';

export async function nativeOpportunityViewportJourney(page){
 await mkdir(evidence,{recursive:true});
 const diagnostics={viewports:[],consoleErrors:[],pageErrors:[],failedRequests:[],navigationCancellations:[]};
 page.on('console',message=>{if(message.type()==='error')diagnostics.consoleErrors.push(message.text());});
 page.on('pageerror',error=>diagnostics.pageErrors.push(error.message));
 page.on('requestfailed',request=>{
  const failure={url:request.url(),error:request.failure()?.errorText};
  (failure.error==='net::ERR_ABORTED'?diagnostics.navigationCancellations:diagnostics.failedRequests).push(failure);
 });
 try{
  await page.goto('/app');
  const origin=new URL(page.url()).origin,api=page.request,nonce=randomBytes(18).toString('hex');
  const post=(path,data)=>api.post(path,{headers:{Origin:origin},data});
  const inventory=await(await api.get('/api/v1/workbench')).json();
  const created=await post('/api/v1/workbench/opportunities',{title:opportunityTitle,companyName,contactName:'Regional account lead',email:`viewport-${nonce}@example.test`,stageId:inventory.stages[0].id,valueCents:0});
  expect(created.status()).toBe(201);const opportunity=await created.json();
  for(const viewport of viewports){
   await page.setViewportSize({width:viewport.width,height:viewport.height});
   await page.goto('/app/opportunities/'+opportunity.id);
   await expect(page.getByRole('heading',{name:opportunityTitle,exact:true,level:1})).toBeVisible();
   await expect(page.getByRole('main').getByRole('link',{name:companyName,exact:true}).first()).toBeVisible();
   const taskSection=page.getByTestId('handoff-tasks');await expect(taskSection).toHaveCount(0);
   const before=await viewportMetrics(page,viewport.width);
   diagnostics.viewports.push({name:viewport.name,width:viewport.width,height:viewport.height,phase:'before-handoff',...before});
   expect(before.documentWidth,`${viewport.name} before handoff: ${JSON.stringify(before.overflowingElements)}`).toBeLessThanOrEqual(viewport.width);
   expect(before.overflowingElements,`${viewport.name} before handoff has elements outside the viewport`).toEqual([]);
   await page.screenshot({path:`${evidence}/opportunity-${viewport.name}-before-handoff.png`,fullPage:true});
  }

  const client='viewport-'+nonce,callback='https://viewport.example.test/callback';
  const registered=await api.post('/delegation/clients',{headers:{Origin:origin},form:{id:client,redirect_uri:callback},maxRedirects:0});expect(registered.status()).toBe(303);
  const verifier=randomBytes(32).toString('hex'),challenge=createHash('sha256').update(verifier).digest('base64url');
  const query={client_id:client,redirect_uri:callback,response_type:'code',state:nonce,code_challenge:challenge,code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read crm.handoff.write',targets:JSON.stringify(['opportunities/'+opportunity.id])};
  const consent=await api.post('/delegation/authorize',{headers:{Origin:origin},form:query,maxRedirects:0});expect(consent.status()).toBe(303);
  const code=new URL(consent.headers().location).searchParams.get('code');
  const exchanged=await api.post('/api/delegation/v1/token',{form:{grant_type:'authorization_code',client_id:client,redirect_uri:callback,code,code_verifier:verifier}});expect(exchanged.status()).toBe(200);
  const token=(await exchanged.json()).access_token,headers={Authorization:'Bearer '+token};
  const target=`opportunities/${opportunity.id}/handoffs/${nonce}`;
  const check=await(await api.get('/api/delegation/v1/check',{headers,params:{target}})).json();
  const audience=await(await api.get('/api/delegation/v1/audience',{headers,params:{target,operation:'orbit.handoff.upsert'}})).json();
  const initial={title:taskTitle,description:'Coordinate the account team, carrier, and regional installation crew for the Northstar western fleet expansion.',assigneeId:null,dueAt:null,status:'open'};
  const effect=await api.post('/api/delegation/v1/effects',{headers,data:{operationKey:nonce,operation:'orbit.handoff.upsert',target,expectedRevision:check.revision,expectedAudienceRevision:audience.audienceRevision,content:initial}});expect(effect.status()).toBe(200);

  for(const viewport of viewports){
   await page.setViewportSize({width:viewport.width,height:viewport.height});
   // OR3: the hand-off is a line in Activity; its cited link (#handoff-<id>) opens the task in place.
   await page.goto('/app/opportunities/'+opportunity.id+'#handoff-'+nonce);
   await expect(page.getByRole('heading',{name:opportunityTitle,exact:true,level:1})).toBeVisible();
   await expect(page.getByRole('main').getByRole('link',{name:companyName,exact:true}).first()).toBeVisible();
   const section=page.getByTestId('handoff-tasks');
   await expect(section.getByRole('heading',{name:taskTitle,exact:true})).toBeVisible();
   await expect(section.getByRole('textbox',{name:'Title',exact:true})).toHaveValue(taskTitle);
   for(const [role,name] of [['textbox','Description'],['combobox','Assignee'],['textbox',/^Due time \(/],['combobox','Status']])await expect(section.getByRole(role,{name,exact:true})).toBeVisible();
   await expect(section.getByRole('button',{name:/^(Accept with my changes|Update hand-off)$/})).toBeEnabled();
   const after=await viewportMetrics(page,viewport.width);
   diagnostics.viewports.push({name:viewport.name,width:viewport.width,height:viewport.height,phase:'after-handoff',...after});
   expect(after.documentWidth,`${viewport.name} after handoff: ${JSON.stringify(after.overflowingElements)}`).toBeLessThanOrEqual(viewport.width);
   expect(after.overflowingElements,`${viewport.name} after handoff has elements outside the viewport`).toEqual([]);
   if([390,1440].includes(viewport.width)){const axe=await new AxeBuilder({page}).analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);}
   await page.screenshot({path:`${evidence}/opportunity-${viewport.name}-after-handoff.png`,fullPage:true});
   if(viewport.name==='320')await assertKeyboardReachability(page);
  }

  const taskKey=['title','description','assignee_id','due_at','status'];
  let displayedTaskTitle=taskTitle;
  for(const viewport of viewports){
   await page.setViewportSize({width:viewport.width,height:viewport.height});
   await page.goto('/app/opportunities/'+opportunity.id+'#handoff-'+nonce);
   await expect(page.getByRole('heading',{name:opportunityTitle,exact:true,level:1})).toBeVisible();
   const section=page.getByTestId('handoff-tasks');
   await expect(section.getByRole('heading',{name:displayedTaskTitle,exact:true})).toBeVisible();
   const assigneeField=section.getByRole('combobox',{name:'Assignee',exact:true}),statusField=section.getByRole('combobox',{name:'Status',exact:true});
   const assignee=await assigneeField.locator('option').evaluateAll(nodes=>nodes.map(node=>node.value).find(Boolean));
   expect(assignee).toBeTruthy();
   for(const status of ['completed','cancelled','open']){
    const editedTitle=`${taskTitle} (${status})`;
    await section.getByRole('textbox',{name:'Title',exact:true}).fill(editedTitle);
    await section.getByRole('textbox',{name:'Description',exact:true}).fill(`Reviewed regional installation coordination for the Northstar fleet account; current status is ${status}.`);
    await assigneeField.selectOption(status==='cancelled'?'':assignee);
    await section.getByRole('textbox',{name:/^Due time \(/,exact:true}).fill('2026-10-15T09:30');
    await statusField.selectOption(status);
    const saved=page.waitForResponse(response=>response.url().endsWith('/delegation/handoffs')&&response.request().method()==='POST');
    await section.getByRole('button',{name:/^(Accept with my changes|Update hand-off)$/}).click();
    expect((await saved).status()).toBe(200);
    await expect(section.getByRole('heading',{name:editedTitle,exact:true})).toBeVisible();
    const readback=await(await api.get('/delegation/handoffs/'+opportunity.id)).json(),persisted=readback.tasks[0].task;
    expect(Object.fromEntries(taskKey.map(key=>[key,persisted[key]]))).toEqual({title:editedTitle,description:`Reviewed regional installation coordination for the Northstar fleet account; current status is ${status}.`,assignee_id:status==='cancelled'?null:assignee,due_at:'2026-10-14T23:30:00.000Z',status});
    displayedTaskTitle=editedTitle;
   }
  }
  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.failedRequests).toEqual([]);
 }finally{
  await writeFile(`${evidence}/browser-diagnostics.json`,JSON.stringify(diagnostics,null,2)+'\n');
 }
}

async function viewportMetrics(page,width){
 return page.evaluate(expectedWidth=>{
  const root=document.documentElement,body=document.body;
  const overflowingElements=Array.from(document.querySelectorAll('body *')).map(element=>{
   const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
   return {tag:element.tagName.toLowerCase(),className:typeof element.className==='string'?element.className:'',text:(element.textContent??'').trim().slice(0,100),left:Math.round(rect.left),right:Math.round(rect.right),scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,overflowX:style.overflowX};
  }).filter(item=>item.right>expectedWidth+1||item.left< -1).slice(0,20);
  return {viewportWidth:expectedWidth,documentWidth:Math.max(root.scrollWidth,body.scrollWidth),rootScrollWidth:root.scrollWidth,bodyScrollWidth:body.scrollWidth,overflowingElements};
 },width);
}

async function assertKeyboardReachability(page){
 const reached=new Set();
 for(let index=0;index<40&&reached.size<6;index++){
  await page.keyboard.press('Tab');
  const active=await page.evaluate(()=>{const element=document.activeElement;if(!element)return null;const section=element.closest('[data-testid="handoff-tasks"]');return section?{name:element.getAttribute('name')??'',role:element.tagName==='BUTTON'?(element.textContent??'').trim():''}:null;});
  if(active){if(active.name)reached.add(active.name);if(['Update hand-off','Accept with my changes'].includes(active.role))reached.add('save');}
 }
 expect([...reached].sort()).toEqual(['assigneeId','description','dueAt','save','status','title'].sort());
}
