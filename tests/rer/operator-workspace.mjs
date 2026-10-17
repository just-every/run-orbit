import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {freshCheckout,freePort,listening} from './checkout.mjs';
import {devSignIn,prepareOperatorFixture,settled} from './operator-fixture.mjs';
import {devKey,openLink} from './sign-in.mjs';
import {observeOperator} from './operator-observations.mjs';

/** Independent native installations keep viewport shards free of shared fixture state. */
export async function withOperatorWorkspace({name,widths,observeSetup=false},run){
 const directory=resolve(process.env.ORBIT_OPERATOR_EVIDENCE??'verification/operator',name);
 await mkdir(directory,{recursive:true});
 const checkout=await freshCheckout(),port=await freePort(),origin=`http://127.0.0.1:${port}`,observations=[];
 let browser,dev,fixture;
 try{
  const setup=await checkout.rer(['setup','--owner-email','operator-owner@example.test','--port',String(port),'--non-interactive']);
  assert.equal(setup.code,0,'Native rer setup failed; private output withheld');
  dev=await checkout.serve(['dev']);const open=openLink(await dev.ready);
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});
  const context=await browser.newContext({baseURL:origin,viewport:{width:1440,height:900}}),page=await context.newPage();settled(page);
  page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(60000);
  await devSignIn(page,open);
  if(observeSetup)for(const width of widths)await observeOperator(page,'setup',width,directory,observations);
  await page.getByLabel('Your name').fill('Opal Operator');await page.getByLabel('Business name').fill('Operator acceptance');
  await page.getByRole('button',{name:'Finish setup',exact:true}).click();await page.waitForURL(origin+'/app');
  fixture=await prepareOperatorFixture(page,browser,origin,await devKey(checkout.root),'operator-owner@example.test');
  assert.ok(fixture,'The native journey must prepare the real fixture');
  await run({page,fixture,origin,directory,observations});
 }finally{
  await fixture?.collaboratorContext.close();await browser?.close();
  if(dev){dev.child.kill('SIGTERM');await dev.exited;}
  await checkout.stop('dev');assert.equal(await listening(port),false);await checkout.close();
 }
}
