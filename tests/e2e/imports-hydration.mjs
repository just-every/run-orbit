import {expect} from '@playwright/test';
import {join} from 'node:path';
import {hubspotExport} from '../support/hubspot-export.ts';

/** Pick all five files while the server HTML is visible and module scripts are still in flight. */
export async function hydrationImportFlow(page,settings,screenshots){
 const names={contact:'Contacts',company:'Companies',deal:'Deals',note:'Notes',suppression:'Do not contact list'};
 const source=hubspotExport(settings.stages[0].id);
 source.files.push({kind:'suppression',name:'hubspot-suppression.csv',csv:'Email\nsynthetic-orbit-standalone@example.test',mapping:{email:'Email'},separator:';'});
 let release;const scripts=new Promise(resolve=>{release=resolve;});
 const hold=async route=>{if(route.request().resourceType()==='script')await scripts;await route.continue();};
 await page.route('**/*',hold);
 try{
  await page.goto('/app/settings/data/import',{waitUntil:'commit'});
  await page.getByRole('radio',{name:'HubSpot CSV',exact:true}).check();
  for(const file of source.files)await page.getByLabel(names[file.kind],{exact:true}).setInputFiles({name:file.name,mimeType:'text/csv',buffer:Buffer.from(file.csv)});
 }finally{release();await page.unrouteAll({behavior:'wait'});}
 const next=page.getByRole('button',{name:'Review dry run',exact:true});await expect(next).toBeEnabled();
 await expect(page.getByRole('radio',{name:'HubSpot CSV',exact:true})).toBeChecked();
 for(const file of source.files)await expect(page.locator('.crm-file-description').filter({hasText:file.name})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
 const proof=async name=>{await page.screenshot({path:join(screenshots,`${name}-1440.png`),fullPage:true});await page.setViewportSize({width:390,height:900});await page.screenshot({path:join(screenshots,`${name}-390.png`),fullPage:true});await page.setViewportSize({width:1440,height:900});};
 await proof('hubspot-upload');await next.click();await page.getByLabel('Name for this import').fill(source.account);
 const notes=page.locator('details').filter({has:page.getByText('Notes: hubspot-note.csv',{exact:true})});
 await expect(notes.getByLabel('Activity date and time',{exact:true})).toHaveValue('Create Date');
 await expect(notes.getByLabel('ID in your old system',{exact:true})).toHaveValue('Record ID');
 await expect(notes.getByLabel('Note text',{exact:true})).toHaveValue('Note Body');
 await page.getByRole('combobox',{name:'Qualified',exact:true}).selectOption(settings.stages[0].id);
 await proof('hubspot-mapping');
 const response=page.waitForResponse(response=>response.url().endsWith('/imports/dry-run')&&response.request().method()==='POST');
 await page.getByRole('button',{name:'Run dry run',exact:true}).click();const result=await response,dry=await result.json(),posted=result.request().postDataJSON();
 expect(posted.vendor).toBe('hubspot');expect(posted.files).toHaveLength(5);expect(dry.counts.rejected).toBe(0);expect(dry.rows.filter(row=>row.kind==='note'&&row.status==='ready')).toHaveLength(2);
 const review=page.locator('section[aria-label="Import review"]');await expect(review).toBeVisible();
 await expect(review.locator('p').first()).not.toContainText('companies made from Company name');
 await proof('hubspot-review');
 await page.getByRole('checkbox',{name:'I checked these rows, including any that will not import and any marked Do not contact.'}).check();
 await page.getByRole('button',{name:'Apply reviewed import',exact:true}).click();await expect(page.getByRole('heading',{name:'Import complete',exact:true})).toBeVisible({timeout:90_000});
 const contacts=await(await page.request.get('/api/v1/records/contact?q=synthetic-orbit-export%40example.test')).json();expect(contacts.records).toHaveLength(1);
 const detail=await(await page.request.get(`/api/v1/records/contact/${contacts.records[0].id}`)).json();expect(detail.timeline.filter(entry=>entry.kind==='import.note')).toHaveLength(2);
 await proof('hubspot-completed');
 await page.locator('.crm-history article').filter({hasText:source.account}).getByRole('button',{name:'Undo import',exact:true}).click();
 await page.getByRole('dialog',{name:'Undo this import?',exact:true}).getByRole('button',{name:'Confirm undo',exact:true}).click();await expect(page.getByRole('status')).toContainText('Import undone',{timeout:90_000});
 await page.getByRole('button',{name:'Start another dry run',exact:true}).click();
}
