import {importOwnersBrowserJourney} from './browser-import-owners';
import assert from 'node:assert/strict';
import type {Browser} from '@playwright/test';
import {expect} from '@playwright/test';
import {accessible,watchBrowser} from './browser-observations';

/** Native record ownership and the same bulk review at both supported widths. */
export async function ownershipBrowserJourney(browser:Browser,origin:string,directory:string,cookie:string,receiver:{id:string;cookie:string}) {
 for(const width of [1440,390]) {
  const context=await browser.newContext({baseURL:origin,viewport:{width,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:cookie}}),errors=watchBrowser(context),page=await context.newPage();
  try {
   async function create(path:string,body:unknown):Promise<any> {
    const response=await context.request.post(`/api/v1/${path}`,{data:body,headers:{Origin:origin}});assert.ok(response.ok(),await response.text());return response.json();
   }
   const owner={id:receiver.id};
   const company=await create('records/company',{name:`Northstar Manufacturing ${width}`,primary_domain:`northstar-${width}.example`});
   const contact=await create('records/contact',{name:`Morgan Chen ${width}`,email:`synthetic-orbit-buyer-${width}@northstar.example`,job_title:'Operations director',company_id:company.id});
   for(const [kind,id,name]of [['contact',contact.id,`Morgan Chen ${width}`],['company',company.id,`Northstar Manufacturing ${width}`]]) {
    // OR3: a record's one owner is a value on its page; choosing runs the reviewed assignment in one go.
    await page.goto(`/app/${kind==='company'?'companies':'contacts'}/${id}`);
    await expect(page.getByRole('heading',{name,exact:true,level:1})).toBeVisible();
    const details=page.getByTestId('record-details'),ownerField=details.getByLabel('Owner',{exact:true});
    await expect(ownerField).toHaveValue('');
    await ownerField.selectOption(owner.id);
    await expect(details.getByRole('status').filter({hasText:'Saved'})).toBeVisible();
    await expect.poll(async()=>(await(await context.request.get(`/api/v1/records/${kind}/${id}`)).json()).ownership.ownerId).toBe(owner.id);
    await expect(ownerField).toHaveValue(owner.id);
    const ownerEntry=page.locator('li[id^="entry-"]').filter({hasText:'Jordan Reyes'});await expect(ownerEntry).toHaveCount(1);await ownerEntry.getByText('Recorded details',{exact:true}).click();await expect(ownerEntry.getByText('Jordan Reyes',{exact:true}).first()).toBeVisible();
    await accessible(page,`ownership-${kind}-assigned-${width}`,directory);
   }
   await page.goto('/app/contacts');
   await expect(page.getByRole('checkbox',{name:`Select Morgan Chen ${width}`,exact:true})).toBeVisible();
   await page.getByRole('checkbox',{name:`Select Morgan Chen ${width}`,exact:true}).check();
   const review=page.getByRole('region',{name:'Record ownership'});
   await review.getByLabel('New owner',{exact:true}).selectOption('');
   await review.getByRole('button',{name:'Review assignment',exact:true}).click();
   await expect(review.getByRole('button',{name:'Apply assignment',exact:true})).toBeEnabled();
   await accessible(page,`ownership-bulk-review-${width}`,directory);
   await review.getByRole('button',{name:'Apply assignment',exact:true}).click();
   await expect(review.getByRole('button',{name:'Undo assignment',exact:true})).toBeEnabled();
   await review.getByRole('button',{name:'Undo assignment',exact:true}).click();
   await expect(review.getByText('Previous owner restored',{exact:true})).toBeVisible();
   await accessible(page,`ownership-bulk-undone-${width}`,directory);
   const response=await context.request.get(`/api/v1/records/contact/${contact.id}`);assert.equal((await response.json()).ownership.ownerId,owner.id);
   const recipient=await browser.newContext({baseURL:origin,viewport:{width,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:receiver.cookie}});
   try {
    const inbox=await recipient.newPage();await inbox.goto('/app/notifications');
    await inbox.getByLabel('Notification type',{exact:true}).selectOption('assignment');
    await expect(inbox.locator('.notification-list').first()).toContainText(`Morgan Chen ${width}`);
    const href=`/app/contacts/${contact.id}`,notifications=await(await recipient.request.get('/api/v1/notifications')).json(),notification=notifications.notifications.find((item:any)=>item.kind==='record.assigned'&&item.href===href);
    assert.ok(notification);assert.equal(notification.recordTitle,`Morgan Chen ${width}`);await inbox.locator('.notification-list--inbox li').filter({has:inbox.locator(`a[href="${href}"]`)}).first().getByRole('link').click();
    await expect(inbox.getByRole('heading',{name:`Morgan Chen ${width}`,exact:true,level:1})).toBeVisible();
    await expect.poll(async()=>(await(await recipient.request.get('/api/v1/notifications')).json()).notifications.find((item:any)=>item.id===notification.id)?.readAt).toBeTruthy();
    await accessible(inbox,`ownership-notifications-${width}`,directory);
   } finally {await recipient.close();}
   await errors.check(directory,`ownership-${width}`);
  } finally {await context.close();}
 }
 await importOwnersBrowserJourney(browser,origin,directory,cookie,receiver);
}
