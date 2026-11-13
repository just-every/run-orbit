import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect,test } from '@playwright/test';
import { contract } from '../contract.mjs';
import { authenticateOperator } from './operator-session.mjs';
test.beforeEach(async({context})=>{await authenticateOperator(context);});
contract('ACTION-005','an operator sees new evidence and confirms a stale draft without sending',async({page})=>{
 test.setTimeout(120_000);
 await page.goto('/app');
 const fixture=await page.evaluate(async()=>{
  async function api(path,body){const response=await fetch('/api/v1/'+path,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:undefined);const result=await response.json();if(!response.ok)throw new Error(result.error);return result;}
  const inventory=await api('workbench');const unique=crypto.randomUUID();const opportunity=await api('workbench/opportunities',{title:'Stale review journey',companyName:'Review company',contactName:'Review contact',email:`review-${unique}@example.test`,stageId:inventory.stages[0].id,valueCents:100});
  const detail=await api(`opportunities/${opportunity.id}`);const contact=detail.opportunity.contacts[0];
  const draft=await api(`workbench/opportunities/${opportunity.id}/drafts`,{contactId:contact.id,subject:'Reviewed subject',body:'The operator reviewed this exact body.'});
  await api(`workbench/opportunities/${opportunity.id}/events`,{type:'meeting.booked',subject:'Customer booked a new meeting',occurredAt:new Date().toISOString(),eventId:unique,contactId:contact.id});return draft;
 });
 const approvals=[];page.on('request',request=>{if(request.url().endsWith('/approve'))approvals.push(request.url());});
 await page.goto(`/app/drafts/${fixture.id}`);
 await expect(page.getByTestId('stale-review')).toBeVisible();await expect(page.getByTestId('stale-review')).toContainText('Customer booked a new meeting');
 const confirm=page.getByRole('button',{name:'Confirm reviewed draft'});await expect(confirm).toBeDisabled();
 await page.getByLabel('I reviewed the changed evidence, current recipient, subject and body above.').check();await confirm.click();
 await expect(page.getByTestId('stale-review')).toHaveCount(0);
 const persisted=await page.evaluate(async id=>(await (await fetch(`/api/v1/drafts/${id}`)).json()).draft,fixture.id);
 expect(persisted.isStale).toBe(false);expect(persisted.revision).toBe(2);expect(persisted.subject).toBe('Reviewed subject');expect(persisted.body).toBe('The operator reviewed this exact body.');expect(approvals).toEqual([]);

 // A handwritten draft has never authorized a follow-up. Accept a real imported
 // reply's proposals through Capture, as an operator would from Review.
 const unscheduled=await page.evaluate(async()=>{
  const api=async(path,body)=>{const response=await fetch('/api/v1/'+path,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:undefined);if(!response.ok)throw new Error(await response.text());return response.json();};
  const unique=crypto.randomUUID(),inventory=await api('workbench'),email=`maya-${unique}@example.test`;
  const deal=await api('workbench/opportunities',{title:'Imported reply review',companyName:'Reply review company',contactName:'Maya Chen',email,stageId:inventory.stages[0].id,valueCents:100});
  const contact=(await api(`opportunities/${deal.id}`)).opportunity.contacts[0];
  const draft=await api(`workbench/opportunities/${deal.id}/drafts`,{contactId:contact.id,subject:'Handwritten follow-up',body:'Could we discuss your team plan?'});
  return {draftId:draft.id,dealId:deal.id,contactId:contact.id,email,unique};
 });
 const history=async()=>(await (await page.request.get(`/api/v1/workbench/opportunities/${unscheduled.dealId}/messages`)).json()).messages;
 expect(await history()).toEqual([]);
 const subject=`Re: Team plan ${unscheduled.unique}`;
 const reply=['From: Maya Chen <'+unscheduled.email+'>','To: seller@orbit.test','Subject: '+subject,'Date: '+new Date().toUTCString(),'Message-ID: <'+unscheduled.unique+'@example.test>','MIME-Version: 1.0','Content-Type: text/plain; charset=utf-8','','Thanks, can we talk next week?'].join('\r\n');
 await page.goto('/app/settings/capture/connect/files');
 await page.getByLabel('Mail (.eml or mbox) and calendar (.ics) files').setInputFiles({name:'reply.eml',mimeType:'message/rfc822',buffer:Buffer.from(reply)});
 await page.getByRole('button',{name:'Add files',exact:true}).click();
 await expect(page.getByRole('region',{name:'Import result'})).toBeVisible();
 const proposals=(await (await page.request.get('/api/v1/capture/proposals')).json()).proposals.filter(proposal=>proposal.details.evidence.subject===subject);
 expect(proposals.some(proposal=>proposal.kind==='link_signal')).toBe(true);
 expect(proposals.some(proposal=>proposal.kind==='next_action')).toBe(true);
 await page.goto('/app/review');
 for(const proposal of proposals.filter(proposal=>['link_signal','next_action'].includes(proposal.kind))){
  const accepted=page.waitForResponse(response=>response.url().endsWith(`/proposals/${proposal.id}/accept`));
  await page.locator(`#proposal-${proposal.id}`).getByRole('button',{name:'Accept',exact:true}).click();expect((await accepted).ok()).toBe(true);
 }
 await page.goto(`/app/drafts/${unscheduled.draftId}`);
 const review=page.getByTestId('stale-review');await expect(review).toBeVisible();
 expect.soft(await review.locator('p').first().innerText()).toMatch(/repl|respond/i);
 expect.soft(await review.locator('p').first().innerText()).not.toMatch(/cancel|schedul/i);
 const screenshots=process.env.STALE_REVIEW_SCREENSHOT_DIR;
 async function proof(state){if(!screenshots)return;mkdirSync(screenshots,{recursive:true});for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:join(screenshots,`${state}-${width}.png`),fullPage:true});}await page.setViewportSize({width:1440,height:900});}
 await proof('reply');
 await expect(page.getByTestId('save-draft')).toBeDisabled();await expect(page.getByRole('button',{name:'Confirm reviewed draft'})).toBeDisabled();
 expect(await history()).toEqual([]);

 await page.goto(`/app/contacts/${unscheduled.contactId}`);
 const details=page.getByTestId('record-details');
 await details.getByLabel('Email permission',{exact:true}).selectOption('do_not_contact');
 const stopped=page.waitForResponse(response=>response.request().method()==='PATCH'&&response.url().endsWith(`/records/contact/${unscheduled.contactId}`));
 await details.getByRole('group',{name:'Confirm change'}).getByRole('button',{name:'Stop mail',exact:true}).click();expect((await stopped).ok()).toBe(true);
 await page.goto(`/app/drafts/${unscheduled.draftId}`);await expect(review).toBeVisible();
 expect.soft(await review.textContent()).not.toMatch(/do_not_contact/);
 const recipient=review.getByLabel('Confirm the current recipient');
 expect.soft(await recipient.locator('option:checked').textContent()).toMatch(/Do not contact/i);
 await expect(recipient.locator('option:checked')).toHaveJSProperty('disabled',true);await proof('do-not-contact');
 expect(await history()).toEqual([]);expect(approvals).toEqual([]);
});

test('source review loads genuine diagnostics and unmatched reply inventory',async({page})=>{
 const inventory=path=>page.waitForResponse(response=>new URL(response.url()).pathname===path);
 const sources=inventory('/api/v1/sources');await page.goto('/app/settings/capture');expect((await sources).status()).toBe(200);await expect(page.getByRole('heading',{name:'Website and app events'})).toBeVisible();
 const summary=inventory('/api/v1/review/summary');await page.goto('/app/review');expect((await summary).status()).toBe(200);await expect(page.getByRole('heading',{name:'Review',level:1})).toBeVisible();
 const waiting=await (await page.request.get('/api/v1/review/summary')).json(),replies=await page.request.get('/api/v1/sources/replies');expect(replies.status()).toBe(200);expect((await replies.json()).replies.length).toBe(waiting.replies);
 await expect(page.getByRole('heading',{name:'Replies without a thread'})).toHaveCount(waiting.replies?1:0);await expect(page.getByRole('alert')).toHaveCount(0);
});
