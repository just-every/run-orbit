import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {crmFixture} from '../support/crm-fixtures.ts';
const names={contact:'Contacts',company:'Companies',deal:'Deals',note:'Notes',suppression:'Do not contact list'};
export async function importCustomerBook({page,context},info) {
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const screenshots=process.env.IMPORT_SCREENSHOT_DIR??info.outputPath('visual');mkdirSync(screenshots,{recursive:true});
 await page.setViewportSize({width:1440,height:1024});await page.goto('/app/imports');await expect(page.getByRole('heading',{name:'Move in your customer records'})).toBeVisible();
 await page.screenshot({path:join(screenshots,'desktop-upload.png'),fullPage:true});
 for(const width of [1440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByLabel('Do not contact list',{exact:true})).toBeAttached();await page.screenshot({path:join(screenshots,`viewport-${width}-upload.png`),fullPage:true});const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(accessibility.violations).toEqual([]);}
 const domain=`onboarding-${Date.now()}.example`;
 const settingsResponse=await page.request.get('/api/v1/settings');expect(settingsResponse.ok()).toBe(true);const settings=await settingsResponse.json();
 for(const width of [1440])for(const vendor of ['hubspot','pipedrive','csv']){
  await page.setViewportSize({width,height:900});
  const spreadsheetRows=['csv-0@example.test,Spreadsheet Person,Spreadsheet Company','csv-1@example.test,Spreadsheet Person,Another Company','csv-2@example.test,Spreadsheet Person,',...Array.from({length:6},(_,index)=>`csv-extra-${index}@example.test,Extra Person ${index},Spreadsheet Company`),'invalid-email,Rejected Person,',`ana@${domain},Ana Ruiz,Spreadsheet Company`,`bob@${domain},Bob Stone,Spreadsheet Company`];
  const source=vendor==='csv'?{vendor,files:[{kind:'contact',name:'csv-contact.csv',csv:['email,name,company,seats',...spreadsheetRows.map((row,index)=>`${row},${index+3}`)].join('\r\n')}]}:crmFixture(vendor,settings.stages[0].id,3);source.account=`Browser ${vendor} ${width} ${Date.now()}`;
  await page.getByRole('radio',{name:vendor==='csv'?'Generic CSV':vendor==='hubspot'?'HubSpot CSV':'Pipedrive CSV'}).check();
  for(const file of source.files)await page.getByLabel(names[file.kind],{exact:true}).setInputFiles({name:file.name,mimeType:'text/csv',buffer:Buffer.from(file.csv)});
  await page.getByRole('button',{name:'Review dry run',exact:true}).click();await page.getByLabel('Name for this import').fill(source.account);
  const contactMapping=page.locator('details').filter({has:page.getByText(`Contacts: ${vendor}-contact.csv`,{exact:true})});
  if(vendor==='csv'){
   await expect(contactMapping.getByLabel('ID in your old system',{exact:true})).toHaveValue('');await expect(contactMapping.getByLabel('Column seats',{exact:true})).toHaveValue('custom');
   await expect(contactMapping.getByLabel('Email',{exact:true})).toHaveValue('email');
   await expect(contactMapping.getByLabel('Full name',{exact:true})).toHaveValue('name');
   await expect(contactMapping.getByLabel('Company name',{exact:true})).toHaveValue('company');
  }else await contactMapping.getByLabel('Permission to contact',{exact:true}).selectOption('Marketing status');
  if(vendor!=='csv')await page.getByRole('combobox',{name:'Qualified',exact:true}).selectOption(settings.stages[0].id);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:join(screenshots,`viewport-${width}-${vendor}-mapping.png`),fullPage:true});
  await page.getByRole('button',{name:'Run dry run',exact:true}).click();await expect(page.getByRole('heading',{name:'Review your dry run',exact:true})).toBeVisible();if(vendor!=='csv')await expect(page.locator('.crm-results')).toContainText('occurrence time');
  if(vendor==='csv'){
   const results=page.getByRole('list',{name:'Dry run row results'});
   await expect(results).toContainText('Spreadsheet Person · csv-0@example.test');await expect(results).toContainText('Rejected Person · invalid-email');
   expect(await results.evaluate(element=>element.scrollHeight<=element.clientHeight)).toBe(true);
   await results.getByText('Rejected Person · invalid-email',{exact:true}).scrollIntoViewIfNeeded();
   await expect(results.getByText('Rejected Person · invalid-email',{exact:true})).toBeInViewport();
  }
  await page.getByRole('checkbox',{name:'I checked these rows, including any that will not import and any marked Do not contact.'}).check();await page.getByRole('button',{name:'Apply reviewed import',exact:true}).click();await expect(page.getByRole('heading',{name:'Import complete',exact:true})).toBeVisible({timeout:90_000});
  const imported=await page.request.get(`/api/v1/records/contact?q=${vendor}-0%40example.test`);expect(imported.ok()).toBe(true);const contacts=(await imported.json()).records;expect(contacts).toHaveLength(1);expect(contacts[0].contactability).toBe('do_not_contact');
  if(vendor==='csv'){const recordPage=await context.newPage();try{
   await recordPage.goto(`/app/records?kind=contact&record=${contacts[0].id}`);await expect(recordPage.getByText(`${source.account} (spreadsheet)`,{exact:true})).toBeVisible();await expect(recordPage.getByText('Seats',{exact:true})).toBeVisible();
   await recordPage.getByRole('button',{name:'Back to records',exact:true}).click();await recordPage.getByText('Import, duplicate review and data export',{exact:true}).click();
   await recordPage.getByRole('button',{name:'Find matching names',exact:true}).click();
   for(const [email,company] of [['csv-0@example.test','Spreadsheet Company'],['csv-1@example.test','Another Company'],['csv-2@example.test','No company']])await expect(recordPage.getByRole('button',{name:`Spreadsheet Person · ${email} · ${company}`,exact:true})).toBeVisible();
   expect(await recordPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{await recordPage.close();}}
  if(vendor==='hubspot')await page.screenshot({path:join(screenshots,`viewport-${width}-review-completed.png`),fullPage:true});
  if(vendor==='csv'){
   const lookup=async email=>(await(await page.request.get(`/api/v1/records/contact?q=${encodeURIComponent(email)}`)).json()).records.find(row=>row.email===email);
   const ana=await lookup(`ana@${domain}`),bob=await lookup(`bob@${domain}`),company=ana.company_id;
   const response=await page.request.put(`/api/v1/records/company/${company}`,{headers:{Origin:new URL(page.url()).origin},data:{name:'Spreadsheet Company',primary_domain:domain}});expect(response.status()).toBe(200);
   expect(errors).toEqual([]);
   return {company,ana:ana.id,bob:bob.id,domain,account:'Spreadsheet Company'};
  }
  const history=page.locator('.crm-history article').filter({hasText:source.account}),undo=history.getByRole('button',{name:'Undo import',exact:true});await undo.click();const dialog=page.getByRole('dialog',{name:'Undo this import?',exact:true});await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(undo).toBeFocused();await undo.click();
  // Wait for this confirmation's final native response before reading its effects.
  const undone=page.waitForResponse(async response=>response.request().method()==='POST'&&new URL(response.url()).pathname.endsWith('/undo')&&(await response.json()).job?.state==='undone',{timeout:90_000});
  await dialog.getByRole('button',{name:'Confirm undo',exact:true}).click();
  const undoResult=await(await undone).json();expect(undoResult.undo.dispositions.filter(item=>item.disposition==='retained')).toEqual([]);
  await expect(page.getByRole('status')).toContainText('Import undone',{timeout:90_000});
  const erased=await page.request.get(`/api/v1/records/contact?q=${vendor}-0%40example.test`);expect((await erased.json()).records).toHaveLength(0);
  await page.getByRole('button',{name:'Start another dry run',exact:true}).click();
 }
 expect(errors).toEqual([]);
}
