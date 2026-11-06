import {mkdirSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {authenticateOperator} from './operator-session.mjs';
test('BASE-PUBLIC-001 BASE-SECRET-001 PUBLIC-001 public surfaces expose no private data or third-party requests before interaction',async({page,context})=>{
 const external=[];page.on('request',request=>{if(new URL(request.url()).origin!==`http://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}`)external.push(request.url());});
 await page.goto('/');await page.waitForLoadState('networkidle');expect(external).toEqual([]);expect(await context.cookies()).toEqual([]);await expect(page.locator('body')).not.toContainText('Fieldhouse');await expect(page.locator('body')).not.toContainText('maya.patel');
 const scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(node=>node.src));for(const script of scripts){const body=await(await page.request.get(script)).text();expect(body).not.toContain('SENDGRID_API_KEY');expect(body).not.toContain('OPENAI_API_KEY');expect(body).not.toContain('ORBIT_ENCRYPTION_KEY');}
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
