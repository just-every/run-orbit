import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {request,requestStatus} from './operator-fixture.mjs';

export async function exerciseDuplicateMerge(page,origin,fixture,observe){
 for(const reverse of [false,true]){
  const label=reverse?'Reverse duplicate review':'Duplicate review company';
  const first=await request(page,'/api/v1/records/company',{name:label,primary_domain:`${reverse?'reverse-':''}first.example`,custom_fields:{campaign_json:'Studio',import_source:JSON.stringify(fixture.provenance)}});
  const second=await request(page,'/api/v1/records/company',{name:label,primary_domain:`${reverse?'reverse-':''}second.example`,custom_fields:{campaign_json:'Agency'}});
  const [survivor,retired]=reverse?[second,first]:[first,second];
  const detail=id=>request(page,`/api/v1/records/company/${id}`,undefined,'GET');
  const select=async()=>{
   const candidates=await Promise.all([detail(survivor.id),detail(retired.id)]);
   await page.getByRole('button',{name:'Find matching names',exact:true}).click();
   for(const {record} of candidates)await page.getByRole('button',{name:`${record.name} · ${record.primary_domain}`,exact:true}).click();
  };
  const choose=async()=>{await page.getByLabel('Primary domain',{exact:true}).selectOption(reverse?'survivor':'retired');await page.getByLabel('Custom fields',{exact:true}).selectOption(reverse?'retired':'survivor');};
  const confirm=async()=>{await page.getByRole('button',{name:'Confirm merge',exact:true}).click();return page.getByRole('dialog',{name:'Merge records',exact:true});};
  await page.goto(origin+'/app/records?kind=company');await page.getByText('Import, duplicate review and data export',{exact:true}).click();await select();
  await page.getByRole('button',{name:'Confirm merge',exact:true}).click();await expect(page.getByLabel('Primary domain',{exact:true})).toBeFocused();
  await expect(page.getByLabel('Custom fields',{exact:true}).locator(`option[value=${reverse?'retired':'survivor'}]`)).toContainText('Campaign json: Studio');
  await expect(page.getByLabel('Custom fields',{exact:true}).locator(`option[value=${reverse?'retired':'survivor'}]`)).toContainText(`ID in old system: ${fixture.provenance.sourceId}`);await choose();
  if(!reverse){
   for(const width of [1440]){
    await observe('merge-values',width);const dialog=await confirm();await observe('merge-dialog',width);await dialog.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal((await detail(retired.id)).record.id,retired.id);
   }
   const dialog=await confirm(),before=(await detail(retired.id)).record;
   await request(page,`/api/v1/records/company/${retired.id}`,{...before,primary_domain:'changed-after-review.example',custom_fields:JSON.parse(before.custom_fields_json)},'PUT');
   const reviewedAfterEdit=await Promise.all([detail(survivor.id),detail(retired.id)]);
   const response=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/records/company/merge'&&response.request().method()==='POST');await dialog.getByRole('button',{name:'Merge records',exact:true}).click();assert.equal((await response).status(),409);
   await expect(page.getByRole('alert').filter({hasText:'review the current values'})).toBeVisible();assert.deepEqual(await Promise.all([detail(survivor.id),detail(retired.id)]),reviewedAfterEdit);
   await select();await expect(page.getByLabel('Primary domain',{exact:true}).locator('option[value=retired]')).toContainText('changed-after-review.example');await choose();
  }
  const beforeSurvivor=(await detail(survivor.id)).record,beforeRetired=(await detail(retired.id)).record;
  await (await confirm()).getByRole('button',{name:'Merge records',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Records merged.'})).toBeVisible();
  const saved=await detail(survivor.id);assert.equal(saved.record.primary_domain,(reverse?beforeSurvivor:beforeRetired).primary_domain);assert.equal(saved.record.custom_fields_json,(reverse?beforeRetired:beforeSurvivor).custom_fields_json);assert.equal(await requestStatus(page,`/api/v1/records/company/${retired.id}`),404);
  const events=saved.timeline.filter(entry=>entry.kind==='record.merged');assert.equal(events.length,1);assert.deepEqual(JSON.parse(events[0].payload_json),{retiredId:retired.id,choices:{primary_domain:reverse?'survivor':'retired',custom_fields_json:reverse?'retired':'survivor'}});
  const aliasDomain=(reverse?beforeRetired:beforeSurvivor).primary_domain;
  const denied=await page.evaluate(async({aliasDomain})=>{const response=await fetch('/api/v1/records/company',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Alias must remain reserved',primary_domain:aliasDomain})});return {status:response.status,body:await response.json()};},{aliasDomain});assert.equal(denied.status,409);assert.equal(denied.body.recordId,survivor.id);
 }
}
