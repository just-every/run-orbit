import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {agentOverviewProof} from './overview-proof.mjs';

export async function agentOverviewBrowser(input) {
 const proof=await agentOverviewProof(input);
 const directory=resolve(process.env.ORBIT_AGENT_OVERVIEW_EVIDENCE??'verification/agent-overview');
 await mkdir(directory,{recursive:true});
 const browser=await chromium.launch({headless:true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),
  args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  // Send each browser request to the same emitted Worker used by conformance.
  await context.route(input.origin+'/**',async route=>{
   const request=route.request();
   const response=await input.request(request.url(),{method:request.method(),headers:{...request.headers(),Cookie:input.cookie},
    ...(['GET','HEAD'].includes(request.method())?{}:{body:request.postDataBuffer()})});
   await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(input.origin+'/agents');
  await expect(page.locator('[data-agents-count]').first()).toBeVisible();
  const groups=await page.locator('[data-agents-count]').evaluateAll(cells=>cells.map(cell=>
   [JSON.stringify([cell.dataset.class,cell.dataset.decision]),Number(cell.textContent)]).sort());
  assert.deepEqual(groups,proof.groups,'the built overview displays every reconciled class and decision group');
  for(const call of input.calls.filter(call=>call.review)) {
   const item=page.locator(`[data-review-id="${call.review}"]`);
   await expect(item).toBeVisible();
   await expect(item).toContainText(call.title);
   await expect(item.locator('[data-review-action="reviewed"]')).toBeVisible();
   await expect(item.locator('[data-review-action="flag"]')).toBeVisible();
  }
  const capture=[];
  for(const width of [1440,390]) {
   await page.setViewportSize({width,height:1000});
   await page.screenshot({path:resolve(directory,`overview-${width}.png`),fullPage:true});
   capture.push(await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,
    minTextSize:Math.min(...[...document.querySelectorAll('main *')].filter(element=>element.childNodes.length&&[...element.childNodes].some(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim())).map(element=>parseFloat(getComputedStyle(element).fontSize))),
    unnamedControls:[...document.querySelectorAll('button,a')].filter(element=>!element.textContent.trim()&&!element.getAttribute('aria-label')).length})));
  }
  assert.deepEqual(errors,[],'the populated overview has no browser runtime error');
  await writeFile(resolve(directory,'receipt.json'),JSON.stringify({proof:'SURFACE-011.internal-task-overview',
   calls:input.calls,auditRows:proof.rows.length,pages:proof.pages,since:new Date(proof.since).toISOString(),groups:proof.groups,capture},null,2)+'\n');
 } finally {await browser.close();}
}
