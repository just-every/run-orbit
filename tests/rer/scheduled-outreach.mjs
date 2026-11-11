import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {expect} from '@playwright/test';
import {browserAPI} from './browser-api.mjs';

/** A fresh hosted timer must not block exact approval or hide when a send is due. */
export async function scheduleOutreach(page,opportunityURL,evidence,submissions){
 const width=page.viewportSize().width;
 const opportunityId=new URL(opportunityURL).pathname.split('/').at(-1);
 const messagesPath=`/api/v1/workbench/opportunities/${opportunityId}/messages`;
 // Keep these two fields on the same calendar, even when the browser's clock differs.
 await page.goto(new URL('/app/settings/workspace',opportunityURL).href);
 const savedZone=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/settings'&&response.request().method()==='PUT');
 await page.getByLabel('Time zone',{exact:true}).selectOption('America/Chicago');
 assert.equal((await savedZone).status(),200);
 await page.goto(opportunityURL);
 const close=page.getByLabel('Expected close',{exact:true});
 await close.fill('04/11/2027');await close.press('Enter');
 if(width===1440)await expect(close).toHaveValue('04/11/2027');
 const recordPath=`/api/v1/records/opportunity/${opportunityId}`;
 const readClose=async()=>(await browserAPI(page,recordPath)).record.expected_close_at;
 if(width===1440){
  await expect(close).toHaveAttribute('placeholder','mm/dd/yyyy');
  await expect.poll(readClose).toBe('2027-04-11T05:00:00.000Z');
  // Invalid calendar dates must never roll over into a different saved day.
  await close.fill('02/30/2027');await close.press('Enter');
  await expect(page.getByText('Enter a date as mm/dd/yyyy.',{exact:true})).toBeVisible();
  assert.equal(await readClose(),'2027-04-11T05:00:00.000Z');
  await close.press('Escape');
 }
 await page.reload({waitUntil:'networkidle'});
 if(width===1440)await expect(close).toHaveValue('04/11/2027');
 const closeReadback={typed:'04/11/2027',display:await close.inputValue(),api:await readClose()};
 await dateProof(page,evidence,'us-date-deal',width);
 const before=await browserAPI(page,messagesPath);
 assert.equal(before.scheduler.lastRunAt,null,'An ordinary request does not claim that Cloudflare ran its timer');
 assert.equal(before.scheduler.ready,false);
 const {opportunity}=await browserAPI(page,`/api/v1/opportunities/${opportunityId}`);
 const contact=opportunity.contacts[0],subject='Your scheduled walkthrough',body='Hi Maya, here are the details for your team walkthrough.';
 const draft=await browserAPI(page,`/api/v1/workbench/opportunities/${opportunityId}/drafts`,'POST',{contactId:contact.id,subject,body});
 const {draft:savedDraft}=await browserAPI(page,`/api/v1/drafts/${draft.id}`);
 const submitted=submissions.length;
 await page.goto(new URL(`/app/drafts/${draft.id}`,opportunityURL).href);
 const approval=page.locator('#send-approval');
 await expect(approval).toContainText(contact.email);
 await expect(approval).toContainText(subject);
 await expect(approval).toContainText(body);
 // A future January weekday at 10:00 Chicago is 16:00 UTC. The contact has no
 // separate timezone, so scheduling and the displayed date share the workspace clock.
 const requested=new Date(Date.UTC(new Date().getUTCFullYear()+1,0,11,16));
 while([0,6].includes(requested.getUTCDay()))requested.setUTCDate(requested.getUTCDate()+1);
 const requestedAt=requested.toISOString(),typed=`01/${String(requested.getUTCDate()).padStart(2,'0')}/${requested.getUTCFullYear()} 10:00`;
 const schedule=approval.getByLabel(/Schedule for later/);
 if(width===1440)await expect(schedule).toHaveAttribute('placeholder','mm/dd/yyyy HH:mm');
 await schedule.fill(typed);
 const previewResponse=page.waitForResponse(response=>new URL(response.url()).pathname===`/api/v1/workbench/drafts/${draft.id}/approval-preview`);
 await approval.getByRole('button',{name:'Review schedule for exact revision',exact:true}).click();
 const response=await previewResponse;assert.equal(response.status(),200);
 const preview=await response.json();
 assert.equal(preview.requestedAt,requestedAt);
 assert.equal(preview.scheduledAt,requestedAt,'The permitted requested time is preserved');
 // The reviewed time identifies the exact permitted instant that approval saves.
 const reviewedTime=approval.getByRole('alert').locator('strong time');
 await expect(reviewedTime).toBeVisible();
 await expect(reviewedTime).toHaveAttribute('datetime',preview.scheduledAt);
 if(width===1440){
  const display=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'numeric',minute:'2-digit'}).format(requested);
  await expect(reviewedTime).toHaveText(display);
 }

 assert.equal((await browserAPI(page,messagesPath)).messages.some(message=>message.draftId===draft.id),false,'Schedule preview does not approve a send');
 await dateProof(page,evidence,'schedule-approval-preview',width);
 const reviewedDisplay=await reviewedTime.textContent();
 const approvedResponse=page.waitForResponse(response=>new URL(response.url()).pathname===`/api/v1/workbench/drafts/${draft.id}/approve`&&response.request().method()==='POST');
 await approval.getByRole('button',{name:'Approve and schedule exact revision',exact:true}).click();
 const approved=await approvedResponse;assert.equal(approved.status(),200);
 const scheduled=await approved.json();
 assert.equal(scheduled.state,'scheduled');assert.equal(scheduled.scheduledAt,preview.scheduledAt);
 assert.deepEqual(approved.request().postDataJSON(),{revision:savedDraft.revision,scheduledAt:requestedAt,scheduledAtConfirmation:preview.scheduledAt});
 await expect(page.getByTestId('draft-editor').locator('time')).toHaveAttribute('datetime',preview.scheduledAt);
 await page.goto(opportunityURL);
 // OR3: the deal's Activity holds the message in its own line (to whom, when it will send, to the instant) and says
 // first how due sends go out.
 const history=page.getByTestId('record-activity'),message=history.locator('li').filter({has:page.getByText(subject,{exact:true})});
 await expect(message).toContainText(`To ${contact.name??contact.email}`);
 await expect(message).toContainText('Scheduled');
 await expect(message.locator('time')).toHaveAttribute('datetime',preview.scheduledAt);
 const startup=history.getByRole('status');
 await expect(startup).toContainText(/Cloudflare has not started its timer/);
 await expect(startup).toContainText(/Due sends go out when Orbit is next used/);
 const saved=(await browserAPI(page,messagesPath)).messages.find(message=>message.id===scheduled.id);
 assert.deepEqual({subject:saved.subject,body:saved.body,recipientEmail:saved.recipientEmail,scheduledAt:saved.scheduledAt},{subject,body,recipientEmail:contact.email,scheduledAt:preview.scheduledAt});
 assert.equal(submissions.length,submitted,'Scheduling future mail never submits it early');
 await page.screenshot({path:`${evidence}/scheduled-outreach-${width}.png`,fullPage:true});
 const cancelled=page.waitForResponse(response=>new URL(response.url()).pathname===`/api/v1/workbench/messages/${scheduled.id}/cancel`&&response.request().method()==='POST');
 await message.getByRole('button',{name:'Cancel scheduled message',exact:true}).click();
 assert.equal((await cancelled).status(),200);
 await expect(message.getByRole('button',{name:'Cancel scheduled message',exact:true})).toHaveCount(0);
 assert.equal((await browserAPI(page,messagesPath)).messages.find(message=>message.id===scheduled.id).state,'cancelled');
 assert.equal(submissions.length,submitted,'Cancellation does not submit the scheduled mail');
 await expect(message).toContainText('cancelled');
 await page.screenshot({path:`${evidence}/cancelled-outreach-${width}.png`,fullPage:true});
 if(width===1440){
  // A separate synthetic fixture context exercises a real British browser locale.
  // Its native test sign-in stays in memory; no real browser profile is read.
  await page.goto(new URL('/app/settings/workspace',opportunityURL).href);
  const changed=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/settings'&&response.request().method()==='PUT');
  await page.getByLabel('Time zone',{exact:true}).selectOption('Europe/London');assert.equal((await changed).status(),200);
  const british=await page.context().browser().newContext({locale:'en-GB',viewport:{width:1440,height:900},ignoreHTTPSErrors:true,storageState:await page.context().storageState()});
  try{
   const britishPage=await british.newPage();await britishPage.goto(opportunityURL,{waitUntil:'networkidle'});
   const britishClose=britishPage.getByLabel('Expected close',{exact:true});
   await expect(britishClose).toHaveAttribute('placeholder','dd/mm/yyyy');
   await britishClose.fill('04/11/2027');await britishClose.press('Enter');
   const readBritish=async()=>(await browserAPI(britishPage,recordPath)).record.expected_close_at;
   await expect.poll(readBritish).toBe('2027-11-04T00:00:00.000Z');
   await britishPage.reload({waitUntil:'networkidle'});await expect(britishClose).toHaveValue('04/11/2027');
   await writeFile(`${evidence}/date-roundtrip.json`,JSON.stringify({width,locale:'en-US',workspaceTimezone:'America/Chicago',close:closeReadback,invalidDayRejected:'02/30/2027',schedule:{typed,requestedAt:preview.requestedAt,reviewedAt:preview.scheduledAt,savedAt:saved.scheduledAt,displayed:reviewedDisplay},british:{locale:await britishPage.evaluate(()=>navigator.language),display:await britishClose.inputValue(),api:await readBritish()}},null,2)+'\n');
  }finally{await british.close();}
 }
}

/** Assert the journey at desktop width; retain the changed screens once at each width. */
async function dateProof(page,evidence,name,width){
 await page.screenshot({path:`${evidence}/${name}-${width}.png`,fullPage:true});
 if(width===1440){
  await page.setViewportSize({width:390,height:900});
  await page.screenshot({path:`${evidence}/${name}-390.png`,fullPage:true});
  await page.setViewportSize({width:1440,height:900});
 }
}
