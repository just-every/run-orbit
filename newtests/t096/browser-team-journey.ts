import {emittedWorker} from './emitted-fixture';
import {slackNetwork} from '../../tests/support/slack-network';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import assert from 'node:assert/strict';
import {chromium,expect,type Browser} from '@playwright/test';
import {join} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {createApp} from '../../tests/support/app';
import {signIn,fixture} from './fixture';
import {defaultSalesProfile} from '../../src/core/features/teams/policy';
export async function teamBrowserSeed(f:Awaited<ReturnType<typeof fixture>>){
 const app=createApp({database:f.db,sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)})!,captureOrigin:'https://orbit.test',assets:{fetch:async()=>new Response('')}}),people=[];
 for(const name of ['Jordan Seller','Avery Manager']){const email=name.split(' ')[0].toLowerCase()+'@'+'team-browser.test';const result=await app.request('https://orbit.test/api/v1/settings/operators',{method:'POST',headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({email,displayName:name})});assert.equal(result.status,201);people.push(await signIn(f.db,email));}
 const edge=slackNetwork();try{const response=await app.request('https://orbit.test/api/v1/settings/slack/connect',{method:'POST',headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({token:edge.token,signingSecret:edge.secret})});assert.equal(response.status,200,await response.clone().text());}finally{edge.restore();}
 return{rep:people[0]!,manager:people[1]!};
}
export async function teamBrowserJourney(browser:Browser,origin:string,directory:string,cookie:string,seed:Awaited<ReturnType<typeof teamBrowserSeed>>){
 const context=await browser.newContext({baseURL:origin,viewport:{width:1440,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:cookie}}),page=await context.newPage();
 const call=async(path:string,body?:unknown,method=body===undefined?'GET':'POST')=>{const response=await context.request.fetch(path,{method,...(body===undefined?{}:{data:body}),headers:{Origin:origin}});assert.ok(response.ok(),`${path}: ${response.status()} ${await response.text()}`);return response.json();};
 try{
 const settings='/api/v1/settings/teams';for(const [person,role]of [[seed.rep,'seller'],[seed.manager,'manager']] as const)await call(settings+'/roles/'+person.operator.operatorId,defaultSalesProfile(role),'PUT');
 const team=await call(settings,{name:'West sales',active:true,defaultDashboardId:null});await call(settings+'/'+team.id+'/members',{operatorIds:[seed.rep.operator.operatorId,seed.manager.operator.operatorId]},'PUT');
 await call('/api/v1/library',{kind:'template',name:'West team follow-up',subject:'Next steps',body:'Thank you for our conversation. Shall we review the next step?',visibility:'shared',teamId:team.id});
 const company=await call('/api/v1/records/company',{name:'West account',primary_domain:'west-business.test'}),review=await call('/api/v1/records/ownership/review',{kind:'company',ids:[company.id],ownerId:seed.rep.operator.operatorId});await call('/api/v1/records/ownership/'+review.id+'/apply',{});
 const workspace=await call('/api/v1/settings'),stage=workspace.stages[0].id;await call('/api/v1/records/opportunity',{title:'West renewal',stage_id:stage,owner_id:seed.rep.operator.operatorId,company_id:company.id,value_cents:800000,expected_close_at:'2026-11-15T17:00:00Z'});
 const root='/api/v2/workspaces/workspace';await call(root+'/forecast/stages',{stageId:stage,probability:60,category:'pipeline',reason:'Reviewed West opportunities'});await call(root+'/forecast/quotas',{teamId:team.id,period:'monthly',startDate:'2026-11-01',amountCents:2000000,reason:'West sales goal'});await call(root+'/operations/metrics',{id:'team-browser-pipeline',version:1,definition:{kind:'sales',name:'West pipeline',description:'Current permitted West pipeline',measures:['pipeline','activities'],pipelineIds:[],repIds:[],groupBy:'owner',bucket:'month'},sharing:{audience:'teams',operatorIds:[],teamIds:[team.id]}});
 const dashboard=root+'/dashboards/west-sales';await call(dashboard,{version:0,definition:{name:'West sales',filters:{ownerIds:[],pipelineIds:[],teamIds:[],from:'2026-10',through:'2026-11',field:null},tiles:[{id:'pipeline',source:'report',sourceId:'team-browser-pipeline',version:'live',snapshotId:null,measure:'pipeline',kind:'number',width:6,height:1,bindings:{}}]}},'PUT');await call(dashboard+'/sharing',{version:1,audience:'teams',grants:[],teamGrants:[{teamId:team.id,access:'view'}]},'PUT');await call(dashboard+`/teams/${team.id}/default`,{enabled:true},'PUT');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto('/app/settings');const teams=page.locator('.sales-teams');await expect(teams.getByRole('heading',{name:'Sales roles and teams',exact:true})).toBeVisible();await teams.locator('summary').filter({hasText:'Jordan Seller'}).click();await expect(teams.getByLabel('Sales role',{exact:true}).first()).toBeVisible();await teams.locator('summary').filter({hasText:'Manage record privacy'}).click();await teams.getByLabel('Record privacy selection',{exact:true}).selectOption('company:'+company.id);if(await teams.getByLabel('Record visibility',{exact:true}).inputValue()==='restricted'){await teams.getByLabel('Record visibility',{exact:true}).selectOption('workspace');await expect(teams.getByRole('status')).toContainText('Saved');}await teams.getByLabel('Record visibility',{exact:true}).selectOption('restricted');await expect(teams.getByRole('status')).toContainText('Saved');await teams.scrollIntoViewIfNeeded();await teams.screenshot({path:join(directory,`team-settings-${width}.png`)});
  const capacity=page.locator('section').filter({has:page.getByRole('heading',{name:'Sending capacity',exact:true})}).last();await capacity.scrollIntoViewIfNeeded();await capacity.screenshot({path:join(directory,`team-capacity-${width}.png`)});
  const slack=page.locator('section').filter({has:page.getByRole('heading',{name:/Slack/})}).last();await expect(slack.getByLabel('Channel audience',{exact:true})).toBeVisible();await slack.getByLabel('Channel audience',{exact:true}).selectOption(team.id);await slack.scrollIntoViewIfNeeded();await slack.screenshot({path:join(directory,`team-slack-${width}.png`)});
  await page.goto('/app/library');await expect(page.getByRole('heading',{name:'Message library',exact:true})).toBeVisible();await page.getByRole('button',{name:/West team follow-up/}).click();await expect(page.getByLabel('Sales team',{exact:true})).toHaveValue(team.id);await page.screenshot({path:join(directory,`team-library-${width}.png`),fullPage:true});
  await page.goto('/app/reports');await expect(page.getByRole('heading',{name:'Reports',exact:true}).first()).toBeVisible();await page.screenshot({path:join(directory,`team-reports-${width}.png`)});const forecast=page.locator('#forecast');await forecast.scrollIntoViewIfNeeded();await forecast.screenshot({path:join(directory,`team-forecast-${width}.png`)});
  await page.goto('/app/dashboards/west-sales');await expect(page.getByRole('heading',{name:'West sales',exact:true})).toBeVisible();await page.screenshot({path:join(directory,`team-dashboard-${width}.png`),fullPage:true});
  const repContext=await browser.newContext({baseURL:origin,viewport:{width,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:seed.rep.cookie}}),repPage=await repContext.newPage();try{await repPage.goto('/app/shared-records?kind=company');await expect(repPage.getByRole('button',{name:'West account',exact:true})).toBeVisible();await repPage.getByRole('button',{name:'West account',exact:true}).click();await expect(repPage.getByRole('heading',{name:'West account',exact:true})).toBeVisible();await repPage.screenshot({path:join(directory,`team-restricted-record-${width}.png`),fullPage:true});const denied=await repContext.request.get(settings);assert.equal(denied.status(),403);}finally{await repContext.close();}
 }
 }finally{await context.close();}
}

/** Isolated emitted product walk; also reusable locally without the unrelated native journeys. */
export async function teamBrowserProof(directory:string){
 await mkdir(directory,{recursive:true,mode:0o700});
 const f=await fixture();let worker:Awaited<ReturnType<typeof emittedWorker>>|undefined,browser:Browser|undefined;
 try{const seed=await teamBrowserSeed(f);worker=await emittedWorker(f.target,undefined,{ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)});browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic','--disable-gpu',...worker.browserArgs]});await teamBrowserJourney(browser,worker.origin,directory,f.cookie,seed);}
 finally{await browser?.close();await worker?.dispose();await f.close();}
}
