import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {join} from 'node:path';
import {request} from './operator-fixture.mjs';

/** Exercise typed native custom values through the owner API and record editor. */
export async function workflowValuesBrowserJourney({page,fixture,origin,directory},width){
 await page.setViewportSize({width,height:900});

 const settings=await request(page,'/api/v1/settings',undefined,'GET');
 const workspace=settings.workspace,workingHours=JSON.parse(workspace.working_hours_json),freeMailDomains=JSON.parse(workspace.free_mail_domains_json);
 await request(page,'/api/v1/settings',{
  name:workspace.name,timezone:'UTC',currency:workspace.currency,workingHours,
  staleIntervalDays:workspace.stale_interval_days,awaitingResponseWorkingDays:workspace.awaiting_response_working_days,freeMailDomains,
 },'PUT');

 const opportunity=await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET');
 const ownerId=opportunity.record.owner_id;
 assert.ok(ownerId,'Fixture opportunity has a native operator owner for the user field.');
 const definitions=[
  {kind:'contact',fieldKey:'review_checked',label:'Review checked',valueType:'boolean',required:false,unique:false,options:[],archived:false},
  {kind:'contact',fieldKey:'review_operator',label:'Review operator',valueType:'user',required:false,unique:false,options:[],archived:false},
  {kind:'contact',fieldKey:'review_time',label:'Review time',valueType:'datetime',required:false,unique:false,options:[],archived:false},
 ];
 for(const input of definitions){
  const preview=await request(page,'/api/v1/settings/custom-fields/preview',input);
  await request(page,'/api/v1/settings/custom-fields/confirm',{input,reviewHash:preview.reviewHash,confirmed:true});
 }

 const current=await request(page,`/api/v1/records/contact/${fixture.contactId}`,undefined,'GET');
 const savedCustom={...JSON.parse(current.record.custom_fields_json??'{}'),review_checked:true,review_operator:ownerId,review_time:'2026-11-03T15:30:00.000Z'};
 await request(page,`/api/v1/records/contact/${fixture.contactId}`,{
  name:current.record.name,email:current.record.email,phone:current.record.phone,job_title:current.record.job_title,
  timezone:current.record.timezone,company_id:current.record.company_id,contactability:current.record.contactability,
  custom_fields:savedCustom,
 },'PUT');

 // OR4: typed values are quiet fields on the contact's page; a choice saves on change, a time when left.
 await page.goto(`${origin}/app/contacts/${fixture.contactId}`);
 const editor=page.getByTestId('record-details');
 const checked=editor.getByLabel('Review checked',{exact:true}),operator=editor.getByLabel('Review operator',{exact:true}),time=editor.getByLabel('Review time',{exact:true});
 await expect(checked).toBeVisible();await expect(checked).toHaveValue('true');await expect(checked).toHaveJSProperty('tagName','SELECT');
 await expect(operator).toBeVisible();await expect(operator).toHaveValue(ownerId);await expect(operator).toHaveJSProperty('tagName','SELECT');
 await expect(time).toBeVisible();await expect(time).toHaveAttribute('type','datetime-local');await expect(time).toHaveValue('2026-11-03T15:30');

 await time.scrollIntoViewIfNeeded();
 await page.screenshot({path:join(directory,`workflow-values-editor-${width}.png`)});
 await checked.selectOption('false');await operator.selectOption(ownerId);await time.fill('2026-11-04T12:15');await time.press('Enter');
 const smallText=await editor.evaluate(root=>Array.from(root.querySelectorAll('*')).filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&Array.from(el.childNodes).some(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim())&&parseFloat(getComputedStyle(el).fontSize)<13).map(el=>el.tagName));
 assert.deepEqual(smallText,[],'Visible record details text is at least 13px.');
 await expect.poll(async()=>JSON.parse((await request(page,`/api/v1/records/contact/${fixture.contactId}`,undefined,'GET')).record.custom_fields_json).review_time).toBe('2026-11-04T12:15:00.000Z');
 const saved=await request(page,`/api/v1/records/contact/${fixture.contactId}`,undefined,'GET');
 const values=JSON.parse(saved.record.custom_fields_json);
 assert.equal(values.review_checked,false);
 assert.equal(values.review_operator,ownerId);
 assert.equal(values.review_time,'2026-11-04T12:15:00.000Z');

 await page.screenshot({path:join(directory,`workflow-values-saved-${width}.png`)});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Record editor and saved record fit the viewport.');
}
