import {test,expect} from '@playwright/test';
import {authenticateOperator} from './operator-session.mjs';
test('NOTIFY-002 unread count updates within five seconds and opening a notification persists one read',async({page,context})=>{
 await authenticateOperator(context);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.goto('/app/notifications',{waitUntil:'networkidle'});
  if(width===390)await page.getByRole('button',{name:'Menu',exact:true}).click();
  const before=await(await page.request.get('/api/v1/notifications')).json(),inventory=await(await page.request.get('/api/v1/workbench')).json(),name=`Notification journey ${width} ${Date.now()}`;
  const created=await page.request.post('/api/v1/workbench/opportunities',{headers:{Origin:`http://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}`},data:{title:name,companyName:name,contactName:'Notification contact',email:`notification-${width}-${Date.now()}@example.test`,stageId:inventory.stages[0].id,valueCents:0}});expect(created.status()).toBe(201);
  await expect(page.getByRole('link',{name:`Notifications, ${before.unread+1} unread`})).toBeVisible({timeout:5000});
  if(width===390)await page.getByRole('button',{name:'Menu',exact:true}).click();
  const title=page.getByRole('link',{name,exact:true}),item=page.locator('.notification-list--inbox li').filter({has:title}),mark=item.getByRole('button',{name:'Mark read',exact:true});
  await expect(item).toBeVisible();await title.focus();await expect(title).toBeFocused();await expect(mark).toBeInViewport();await mark.focus();await expect(mark).toBeFocused();await expect(mark).toBeEnabled();
  await title.press('Enter');await expect(page.getByRole('heading',{name,exact:true,level:1})).toBeVisible();
  const readNotification=async()=>(await(await page.request.get('/api/v1/notifications')).json()).notifications.find(row=>row.opportunityTitle===name);
  await expect.poll(async()=>(await readNotification()).readAt).toBeTruthy();
  const after=await(await page.request.get('/api/v1/notifications')).json(),notification=await readNotification();expect(after.unread).toBe(before.unread);
  await page.request.post(`/api/v1/notifications/${notification.id}/read`,{headers:{Origin:`http://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}`}});expect((await(await page.request.get('/api/v1/notifications')).json()).unread).toBe(before.unread);
 }
});
