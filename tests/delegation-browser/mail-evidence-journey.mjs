import {expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

export async function mailEvidenceJourney(page,data){
 const evidence=resolve(process.env.ORBIT_RECORD_EVIDENCE??'.orbit-viewport-evidence/record-layout');mkdirSync(evidence,{recursive:true});
 await page.setViewportSize({width:1440,height:900});
 for(const [kind,id] of [['opportunities',data.deal],['companies',data.company],['contacts',data.contact]]){
  await page.goto(`/app/${kind}/${id}`);
  const activity=page.getByTestId('record-activity');
  await expect(activity.locator('li').filter({has:page.locator('.r-entry-title',{hasText:data.subject})})).toContainText(/Open.click not tracked/);
  await expect(activity).not.toContainText('not opened');
  for(const [id,label] of [[data.processed,'Accepted by mail provider'],[data.delivered,'Delivery reported by mail provider'],[data.open,'Open reported · inferred'],[data.click,'Link click reported · inferred']]){
   const row=page.locator(`#entry-${id}`);await expect(row).toContainText(label);
   await row.getByText('Recorded details',{exact:true}).click();
   await expect(row).toContainText('Occurred');await expect(row).toContainText('recorded');await expect(row).toContainText(/sendgrid/i);
  }
  for(const id of [data.open,data.click]){const row=page.locator(`#entry-${id}`);await expect(row).toContainText('Inferred, unverified report');await expect(row).toContainText('privacy proxy or automated scanner');}
  const reply=page.locator(`#entry-${data.reply}`);await expect(reply).toContainText('Actual customer reply');await expect(reply).toContainText('Reply');
  await reply.getByText('Recorded details',{exact:true}).click();await expect(reply).toContainText(/sendgrid.*replies/i);await expect(reply).toContainText('Occurred');await expect(reply).toContainText('recorded');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`${evidence}/mail-${kind}-1440.png`,fullPage:true});
  await page.setViewportSize({width:390,height:900});
  await page.screenshot({path:`${evidence}/mail-${kind}-390.png`,fullPage:true});
  await page.setViewportSize({width:1440,height:900});
 }
 await page.close();
}
