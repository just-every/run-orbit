import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {freshCheckout,freePort,listening} from './checkout.mjs';
import {devSignIn,prepareOperatorFixture,request,requestStatus,settled} from './operator-fixture.mjs';
import {devKey,openLink} from './sign-in.mjs';
import {observeOperator} from './operator-observations.mjs';
import {operatorRoutes} from './operator-routes.mjs';
import {expectProvenance,exerciseProvenanceEditing} from './operator-provenance.mjs';
import {exerciseDuplicateMerge} from './operator-merge.mjs';

const widths=[1440,390,320];
test('BASE-PUBLIC-003 T099 operator controls through native rer dev and disposable customer records',{timeout:30*60000},async t=>{
 const directory=resolve(process.env.ORBIT_OPERATOR_EVIDENCE??'verification/operator');await mkdir(directory,{recursive:true});
 const checkout=await freshCheckout(),port=await freePort(),origin=`http://127.0.0.1:${port}`,observations=[];let browser,dev,fixture;let completed=0;
 try{
  const setup=await checkout.rer(['setup','--owner-email','operator-owner@example.test','--port',String(port),'--non-interactive']);assert.equal(setup.code,0,'Native rer setup failed; private output withheld');
  dev=checkout.serve(['dev']);const open=openLink(await dev.ready);browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});const context=await browser.newContext({baseURL:origin,viewport:{width:1440,height:900}}),page=await context.newPage();settled(page);
  await devSignIn(page,open);
  await t.test('every reachable operator route and expanded data view passes WCAG A/AA without horizontal scrolling',async()=>{
   for(const width of widths)await observeOperator(page,'setup',width,directory,observations);
   await page.getByLabel('Your name').fill('Opal Operator');await page.getByLabel('Business name').fill('Operator acceptance');await page.getByRole('button',{name:'Finish setup',exact:true}).click();await page.waitForURL(origin+'/app');
   fixture=await prepareOperatorFixture(page,browser,origin,await devKey(checkout.root),'operator-owner@example.test');
   const cases=operatorRoutes(fixture);
   for(const width of widths){
    for(const route of cases){await page.goto(origin+route.path);await route.ready(page);try{await observeOperator(page,route.name,width,directory,observations);}finally{await route.after?.(page);}}
    await fixture.collaborator.setViewportSize({width,height:900});await fixture.collaborator.goto(origin+`/app/shared-records?kind=contact&id=${fixture.contactId}`);await fixture.collaborator.getByRole('region',{name:'Shared record details'}).waitFor();await expect(fixture.collaborator.getByText('Ordinary campaign text',{exact:true})).toBeVisible();await expectProvenance(fixture.collaborator,fixture.provenance);await observeOperator(fixture.collaborator,'collaborator-shared',width,directory,observations);
    await fixture.collaborator.goto(origin+'/app/access');await fixture.collaborator.getByRole('heading',{name:'Your collaborator access'}).waitFor();await expect(fixture.collaborator.getByRole('link',{name:'Connected applications and delegations',exact:true})).toHaveCount(0);await observeOperator(fixture.collaborator,'collaborator-access',width,directory,observations);
   }
   await exerciseProvenanceEditing(page,origin,fixture);
   completed++;
  });
  assert.ok(fixture,'The route journey must prepare the real fixture');
  await t.test('phone navigation opens by keyboard and places collaborator links under Settings Access',async()=>{
   for(const width of [390,320]){
    await page.setViewportSize({width,height:900});await page.goto(origin+'/app');const menu=page.getByRole('button',{name:'Menu',exact:true}),nav=page.getByRole('navigation',{name:'Operator navigation'});
    await expect(nav).toBeHidden();await menu.focus();await page.keyboard.press('Enter');await expect(menu).toHaveAttribute('aria-expanded','true');await expect(nav).toBeVisible();await expect(nav.getByRole('link',{name:'Collaborators',exact:true})).toHaveCount(0);await expect(nav.getByRole('link',{name:'Shared records',exact:true})).toHaveCount(0);
    await nav.getByRole('link',{name:'Settings',exact:true}).focus();await page.keyboard.press('Escape');await expect(menu).toBeFocused();await expect(nav).toBeHidden();await page.keyboard.press('Enter');await nav.getByRole('link',{name:'Settings',exact:true}).click();
    const access=page.getByRole('navigation',{name:'Access settings'});await expect(access.getByRole('link',{name:'Collaborators',exact:true})).toBeVisible();await access.getByRole('link',{name:'Shared records',exact:true}).click();await expect(page.getByRole('heading',{name:'Shared records',exact:true})).toBeVisible();
   }
   completed++;
  });
  await t.test('labelled forms validate and modal confirmations contain keyboard focus, cancel safely and save reasons',async()=>{
   const nativeDialogs=[];page.on('dialog',dialog=>{nativeDialogs.push(dialog.type());void dialog.dismiss();});
   for(const width of widths){
    await page.setViewportSize({width,height:900});await page.goto(origin+'/app/new');await expect(page.getByRole('button',{name:'Save opportunity'})).toBeEnabled();await page.getByRole('button',{name:'Save opportunity'}).click();await expect(page.getByLabel('Company name',{exact:true})).toBeFocused();
    await page.goto(origin+`/app/records?record=${fixture.opportunityId}`);const trigger=page.getByRole('button',{name:'Close won',exact:true});await trigger.click();const dialog=page.getByRole('dialog',{name:'Close won',exact:true});await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();await page.keyboard.press('Tab');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.closest('dialog')!==null),true);await dialog.getByRole('button',{name:'Cancel',exact:true}).focus();
    await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement?.closest('dialog')!==null),true);await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
    await trigger.click();await dialog.getByRole('button',{name:'Close won',exact:true}).click();await expect(dialog.getByLabel('Reason for closing this opportunity')).toBeFocused();await dialog.getByLabel('Reason for closing this opportunity').fill('   ');await dialog.getByRole('button',{name:'Close won',exact:true}).click();await expect(dialog).toBeVisible();
    await dialog.getByLabel('Reason for closing this opportunity').fill(`Customer confirmed at ${width}px`);await observeOperator(page,'lifecycle-dialog',width,directory,observations);await dialog.getByRole('button',{name:'Close won',exact:true}).click();await expect(dialog).toHaveCount(0);await expect.poll(async()=>{const detail=await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET');return detail.record.lifecycle;}).toBe('won');await page.getByRole('button',{name:'Reopen',exact:true}).click();
   }
   await page.goto(origin+`/app/opportunities/${fixture.opportunityId}`);const timeline=page.getByTestId('opportunity-timeline');await timeline.getByRole('button',{name:'Edit entry',exact:true}).click();await expect(page.getByRole('heading',{name:'Edit entry',exact:true}).locator('..').getByLabel('Text',{exact:true})).toBeFocused();await page.getByRole('button',{name:'Cancel editing',exact:true}).click();await expect(timeline.getByRole('button',{name:'Edit entry',exact:true})).toBeFocused();
   await timeline.getByRole('button',{name:'Delete entry',exact:true}).click();await page.getByRole('dialog',{name:'Delete timeline entry',exact:true}).getByRole('button',{name:'Cancel',exact:true}).click();assert.ok((await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET')).timeline.some(entry=>entry.id===fixture.timelineEntryId));
   await timeline.getByRole('button',{name:'Delete entry',exact:true}).click();await page.getByRole('dialog',{name:'Delete timeline entry',exact:true}).getByRole('button',{name:'Delete entry',exact:true}).click();await expect(timeline.getByRole('button',{name:'Delete entry',exact:true})).toHaveCount(0);assert.equal((await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET')).timeline.some(entry=>entry.id===fixture.timelineEntryId),false);
   const disposable=await request(page,'/api/v1/records/contact',{name:'Delete only after confirmation',email:'delete-review@example.test',contactability:'do_not_contact'});
   await page.goto(origin+`/app/records?kind=contact&record=${disposable.id}`);await page.getByRole('button',{name:'Clear do-not-contact',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();assert.equal((await request(page,`/api/v1/records/contact/${disposable.id}`,undefined,'GET')).record.contactability,'do_not_contact');
   await page.getByRole('button',{name:'Clear do-not-contact',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Clear do-not-contact',exact:true}).click();await expect(page.getByRole('button',{name:'Clear do-not-contact',exact:true})).toHaveCount(0);assert.equal((await request(page,`/api/v1/records/contact/${disposable.id}`,undefined,'GET')).record.contactability,'contactable');
   await page.getByRole('button',{name:'Delete record',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();assert.equal((await request(page,`/api/v1/records/contact/${disposable.id}`,undefined,'GET')).record.id,disposable.id);
   await page.getByRole('button',{name:'Delete record',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete record',exact:true}).click();await expect(page.getByRole('heading',{name:'Records',exact:true})).toBeVisible();assert.equal(await requestStatus(page,`/api/v1/records/contact/${disposable.id}`),404);
   await exerciseDuplicateMerge(page,origin,fixture,(name,width)=>observeOperator(page,name,width,directory,observations));
   assert.deepEqual(nativeDialogs,[]);
   completed++;
  });
  assert.equal(completed,3,'Every operator requirement must pass before recording acceptance.');
 }finally{
  await fixture?.collaboratorContext.close();await browser?.close();if(dev){dev.child.kill('SIGTERM');await dev.exited;}await checkout.rer(['dev','--stop']);assert.equal(await listening(port),false);await checkout.close();
 }
 await writeFile(join(directory,'closure.json'),JSON.stringify({routes:observations.length,viewports:widths,checks:'All assertions passed.',ownedBrowsers:0,ownedServers:0},null,2));
});
