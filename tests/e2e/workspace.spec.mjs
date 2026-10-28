import {mkdir} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
import {authenticateOperator} from './operator-session.mjs';
import {baselineJourney1,baselineJourney2,baselineJourney3,baselineJourney4,baselineJourney5} from './baseline-journey.mjs';
import {operatorJourney1,operatorJourney2,operatorJourney3,operatorJourney4,operatorJourney5,operatorJourney6,watchFailures} from './operator-journey.mjs';
import {stale_reviewJourney1,stale_reviewJourney2} from './stale-review-journey.mjs';
import {recordsJourney1,recordsJourney3} from './records-journey.mjs';
import {workbenchJourney1} from './workbench-journey.mjs';
import {assistanceJourney1} from './assistance-journey.mjs';
import {captureJourney1,captureJourney2} from './capture-journey.mjs';
import {importsJourney1} from './imports-journey.mjs';
import {zz_notificationsJourney1} from './zz-notifications-journey.mjs';

test.use({timezoneId:'Australia/Brisbane'});

test.describe.configure({mode:'serial'});

test('a sessionless visitor opens public docs while private documents and APIs reject forged identity',async({page,context,browser,request},info)=>{
 const input={page,context,browser,request};
 const health=await request.get('/health');expect(health.ok()).toBe(true);expect(await health.json()).toMatchObject({database:'ok'});
 expect((await request.get('/app',{maxRedirects:0})).status()).toBe(302);
 await baselineJourney1(input,info);
 await baselineJourney2(input,info);
 await baselineJourney3(input,info);
 await baselineJourney4(input,info);
 await page.goto('/');const setup=await(await request.get('/setup/state')).json(),claimed=setup.state==='claimed';await expect(page.getByRole('link',{name:claimed?'Sign in':'Finish setup',exact:true})).toHaveAttribute('href',claimed?'/signin':'/setup');for(const path of ['/pricing/','/review/','/sent/'])expect((await request.get(path)).status()).toBe(404);
 const initialResponse=await page.goto('/docs',{waitUntil:'networkidle'});expect(initialResponse?.status()).toBe(200);await expect(page).toHaveURL(/\/docs$/);await expect(page.getByRole('heading',{level:1,name:'Orbit'})).toBeVisible();
 const sidebar=page.locator('.docs-sidebar'),links=await sidebar.getByRole('link').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));expect(links.length).toBeGreaterThan(1);
 const initialCurrent=await page.evaluate(html=>{const document=new DOMParser().parseFromString(html,'text/html');return ['.docs-sidebar','.docs-menu'].map(selector=>Array.from(document.querySelectorAll(`${selector} [aria-current="page"]`),item=>item.getAttribute('href')));},await initialResponse.text());
 expect(initialCurrent).toEqual([[links[0]],[links[0]]]);for(const href of links)expect((await request.get(href)).status()).toBe(200);
 await sidebar.getByRole('link').nth(2).click();await expect(sidebar.locator('[aria-current="page"]')).toHaveCount(1);await expect(sidebar.locator('[aria-current="page"]')).toHaveAttribute('href',links[2]);expect((await request.get('/docs/not-a-page')).status()).toBe(404);
});

test('an operator follows scored evidence into an opportunity and saves reviewed outreach',async({page,context,browser,request},info)=>{
 test.setTimeout(300_000);
 const input={page,context,browser,request};await authenticateOperator(context);
 await operatorJourney1(input,info);
 await operatorJourney2(input,info);
 await operatorJourney3(input,info);
 await operatorJourney4(input,info);
 await operatorJourney5(input,info);
 await operatorJourney6(input,info);
 await workbenchJourney1(input,info);
 await stale_reviewJourney1(input,info);
 await assistanceJourney1(input,info);
});

test('an operator imports customer records, reviews captured changes and follows their notifications',async({page,context,browser,request},info)=>{
 test.setTimeout(300_000);
 const input={page,context,browser,request};await authenticateOperator(context);
 let failures=watchFailures(page);
 await stale_reviewJourney2(input,info);
 await recordsJourney1(input,info);
 await recordsJourney3(input,info);
 await captureJourney1(input,info);
 // The provider fixture deliberately stops the Worker while it owns D1.
 // Finish checking the live page, then close its notification poller before that outage.
 expect(failures).toEqual([]);
 await input.page.close();
 input.page=await context.newPage();
 failures=watchFailures(input.page);
 // The context keeps its pre-restart synthetic cookie; this step must use the
 // persisted native session rather than hiding lost authority behind a new sign-in.
 await captureJourney2(input,info);
 await importsJourney1(input,info);
 await zz_notificationsJourney1(input,info);
 await baselineJourney5(input,info);
 await input.page.waitForLoadState('networkidle');await input.page.goto('/app/settings',{waitUntil:'networkidle'});await expect(input.page.getByRole('heading',{name:'Workspace settings',exact:true})).toBeVisible();await mkdir('verification/ui',{recursive:true});await input.page.screenshot({path:'verification/ui/settings-1440.png',fullPage:true});
 await input.page.goto('/app/records',{waitUntil:'networkidle'});await input.page.screenshot({path:'verification/ui/workspace-1440.png',fullPage:true});
 expect(failures).toEqual([]);
});
