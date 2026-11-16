import {expect} from '@playwright/test';
import {join} from 'node:path';

/** A stranger's plain spreadsheets retain readable review and record provenance. */
export async function clinicImportJourney(page,settings,screenshots){
 const owner=settings.operators.find(person=>person.setup_owner===1)??settings.operators[0],account='Synthetic clinic import',email='synthetic-orbit-clinic@example.test';
 await page.goto('/app/settings/data/import');
 await page.getByRole('radio',{name:'Generic CSV'}).check();
 const files=[
  ['Contacts','contacts.csv',`Name,Email,Owner,Phone,Job title\nOmar Reyes,${email},Alex Morgan,5550101,Director`],
  ['Companies','companies.csv','Name,Domain\nHarborlight Health,synthetic-clinic.example'],
  ['Deals','deals.csv','Title,Value,Company,Stage\nClinic analytics rollout,20000,Harborlight Health,Qualified']
 ];
 for(const [label,name,csv]of files)await page.getByLabel(label,{exact:true}).setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(csv)});
 await page.getByRole('button',{name:'Review dry run',exact:true}).click();
 await page.getByLabel('Name for this import').fill(account);
 const company=page.locator('details').filter({has:page.getByText('Companies: companies.csv',{exact:true})}),deal=page.locator('details').filter({has:page.getByText('Deals: deals.csv',{exact:true})});
 await company.getByLabel('ID in your old system',{exact:true}).selectOption('Name');
 await deal.getByLabel('ID in your old system',{exact:true}).selectOption('Title');
 await deal.getByLabel('Deal value',{exact:true}).selectOption('Value');
 await deal.getByLabel('Company ID (from the companies file)',{exact:true}).selectOption('Company');
 await page.getByRole('combobox',{name:'Qualified',exact:true}).selectOption(settings.stages[0].id);
 await page.getByRole('combobox',{name:'Owner for Alex Morgan',exact:true}).selectOption(owner.id);
 await page.getByRole('button',{name:'Run dry run',exact:true}).click();
 const results=page.getByRole('list',{name:'Dry run row results'});
 await expect(results.locator('strong').filter({hasText:/^Harborlight Health$/})).toBeVisible();
 await expect(results.locator('strong').filter({hasText:/^Clinic analytics rollout$/})).toBeVisible();
 const reviewedDeal=results.getByRole('listitem').filter({has:page.locator('strong').filter({hasText:/^Clinic analytics rollout$/})});
 await reviewedDeal.getByText('Audit details',{exact:true}).click();
 await expect(reviewedDeal).toContainText('20000');await expect(reviewedDeal).toContainText('Harborlight Health');await expect(reviewedDeal).toContainText('Qualified');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:join(screenshots,`clinic-review-${width}.png`),fullPage:true});}
 await page.setViewportSize({width:1440,height:900});
 await page.getByRole('checkbox',{name:'I checked these rows, including any that will not import and any marked Do not contact.'}).check();
 await page.getByRole('button',{name:'Apply reviewed import',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Import complete',exact:true})).toBeVisible();
 const contacts=await(await page.request.get('/api/v1/records/contact?q='+encodeURIComponent(email))).json(),id=contacts.records[0].id;
 await page.goto('/app/contacts/'+id);
 const provenance=page.locator('.r-provenance');
 await expect(provenance).toContainText(owner.display_name);await expect(provenance).toContainText('contacts.csv');await expect(provenance).toContainText('2');
 await expect(provenance).not.toContainText(owner.id);await expect(provenance).not.toContainText(/owner id/i);
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await provenance.scrollIntoViewIfNeeded();await page.screenshot({path:join(screenshots,`clinic-provenance-${width}.png`)});}
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/app/settings/data/import');
}
