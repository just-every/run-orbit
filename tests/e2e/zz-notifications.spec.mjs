import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {authenticateOperator} from './operator-session.mjs';
test('NOTIFY-002 direct actions stay silent while another person updates the badge within five seconds and opening persists one read',async({page,context,browser})=>{
 test.setTimeout(90_000);
 const person=await authenticateOperator(context),colleague=await browser.newContext();
 try{
  await authenticateOperator(colleague,{colleague:true});
  const origin=`http://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}`,headers={Origin:origin};
  await page.goto('/app/notifications',{waitUntil:'networkidle'});
  const before=await(await page.request.get('/api/v1/notifications')).json(),inventory=await(await page.request.get('/api/v1/workbench')).json(),name=`Notification journey ${Date.now()}`;
  const created=await page.request.post('/api/v1/workbench/opportunities',{headers,data:{title:`Own ${name}`,companyName:name,contactName:'Notification contact',email:`notification-${Date.now()}@example.test`,stageId:inventory.stages[0].id,valueCents:0}});expect(created.status()).toBe(201);
  expect((await(await page.request.get('/api/v1/notifications')).json()).unread).toBe(before.unread);
  const other=await colleague.request.post(origin+'/api/v1/records/opportunity',{headers,data:{title:name,stage_id:inventory.stages[0].id,owner_id:person.operatorId,value_cents:0}});expect(other.status()).toBe(201);
  const {id}=await other.json();
  const event={type:'meeting.booked',subject:'Another person recorded an enquiry',occurredAt:new Date().toISOString(),eventId:`synthetic-orbit-${Date.now()}`};
  expect((await colleague.request.post(origin+`/api/v1/workbench/opportunities/${id}/events`,{headers,data:event})).status()).toBe(201);
  await expect(page.getByRole('link',{name:`Notifications, ${before.unread+1} unread`})).toBeVisible({timeout:5000});
  const title=page.getByRole('link',{name,exact:true}),item=page.locator('.notification-list--inbox li').filter({has:title}),mark=item.getByRole('button',{name:'Mark read',exact:true});
  await expect(item).toBeVisible();await title.focus();await expect(title).toBeFocused();await expect(mark).toBeInViewport();await mark.focus();await expect(mark).toBeFocused();await expect(mark).toBeEnabled();
  const inbox=await(await page.request.get('/api/v1/notifications')).json();expect(inbox.unread).toBe(inbox.notifications.filter(row=>!row.readAt).length);
  if(process.env.ORBIT_NOTIFICATION_PROOF_DIR){
   await mkdir(process.env.ORBIT_NOTIFICATION_PROOF_DIR,{recursive:true});
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    await page.screenshot({path:`${process.env.ORBIT_NOTIFICATION_PROOF_DIR}/notifications-${width}.png`,fullPage:true});
   }
   await page.setViewportSize({width:1440,height:900});
  }
  await title.press('Enter');await expect(page.getByRole('heading',{name,exact:true,level:1})).toBeVisible();
  const readNotification=async()=>(await(await page.request.get('/api/v1/notifications')).json()).notifications.find(row=>row.opportunityTitle===name);
  await expect.poll(async()=>(await readNotification()).readAt).toBeTruthy();
  const notification=await readNotification();expect((await(await page.request.get('/api/v1/notifications')).json()).unread).toBe(before.unread);
  await page.request.post(`/api/v1/notifications/${notification.id}/read`,{headers});expect((await(await page.request.get('/api/v1/notifications')).json()).unread).toBe(before.unread);
 }finally{await colleague.close();}
});
