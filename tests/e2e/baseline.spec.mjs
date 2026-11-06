import {mkdirSync,readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {authenticateOperator} from './operator-session.mjs';
test('BASE-PUBLIC-001 BASE-SECRET-001 PUBLIC-001 public surfaces expose no private data or third-party requests before interaction',async({browser,baseURL})=>{
 test.setTimeout(120000);mkdirSync('./verification/ui',{recursive:true});
 const sample=JSON.parse(readFileSync(new URL('../fixtures/orbit-sample.v1.json',import.meta.url),'utf8'));
 const operator=await browser.newContext({baseURL});
 let originalSettings;
 const settingsInput=workspace=>({name:workspace.name,timezone:workspace.timezone,currency:workspace.currency,workingHours:JSON.parse(workspace.working_hours_json),staleIntervalDays:workspace.stale_interval_days,awaitingResponseWorkingDays:workspace.awaiting_response_working_days,freeMailDomains:JSON.parse(workspace.free_mail_domains_json)});
 const read=async path=>{const response=await operator.request.get(path);expect(response.status(),path).toBe(200);return response.json();};
 try{
  await authenticateOperator(operator);
  const {workspace}=await read('/api/v1/settings');originalSettings=settingsInput(workspace);
  expect((await operator.request.put('/api/v1/settings',{headers:{Origin:baseURL},data:{...originalSettings,currency:'USD'}})).status()).toBe(200);
  expect((await read('/api/v1/settings')).workspace.currency).toBe('USD');
  const expectedContact=sample.contacts[0],expectedCompany=sample.companies[0],expectedDeal=sample.opportunities[0];
  const {record:contact}=await read(`/api/v1/records/contact/${expectedContact.id}`);
  expect(contact).toMatchObject({id:expectedContact.id,name:expectedContact.name,email:expectedContact.email});
  const {record:company}=await read(`/api/v1/records/company/${expectedCompany.id}`);
  expect(company).toMatchObject({id:expectedCompany.id,name:expectedCompany.name,primary_domain:expectedCompany.primaryDomain});
  const {opportunity}=await read(`/api/v1/opportunities/${expectedDeal.id}`);
  expect(opportunity).toMatchObject({id:expectedDeal.id,title:expectedDeal.title,companyId:company.id,valueCents:expectedDeal.valueCents});
  expect(opportunity.valueCents).toBeGreaterThan(0);
  expect(opportunity.contacts).toEqual(expect.arrayContaining([expect.objectContaining({id:contact.id,name:contact.name,email:contact.email})]));
  expect(sample.signals.length).toBeGreaterThan(0);
  for(const signal of sample.signals)expect(opportunity.signals).toEqual(expect.arrayContaining([expect.objectContaining({id:signal.id,subject:signal.subject})]));
  const privateValues=[contact.id,contact.name,contact.email,company.id,company.name,company.primary_domain,opportunity.id,opportunity.title,String(opportunity.valueCents),String(opportunity.valueCents/100),new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(opportunity.valueCents/100),...opportunity.signals.flatMap(signal=>[signal.id,signal.subject])];
  for(const value of privateValues){expect(typeof value).toBe('string');expect(value.length).toBeGreaterThan(0);}
  for(const width of [1440,390]){
   // A new context has neither the operator's injected headers nor its cookie jar.
   const context=await browser.newContext({baseURL,viewport:{width,height:900}});
   try{
    expect(await context.cookies()).toEqual([]);
    const page=await context.newPage(),external=[],requests=[],responses=[];
    page.on('request',request=>{requests.push(request);if(new URL(request.url()).origin!==baseURL)external.push(request.url());});
    page.on('response',response=>responses.push(response));
    const document=await page.goto('/');await page.waitForLoadState('networkidle');
    expect(document.status()).toBe(200);expect(document.headers()['x-rer-document']).toBe('lobby');
    expect(external).toEqual([]);expect(await context.cookies()).toEqual([]);await expect(page.locator('body')).not.toContainText('Fieldhouse');await expect(page.locator('body')).not.toContainText('maya.patel');
    for(const request of requests){const headers=await request.allHeaders();for(const name of ['cookie','authorization','x-operator-id'])expect(headers[name],`${width}px ${request.url()} ${name}`).toBeUndefined();}
    const html=await document.text();for(const value of privateValues)expect(html,`${width}px raw Lobby HTML`).not.toContain(value);
    expect(responses).toContain(document);
    for(const response of responses){
     const body=(await response.body()).toString('utf8');
     for(const value of privateValues)expect(body,`${width}px first-load response ${response.url()}`).not.toContain(value);
    }
    const scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(node=>node.src));for(const script of scripts){const body=await(await page.request.get(script)).text();expect(body).not.toContain('SENDGRID_API_KEY');expect(body).not.toContain('OPENAI_API_KEY');expect(body).not.toContain('ORBIT_ENCRYPTION_KEY');}
    await page.screenshot({path:`verification/ui/${width}-lobby-privacy.png`,fullPage:true});
   }finally{await context.close();}
  }
 }finally{
  try{if(originalSettings)expect((await operator.request.put('/api/v1/settings',{headers:{Origin:baseURL},data:originalSettings})).status()).toBe(200);}
  finally{await operator.close();}
 }
});
test('BASE-PUBLIC-003 PUBLIC-002 public surfaces and unknown demo paths pass WCAG 2.2 AA at desktop and phone widths',async({page,context})=>{
 test.setTimeout(120000);mkdirSync('verification/ui',{recursive:true});
 const demoRequests=[];let visitingDemo=false;
 page.on('request',request=>{if(visitingDemo)demoRequests.push({url:request.url(),method:request.method()});});
 const unknownDemo='/demo/synthetic-orbit-unknown';
 const routes=['/','/signin','/docs','/demo',unknownDemo];
 for(const width of [1440,390,320]){
  await context.clearCookies();await page.setViewportSize({width,height:900});
  for(const route of routes){
   visitingDemo=route==='/demo'||route===unknownDemo;demoRequests.length=0;
   const response=await page.goto(route);await page.waitForLoadState('networkidle');
   if(route===unknownDemo){
    expect(response.status()).toBe(404);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('main').getByRole('heading',{level:1,name:'Page not found'})).toBeVisible();
   }
   await page.screenshot({path:`verification/ui/${width}-${route==='/'?'public':route.slice(1).replaceAll('/','-')}.png`,fullPage:true});
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
   expect(result.violations,`${width}px ${route}`).toEqual([]);
   if(route==='/demo'){
    if(width===1440){
     const examples=page.getByRole('complementary',{name:'Opportunities'});
     await expect(examples.getByRole('button')).toHaveCount(12);
     const label=page.getByRole('note');await expect(label).toContainText(/read-only demo/i);await expect(label).toContainText(/fictional/i);
     expect(await label.evaluate(node=>Boolean(node.compareDocumentPosition(document.querySelector('.workspace'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
     const story=page.getByRole('region',{name:/Example opportunity:/});
     await expect(story.getByRole('heading',{name:'Suggested follow-up',exact:true})).toBeVisible();
     await expect(story.getByRole('heading',{name:'Email sent',exact:true})).toBeVisible();
     await expect(story.getByRole('heading',{name:'Customer reply',exact:true})).toBeVisible();
     await expect(story.locator('time').first()).toContainText(/ago/);
    }
    const selected=page.getByRole('complementary',{name:'Opportunities'}).getByRole('button').last();await selected.focus();await page.keyboard.press('Enter');await expect(selected).toHaveAttribute('aria-pressed','true');
    if(width===1440)await expect(page.getByRole('region',{name:/Example opportunity:/}).getByRole('heading',{level:2})).toHaveText(await selected.locator('.company').innerText());
    const changed=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();expect(changed.violations,`${width}px demo selection`).toEqual([]);
    await page.screenshot({path:`verification/ui/${width}-demo-selected.png`,fullPage:true});
   }
   // Start from a fresh document, not after the last demo control, so Tab proves a reachable first control.
   if(route==='/demo'){await page.goto(route);await page.waitForLoadState('networkidle');}
   await page.keyboard.press('Tab');
   expect(await page.evaluate(()=>document.activeElement!==document.body),`${width}px ${route} keyboard focus`).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px ${route} horizontal overflow`).toBe(true);
   if(visitingDemo&&width===1440){
    for(const request of demoRequests){
     const url=new URL(request.url);expect(url.origin).toBe(`http://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}`);expect(request.method).toBe('GET');
     expect(url.pathname.startsWith('/api/')&&url.pathname!=='/api/v1/public-demo').toBe(false);expect(url.pathname.startsWith('/_serverFn/')).toBe(false);
    }
   }
   visitingDemo=false;
   if(route===unknownDemo){
    await page.getByRole('link',{name:'Return home',exact:true}).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('main')).toBeVisible();
   }
  }
 }
});
test('BASE-ACCESS-001 BASE-ACCESS-002 native operator APIs reject anonymous and forged session claims',async({request})=>{
 for(const route of ['/api/v1/records/contact','/api/v1/settings','/api/v1/notifications','/api/v1/assistance/usage','/api/v1/sources']){
  expect((await request.get(route)).status()).toBe(401);expect((await request.get(route,{headers:{Cookie:'__Host-orbit_session=forged','X-Operator-Id':'setup-owner'}})).status()).toBe(401);
 }
});

test('BASE-PUBLIC-002 BASE-INPUT-003 operator documents reject framing and unsupported upload endpoints',async({request})=>{const response=await request.get('/');expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");expect(response.headers()['x-frame-options']).toBe('DENY');expect((await request.post('/uploads',{data:'not an accepted upload'})).status()).toBe(404);});
test('BASE-INPUT-002 user HTML is displayed as text and cannot execute or load remote pixels',async({page,context})=>{
 await authenticateOperator(context);const pixel=`https://untrusted.example/pixel-${Date.now()}`,requests=[];page.on('request',request=>{if(request.url().startsWith('https://untrusted.example'))requests.push(request.url());});
 const name=`<img src="${pixel}" onerror="window.orbitInjected=true">`;
 const response=await page.request.post('/api/v1/records/company',{headers:{Origin:`http://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}`},data:{name}});expect(response.status()).toBe(201);await page.goto('/app/companies');await expect(page.getByText(name,{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.orbitInjected)).toBeUndefined();expect(requests).toEqual([]);expect(await page.locator(`img[src="${pixel}"]`).count()).toBe(0);
});
