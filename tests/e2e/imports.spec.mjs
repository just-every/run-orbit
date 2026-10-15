import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {authenticateOperator} from './operator-session.mjs';
import {crmFixture} from '../support/crm-fixtures.ts';
const names={contact:'Contacts',company:'Companies',deal:'Deals',note:'Notes',suppression:'Do not contact list'};
test('RECORD-008 reviewed vendor files and plain CSV import and undo through the responsive native wizard',async({page,context},info)=>{
 test.setTimeout(240_000);await authenticateOperator(context);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const screenshots=process.env.IMPORT_SCREENSHOT_DIR??info.outputPath('visual');mkdirSync(screenshots,{recursive:true});
 await page.setViewportSize({width:1440,height:1024});await page.goto('/app/imports');await expect(page.getByRole('heading',{name:'Move in your customer records'})).toBeVisible();
 await page.screenshot({path:join(screenshots,'desktop-upload.png'),fullPage:true});
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByLabel('Do not contact list',{exact:true})).toBeAttached();await page.screenshot({path:join(screenshots,`viewport-${width}-upload.png`),fullPage:true});const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(accessibility.violations).toEqual([]);}
 const settingsResponse=await page.request.get('/api/v1/settings');expect(settingsResponse.ok()).toBe(true);const settings=await settingsResponse.json();
 for(const width of [1440,390])for(const vendor of ['hubspot','pipedrive','csv']){
  await page.setViewportSize({width,height:900});
  const spreadsheetRows=['csv-0@example.test,Spreadsheet Person,Spreadsheet Company','csv-1@example.test,Spreadsheet Person,Another Company','csv-2@example.test,Spreadsheet Person,',...Array.from({length:6},(_,index)=>`csv-extra-${index}@example.test,Extra Person ${index},Spreadsheet Company`),'invalid-email,Rejected Person,'];
  const source=vendor==='csv'?{vendor,files:[{kind:'contact',name:'csv-contact.csv',csv:['email,name,company',...spreadsheetRows].join('\r\n')}]}:crmFixture(vendor,settings.stages[0].id,3);source.account=`Browser ${vendor} ${width} ${Date.now()}`;
  await page.getByRole('radio',{name:vendor==='csv'?'Generic CSV':vendor==='hubspot'?'HubSpot CSV':'Pipedrive CSV'}).check();
  for(const file of source.files)await page.getByLabel(names[file.kind],{exact:true}).setInputFiles({name:file.name,mimeType:'text/csv',buffer:Buffer.from(file.csv)});
  await page.getByRole('button',{name:'Review dry run',exact:true}).click();await page.getByLabel('Source account label').fill(source.account);
  const contactMapping=page.locator('details').filter({has:page.getByText(`${vendor}-contact.csv — contact columns`,{exact:true})});if(vendor==='csv'){await expect(contactMapping.getByLabel('id',{exact:true})).toHaveValue('');await expect(contactMapping.getByLabel('email',{exact:true})).toHaveValue('email');await expect(contactMapping.getByLabel('name',{exact:true})).toHaveValue('name');await expect(contactMapping.getByLabel('company name',{exact:true})).toHaveValue('company');}else await contactMapping.getByLabel('permission',{exact:true}).selectOption('Marketing status');
  if(vendor!=='csv')await page.getByRole('combobox',{name:'Qualified',exact:true}).selectOption(settings.stages[0].id);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Run dry run',exact:true}).click();await expect(page.getByRole('heading',{name:'Review your dry run',exact:true})).toBeVisible();if(vendor!=='csv')await expect(page.locator('.crm-results')).toContainText('occurrence time');
  if(vendor==='csv'){
   const results=page.getByRole('list',{name:'Dry run row results'});
   await expect(results).toContainText('Spreadsheet Person · csv-0@example.test');await expect(results).toContainText('Rejected Person · invalid-email');
   expect(await results.evaluate(element=>element.scrollHeight<=element.clientHeight)).toBe(true);
   await results.getByText('Rejected Person · invalid-email',{exact:true}).scrollIntoViewIfNeeded();
   await expect(results.getByText('Rejected Person · invalid-email',{exact:true})).toBeInViewport();
  }
  await page.getByRole('checkbox',{name:'I reviewed every rejection, association and suppression result.'}).check();await page.getByRole('button',{name:'Apply reviewed import',exact:true}).click();await expect(page.getByRole('heading',{name:'Import complete',exact:true})).toBeVisible({timeout:90_000});
  const imported=await page.request.get(`/api/v1/records/contact?q=${vendor}-0%40example.test`);expect(imported.ok()).toBe(true);const contacts=(await imported.json()).records;expect(contacts).toHaveLength(1);expect(contacts[0].contactability).toBe('do_not_contact');
  if(vendor==='csv'){const recordPage=await context.newPage();try{
   await recordPage.goto(`/app/records?kind=contact&record=${contacts[0].id}`);await expect(recordPage.getByText('Generic CSV',{exact:true})).toBeVisible();
   await recordPage.getByRole('button',{name:'Back to records',exact:true}).click();await recordPage.getByText('Import, duplicate review and data export',{exact:true}).click();
   await recordPage.getByRole('button',{name:'Find matching names',exact:true}).click();
   for(const [email,company] of [['csv-0@example.test','Spreadsheet Company'],['csv-1@example.test','Another Company'],['csv-2@example.test','No company']])await expect(recordPage.getByRole('button',{name:`Spreadsheet Person · ${email} · ${company}`,exact:true})).toBeVisible();
   expect(await recordPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{await recordPage.close();}}
  if(vendor==='hubspot')await page.screenshot({path:join(screenshots,`viewport-${width}-review-completed.png`),fullPage:true});
  const history=page.locator('.crm-history article').filter({hasText:source.account}),undo=history.getByRole('button',{name:'Undo import',exact:true});await undo.click();const dialog=page.getByRole('dialog',{name:'Undo this import?',exact:true});await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(undo).toBeFocused();await undo.click();await dialog.getByRole('button',{name:'Confirm undo',exact:true}).click();await expect(page.getByRole('status')).toContainText('Import undone',{timeout:90_000});
  const erased=await page.request.get(`/api/v1/records/contact?q=${vendor}-0%40example.test`);expect((await erased.json()).records).toHaveLength(0);
  await page.getByRole('button',{name:'Start another dry run',exact:true}).click();
 }
 expect(errors).toEqual([]);
});
