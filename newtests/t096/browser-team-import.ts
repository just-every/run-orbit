import assert from 'node:assert/strict';
import {expect,type APIRequestContext,type Page} from '@playwright/test';
import {join} from 'node:path';
import {defaultSalesProfile} from '../../src/core/features/teams/policy';

/** A restricted rep reviews source owners, then imports only under current authority. */
export async function teamImportJourney(page:Page,admin:APIRequestContext,origin:string,directory:string,width:number,operatorId:string){
 const role='/api/v1/settings/teams/roles/'+operatorId,profile=defaultSalesProfile('seller');
 const grant=async(enabled:boolean)=>{const response=await admin.put(role,{headers:{Origin:origin},data:{...profile,fields:['*'],permissions:[...profile.permissions,...enabled?['import']:[]]}});assert.equal(response.status(),200,await response.text());};
 const email=['synthetic-orbit-'+width,'team-import.test'].join('@');
 try{
  await grant(true);await page.goto('/app/imports');
  await page.getByLabel('Contacts',{exact:true}).setInputFiles({name:'west-contacts.csv',mimeType:'text/csv',buffer:Buffer.from('id,name,email,owner\r\nwest-'+width+',West imported buyer,'+email+',Legacy West rep')});
  await page.getByRole('button',{name:'Review dry run',exact:true}).click();
  await page.getByLabel('Name for this import',{exact:true}).fill('West assigned contacts '+width);
  const mapped=page.getByRole('combobox',{name:'Orbit owner for Legacy West rep',exact:true});
  await expect(mapped).toHaveValue('');
  const refused=page.waitForResponse(response=>response.url().endsWith('/imports/dry-run')&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Run dry run',exact:true}).click();assert.equal((await refused).status(),403);
  await expect(page.getByRole('alert')).toContainText('outside your current sales permissions');
  await mapped.selectOption(operatorId);assert.equal(await mapped.inputValue(),operatorId);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:join(directory,`team-import-mapping-${width}.png`),fullPage:true});
  const reviewing=page.waitForResponse(response=>response.url().endsWith('/imports/dry-run')&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Run dry run',exact:true}).click();const reviewed=await reviewing;assert.equal(reviewed.status(),200);const review=await reviewed.json();
  await expect(page.getByRole('heading',{name:'Review your dry run',exact:true})).toBeVisible();
  await expect(page.getByRole('list',{name:'Dry run row results'})).toContainText('West imported buyer');
  await page.getByRole('checkbox',{name:'I checked these rows, including any that will not import and any marked Do not contact.',exact:true}).check();
  await grant(false);const denied=page.waitForResponse(response=>response.url().endsWith(`/imports/${review.id}/apply`));
  await page.getByRole('button',{name:'Apply reviewed import',exact:true}).click();assert.equal((await denied).status(),403);
  await expect(page.getByRole('alert')).toBeVisible();
  const before=await admin.get('/api/v1/records/contact?q='+encodeURIComponent(email));assert.equal(before.status(),200);assert.equal((await before.json()).records.length,0);
  await grant(true);await page.getByRole('button',{name:'Apply reviewed import',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Import complete',exact:true})).toBeVisible();
  const own=await page.request.get('/api/v2/workspaces/workspace/records?kind=contact&q='+encodeURIComponent(email));assert.equal(own.status(),200);const items=(await own.json()).items;assert.equal(items.length,1);assert.equal(items[0].fields.name,'West imported buyer');
  await page.screenshot({path:join(directory,`team-import-complete-${width}.png`),fullPage:true});
 }finally{const response=await admin.put(role,{headers:{Origin:origin},data:profile});assert.equal(response.status(),200,await response.text());}
}
