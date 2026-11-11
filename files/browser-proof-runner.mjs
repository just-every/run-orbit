import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium,expect} from '/workspace/run-orbit/node_modules/@playwright/test/index.mjs';
import {devSignIn} from '/workspace/run-orbit/tests/rer/operator-fixture.mjs';
const packet=process.env.HOME+'/rer-consolidation/work/main-orbit-forms-compile-1/packet';
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 const open=/^RER_OPEN (\S+)$/m.exec(await readFile('/tmp/orbit-dev.log','utf8'))?.[1];assert.ok(open);await devSignIn(page,open);
 await page.goto('http://127.0.0.1:8787/app/settings/forms');
 const row=page.locator('.fold-row').filter({has:page.getByRole('heading',{name:'Synthetic Orbit form',exact:true})});
 await expect(row.getByRole('button',{name:'Compile form',exact:true})).toBeEnabled();
 await page.reload();await row.getByRole('button',{name:'Compile form',exact:true}).waitFor();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  await row.scrollIntoViewIfNeeded();await page.screenshot({path:packet+`/after-saved-forms-${width}.png`,fullPage:true});
 }
 await row.getByRole('button',{name:'Compile form',exact:true}).click();await expect(page.getByLabel('Public path',{exact:true})).toBeFocused();
 await expect(page.getByLabel('Page heading',{exact:true})).toHaveValue('Talk about your rollout');
 await page.getByLabel('Public path',{exact:true}).fill('synthetic-orbit-compile');
 const response=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname.endsWith('/forms/compile'));
 await page.getByRole('button',{name:'Compile saved revision',exact:true}).click();const compiled=await response;assert.equal(compiled.status(),200);const result=await compiled.json();assert.equal(result.formRevision,1);
 const review=page.getByRole('region',{name:'Compiled page review'});await expect(review).toBeVisible();await expect(page.frameLocator('iframe[title="Compiled landing page preview"]').getByRole('heading',{name:'Talk about your rollout',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Approve reviewed page',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Publish approved page',exact:true})).toBeDisabled();
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await review.scrollIntoViewIfNeeded();await page.screenshot({path:packet+`/after-compiled-forms-${width}.png`,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await writeFile(packet+'/browser-proof.json',JSON.stringify({status:'passed',route:'/app/settings/forms',widths:[1440,390],reloadCompileEntry:true,editNotRequired:true,selectedRevision:result.formRevision,compileStatus:compiled.status(),previewHeading:'Talk about your rollout',approvalRequired:true,publicationDisabledBeforeApproval:true,horizontalOverflow:false},null,2)+'\n');
 console.log('Candidate browser proof passed at 1440 and 390; saved revision compiled without Edit; approval still required.');
}finally{await browser.close();}
