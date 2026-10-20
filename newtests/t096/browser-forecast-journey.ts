import assert from 'node:assert/strict';
import {join} from 'node:path';
import {expect,type Browser,type Page} from '@playwright/test';
import {accessible,watchBrowser} from './browser-observations';
import type {ForecastPreview,ForecastSnapshot,ForecastState} from '../../src/core/features/forecast/types';
import type {ForecastJourneyProof} from './forecast-archive-journey';

const base='/api/v2/workspaces/workspace/forecast';
export async function forecastBrowserJourney(browser:Browser,origin:string,directory:string,cookie:string,limitedCookie:string):Promise<ForecastJourneyProof>{
 const now=new Date(),from=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString().slice(0,10),through=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)).toISOString().slice(0,10),quarter=new Date(Date.UTC(now.getUTCFullYear(),Math.floor(now.getUTCMonth()/3)*3,1)).toISOString().slice(0,10),close=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,0)).toISOString().slice(0,10);
 const setup=await browser.newContext({baseURL:origin,ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:cookie}});
 const request=async(path:string,method='GET',data?:unknown)=>{const response=await setup.request.fetch(path,{method,...(data===undefined?{}:{data}),headers:{Origin:origin}});assert.equal(response.ok(),true,`${method} ${path}: ${response.status()} ${await response.text()}`);return response.json();};
 const period={from,through};
 // A snapshot taken before these customers exists must remain readable after their erasure.
 const empty=await request(`${base}/preview`,'POST',period) as ForecastPreview;
 const unrelated=await request(`${base}/snapshots`,'POST',{...period,reviewHash:empty.reviewHash}) as ForecastSnapshot;
 const settings=await request('/api/v1/settings');
 await request('/api/v1/settings/stages','PUT',{stages:[...settings.stages.map((stage:any)=>({id:stage.id,name:stage.name})),{name:'Forecast proposal'},{name:'Unreviewed forecast'}]});
 const state=await request(base) as ForecastState;
 const firstStage=state.stages[0]!.id,secondStage=state.stages.find(stage=>stage.name==='Forecast proposal')!.id,unreviewed=state.stages.find(stage=>stage.name==='Unreviewed forecast')!.id;
 const rep=await request('/api/v1/settings/operators','POST',{email:'forecast-rep@browser.test',displayName:'Jordan Sales'});
 const contact=await request('/api/v1/records/contact','POST',{name:'Forecast buyer',email:'buyer@forecast-browser.test'});
 const first=await request('/api/v1/records/opportunity','POST',{title:'Harbor annual platform',stage_id:firstStage,owner_id:state.operators[0]!.id,value_cents:1000000,expected_close_at:close+'T12:00:00.000Z',contact_ids:[contact.id],primary_contact_id:contact.id});
 const second=await request('/api/v1/records/opportunity','POST',{title:'Summit expansion',stage_id:secondStage,owner_id:rep.id,value_cents:2000000,expected_close_at:close+'T12:00:00.000Z'});
 await request('/api/v1/records/opportunity','POST',{title:'Date and probability need review',stage_id:unreviewed,value_cents:500000});
 const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);await request('/api/v1/records/opportunity','POST',{title:'Past close date needs review',stage_id:firstStage,value_cents:0,expected_close_at:yesterday+'T12:00:00.000Z'});
 const overrideReason='Buyer confirmed budget after procurement review';
 let prior:ForecastSnapshot|undefined;
 async function capture(page:Page,name:string){await accessible(page,name,directory);await page.getByRole('region',{name:'Sales forecast',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:join(directory,name+'-viewport.png')});}
 async function reviewedAction(page:Page,name:string,path:string){await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname===base+path&&response.request().method()==='POST'&&response.ok()),page.getByRole('button',{name,exact:true}).click()]);}
 for(const width of [1440,390]){
  const context=await browser.newContext({baseURL:origin,viewport:{width,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:cookie}}),errors=watchBrowser(context),page=await context.newPage();
  try{
   await page.goto('/app/records');await page.getByRole('link',{name:'Sales forecast and quotas',exact:true}).click();
   const panel=page.getByRole('region',{name:'Sales forecast',exact:true});await expect(panel).toBeVisible();
   await panel.getByRole('button',{name:'Review inputs',exact:true}).click();
   if(width===1440){
    for(const [stage,probability,category]of [[firstStage,'30','pipeline'],[secondStage,'60','best_case']] as const){await panel.getByLabel('Forecast stage',{exact:true}).selectOption(stage);await panel.getByLabel('Stage probability (%)',{exact:true}).fill(probability);await panel.getByLabel('Stage forecast category',{exact:true}).selectOption(category);await panel.getByLabel('Stage review reason',{exact:true}).fill(`Reviewed ${probability} percent with sales manager`);await reviewedAction(page,'Review stage','/stages');}
    for(const [period,start,amount]of [['monthly',from,'40000'],['quarterly',quarter,'80000']] as const){await panel.getByLabel('Quota rep',{exact:true}).selectOption(rep.id);await panel.getByLabel('Quota period',{exact:true}).selectOption(period);await panel.getByLabel('Quota start date',{exact:true}).fill(start);await panel.getByLabel('Quota amount (USD)',{exact:true}).fill(amount);await panel.getByLabel('Quota review reason',{exact:true}).fill(`Jordan reviewed ${period} target`);await reviewedAction(page,'Save quota','/quotas');}
    await panel.getByRole('button',{name:'Overview',exact:true}).click();await panel.getByLabel('Forecast from',{exact:true}).fill(from);await panel.getByLabel('Forecast through',{exact:true}).fill(through);await reviewedAction(page,'Preview forecast','/preview');
    const preview=await request(`${base}/preview`,'POST',period) as ForecastPreview;
    assert.equal(preview.result.totals.weightedExpectedCents,1500000,'10,000 × 30% + 20,000 × 60% = USD15,000, independent of engagement score');
    await expect(panel.locator('.forecast-measures').first()).toContainText('$15,000.00');
    await reviewedAction(page,'Save reviewed forecast','/snapshots');
    const history=await request(`${base}/snapshots`);prior=await request(`${base}/snapshots/${history.snapshots[0].id}`) as ForecastSnapshot;assert.equal(prior.result.totals.weightedExpectedCents,1500000);
    // Change the same public input after a preview: saving stale reviewed numbers must be refused.
    const stale=await request(`${base}/preview`,'POST',period) as ForecastPreview;
    await panel.getByRole('button',{name:'Review inputs',exact:true}).click();await panel.getByLabel('Forecast deal',{exact:true}).selectOption(first.id);await panel.getByLabel('Deal probability override (%)',{exact:true}).fill('80');await panel.getByLabel('Deal category override',{exact:true}).selectOption('committed');
    await panel.getByRole('button',{name:'Add schedule line',exact:true}).click();await panel.getByLabel('Line 1 label',{exact:true}).fill('Platform subscription');await panel.getByLabel('Line 1 frequency',{exact:true}).selectOption('monthly');await panel.getByLabel('Line 1 amount (USD)',{exact:true}).fill('1000');await panel.getByLabel('Line 1 start date',{exact:true}).fill(from);
    await panel.getByRole('button',{name:'Add schedule line',exact:true}).click();await panel.getByLabel('Line 2 label',{exact:true}).fill('Implementation');await panel.getByLabel('Line 2 amount (USD)',{exact:true}).fill('500');await panel.getByLabel('Line 2 start date',{exact:true}).fill(from);await panel.getByLabel('Deal forecast reason',{exact:true}).fill(overrideReason);
    await capture(page,`forecast-override-${width}`);await reviewedAction(page,'Save deal forecast',`/deals/${first.id}`);
    const refused=await setup.request.post(`${base}/snapshots`,{data:{...period,reviewHash:stale.reviewHash},headers:{Origin:origin}});assert.equal(refused.status(),409,'intervening override invalidates a prior preview');
    await request(`/api/v1/records/opportunity/${second.id}/lifecycle`,'POST',{state:'won',reason:'Signed annual agreement'});
   }else{
    await panel.getByLabel('Forecast deal',{exact:true}).selectOption(first.id);await expect(panel.getByLabel('Deal probability override (%)',{exact:true})).toHaveValue('80');await expect(panel.getByLabel('Line 1 label',{exact:true})).toHaveValue('Platform subscription');await capture(page,`forecast-override-${width}`);
   }
   await panel.getByRole('button',{name:'Overview',exact:true}).click();await panel.getByLabel('Forecast from',{exact:true}).fill(from);await panel.getByLabel('Forecast through',{exact:true}).fill(through);await reviewedAction(page,'Preview forecast','/preview');
   const current=await request(`${base}/preview`,'POST',period) as ForecastPreview;
   assert.equal(current.result.totals.weightedExpectedCents,800000);assert.equal(current.result.totals.wonBookingsCents,2000000);assert.equal(current.result.totals.committedCents,1000000);assert.equal(current.result.totals.recurringScheduledCents,100000);assert.equal(current.result.totals.oneTimeScheduledCents,50000);assert.equal(current.result.totals.mrrCents,100000);assert.equal(current.result.totals.arrCents,1200000);
   assert.deepEqual(current.result.quotaAttainment.map(row=>row.attainmentPercent).sort((a,b)=>a!-b!),[25,50]);
   await expect(panel.getByRole('complementary',{name:'Forecast input warnings'})).toContainText('Missing close date');await expect(panel.getByRole('complementary',{name:'Forecast input warnings'})).toContainText('Missing reviewed probability');await expect(panel.getByRole('complementary',{name:'Forecast input warnings'})).toContainText('Close date is in the past');const override=current.result.inputs.dealInputs.find(input=>input.dealId===first.id)!;assert.equal(override.actorId,state.operators[0]!.id);assert.equal(override.reason,overrideReason);assert.ok(Number.isFinite(Date.parse(override.reviewedAt)));
   await capture(page,`forecast-${width}`);
   await panel.getByRole('button',{name:'History',exact:true}).click();
   await panel.getByLabel('Saved forecast snapshot',{exact:true}).selectOption(prior!.id);
   await expect(panel).toContainText('$15,000.00');await expect(panel).toContainText(overrideReason);await capture(page,`forecast-history-${width}`);
   assert.deepEqual(await request(`${base}/snapshots/${prior!.id}`),prior,'win, new overrides and new reviews never rewrite prior as-of snapshot');
   await errors.check(directory,`forecast-${width}`);
  }catch(error){await page.screenshot({path:join(directory,`forecast-failure-${width}.png`),fullPage:true});console.error('Forecast page on failure:',await page.getByRole('region',{name:'Sales forecast',exact:true}).innerText());throw error;}finally{await context.close();}
 }
 const limited=await browser.newContext({baseURL:origin,ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:limitedCookie}});
 try{for(const path of [base,`${base}/snapshots`,`${base}/snapshots/${prior!.id}`])assert.equal((await limited.request.get(path)).status(),403,'a report collaborator has no current forecast access');assert.equal((await limited.request.post(`${base}/preview`,{data:period,headers:{Origin:origin}})).status(),403);}finally{await limited.close();await setup.close();}
 return{prior:prior!,unrelated,dealId:first.id,contactId:contact.id,overrideReason};
}
