import {mkdirSync} from 'node:fs';
import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {authenticateOperator} from './operator-session.mjs';

export const baselineJourney1 = async({page,context})=>{
 const external=[];page.on('request',request=>{if(new URL(request.url()).origin!==`http://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}`)external.push(request.url());});
 await page.goto('/');await page.waitForLoadState('networkidle');expect(external).toEqual([]);expect(await context.cookies()).toEqual([]);await expect(page.locator('body')).not.toContainText('Fieldhouse');await expect(page.locator('body')).not.toContainText('maya.patel');
 const scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(node=>node.src));for(const script of scripts){const body=await(await page.request.get(script)).text();expect(body).not.toContain('SENDGRID_API_KEY');expect(body).not.toContain('OPENAI_API_KEY');expect(body).not.toContain('ORBIT_ENCRYPTION_KEY');}
};

export const baselineJourney2 = async({page,context})=>{
 mkdirSync('verification/ui',{recursive:true});
 const routes=['/','/signin','/docs','/demo'];
 for(const width of [1440]){
  await context.clearCookies();await page.setViewportSize({width,height:900});
  for(const route of routes){
   await page.goto(route);await page.waitForLoadState('networkidle');
   await page.screenshot({path:`verification/ui/${width}-${route==='/'?'public':route.slice(1).replaceAll('/','-')}.png`,fullPage:true});
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
   expect(result.violations,`${width}px ${route}`).toEqual([]);
   if(route==='/demo'){
    const selected=page.getByRole('complementary',{name:'Opportunities'}).getByRole('button').last();await selected.focus();await page.keyboard.press('Enter');await expect(selected).toHaveAttribute('aria-pressed','true');
    const changed=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();expect(changed.violations,`${width}px demo selection`).toEqual([]);
    await page.screenshot({path:`verification/ui/${width}-demo-selected.png`,fullPage:true});
   }
   // Start from a fresh document, not after the last demo control, so Tab proves a reachable first control.
   if(route==='/demo'){await page.goto(route);await page.waitForLoadState('networkidle');}
   await page.keyboard.press('Tab');
   expect(await page.evaluate(()=>document.activeElement!==document.body),`${width}px ${route} keyboard focus`).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px ${route} horizontal overflow`).toBe(true);
  }
 }
};

export const baselineJourney3 = async({request})=>{
 for(const route of ['/api/v1/records/contact','/api/v1/settings','/api/v1/notifications','/api/v1/assistance/usage','/api/v1/sources']){
  expect((await request.get(route)).status()).toBe(401);expect((await request.get(route,{headers:{Cookie:'__Host-orbit_session=forged','X-Operator-Id':'setup-owner'}})).status()).toBe(401);
 }
};

export const baselineJourney4 = async({request})=>{const response=await request.get('/');expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");expect(response.headers()['x-frame-options']).toBe('DENY');expect((await request.post('/uploads',{data:'not an accepted upload'})).status()).toBe(404);};

export const baselineJourney5 = async({page,context})=>{
 await authenticateOperator(context);const pixel=`https://untrusted.example/pixel-${Date.now()}`,requests=[];page.on('request',request=>{if(request.url().startsWith('https://untrusted.example'))requests.push(request.url());});
 const name=`<img src="${pixel}" onerror="window.orbitInjected=true">`;
 const response=await page.request.post('/api/v1/records/company',{headers:{Origin:`http://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}`},data:{name}});expect(response.status()).toBe(201);await page.goto('/app/records');await page.getByRole('button',{name:'Companies',exact:true}).click();await expect(page.getByText(name,{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.orbitInjected)).toBeUndefined();expect(requests).toEqual([]);expect(await page.locator(`img[src="${pixel}"]`).count()).toBe(0);
};

