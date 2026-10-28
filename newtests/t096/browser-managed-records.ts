import assert from 'node:assert/strict';
import {expect,type APIRequestContext,type Page} from '@playwright/test';
import {join} from 'node:path';

export async function managedRecordsBrowserJourney(owner:Page,rep:Page,admin:APIRequestContext,directory:string,width:number,repId:string,managerId:string){
 const kind='renewal_review';
 await owner.goto('/app/settings');const settings=owner.getByRole('region',{name:'Object types',exact:true});
 await expect(settings.getByRole('combobox',{name:'Configure object type',exact:true})).toBeVisible();
 if(width===1440){
  await settings.getByLabel('Object type key',{exact:true}).fill(kind);await settings.getByLabel('Object label',{exact:true}).fill('Renewal reviews');
  for(const [index,key,label,type,privacy]of [[2,'reference','Reference','text','public'],[3,'secret_margin','Contract margin','number','private']] as const){
   await settings.getByRole('button',{name:'Add field',exact:true}).click();await settings.getByLabel('Field key '+index,{exact:true}).fill(key);await settings.getByLabel('Field label '+index,{exact:true}).fill(label);await settings.getByLabel('Field type '+index,{exact:true}).selectOption(type);await settings.getByLabel('Field privacy '+index,{exact:true}).selectOption(privacy);
  }
  const created=owner.waitForResponse(response=>response.url().endsWith('/managed-records/definitions')&&response.request().method()==='POST');
  await settings.getByRole('button',{name:'Create object type',exact:true}).click();assert.equal((await created).status(),201);await expect(settings.getByRole('status')).toHaveText('Object type saved');
 }else await settings.getByRole('combobox',{name:'Configure object type',exact:true}).selectOption(kind);
 await expect(settings.getByLabel('Field privacy 3',{exact:true})).toHaveValue('private');await settings.screenshot({path:join(directory,`team-object-settings-${width}.png`)});
 await rep.goto('/app/shared-records');await rep.locator('summary').filter({hasText:/^Leads and custom records$/}).click();
 const records=rep.getByRole('region',{name:'Leads and custom records',exact:true}),leadName='West prospect '+width,customName='West renewal review '+width;
 await records.getByRole('combobox',{name:'Record type',exact:true}).selectOption('lead');await records.getByRole('button',{name:'New record',exact:true}).click();
 await records.getByLabel('Record name',{exact:true}).fill(leadName);await records.getByLabel('Email',{exact:true}).fill(['synthetic-orbit-lead-'+width,'team-records.test'].join('@'));await expect(records.getByRole('combobox',{name:'Owner',exact:true})).toHaveValue(repId);
 await records.getByRole('button',{name:'Save record',exact:true}).click();await records.getByRole('button',{name:leadName,exact:true}).click();await expect(records.getByRole('heading',{name:leadName,exact:true})).toBeVisible();
 assert.equal(await rep.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await records.screenshot({path:join(directory,`team-owned-lead-${width}.png`)});
 await records.getByRole('button',{name:'Back to list',exact:true}).click();await records.getByRole('combobox',{name:'Record type',exact:true}).selectOption(kind);await records.getByRole('button',{name:'New record',exact:true}).click();
 await records.getByLabel('Record name',{exact:true}).fill(customName);await records.getByLabel('Reference',{exact:true}).fill('West renewal planning');await expect(records.getByLabel('Contract margin',{exact:true})).toHaveCount(0);
 const saved=rep.waitForResponse(response=>response.url().endsWith('/managed-records/'+kind)&&response.request().method()==='POST');await records.getByRole('button',{name:'Save record',exact:true}).click();const response=await saved;assert.equal(response.status(),201);const record=await response.json();
 await records.getByRole('button',{name:customName,exact:true}).click();await expect(records.getByRole('heading',{name:customName,exact:true})).toBeVisible();await records.screenshot({path:join(directory,`team-owned-custom-${width}.png`)});
 await owner.goto('/app/records');await owner.locator('summary').filter({hasText:/^Leads and custom records$/}).click();const ownerRecords=owner.getByRole('region',{name:'Leads and custom records',exact:true});await ownerRecords.getByRole('combobox',{name:'Record type',exact:true}).selectOption(kind);await ownerRecords.getByRole('button',{name:customName,exact:true}).click();await ownerRecords.getByRole('button',{name:'Edit record',exact:true}).click();await ownerRecords.getByRole('combobox',{name:'Owner',exact:true}).selectOption(managerId);
 await ownerRecords.getByLabel('Contract margin',{exact:true}).fill('12500');await ownerRecords.screenshot({path:join(directory,`team-custom-reassignment-${width}.png`)});await ownerRecords.getByRole('button',{name:'Save record',exact:true}).click();await expect(ownerRecords.getByRole('status')).toHaveText('Record saved');
 const denied=await rep.request.get('/api/v1/managed-records/'+kind+'/'+record.id);assert.equal(denied.status(),403);const retained=await admin.get('/api/v1/managed-records/'+kind+'/'+record.id);assert.equal(retained.status(),200);assert.equal((await retained.json()).fields.secret_margin,12500);
 await rep.reload();await rep.locator('summary').filter({hasText:/^Leads and custom records$/}).click();const current=rep.getByRole('region',{name:'Leads and custom records',exact:true});await current.getByRole('combobox',{name:'Record type',exact:true}).selectOption(kind);await expect(current.getByRole('button',{name:customName,exact:true})).toHaveCount(0);await current.screenshot({path:join(directory,`team-custom-access-withdrawn-${width}.png`)});
}
