import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium,expect} from '/workspace/run-orbit/node_modules/@playwright/test/index.mjs';
import {devSignIn} from '/workspace/run-orbit/tests/rer/operator-fixture.mjs';
import {readFile} from 'node:fs/promises';
const packet=process.env.HOME+'/rer-consolidation/work/main-orbit-forms-compile-1/packet';
const origin='http://127.0.0.1:8787';
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 const open=/^RER_OPEN (\S+)$/m.exec(await readFile('/tmp/orbit-dev.log','utf8'))?.[1];
 assert.ok(open,'Dev must provide its public sign-in door');await devSignIn(page,open);
 if(new URL(page.url()).pathname==='/setup'){
  await page.getByLabel('Your name').fill('Synthetic Orbit Operator');await page.getByLabel('Business name').fill('Synthetic Orbit');
  await page.getByRole('button',{name:'Finish setup',exact:true}).click();await page.waitForURL(origin+'/app');
 }
 await page.goto(origin+'/app/settings/forms');
 await page.getByLabel('Page title',{exact:true}).fill('Synthetic Orbit consultation');
 await page.getByLabel('Page heading',{exact:true}).fill('Talk about your rollout');
 await page.getByLabel('Form title',{exact:true}).fill('Synthetic Orbit form');
 await page.getByLabel('Page text',{exact:true}).fill('Share your details for a consultation.');
 await page.getByRole('button',{name:'Save form text',exact:true}).click();
 await expect(page.getByRole('button',{name:'Compile saved revision',exact:true})).toBeEnabled();
 await page.reload();
 await expect(page.getByRole('button',{name:'Edit saved form',exact:true})).toBeVisible();
 assert.equal(await page.getByRole('button',{name:'Compile saved revision',exact:true}).count(),0);
 const actions=await page.locator('.fold-row').filter({has:page.getByRole('heading',{name:'Synthetic Orbit form',exact:true})}).getByRole('button').allTextContents();
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:packet+`/before-forms-${width}.png`,fullPage:true});}
 await page.getByRole('button',{name:'Edit saved form',exact:true}).click();
 await expect(page.getByRole('button',{name:'Compile saved revision',exact:true})).toBeEnabled();
 await writeFile(packet+'/reproduction.json',JSON.stringify({status:'reproduced',baseHead:process.env.ORBIT_BASE_HEAD,route:'/app/settings/forms',savedCompileVisible:true,reloadedCompileVisible:false,reloadedActions:actions,editRevealsCompile:true,widths:[1440,390]},null,2)+'\n');
 console.log('Reproduced: saving shows compile; reload hides it; Edit saved form reveals it.');
}finally{await browser.close();}
