import {expect} from '@playwright/test';
import {join} from 'node:path';

/** Existing Capture registration also operates its real native security approval. */
export async function captureRotationApprovalScreens({page,screenshots}){
 const before=await (await page.request.get('/api/v1/capture/forward')).json();
 const sources=await (await page.request.get('/api/v1/capture/sources')).json();
 const source=sources.sources.find(item=>item.id==='capture-forward');
 expect(source.captured_count).toBeGreaterThan(0);
 const approvals=await (await page.request.get('/agents/api/approvals')).json();
 const pending=approvals.approvals.find(item=>item.tool==='orbit.capture.address_rotate'&&item.state==='pending');
 expect(pending).toBeTruthy();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await page.goto('/app/settings/capture',{waitUntil:'networkidle'});
  await page.screenshot({path:join(screenshots,`capture-address-source-${width}.png`),fullPage:true});
  await page.goto('/agents/approvals/'+pending.id,{waitUntil:'networkidle'});
  if(width===1440){
   await expect(page.getByRole('heading',{name:'Rotate the private Orbit address',exact:true})).toBeVisible();
   await expect(page.locator('[data-approval-summary]')).toContainText('Captured evidence is preserved');
   await expect(page.locator('body')).not.toContainText(before.address);
   await expect(page.getByRole('button',{name:'Approve',exact:true})).toBeVisible();
   expect((await (await page.request.get('/api/v1/capture/forward')).json()).address).toBe(before.address);
  }
  await page.screenshot({path:join(screenshots,`capture-address-approval-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:1440,height:900});
 const approved=page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/approve')&&response.request().method()==='POST');
 await page.getByRole('button',{name:'Approve',exact:true}).click();
 expect((await approved).status()).toBe(200);
 await expect(page.locator('[data-approval-state]')).toHaveAttribute('data-approval-state','executed');
 const after=await (await page.request.get('/api/v1/capture/forward')).json();
 expect(after.address).not.toBe(before.address);
 const current=(await (await page.request.get('/api/v1/capture/sources')).json()).sources.find(item=>item.id==='capture-forward');
 expect(current.captured_count).toBe(source.captured_count);expect(current.proposals_waiting).toBe(source.proposals_waiting);
}
