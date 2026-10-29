import { expect,test } from '@playwright/test';
import { contract } from '../contract.mjs';
import { authenticateOperator } from './operator-session.mjs';
test.beforeEach(async({context})=>{await authenticateOperator(context);});
contract('ACTION-005','an operator sees new evidence and confirms a stale draft without sending',async({page})=>{
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
});

test('source review loads genuine diagnostics and unmatched reply inventory',async({page})=>{
 const inventory=path=>page.waitForResponse(response=>new URL(response.url()).pathname===path);
 const sources=inventory('/api/v1/sources');await page.goto('/app/settings/capture');expect((await sources).status()).toBe(200);await expect(page.getByRole('heading',{name:'Website and app events'})).toBeVisible();
 const summary=inventory('/api/v1/review/summary');await page.goto('/app/review');expect((await summary).status()).toBe(200);await expect(page.getByRole('heading',{name:'Review',level:1})).toBeVisible();
 const waiting=await (await page.request.get('/api/v1/review/summary')).json(),replies=await page.request.get('/api/v1/sources/replies');expect(replies.status()).toBe(200);expect((await replies.json()).replies.length).toBe(waiting.replies);
 await expect(page.getByRole('heading',{name:'Replies without a thread'})).toHaveCount(waiting.replies?1:0);await expect(page.getByRole('alert')).toHaveCount(0);
});
