import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';
import type {ForecastPreview} from '../../src/core/features/forecast/types';
import type {DashboardView} from '../../src/core/features/dashboards/repository';
import type {seedSalesReport} from './sales-report-fixture';

const root='/api/v2/workspaces/workspace',forecast=root+'/forecast';
type Call=<T=any>(cookie:string,path:string,method?:string,body?:unknown)=>Promise<T>;
/** Extends the existing dashboard registration: saved quota, importer and field pickers through native HTTP and browser doors. */
export async function dashboardTruthJourney({seed,ownerCookie,call,open,shot}:{seed:Awaited<ReturnType<typeof seedSalesReport>>;ownerCookie:string;call:Call;open:(width:number)=>Promise<{page:Page;context:{close():Promise<void>}}> ;shot:(page:Page,name:string)=>Promise<void>}){
 const month=seed.months.current,from=month+'-01',through=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10),period={from,through};
 const first=await call(ownerCookie,'/api/v1/records/opportunity','POST',{title:'Synthetic dashboard first',stage_id:seed.stages.proposal,value_cents:1_000_000,owner_id:seed.ownerId,expected_close_at:month+'-20T12:00:00Z',custom_fields:{Region:'Northeast',Seats:12,Renewal:false}});
 const source={vendor:'csv',account:'Synthetic dashboard spreadsheet',files:[{kind:'deal',name:'deals.csv',csv:'id,title,stage,amount\r\nsynthetic-orbit-1,Synthetic dashboard imported,Proposal,20000',mapping:{id:'id',title:'title',stage:'stage',amount:'amount'}}],stages:{Proposal:seed.stages.proposal},contactability:'mapped_permission'};
 const review=await call(ownerCookie,'/api/v1/imports/dry-run','POST',source);
 let terminal:any;for(let i=0;i<20;i++){terminal=await call(ownerCookie,`/api/v1/imports/${review.id}/apply`,'POST',{fingerprint:review.fingerprint,confirmed:true});if(terminal.job.state==='completed')break;}
 assert.equal(terminal.job.state,'completed');
 const records=await call(ownerCookie,'/api/v1/records/opportunity'),second=records.records.find((item:any)=>item.title==='Synthetic dashboard imported');assert.ok(second);
 const detail=await call(ownerCookie,`/api/v1/records/opportunity/${second.id}`),provenance=JSON.parse(detail.record.custom_fields_json).import_source;assert.equal(JSON.parse(provenance).vendor,'csv');
 await call(ownerCookie,`/api/v1/records/opportunity/${second.id}`,'PUT',{title:detail.record.title,stage_id:detail.record.stage_id,value_cents:detail.record.value_cents,owner_id:seed.ownerId,expected_close_at:month+'-20T12:00:00Z',custom_fields:{...JSON.parse(detail.record.custom_fields_json),Region:'West'}});
 for(const [id,probability] of [[first.id,30],[second.id,60]] as const)await call(ownerCookie,forecast+'/deals/'+id,'POST',{probability,category:'pipeline',closeDate:null,schedules:[],reason:'Synthetic reviewed probability'});
 const run=await open(1440),page=run.page;
 let id='';
 try{
  await page.goto('/app/reports/forecast');const panel=page.getByRole('region',{name:'Sales forecast',exact:true});await panel.getByRole('button',{name:'Inputs and history',exact:true}).click();
  await panel.getByLabel('Quota rep',{exact:true}).selectOption(seed.ownerId);await panel.getByLabel('Quota period',{exact:true}).selectOption('monthly');await panel.getByLabel('Quota start date',{exact:true}).fill(from);await panel.getByLabel('Quota amount (USD)',{exact:true}).fill('50000');await panel.getByLabel('Quota review reason',{exact:true}).fill('Synthetic monthly sales goal');
  await Promise.all([page.waitForResponse(response=>response.url().endsWith(forecast+'/quotas')&&response.ok()),panel.getByRole('button',{name:'Save quota',exact:true}).click()]);await page.getByRole('dialog').getByRole('button',{name:'Close dialog',exact:true}).click();
  await panel.getByRole('button',{name:/^Period: /}).click();await panel.getByLabel('Forecast from',{exact:true}).fill(from);await panel.getByLabel('Forecast through',{exact:true}).fill(through);await panel.getByRole('button',{name:'Apply',exact:true}).click();
  await expect(panel.locator('.reports-quota__total')).toContainText('$50,000.00');await expect(panel.locator('.reports-key')).toContainText('$15,000.00');await shot(page,'quota-live-1440');
  const preview=await call<ForecastPreview>(ownerCookie,forecast+'/preview','POST',period);assert.equal(preview.result.quotaTotals.monthly.amountCents,5_000_000);assert.equal(preview.result.totals.weightedExpectedCents,1_500_000);
  const snapshot=await call(ownerCookie,forecast+'/snapshots','POST',{...period,reviewHash:preview.reviewHash});
  await page.goto('/app/reports');await page.getByRole('button',{name:'New',exact:true}).click();await page.getByRole('menuitem',{name:'Create a dashboard',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Dashboard name',{exact:true}).fill('Synthetic quota agreement');await dialog.getByRole('button',{name:'Create a dashboard',exact:true}).click();await expect(page).toHaveURL(/\/app\/dashboards\/[a-zA-Z0-9_-]+$/);id=new URL(page.url()).pathname.split('/').at(-1)!;
  const base=root+'/dashboards/'+id,definition=await call(ownerCookie,base+'/definition');definition.definition.filters={ownerIds:[],pipelineIds:[],from:month,through:month,field:null};definition.definition.tiles=['live',1].map((version,index)=>({id:'synthetic-orbit-quota-'+index,source:'forecast',sourceId:snapshot.id,version,snapshotId:null,measure:'pipeline',kind:'forecast',width:6,height:2,bindings:{}}));await call(ownerCookie,base,'PUT',definition);
  await page.reload();await expect(page.locator('.dash-grid')).toHaveAttribute('aria-busy','false');const live=page.locator('.dash-tile').nth(0),saved=page.locator('.dash-tile').nth(1);
  await expect(live.locator('.dash-forecast')).toContainText('$50,000.00');await expect(live.locator('.dash-forecast')).toContainText('$15,000.00');await expect(saved.locator('.dash-forecast')).toContainText('$50,000.00');
  const view=await call<DashboardView>(ownerCookie,base);assert.ok(!view.fields.some(field=>field.name==='import_source'));assert.ok(view.fields.some(field=>field.name==='Region'&&field.values.includes('West')));assert.ok(view.fields.some(field=>field.name==='Seats'&&field.values.includes('12')));assert.ok(view.fields.some(field=>field.name==='Renewal'&&field.values.includes('false')));
  const fields=page.getByRole('region',{name:'Dashboard filters'}).locator('optgroup');assert.ok(!(await fields.evaluateAll(groups=>groups.map(group=>group.label))).includes('import_source'));
  await shot(page,'quota-dashboard-1440');
  for(const width of [390]){const phone=await open(width);try{await phone.page.goto('/app/dashboards/'+id);await expect(phone.page.locator('.dash-grid')).toHaveAttribute('aria-busy','false');await phone.page.locator('.dash-filters summary').click();await shot(phone.page,'quota-dashboard-'+width);await phone.page.goto('/app/reports/forecast');await shot(phone.page,'quota-live-'+width);}finally{await phone.context.close();}}
  const csvResponse=await page.request.get(base+'/tiles/synthetic-orbit-quota-0/csv');assert.equal(csvResponse.status(),200);assert.ok((await csvResponse.text()).includes('$50,000.00'));
  // A real owner filter changes the live quota; saved results retain their reviewed value.
  await page.getByLabel('Owner',{exact:true}).selectOption(seed.rileyId);await expect(live.locator('.dash-forecast')).toContainText('$0.00');await expect(live.locator('.dash-forecast')).not.toContainText('$50,000.00');await expect(saved.locator('.dash-forecast')).toContainText('$50,000.00');
  await page.getByLabel('Owner',{exact:true}).selectOption(seed.ownerId);await expect(live.locator('.dash-forecast')).toContainText('$50,000.00');
  const quarter=from.slice(0,4)+'-'+String(Math.floor((Number(from.slice(5,7))-1)/3)*3+1).padStart(2,'0')+'-01';
  await call(ownerCookie,forecast+'/quotas','POST',{operatorId:seed.ownerId,period:'quarterly',startDate:quarter,amountCents:10_000_000,reason:'Synthetic quarterly goal'});
  await page.reload();await expect(live.locator('.dash-forecast')).toContainText('$50,000.00');await expect(live.locator('.dash-forecast')).toContainText('$100,000.00');assert.equal(await live.locator('.dash-forecast').getByRole('button',{name:/\$150,000/}).count(),0,'quota periods are never added together');await expect(saved.locator('.dash-forecast')).not.toContainText('$100,000.00');
  // The two quota totals and export stay in agreement with the forecast's own public result.
  const both=await call<ForecastPreview>(ownerCookie,forecast+'/preview','POST',period);assert.equal(both.result.quotaTotals.monthly.amountCents,5_000_000);assert.equal(both.result.quotaTotals.quarterly.amountCents,10_000_000);
  const bothCsv=await (await page.request.get(base+'/tiles/synthetic-orbit-quota-0/csv')).text();assert.ok(bothCsv.includes('$50,000.00')&&bothCsv.includes('$100,000.00'));
  await call(ownerCookie,forecast+'/quotas','POST',{operatorId:seed.ownerId,period:'monthly',startDate:from,amountCents:0,reason:'Synthetic goal withdrawn'});await page.reload();await expect(live.locator('.dash-forecast')).not.toContainText('$50,000.00');await expect(saved.locator('.dash-forecast')).toContainText('$50,000.00');
  assert.equal(JSON.parse((await call(ownerCookie,`/api/v1/records/opportunity/${second.id}`)).record.custom_fields_json).import_source,provenance,'picking fields never mutates importer provenance');

 }finally{
  await run.context.close();
  if(id)await call(ownerCookie,root+'/dashboards/'+id,'DELETE',{confirmed:true});
  await call(ownerCookie,`/api/v1/records/opportunity/${first.id}`,'DELETE',{confirmed:true});
  await call(ownerCookie,`/api/v1/records/opportunity/${second.id}`,'DELETE',{confirmed:true});
 }
}
