import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {request,requestStatus} from './operator-fixture.mjs';

export async function exerciseDuplicateMerge(page,origin,fixture,observe){
 for(const reverse of [false,true]){
  const label=reverse?'Reverse duplicate review':'Duplicate review company';
  const first=await request(page,'/api/v1/records/company',{name:label,primary_domain:`${reverse?'reverse-':''}first.example`,custom_fields:{campaign_json:'Studio',import_source:JSON.stringify(fixture.provenance)}});
  const second=await request(page,'/api/v1/records/company',{name:label,primary_domain:`${reverse?'reverse-':''}second.example`,custom_fields:{campaign_json:'Agency'}});
  const keyless=await request(page,'/api/v1/records/company',{name:label});
  const [survivor,retired]=reverse?[second,first]:[first,second];
  const detail=id=>request(page,`/api/v1/records/company/${id}`,undefined,'GET');
  const select=async()=>{
   const candidates=await Promise.all([detail(survivor.id),detail(retired.id)]);
   await page.getByRole('button',{name:'Find matching companies',exact:true}).click();
   await expect(page.getByRole('button',{name:`${label} · No domain`,exact:true})).toBeVisible();
   for(const {record} of candidates)await page.getByRole('button',{name:`${record.name} · ${record.primary_domain}`,exact:true}).click();
  };
  const choose=async()=>{await page.getByLabel('Primary domain',{exact:true}).selectOption(reverse?'survivor':'retired');await page.getByLabel('Custom fields',{exact:true}).selectOption(reverse?'retired':'survivor');};
  const confirm=async()=>{await page.getByRole('button',{name:'Confirm merge',exact:true}).click();return page.getByRole('dialog',{name:'Merge records',exact:true});};
  await page.goto(origin+'/app/settings/data');await select();
  await page.getByRole('button',{name:'Confirm merge',exact:true}).click();await expect(page.getByLabel('Primary domain',{exact:true})).toBeFocused();
  await expect(page.getByLabel('Custom fields',{exact:true}).locator(`option[value=${reverse?'retired':'survivor'}]`)).toContainText('Campaign json: Studio');
  await expect(page.getByLabel('Custom fields',{exact:true}).locator(`option[value=${reverse?'retired':'survivor'}]`)).toContainText(`ID in old system: ${fixture.provenance.sourceId}`);await choose();
  if(!reverse){
   for(const width of [1440,390,320]){
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
  assert.equal((await detail(keyless.id)).record.primary_domain,null);
  const events=saved.timeline.filter(entry=>entry.kind==='record.merged');assert.equal(events.length,1);assert.deepEqual(JSON.parse(events[0].payload_json),{retiredId:retired.id,choices:{primary_domain:reverse?'survivor':'retired',custom_fields_json:reverse?'retired':'survivor'}});
  const aliasDomain=(reverse?beforeRetired:beforeSurvivor).primary_domain;
  const denied=await page.evaluate(async({aliasDomain})=>{const response=await fetch('/api/v1/records/company',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Alias must remain reserved',primary_domain:aliasDomain})});return {status:response.status,body:await response.json()};},{aliasDomain});assert.equal(denied.status,409);assert.equal(denied.body.recordId,survivor.id);
 }
 for(const [index,stopped] of ['survivor','retired'].entries()){
  await page.setViewportSize({width:1440,height:900});
  const name=`synthetic-orbit-${stopped}-stop`,email=part=>`${name}-${part}`+'@'+'example.test';
  const pair={survivor:await request(page,'/api/v1/records/contact',{name,email:email('keep'),contactability:'contactable'}),retired:await request(page,'/api/v1/records/contact',{name,email:email('retire'),contactability:'contactable'})};
  const keyless=await Promise.all([request(page,'/api/v1/records/contact',{name}),request(page,'/api/v1/records/contact',{name})]);
  const detail=id=>request(page,`/api/v1/records/contact/${id}`,undefined,'GET'),ids=[pair.survivor.id,pair.retired.id,...keyless.map(row=>row.id)];
  const stop=async()=>{const current=(await detail(pair[stopped].id)).record;await request(page,`/api/v1/records/contact/${current.id}`,{...current,custom_fields:JSON.parse(current.custom_fields_json),contactability:'do_not_contact'},'PUT');};
  if(index===1)await stop();
  const before=await Promise.all(ids.map(detail));
  await page.goto(origin+'/app/settings/data');
  await page.getByRole('button',{name:'Find matching contacts',exact:true}).click();
  await expect(page.getByRole('button',{name:`${name} · No company`,exact:true})).toHaveCount(2);
  assert.deepEqual(await Promise.all(ids.map(detail)),before);
  for(const part of ['survivor','retired'])await page.getByRole('button',{name:`${name} · ${email(part==='survivor'?'keep':'retire')} · No company`,exact:true}).click();
  await page.getByLabel('Email',{exact:true}).selectOption('survivor');
  await expect(page.getByRole('combobox',{name:'Contactability',exact:true})).toHaveCount(0);
  if(index===0)await stop();
  for(const width of [1440,390])await observe(`contact-${stopped}-stop-review`,width);
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole('button',{name:'Confirm merge',exact:true}).click();
  await page.getByRole('dialog',{name:'Merge records',exact:true}).getByRole('button',{name:'Merge records',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Records merged.'})).toBeVisible();
  assert.equal((await detail(pair.survivor.id)).record.contactability,'do_not_contact');
  assert.equal(await requestStatus(page,`/api/v1/records/contact/${pair.retired.id}`),404);
  for(const row of keyless)assert.equal((await detail(row.id)).record.email,null);
  for(const width of [1440,390])await observe(`contact-${stopped}-stop-merged`,width);
 }
}
