import {isolateBrowserTemp} from '../../tests/support/browser-temp.mjs';
isolateBrowserTemp();
import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {mkdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {fixture,nativeRecord,collaborator} from './fixture';
import {emittedWorker} from './emitted-fixture';
import {emittedRequest} from './emitted-request';
import {accessible,watchBrowser} from './browser-observations';
import {seedSalesReport} from './sales-report-fixture';
import {emittedSlackWorker} from './emitted-slack-worker';
import {dashboardSlackFixture} from './dashboard-slack-fixture';
import {dashboardSlackScreens} from './browser-dashboard-slack';
import {dashboardJourney} from './browser-dashboard';
import {salesReportJourney} from './browser-sales-report';

let f:Awaited<ReturnType<typeof fixture>>,worker:Awaited<ReturnType<typeof emittedWorker>>;
let browser:Awaited<ReturnType<typeof chromium.launch>>,limitedCookie:string,companyId:string,sales:Awaited<ReturnType<typeof seedSalesReport>>,seller:Awaited<ReturnType<typeof collaborator>>;
const directory=process.env.ORBIT_FOLD_BROWSER_EVIDENCE!;
const from=new Date(Date.now()-86400000).toISOString().slice(0,16),through=new Date(Date.now()+86400000).toISOString().slice(0,16);
const apiBase='/api/v2/workspaces/workspace/operations';

before(async()=>{
 assert.ok(directory,'Browser evidence directory is required');await mkdir(directory,{recursive:true});
 f=await fixture();
 await f.db.prepare("UPDATE workspace_settings SET currency='AUD' WHERE id='workspace'").run();
 const company=await nativeRecord(f,'company',{name:'Harbor Freight'});companyId=company.ref.id;
 const first=await nativeRecord(f,'opportunity',{title:'First open deal',company_id:companyId,value_cents:120000});
 const second=await nativeRecord(f,'opportunity',{title:'Second open deal',company_id:companyId,value_cents:75000});
 const closed=await nativeRecord(f,'opportunity',{title:'Won deal',company_id:companyId,value_cents:400000});
 await f.db.prepare("UPDATE opportunities SET lifecycle='won' WHERE id=?").bind(closed.ref.id).run();
 await f.db.prepare('UPDATE opportunities SET score=? WHERE id=?').bind(10,first.ref.id).run();
 await f.db.prepare('UPDATE opportunities SET score=? WHERE id=?').bind(20,second.ref.id).run();
 await f.db.prepare('UPDATE opportunities SET owner_id=?').bind(f.operator.operatorId).run();
 limitedCookie=(await collaborator(f,'analyst')).cookie;
 await f.db.prepare("UPDATE schema_types SET fields_json=? WHERE name='company'").bind(JSON.stringify({name:{sensitivity:'private'}})).run();
 sales=await seedSalesReport(f);seller=await collaborator(f,'seller');await f.db.prepare('UPDATE operators SET display_name=? WHERE id=?').bind('Marcus Lee',seller.operator.operatorId).run();
 worker=await emittedWorker(f.target);console.info('Owned emitted Worker PID',worker.pid);browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic','--disable-gpu',...worker.browserArgs]});
});
after(async()=>{await browser?.close();await worker?.dispose();await f?.close();});

test('REPORT-002 a manager’s Tile board composes viewer-fenced reports and exports; REPORT-001 a US monthly two-pipeline report reconciles won/lost/open deals, reasons and rep activities by drill-through, discloses its basis, and leaks nothing after revocation or late evidence',async()=>{
 for(const width of [1440,390]){
  const context=await browser.newContext({baseURL:worker.origin,viewport:{width,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:f.cookie}});
  const errors=watchBrowser(context),page=await context.newPage(),id=`disclosed-value-${width}`;
  try{
   await page.goto('/app/reports');await page.getByText('Create or edit a report from your records',{exact:true}).click();
   await page.getByLabel('Report key').fill(id);await page.getByLabel('Name',{exact:true}).fill('Open opportunity value');
   await page.getByRole('combobox',{name:'Calculation',exact:true}).selectOption('sum');await page.getByLabel('Value field',{exact:true}).selectOption('value_cents');
   await page.getByLabel('Group by field',{exact:true}).selectOption('stage_id');await page.getByLabel('Filter field',{exact:true}).selectOption('lifecycle');
   await page.getByLabel('Filter equals',{exact:true}).selectOption('open');await page.getByLabel('Description',{exact:true}).fill('Value of open opportunities by pipeline stage');
   await Promise.all([page.waitForResponse(r=>r.url().endsWith('/operations/metrics')&&r.request().method()==='POST'&&r.status()===200),page.getByRole('button',{name:'Save report definition',exact:true}).click()]);
   await page.getByRole('combobox',{name:'Report',exact:true}).selectOption(`${id}:1`);await page.getByLabel('Window start',{exact:true}).fill(from);
   await page.getByLabel('Window end',{exact:true}).fill(through);await page.getByRole('button',{name:'Preview report',exact:true}).click();
   const result=page.locator('.analytics-console__result');await expect(result).toBeVisible();
   await page.getByText('How this report is calculated',{exact:true}).click();
   const details=result.locator('.analytics-console__measurement');
   await expect(details).toContainText(new Date(from).toISOString());await expect(details).toContainText(new Date(through).toISOString());
   await expect(details).toContainText('Status: Open');await expect(details).toContainText('Pipeline stage');
   await expect(details).toContainText('Null or nonnumeric');await expect(details).toContainText('Missing numeric values: 0');
   await expect(result.locator('dl').first()).toContainText(new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(1950));
   await expect(details.getByRole('list',{name:'Report groups'})).toContainText('New');
   await expect(details.getByRole('list',{name:'Report groups'})).not.toContainText(f.stage);
   await page.getByRole('button',{name:'Save reviewed report',exact:true}).click();await expect(page.getByRole('heading',{name:'Saved result',exact:true})).toBeVisible();
   await page.reload();await page.getByRole('combobox',{name:'Report',exact:true}).selectOption(`${id}:1`);
   const history=page.getByRole('region',{name:'Saved report history'});await expect(history).toContainText('Status: Open');
   await expect(history).toContainText(new Date(from).toISOString());await expect(history).toContainText(new Date(through).toISOString());
   await expect(history).toContainText('Pipeline stage');await expect(history).toContainText('Null or nonnumeric');await expect(history).toContainText('New');
   await page.getByLabel('Window start',{exact:true}).fill('2000-01-01T00:00');
   await page.getByRole('button',{name:'Reopen saved report',exact:true}).click();
   await page.getByText('How this report is calculated',{exact:true}).click();await expect(result).toContainText(new Date(from).toISOString());
   const downloading=page.waitForEvent('download');await history.getByRole('link',{name:'Export saved report'}).click();
   const path=join(directory,`disclosed-report-${width}.json`);await (await downloading).saveAs(path);
   const exported=JSON.parse(await readFile(path,'utf8'));
   assert.equal(exported.values.value,195000);assert.equal(exported.values.n,2);
   assert.equal(exported.values.formattedValue,new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(1950));
   assert.equal(exported.measurement.valueDivisor,100);
   assert.equal(exported.from,new Date(from).toISOString());assert.equal(exported.through,new Date(through).toISOString());
   assert.deepEqual(exported.measurement.filters,{lifecycle:'open'});assert.equal(exported.measurement.groupBy,'stage_id');
   assert.equal(exported.measurement.dateField,'created_at');assert.equal(exported.measurement.missingPolicy,'incomplete');
   assert.ok(exported.measurement.missingHandling);assert.equal(exported.measurement.currency,'AUD');assert.equal(exported.values.unit,'AUD');
   assert.deepEqual(exported.values.groups.map((g:any)=>[g.label,g.value]),[['New',195000]]);
   await accessible(page,`disclosed-report-${width}`,directory);await errors.check(directory,`disclosed-report-${width}`);
  }finally{await context.close();}
 }
 await dashboardJourney({browser,worker,ownerCookie:f.cookie,seller:{cookie:seller.cookie,operatorId:seller.operator.operatorId},seed:sales,directory});
 await browser.close();await worker.dispose();await f.target.reopen();worker=await emittedSlackWorker(f.target,origin=>dashboardSlackFixture(f,origin));browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic','--disable-gpu',...worker.browserArgs]});console.info('Owned emitted Worker PID',worker.pid);
 await dashboardSlackScreens(browser,worker,f.cookie,directory);
 await salesReportJourney({browser,worker,ownerCookie:f.cookie,seller:{cookie:seller.cookie,operatorId:seller.operator.operatorId,email:seller.operator.email,displayName:'Marcus Lee'},seed:sales,directory});
});

test('Sum and Mean identify money or the measured field, and record group names obey current field authority through the report API',async()=>{
 const definition={name:'Measured values',description:'Native measurements with all filters disclosed',unit:'records',sourceTypes:['opportunity'],sourceOperation:'graph.read',sourceFields:['created_at','score','value_cents','company_id'],currency:null,missingPolicy:'incomplete',lateArrival:'recompute',attributionModel:'none',attributionWindowDays:1,dateField:'created_at',filters:{lifecycle:'open',band:'low'},groupBy:'company_id'};
 for(const [aggregation,valueField,expected] of [['sum','score',30],['mean','score',15],['mean','value_cents',97500],['mean','expected_close_at',null]] as const){
  const id=`unit-${aggregation}-${valueField}`;
  assert.equal((await emittedRequest(worker,f.cookie,`${apiBase}/metrics`,'POST',{id,version:1,definition:{...definition,aggregation,valueField}})).status,200);
  const response=await emittedRequest(worker,f.cookie,`${apiBase}/metrics/${id}/preview`,'POST',{version:1,from:new Date(from).toISOString(),through:new Date(through).toISOString()});
  assert.equal(response.status,200);const preview=await response.json() as any;
  assert.equal(preview.values.value,expected);assert.equal(preview.values.unit,valueField==='value_cents'?'AUD':valueField);
  assert.equal(preview.measurement.currency,valueField==='value_cents'?'AUD':null);assert.deepEqual(preview.measurement.filters,definition.filters);
  assert.equal(preview.values.groups[0].label,'Harbor Freight');assert.equal(preview.values.groups[0].group,companyId);
  if(expected===null){assert.equal(preview.values.missing,2);assert.ok(preview.incompleteReasons.length);}
  const saved=await emittedRequest(worker,f.cookie,`${apiBase}/metrics/${id}/snapshots`,'POST',{version:1,from:preview.from,through:preview.through,reviewHash:preview.reviewHash});
  assert.equal(saved.status,200);const snapshot=await saved.json() as any;
  const exported=await emittedRequest(worker,f.cookie,`${apiBase}/snapshots/${snapshot.id}/export`);assert.equal(exported.status,200);
  assert.equal((await exported.json() as any).values.groups[0].label,'Harbor Freight');
  const denied=await emittedRequest(worker,limitedCookie,`${apiBase}/snapshots/${snapshot.id}/export`);
  assert.equal(denied.status,403);assert.doesNotMatch(await denied.text(),/Harbor Freight/);
  assert.equal((await emittedRequest(worker,'',`${apiBase}/snapshots/${snapshot.id}/export`)).status,401);
 }
 for(const groupBy of ['id','owner_id']){
  const id=`named-${groupBy}`;
  assert.equal((await emittedRequest(worker,f.cookie,`${apiBase}/metrics`,'POST',{id,version:1,definition:{...definition,aggregation:'sum',valueField:'value_cents',groupBy}})).status,200);
  const input={version:1,from:new Date(from).toISOString(),through:new Date(through).toISOString()};
  const response=await emittedRequest(worker,f.cookie,`${apiBase}/metrics/${id}/preview`,'POST',input);
  assert.equal(response.status,200);const preview=await response.json() as any;
  assert.equal(preview.values.value,195000);
  assert.deepEqual(preview.values.groups.map((g:any)=>g.label).sort(),groupBy==='id'?['First open deal','Second open deal']:['Owner']);
  const saved=await emittedRequest(worker,f.cookie,`${apiBase}/metrics/${id}/snapshots`,'POST',{...input,reviewHash:preview.reviewHash});
  assert.equal(saved.status,200);const snapshot=await saved.json() as any;
  const exported=await emittedRequest(worker,f.cookie,`${apiBase}/snapshots/${snapshot.id}/export`);assert.equal(exported.status,200);
  assert.deepEqual((await exported.json() as any).values.groups.map((g:any)=>g.label).sort(),preview.values.groups.map((g:any)=>g.label).sort());
  if(groupBy==='owner_id'){
   const denied=await emittedRequest(worker,limitedCookie,`${apiBase}/snapshots/${snapshot.id}/export`);
   assert.equal(denied.status,403);assert.doesNotMatch(await denied.text(),/"label":"Owner"/);
  }
 }
});
