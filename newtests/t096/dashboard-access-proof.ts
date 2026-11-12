import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {expect,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {emittedRequest} from './emitted-request';
import {watchBrowser} from './browser-observations';
import type {seedSalesReport} from './sales-report-fixture';
import type {SalesView} from '../../src/core/features/analytics/sales-view';
import type {DashboardView} from '../../src/core/features/dashboards/repository';
import {reconcileDashboard} from './browser-dashboard';
type Worker={origin:string;certificate:{cert:string}};
type Run={context:BrowserContext;errors:ReturnType<typeof watchBrowser>;page:Page};
const root='/api/v2/workspaces/workspace',ops=root+'/operations';
export async function dashboardAccessProof({worker,ownerCookie,seller,seed,id,disclosed,evidence,open,shot,call}:{browser:Browser;worker:Worker;ownerCookie:string;seller:{cookie:string;operatorId:string};seed:Awaited<ReturnType<typeof seedSalesReport>>;id:string;disclosed:Record<number,string>;evidence:string;open:(width:number,cookie?:string)=>Promise<Run>;shot:(page:Page,name:string)=>Promise<void>;call:<T=any>(cookie:string,path:string,method?:string,body?:unknown)=>Promise<T>}){
 const base=root+'/dashboards/'+id,document='/app/dashboards/'+id;
 assert.equal((await emittedRequest(worker,'',document)).status,401,'dashboard documents require native sign-in');
 // A newer source definition makes a saved tile's older version a meaningful navigation check.
 const original=await call<DashboardView>(ownerCookie,base),savedTile=original.tiles.find(tile=>tile.status==='ready'&&tile.report?.saved);
 assert.ok(savedTile?.status==='ready'&&savedTile.report);
 await call(ownerCookie,ops+'/metrics','POST',{id:savedTile.report.definitionId,version:savedTile.report.definitionVersion+1,definition:{...savedTile.report.definition,name:'Quarterly sales evidence revised',description:'A later definition must not replace a tile’s saved version'}});
 const full=await call<DashboardView>(ownerCookie,base);reconcileDashboard(full);
 assert.ok(full.tiles.some(tile=>tile.status==='ready'&&tile.report&&tile.report.definitionVersion>savedTile.report!.definitionVersion));
 const definitions=async(page:Page,view:DashboardView,width:number,label:string)=>{
  for(const tile of view.tiles){
   const article=page.locator('.dash-tile').filter({has:page.locator(`#tile-${tile.id}-title`)});
   if(tile.status!=='ready'||!tile.report){await expect(article.getByRole('link',{name:/Open report definition/})).toHaveCount(0);continue;}
   const report=tile.report,fold=article.locator('.dash-basis-fold'),link=fold.getByRole('link',{name:`Open report definition · v${report.definitionVersion}`,exact:true});
   await fold.locator('summary').focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');await expect(link).toBeFocused();
   const href=await link.getAttribute('href');assert.ok(href);const address=new URL(href,worker.origin);
   assert.equal(address.pathname,'/app/reports/'+report.definitionId);assert.equal(address.searchParams.get('version'),String(report.definitionVersion));
   const [response]=await Promise.all([page.waitForResponse(response=>response.url().endsWith(ops+'/reports/'+report.definitionId+'/preview')&&response.request().postDataJSON().version===report.definitionVersion&&response.status()===200),page.keyboard.press('Enter')]);
   await expect(page).toHaveURL(address.href);
   const opened=await response.json() as SalesView;assert.equal(opened.definitionId,report.definitionId);assert.equal(opened.definitionVersion,report.definitionVersion);
   assert.equal(opened.period.fromMonth,report.period.fromMonth);assert.equal(opened.period.throughMonth,report.period.throughMonth);assert.equal(opened.timezone,report.timezone);assert.equal(opened.currency,report.currency);
   const result=page.locator('.sales-result');await expect(result).toHaveAttribute('aria-busy','false');
   await result.locator('.reports-basis>summary').click();await expect(result.locator('.sales-result__name')).toHaveText(`${opened.name} · version ${report.definitionVersion}`);
   const disclosure=result.getByLabel('Report basis',{exact:true});
   for(const text of [opened.period.from,opened.period.through,opened.timezone,opened.currency,opened.freshness,...opened.missing])await expect(disclosure).toContainText(text);
   await expect(disclosure).toContainText('Missing data');
   for(const section of report.sections){await expect(result).toContainText(section.definition);await expect(result).toContainText('Source fields: '+section.sources.join(', ')+'.');}
   if(!view.canEdit){await expect(disclosure).toContainText('Limited to your access');await expect(result).not.toContainText(/Atlas expansion|Birch rollout|Cedar renewal|Hazel expansion|Riley Chen/);}
   if(tile.report.saved){assert.equal(opened.definitionVersion,savedTile.report!.definitionVersion);await shot(page,`definition-${label}-${width}`);}
   await page.goto(document);await expect(page.locator('.dash-grid')).toHaveAttribute('aria-busy','false');
  }
  const reportTile=view.tiles.find(tile=>tile.status==='ready'&&tile.report);assert.ok(reportTile?.status==='ready'&&reportTile.report);
  const basis=page.locator(`#tile-${reportTile.id}-title`).locator('..').locator('..').locator('.dash-basis-fold');
  await basis.locator('summary').click();await shot(page,`definition-link-${label}-${width}`);await basis.locator('summary').click();
 };
 for(const width of [1440,390]){
  const run=await open(width),page=run.page,releases:(()=>void)[]=[];
  try{
   // Delay an actual request, never replace an application response, to inspect the real first-load frames.
   let release!:()=>void;const hold=new Promise<void>(resolve=>{release=resolve;});releases.push(()=>release());await page.route('**'+base,async route=>{await hold;await route.continue();});
   await page.goto(document,{waitUntil:'domcontentloaded'});await expect(page.locator('.dash-tile').filter({hasText:'Computing under your access…'}).first()).toBeVisible();await shot(page,`loading-${width}`);release();await page.unrouteAll({behavior:'wait'});await expect(page.locator('.dash-grid')).toHaveAttribute('aria-busy','false');
   await shot(page,`dashboard-operator-${width}`);await expect(page.locator('.dash-summary')).toContainText('9 tiles');
   // While the filters equal the saved ones the saved period is selected as itself, with no date inputs until a custom range is chosen.
   await expect(page.getByLabel('Date range',{exact:true})).toHaveValue('saved');await expect(page.getByLabel('Start date',{exact:true})).toHaveCount(0);const readyTitles=await page.locator('.dash-tile h2').allTextContents();
   for(const detail of await page.locator('.dash-tile>details').all()){await detail.locator('summary').click();await expect(detail.locator('.sales-basis, p').first()).toBeVisible();await detail.locator('summary').click();}
   await definitions(page,full,width,'owner');
   const stage=page.locator('.dash-tile--chart'),cell=stage.getByRole('button').filter({hasText:/^[1-9]\d*$/}).first(),shown=(await cell.textContent())!.trim();await cell.click();const drawer=page.getByRole('dialog');await expect(drawer.locator('.sales-drill')).toBeVisible();await expect(drawer.locator('.sales-drill [role=status]')).toContainText(`${shown} record`);await shot(page,`drill-${width}`);await page.keyboard.press('Escape');await expect(drawer).toHaveCount(0);await expect(cell).toBeFocused();
   // The default menu closes on Escape and gives focus back to its button; every action is reachable without a More menu at both widths.
   const defaults=page.getByRole('button',{name:'Your default dashboard',exact:true});await defaults.click();await expect(page.getByRole('menuitem',{name:'Remove as my default',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('menu')).toHaveCount(0);await expect(defaults).toBeFocused();
   await page.getByRole('button',{name:'Edit tiles',exact:true}).click();await shot(page,`edit-tiles-${width}`);await page.getByRole('button',{name:'Save dashboard version',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
   await page.getByRole('button',{name:'Share',exact:true}).click();await expect(page.getByRole('dialog').getByLabel('Add a person',{exact:true})).toBeVisible();await shot(page,`share-${width}`);await page.getByRole('button',{name:'Close dialog',exact:true}).click();
   await page.getByRole('button',{name:'Schedule email',exact:true}).click();await expect(page.getByRole('dialog').getByLabel('Slack channel',{exact:true})).toHaveValue('');await shot(page,`schedule-${width}`);await page.getByRole('dialog').evaluate(dialog=>{dialog.scrollTop=dialog.scrollHeight;});await shot(page,`schedule-footer-${width}`);await page.getByRole('button',{name:'Close dialog',exact:true}).click();
   await page.goto('/app/reports?dashboards=all');await expect(page.getByRole('region',{name:'Dashboards',exact:true}).getByText('Your default',{exact:true})).toBeVisible();await shot(page,`reports-default-${width}`);
   await page.goto(document);await expect(page.locator('.dash-grid')).toHaveAttribute('aria-busy','false');if(width===390)await page.locator('.dash-filters summary').click();
   let resume!:()=>void;const blocked=new Promise<void>(resolve=>{resume=resolve;});releases.push(()=>resume());await page.route('**'+base+'/compute',async route=>{await blocked;await route.continue();});await page.getByLabel('Owner',{exact:true}).selectOption(seed.ownerId);await expect(page.locator('.dash-summary')).toHaveText('Updating…');await shot(page,`refetch-${width}`);resume();await page.unrouteAll({behavior:'wait'});await expect(page.locator('.dash-grid')).toHaveAttribute('aria-busy','false');if(width===390){await page.getByRole('button',{name:'Remove owner filter',exact:true}).click();await expect(page.getByLabel('Owner',{exact:true})).toHaveValue('');await expect(page.locator('.dash-grid')).toHaveAttribute('aria-busy','false');await page.getByLabel('Owner',{exact:true}).selectOption(seed.ownerId);await expect(page.locator('.dash-grid')).toHaveAttribute('aria-busy','false');}await expect(page.locator('.dash-tile--pipeline').first()).toContainText('Date range not applied');assert.deepEqual(full.fields,[{name:'Region',values:['Northeast','West']}]);assert.deepEqual(await page.getByLabel('Region',{exact:true}).locator('option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value).filter(Boolean)),['Region:Northeast','Region:West']);await page.getByLabel('Region',{exact:true}).selectOption('Region:Northeast');await expect(page.locator('.dash-tile--number.dash-tile--pipeline .dash-number')).toContainText('$8,000.00');await shot(page,`filter-not-applied-${width}`);
   const filtered=await call<DashboardView>(ownerCookie,base+'/compute','POST',{...full.filters,ownerIds:[seed.ownerId],field:{name:'Region',value:'Northeast'}});reconcileDashboard(filtered);const pipeline=filtered.tiles.find(t=>t.status==='ready'&&t.tile.measure==='pipeline');assert.ok(pipeline?.status==='ready'&&pipeline.report);assert.equal(pipeline.report.sections[0]!.totals.find(c=>c.key==='value')!.value,800_000,'only the manager’s Northeast open deal is counted; the West deal is excluded');
   await page.getByLabel('Date range',{exact:true}).selectOption('custom');
   await Promise.all([page.waitForResponse(response=>response.url().endsWith(base+'/compute')&&response.request().postDataJSON().dateRange?.from==='1900-01-01'&&response.status()===200),page.getByLabel('Start date',{exact:true}).fill('1900-01-01')]);
   await expect(page.locator('.dash-grid')).toHaveAttribute('aria-busy','false');await expect(page.getByLabel('Start date',{exact:true})).toHaveValue('1900-01-01');
   await Promise.all([page.waitForResponse(response=>response.url().endsWith(base+'/compute')&&response.request().postDataJSON().dateRange?.through==='1900-01-31'&&response.status()===200),page.getByLabel('End date',{exact:true}).fill('1900-01-31')]);
   await expect(page.locator('.dash-grid')).toHaveAttribute('aria-busy','false');await expect(page.locator('.dash-tile--win_rate')).toContainText('Not available');await shot(page,`no-value-${width}`);
   // The filter refuses an end before the start: an alert, no computation, and the period stays.
   let computes=0;page.on('request',request=>{if(request.url().endsWith(base+'/compute'))computes++;});const period=await page.locator('.dash-tile--win_rate>.dash-meta').textContent();await page.getByLabel('Start date',{exact:true}).fill('1901-01-01');await expect(page.locator('.dash-filters').getByRole('alert')).toBeVisible();await expect(page.locator('.dash-tile--win_rate>.dash-meta')).toHaveText(period!);await Promise.all([page.waitForResponse(response=>response.url().endsWith(base+'/compute')),page.getByLabel('Start date',{exact:true}).fill('1900-01-01')]);assert.equal(computes,1,'only the valid range is computed');
   // A reversed range saved through the dashboards door is a real cause: every live tile's error frame keeps that tile's own name.
   const saved=await call(ownerCookie,base+'/definition'),savedFilters=saved.definition.filters,reversed=await call(ownerCookie,base,'PUT',{version:saved.version,definition:{...saved.definition,filters:{...savedFilters,from:savedFilters.through,through:savedFilters.from,dateRange:{from:`${savedFilters.through}-28`,through:`${savedFilters.from}-01`}}}});
   await page.goto(document);await expect(page.locator('.dash-tile__error').first()).toBeVisible();const errors=await call<DashboardView>(ownerCookie,base),titles=await page.locator('.dash-tile h2').allTextContents();assert.ok(errors.tiles.some(tile=>tile.status==='error'));for(const [index,tile] of errors.tiles.entries())if(tile.status==='error')assert.equal(titles[index],readyTitles[index]);await shot(page,`tile-error-${width}`);
   await call(ownerCookie,base,'PUT',{version:reversed.version,definition:saved.definition});
   await run.errors.check(evidence,`operator-states-${width}`);
  }finally{for(const release of releases)release();await page.unrouteAll({behavior:'wait'});await run.context.close();}
 }
 const empty='synthetic-orbit-empty';await call(ownerCookie,root+'/dashboards/'+empty,'PUT',{version:0,definition:{name:'A new dashboard',filters:full.filters,tiles:[]}});
 for(const width of [1440,390]){const run=await open(width);try{await run.page.goto('/app/dashboards/'+empty);await expect(run.page.getByRole('heading',{name:'No tiles yet',exact:true})).toBeVisible();await shot(run.page,`dashboard-empty-${width}`);await run.page.goto('/app/reports');const choice=run.page.getByRole('region',{name:'Dashboards',exact:true}).getByRole('listitem').filter({has:run.page.getByRole('button',{name:'Make this my default',exact:true})});await choice.getByRole('link').focus();await expect(choice.getByRole('button',{name:'Make this my default',exact:true})).toBeVisible();await shot(run.page,`reports-with-choices-${width}`);await run.errors.check(evidence,`dashboard-empty-${width}`);}finally{await run.context.close();}}
 // The collaborator has report-reading permission alone and explicit current record grants.
 await call(ownerCookie,root.replace('/workspaces/workspace','')+'/access/workspaces/workspace/roles/seller','PUT',{actions:['analytics.read'],fields:['*']});
 const grants=[];for(const deal of [seed.deals.dune,seed.deals.elm])grants.push(await call(ownerCookie,'/api/v2/access/workspaces/workspace/grants','POST',{subjectKind:'operator',subjectId:seller.operatorId,resourceType:'opportunity',resourceId:deal,actions:['graph.read','entries.read'],fields:['*'],purpose:'Dashboard review',expiresAt:null}));
 const deniedHistory=[1440,390].map(width=>`${ops}/metrics/${disclosed[width]}/versions/1/snapshots`);for(const path of deniedHistory){const denied=await emittedRequest(worker,seller.cookie,path);assert.equal(denied.status,409,'an unrelated Sum snapshot is refused by its current source-lineage fence');assert.doesNotMatch(await denied.text(),/First open deal|Second open deal|Harbor Freight|195000|1,950/);}
 // A named viewer can read the dashboard and pick a personal default without changing its definition or sharing.
 const readerDefinition=await call(ownerCookie,base+'/definition'),readerShare=await call(ownerCookie,base+'/sharing');
 assert.equal(readerShare.audience,'named');assert.equal(readerShare.grants.find((grant:any)=>grant.operatorId===seller.operatorId).access,'view');
 for(const [path,method,body] of [[base+'/definition','GET',undefined],[base,'PUT',{...readerDefinition,definition:{...readerDefinition.definition,name:'Reader must not rename'}}],[base+'/sharing','GET',undefined],[base+'/sharing','PUT',{version:readerShare.version,audience:'workspace',grants:[]}]] as const){const denied=await emittedRequest(worker,seller.cookie,path,method,body);assert.equal(denied.status,403);assert.deepEqual(Object.keys(await denied.json() as object),['error']);}
 assert.deepEqual(await call(ownerCookie,base+'/definition'),readerDefinition);assert.deepEqual(await call(ownerCookie,base+'/sharing'),readerShare);
 await call(seller.cookie,base+'/default','PUT',{enabled:true});const limited=await call<DashboardView>(seller.cookie,base);assert.equal(limited.limited,true);assert.equal(limited.canEdit,false);assert.equal(limited.canManage,false);assert.equal(limited.isDefault,true);reconcileDashboard(limited);
 const readerPipeline=limited.tiles.find(t=>t.status==='ready'&&t.tile.measure==='pipeline');assert.ok(readerPipeline?.status==='ready'&&readerPipeline.report);
 assert.equal(readerPipeline.report.sections[0]!.totals.find(cell=>cell.key==='deals')!.value,2);
 assert.equal(readerPipeline.report.sections[0]!.totals.find(cell=>cell.key==='value')!.value,2_300_000);
 assert.deepEqual(readerPipeline.report.sections[0]!.totals.find(cell=>cell.key==='deals')!.rows.sort(),[`deal:${seed.deals.dune}`,`deal:${seed.deals.elm}`].sort());
 assert.equal(readerPipeline.report.rows[`deal:${seed.deals.dune}`]!.label,'Dune pilot');assert.equal(readerPipeline.report.rows[`deal:${seed.deals.elm}`]!.label,'Elm upgrade');
 assert.equal((await call<DashboardView>(ownerCookie,base)).isDefault,full.isDefault,'the reader changes only their own default');
 assert.equal(limited.unavailable,2);const text=JSON.stringify(limited);for(const hidden of ['Atlas expansion','Birch rollout','Cedar renewal','Hazel expansion','Riley Chen'])assert.ok(!text.includes(hidden),hidden);
 for(const width of [1440,390]){const run=await open(width,seller.cookie);for(const path of deniedHistory)run.errors.allowDeniedResource(path,409);try{await run.page.goto('/app/reports');const directory=run.page.getByRole('region',{name:'Dashboards',exact:true});await expect(directory.getByText('Your default',{exact:true})).toBeVisible();await directory.getByRole('link',{name:full.name,exact:true}).click();await expect(run.page).toHaveURL(new RegExp('/app/dashboards/'+id+'$'));await expect(run.page.locator('.dash-access')).toContainText('Limited to your access');await expect(run.page.locator('.dash-grid')).toHaveAttribute('aria-busy','false');await expect(run.page.getByRole('button',{name:'Edit tiles',exact:true})).toHaveCount(0);await expect(run.page.getByRole('button',{name:'Share',exact:true})).toHaveCount(0);await expect(run.page.locator('.dash-tile--number.dash-tile--pipeline .dash-number')).toContainText('$23,000.00');await expect(run.page.locator('.dash-tile--activities')).toContainText('per-person groups are withheld');await shot(run.page,`dashboard-restricted-${width}`);await definitions(run.page,limited,width,'reader');const permittedCell=run.page.locator('.dash-tile--chart').getByRole('button').filter({hasText:/^[1-9]\d*$/}).first(),count=(await permittedCell.textContent())!.trim();await permittedCell.click();await expect(run.page.getByRole('dialog').locator('.sales-drill [role=status]')).toContainText(`${count} record`);const drillRows=run.page.getByRole('dialog').locator('.sales-drill ol>li>a');await expect(drillRows).toHaveCount(Number(count));for(const label of await drillRows.allTextContents())assert.ok(['Dune pilot','Elm upgrade'].includes(label),label);await shot(run.page,`drill-restricted-${width}`);await run.page.keyboard.press('Escape');await run.errors.check(evidence,`dashboard-restricted-${width}`);}finally{await run.context.close();}}
 const shared=await call(ownerCookie,base+'/sharing');await call(ownerCookie,base+'/sharing','PUT',{version:shared.version,audience:'workspace',grants:[]});assert.equal((await call(seller.cookie,base)).name,full.name,'workspace sharing opens the definition without granting another record');
 // Source sharing is independent of dashboard sharing.
 for(const width of [1440,390]){
  const run=await open(width,seller.cookie);
  try{
   await run.page.goto(document);await expect(run.page.locator('.dash-grid')).toHaveAttribute('aria-busy','false');
   const basis=run.page.locator('.dash-tile--number.dash-tile--pipeline .dash-basis-fold');await basis.locator('summary').click();
   const link=basis.getByRole('link',{name:/Open report definition/});await link.focus();await expect(link).toBeFocused();const href=await link.getAttribute('href');assert.ok(href);
   const sourceShare=await call(ownerCookie,ops+'/reports/synthetic-orbit-sales/sharing');await call(ownerCookie,ops+'/reports/synthetic-orbit-sales/sharing','PUT',{revision:sourceShare.revision,audience:'private',operatorIds:[]});
   await run.page.keyboard.press('Enter');await expect(run.page).toHaveURL(new URL(href,worker.origin).href);await expect(run.page.getByRole('heading',{name:'Not found',exact:true})).toBeVisible();await expect(run.page.locator('.sales-result')).toHaveCount(0);
   const denied=await emittedRequest(worker,seller.cookie,ops+'/reports/synthetic-orbit-sales/preview','POST',{version:Number(new URL(href,worker.origin).searchParams.get('version')),from:full.filters.from,through:full.filters.through});assert.equal(denied.status,403);assert.deepEqual(Object.keys(await denied.json() as object),['error']);
   const unavailable=await call<DashboardView>(seller.cookie,base);assert.equal(unavailable.unavailable,9);for(const tile of unavailable.tiles)assert.deepEqual(Object.keys(tile).sort(),['height','id','status','width']);
   await run.page.goto(document);await expect(run.page.locator('.dash-tile--unavailable')).toHaveCount(9);await expect(run.page.getByRole('link',{name:/Open report definition/})).toHaveCount(0);await shot(run.page,`source-no-longer-shared-${width}`);await run.errors.check(evidence,`source-no-longer-shared-${width}`);
  }finally{await run.context.close();}
  const sourceShare=await call(ownerCookie,ops+'/reports/synthetic-orbit-sales/sharing');await call(ownerCookie,ops+'/reports/synthetic-orbit-sales/sharing','PUT',{revision:sourceShare.revision,audience:'workspace',operatorIds:[]});
 }
 // Revocation changes the very next computation, CSV and PDF; neither export reuses an on-screen result.
 await call(ownerCookie,'/api/v2/access/workspaces/workspace/grants/'+grants[1].id,'DELETE',{});const revoked=await call<DashboardView>(seller.cookie,base);reconcileDashboard(revoked);assert.ok(!JSON.stringify(revoked).includes('Elm upgrade'));const number=revoked.tiles.find(t=>t.status==='ready'&&t.tile.measure==='pipeline');assert.ok(number?.status==='ready'&&number.report);assert.equal(number.report.sections[0]!.totals.find(c=>c.key==='value')!.value,800_000);
 for(const width of [1440,390]){const run=await open(width,seller.cookie);try{await run.page.goto(document);await expect(run.page.locator('.dash-tile--number.dash-tile--pipeline .dash-number')).toContainText('$8,000.00');await shot(run.page,`access-revoked-${width}`);await run.errors.check(evidence,`access-revoked-${width}`);}finally{await run.context.close();}}
 const csv=await emittedRequest(worker,seller.cookie,`${base}/tiles/${number.id}/csv`);assert.equal(csv.status,200);assert.ok((await csv.text()).includes('$8,000.00'));const pdf=await emittedRequest(worker,seller.cookie,base+'/pdf');assert.equal(pdf.status,200);const bytes=Buffer.from(await pdf.arrayBuffer());await writeFile(join(evidence,'dashboard-restricted.pdf'),bytes);assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.ok(!bytes.toString().includes('Elm upgrade'));
 // Revoke the dashboard share itself. The remaining record grant and source sharing stay intact.
 for(const width of [1440,390]){
  const share=await call(ownerCookie,base+'/sharing');await call(ownerCookie,base+'/sharing','PUT',{version:share.version,audience:'named',grants:[{operatorId:seller.operatorId,access:'view'}]});
  const run=await open(width,seller.cookie);for(const path of deniedHistory)run.errors.allowDeniedResource(path,409);for(const path of [base,base+'/outline',base+'/compute'])run.errors.allowDeniedResource(path,403);
  try{
   await run.page.goto(document);await expect(run.page.locator('.dash-grid')).toHaveAttribute('aria-busy','false');await expect(run.page.locator('.dash-tile--number.dash-tile--pipeline .dash-number')).toContainText('$8,000.00');
   const drill=run.page.locator('.dash-tile--chart').getByRole('button').filter({hasText:/^[1-9]\d*$/}).first();
   const current=await call(ownerCookie,base+'/sharing');await call(ownerCookie,base+'/sharing','PUT',{version:current.version,audience:'private',grants:[]});
   await drill.click();await expect(run.page.getByRole('alert')).toContainText('Dashboard unavailable.');await expect(run.page.locator('.dash-tile')).toHaveCount(0);await expect(run.page.getByRole('dialog')).toHaveCount(0);
   await run.page.reload();await expect(run.page.getByRole('alert')).toContainText('Dashboard unavailable.');await expect(run.page.getByRole('heading',{name:full.name,exact:true})).toHaveCount(0);await expect(run.page.locator('.dashboard')).not.toContainText(/Dune pilot|Elm upgrade|\$8,000|\$23,000/);await shot(run.page,`dashboard-share-revoked-${width}`);
   await Promise.all([run.page.waitForResponse(response=>response.url().endsWith(root+'/dashboards')&&response.status()===200),run.page.goto('/app/reports')]);await expect(run.page.getByRole('region',{name:'Dashboards',exact:true}).getByRole('link',{name:full.name,exact:true})).toHaveCount(0);await shot(run.page,`default-share-revoked-${width}`);await run.errors.check(evidence,`dashboard-share-revoked-${width}`);
  }finally{await run.context.close();}
 }
 for(const [path,method,body] of [[base,'GET',undefined],[base+'/compute','POST',full.filters],[base+'/outline','GET',undefined],[base+'/pdf','GET',undefined],[`${base}/tiles/${number.id}/csv`,'GET',undefined],[base+'/definition','GET',undefined],[base+'/default','PUT',{enabled:true}]] as const){const denied=await emittedRequest(worker,seller.cookie,path,method,body);assert.equal(denied.status,403);assert.deepEqual(await denied.json(),{error:'Dashboard unavailable.'});}
 assert.ok(!(await call(seller.cookie,root+'/dashboards')).items.some((item:any)=>item.id===id));
 assert.equal((await call(seller.cookie,`${root}/records/opportunity/${seed.deals.dune}`)).ref.id,seed.deals.dune,'share revocation never substitutes for record revocation');
 const privateShare=await call(ownerCookie,base+'/sharing');await call(ownerCookie,base+'/sharing','PUT',{version:privateShare.version,audience:'workspace',grants:[]});
 for(const grant of grants)await call(ownerCookie,'/api/v2/access/workspaces/workspace/grants/'+grant.id,'DELETE',{});await call(seller.cookie,base+'/default','PUT',{enabled:false});
}
