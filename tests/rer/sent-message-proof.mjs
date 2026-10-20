import assert from 'node:assert/strict';
import {expect} from '@playwright/test';

/** Approval and its saved message stay equal to the bytes handed to the paid transport. */
export async function sentMessageProof(page,approval,{recipient,subject,body}){
 const response=await approval;assert.equal(response.status(),200);assert.equal((await response.json()).state,'accepted');
 const sent=page.getByTestId('sent-message');
 for(let reload=0;reload<2;reload++){
  if(reload)await page.reload();
  await expect(sent).toBeVisible();
  assert.deepEqual(await sent.locator('dd').allTextContents(),[recipient,subject,body]);
 }
}
export const approvalResponse=page=>page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/approve')&&response.request().method()==='POST');
