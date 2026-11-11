import {expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {authenticateOperator} from '../e2e/operator-session.mjs';

/** Follow the same-origin guide and execute its actual rendered console examples, without returning or logging secrets. */
export async function proveIntegrationsApiGuide(page,info){
 await authenticateOperator(page.context(),{owner:true});
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/app/settings/integrations',{waitUntil:'networkidle'});
 const response=await page.request.get('/api/v1/settings/products');
 expect(response.status()).toBe(200);
 const {products}=await response.json();
 for(const product of products){
  const connected=product.state==='connected'||product.state==='receiving';
  for(const name of product.products){
   const key=({'Slack':'slack','Calendly':'calendly','Cal.com':'calcom','Mailchimp':'mailchimp'})[name];
   if(!key)continue;
   const row=page.locator(`[data-product="${key}"]`);
   await expect(row).toBeVisible();
   await expect(row).toContainText(product.job);
   await expect(row.locator('xpath=ancestor::section[1]')).toHaveAttribute('aria-labelledby',connected?'integrations-connected':'integrations-not-connected');
   // Its existing setup action still opens the corresponding inline panel.
   const action=row.getByRole('button').first();await action.click();
   await expect(page.locator(`#integration-${key}`)).toBeVisible();await action.click();
  }
 }
 const calls=await page.request.get('/api/v1/calls/settings');
 const configured=calls.ok()?(await calls.json()).configured:null;
 await expect(page.locator('[data-product="twilio"]').locator('xpath=ancestor::section[1]')).toHaveAttribute('aria-labelledby',configured===null?'integrations-status-unavailable':configured?'integrations-connected':'integrations-not-connected');
 await expect(page.getByRole('region',{name:'API access',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('integrations-1440.png'),fullPage:true});
 await page.getByRole('link',{name:'Create and use a read credential'}).click();
 await expect(page).toHaveURL(/\/docs\/api-credentials$/);
 await expect(page.getByRole('heading',{level:1})).toBeVisible();
 const examples=await page.locator('.docs-prose pre code.language-js').allTextContents();
 expect(examples).toHaveLength(4);
 // Native navigation now uses the session cookie jar; it must not be injected into bearer-only requests.
 await page.context().setExtraHTTPHeaders({});
 const bearerHeaders=[];
 const observed=request=>{if(new URL(request.url()).pathname.startsWith('/api/rest/v1/deals/'))bearerHeaders.push(request.allHeaders().then(headers=>({hasCookie:Boolean(headers.cookie)})));};
 page.on('request',observed);
 const session=await page.context().newCDPSession(page);
 const execute=async expression=>{
  const result=await session.send('Runtime.evaluate',{expression,awaitPromise:true,replMode:true});
  expect(Boolean(result.exceptionDetails),'The guide example executes successfully').toBe(false);
 };
 try{
  // Save only URL paths/status codes. The secret stays within the browser's console scope.
  await page.evaluate(()=>{
   window.guideReceipts=[];const original=window.fetch;
   window.fetch=async(...args)=>{const response=await original(...args);window.guideReceipts.push({path:new URL(response.url).pathname,method:args[1]?.method??'GET',status:response.status});return response;};
  });
  await execute(examples[0]);
  await execute("globalThis.prompt = message => message.includes('operator') ? settings.operators.find(operator => operator.status === 'active' && operator.collaborator === 0).id : deals.records[0].id");
  await execute(examples[1]);
  await execute(examples[2]);
  await execute(examples[3]);
  // Reuse the guide's bearer-only request after revocation. No native cookie accompanies either read.
  await execute("var revokedRead = await fetch('/api/rest/v1/deals/' + encodeURIComponent(dealId) + '?fields=title,expected_close_at,owner_id,products', {credentials:'omit',headers:{Authorization:'Bearer ' + issued.secret}})");
  const receipts=await page.evaluate(()=>window.guideReceipts);
  expect(await Promise.all(bearerHeaders)).toEqual([{hasCookie:false},{hasCookie:false}]);
  expect(receipts.filter(row=>row.path==='/api/v1/settings/api-credentials'&&row.method==='POST').map(row=>row.status)).toEqual([201]);
  expect(receipts.filter(row=>row.path.startsWith('/api/rest/v1/deals/')).map(row=>row.status)).toEqual([200,401]);
  expect(receipts.filter(row=>row.path.endsWith('/revoke')).map(row=>row.status)).toEqual([200]);
  // Metadata never re-discloses the one-time secret.
  await execute("var metadata = await orbitJson('/api/v1/settings/api-credentials'); if (JSON.stringify(metadata).includes(issued.secret)) throw Error('Secret re-disclosed')");
  const receipt=info.outputPath('api-guide-receipt.json');
  await writeFile(receipt,JSON.stringify({receipts,secretReturnedToTest:false,bearerRequestsCarryNativeCookie:false},null,2)+'\n');
  await info.attach('api-guide-receipt.json',{contentType:'application/json',path:receipt});
 }finally{page.off('request',observed);await session.detach();}
 await page.screenshot({path:info.outputPath('api-guide-1440.png'),fullPage:true});
 // Candidate visual proof only; functional assertions run once, at desktop width.
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:info.outputPath('api-guide-390.png'),fullPage:true});
 await page.goto('/app/settings/integrations',{waitUntil:'networkidle'});
 await page.locator('[data-product="slack"]').waitFor();
 await page.screenshot({path:info.outputPath('integrations-390.png'),fullPage:true});
}
