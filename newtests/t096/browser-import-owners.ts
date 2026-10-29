import assert from 'node:assert/strict';
import {expect,type Browser} from '@playwright/test';
import {accessible,watchBrowser} from './browser-observations';

/** Extend the ownership registration with a real HubSpot-shaped upload and saved owner table. */
export async function importOwnersBrowserJourney(browser:Browser,origin:string,directory:string,cookie:string,receiver:{id:string;cookie:string}){
 const context=await browser.newContext({baseURL:origin,viewport:{width:1440,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:cookie}}),errors=watchBrowser(context),page=await context.newPage();
 try{
  await page.goto('/app/settings/data/import');await page.getByLabel('HubSpot CSV',{exact:true}).check();
  await page.getByLabel('Contacts',{exact:true}).setInputFiles({name:'contacts.csv',mimeType:'text/csv',buffer:Buffer.from('Record ID,First Name,Email,Contact owner\r\n723,Synthetic import contact,synthetic-orbit-723@ownership.test,Former rep\r\n724,Second import contact,synthetic-orbit-724@ownership.test,Former rep')});
  await page.getByLabel('Companies',{exact:true}).setInputFiles({name:'companies.csv',mimeType:'text/csv',buffer:Buffer.from('Record ID,Company name,Company owner\r\n725,Synthetic import company,Former rep')});
  await page.getByRole('button',{name:'Review dry run',exact:true}).click();
  await expect(page.getByRole('group',{name:'Import owner mapping'})).toContainText('Former rep · 3 rows');
  await page.getByLabel('Owner for Former rep',{exact:true}).selectOption(receiver.id);
  await accessible(page,'import-owner-mapping-1440',directory);
  await page.setViewportSize({width:390,height:1000});await page.screenshot({path:`${directory}/import-owner-mapping-390.png`,fullPage:true});await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:'Run dry run',exact:true}).click();
  await expect(page.getByRole('region',{name:'Reviewed import owners'})).toContainText('Former rep · 3 rows → Jordan Reyes');
  await expect(page.getByRole('list',{name:'Dry run row results'})).toContainText('Owner: Unassigned → Jordan Reyes');
  await accessible(page,'import-owner-review-1440',directory);
  await page.setViewportSize({width:390,height:1000});await page.screenshot({path:`${directory}/import-owner-review-390.png`,fullPage:true});await page.setViewportSize({width:1440,height:1000});
  await page.getByLabel('I checked these rows, including any that will not import and any marked Do not contact.').check();
  await page.getByRole('button',{name:'Apply reviewed import',exact:true}).click();await expect(page.getByRole('heading',{name:'Import complete',exact:true})).toBeVisible();
  await page.reload();await page.locator('.crm-history article').first().getByRole('button',{name:'Open review',exact:true}).click();await expect(page.getByRole('region',{name:'Reviewed import owners'})).toContainText('Jordan Reyes');
  const recipient=await browser.newContext({baseURL:origin,viewport:{width:1440,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:receiver.cookie}});
  try{const inbox=await recipient.newPage();await inbox.goto('/app/notifications');await inbox.getByLabel('Notification type',{exact:true}).selectOption('assignment');const notice=inbox.locator('.notification-list--inbox li').filter({hasText:'Synthetic import company'});await expect(notice).toHaveCount(1);await expect(notice).toContainText('Synthetic import contact');await accessible(inbox,'import-owner-notices-1440',directory);await inbox.setViewportSize({width:390,height:1000});await inbox.screenshot({path:`${directory}/import-owner-notices-390.png`,fullPage:true});const notifications=await(await recipient.request.get('/api/v1/notifications')).json();assert.equal(notifications.notifications.filter((item:any)=>item.message.includes('Synthetic import company')).length,1);}finally{await recipient.close();}
  await errors.check(directory,'import-owners');
 }finally{await context.close();}
}
