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
 await page.setViewportSize({width:1440,height:1024});await page.goto('/app/settings/data/import');await expect(page.getByRole('heading',{name:'Move in',level:1})).toBeVisible();
 await page.screenshot({path:join(screenshots,'desktop-upload.png'),fullPage:true});
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByLabel('Do not contact list',{exact:true})).toBeAttached();await page.screenshot({path:join(screenshots,`viewport-${width}-upload.png`),fullPage:true});const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(accessibility.violations).toEqual([]);}
 const settingsResponse=await page.request.get('/api/v1/settings');expect(settingsResponse.ok()).toBe(true);const settings=await settingsResponse.json();
 for(const width of [1440,390])for(const vendor of ['hubspot','pipedrive','csv']){
  await page.setViewportSize({width,height:900});
  const spreadsheetRows=['csv-0@example.test,Spreadsheet Person,Spreadsheet Company','csv-1@example.test,Spreadsheet Person,Another Company','csv-2@example.test,Spreadsheet Person,',...Array.from({length:6},(_,index)=>`csv-extra-${index}@example.test,Extra Person ${index},Spreadsheet Company`),'invalid-email,Rejected Person,'];
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
   await recordPage.goto('/app/settings/data');
   await recordPage.getByRole('button',{name:'Find matching contacts',exact:true}).click();
   for(const [email,company] of [['csv-0@example.test','Spreadsheet Company'],['csv-1@example.test','Another Company'],['csv-2@example.test','No company']])await expect(recordPage.getByRole('button',{name:`Spreadsheet Person · ${email} · ${company}`,exact:true})).toBeVisible();
   expect(await recordPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{await recordPage.close();}}
  if(vendor==='hubspot')await page.screenshot({path:join(screenshots,`viewport-${width}-review-completed.png`),fullPage:true});
  const history=page.locator('.crm-history article').filter({hasText:source.account}),undo=history.getByRole('button',{name:'Undo import',exact:true});await undo.click();const dialog=page.getByRole('dialog',{name:'Undo this import?',exact:true});await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(undo).toBeFocused();await undo.click();await dialog.getByRole('button',{name:'Confirm undo',exact:true}).click();await expect(page.getByRole('status')).toContainText('Import undone',{timeout:90_000});
  const erased=await page.request.get(`/api/v1/records/contact?q=${vendor}-0%40example.test`);expect((await erased.json()).records).toHaveLength(0);
  await page.getByRole('button',{name:'Start another dry run',exact:true}).click();
 }
 // Review and merge through the same native controls, with stops before and after review.
 await page.setViewportSize({width:1440,height:900});const origin=new URL(page.url()).origin;
 for(const phase of ['before','after']){
  const contacts=[];
  for(const index of [0,1]){
   const response=await page.request.post('/api/v1/records/contact',{headers:{Origin:origin},data:{name:`Merge stop ${phase}`,email:`synthetic-orbit-merge-${phase}-${index}${'@'}example.test`}});expect(response.status()).toBe(201);
   contacts.push({id:(await response.json()).id,email:`synthetic-orbit-merge-${phase}-${index}${'@'}example.test`});
  }
  const stop=async()=>{const response=await page.request.put(`/api/v1/records/contact/${contacts[1].id}`,{headers:{Origin:origin},data:{name:`Merge stop ${phase}`,contactability:'do_not_contact'}});expect(response.ok()).toBe(true);};
  if(phase==='before')await stop();
  await page.goto('/app/settings/data');const review=page.getByRole('region',{name:'Duplicate contacts',exact:true});await review.getByRole('button',{name:'Find matching contacts',exact:true}).click();
  for(const contact of contacts)await page.getByRole('button',{name:`Merge stop ${phase} · ${contact.email} · No company`,exact:true}).click();
  await expect(review.getByRole('combobox')).toHaveCount(1);await review.getByRole('combobox',{name:'Email',exact:true}).selectOption('survivor');
  if(phase==='after')await stop();
  if(phase==='before'){
   await page.screenshot({path:join(screenshots,'merge-stop-review-1440.png'),fullPage:true});
   await page.setViewportSize({width:390,height:900});await page.screenshot({path:join(screenshots,'merge-stop-review-390.png'),fullPage:true});await page.setViewportSize({width:1440,height:900});
  }
  await review.getByRole('button',{name:'Confirm merge',exact:true}).click();await page.getByRole('dialog',{name:'Merge records',exact:true}).getByRole('button',{name:'Merge records',exact:true}).click();
  await expect(review.getByRole('status')).toContainText('Records merged.');
  const survivor=await page.request.get(`/api/v1/records/contact/${contacts[0].id}`);expect(survivor.ok()).toBe(true);expect((await survivor.json()).record.contactability).toBe('do_not_contact');expect((await page.request.get(`/api/v1/records/contact/${contacts[1].id}`)).status()).toBe(404);
  await page.goto(`/app/records?kind=contact&record=${contacts[0].id}`);await expect(page.getByRole('button',{name:'Clear do-not-contact',exact:true})).toBeVisible();
  if(phase==='after'){
   await page.screenshot({path:join(screenshots,'merge-stopped-survivor-1440.png'),fullPage:true});
   await page.setViewportSize({width:390,height:900});await page.screenshot({path:join(screenshots,'merge-stopped-survivor-390.png'),fullPage:true});await page.setViewportSize({width:1440,height:900});
  }
 }
 expect(errors).toEqual([]);
});
