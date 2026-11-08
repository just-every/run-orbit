import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const root=process.cwd();
const {fixture,nativeRecord,collaborator}=await import(root+'/newtests/t096/fixture.ts');
const {emittedWorker}=await import(root+'/newtests/t096/emitted-fixture.ts');
const {chromium,expect}=await import(root+'/node_modules/@playwright/test/index.mjs');
const f=await fixture();let worker,browser;
try{
 await f.db.prepare("UPDATE workspace_settings SET timezone='America/New_York' WHERE id='workspace'").run();
 await nativeRecord(f,'opportunity',{title:'Saved-results probe',value_cents:120000});
 const limited=process.env.PROBE_EXPORT403==='1'?(await collaborator(f,'analyst')).cookie:undefined;
 worker=await emittedWorker(f.target);
 browser=await chromium.launch({headless:true,args:worker.browserArgs});
 const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:f.cookie}});
 const page=await context.newPage();
 if(process.env.PROBE_CLOCK)await page.clock.setFixedTime(new Date(process.env.PROBE_CLOCK));
 await page.goto('/app/reports');await page.getByRole('link',{name:'Monthly sales report',exact:true}).click();
 await expect(page.locator('.sales-result')).toBeVisible();
 let release=()=>{};const held=new Promise<void>(resolve=>release=resolve);
 if(process.env.PROBE_DELAY_NAV==='1')await page.evaluate(()=>{const w=window as any,router=w.__TSR_ROUTER__,navigate=router.navigate;let resume;const hold=new Promise<void>(resolve=>resume=resolve);w.resumeSavedNavigation=resume;router.navigate=(options:any)=>options.search?.result?(w.savedNavigation=hold.then(()=>navigate(options))):navigate(options);});
 const [saveResponse]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/reports/sales-monthly/snapshots')&&response.request().method()==='POST'&&response.status()===200),page.getByRole('button',{name:'Save result',exact:true}).click()]);const savedResponse=await saveResponse.json() as any;
 await expect(page.getByText(/^Saved result · measured /)).toBeVisible();
 await page.getByRole('button',{name:'Report options',exact:true}).click();
 const history=page.getByRole('region',{name:'Saved sales results'});
 await expect(history).toBeVisible();
 if(limited){const {emittedRequest}=await import(root+'/newtests/t096/emitted-request.ts');const snapshot=savedResponse.id;assert.ok(snapshot);const path='/api/v2/workspaces/workspace/operations/snapshots/'+snapshot+'/export';const sharing='/api/v2/workspaces/workspace/operations/reports/sales-monthly/sharing',state=await (await emittedRequest(worker,f.cookie,sharing)).json() as any;assert.equal((await emittedRequest(worker,f.cookie,sharing,'PUT',{audience:'private',operatorIds:[],revision:state.revision})).status,200);const owner=await emittedRequest(worker,f.cookie,path),denied=await emittedRequest(worker,limited,path);assert.equal(owner.status,200);assert.equal(denied.status,403);assert.doesNotMatch(await denied.text(),/Saved-results probe/);console.log('EXPORT_PROBE owner=200 collaborator=403 no-source-leak=true');}
 release();
 if(process.env.PROBE_DELAY_NAV==='1')await page.evaluate(async()=>{const w=window as any;w.resumeSavedNavigation();await w.savedNavigation;});
 await page.waitForLoadState('networkidle');
 await expect(history.locator('ol > li')).toHaveCount(1);
 console.log('PROBE_SAVED_HISTORY passed',JSON.stringify({clock:process.env.PROBE_CLOCK??'system',delayed:process.env.PROBE_DELAY_NAV==='1',url:new URL(page.url()).search}));
 if(process.env.PROBE_SCREENSHOT){await mkdir(process.env.PROBE_SCREENSHOT,{recursive:true});await page.screenshot({path:process.env.PROBE_SCREENSHOT+'/saved-history-1440.png',fullPage:true});
 const phoneContext=await browser.newContext({baseURL:worker.origin,viewport:{width:390,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:f.cookie}}),phone=await phoneContext.newPage();
 await phone.goto(new URL(page.url()).pathname+new URL(page.url()).search);await phone.getByRole('button',{name:'Report options',exact:true}).click();
 await phone.getByRole('region',{name:'Saved sales results'}).getByRole('link',{name:'Export sales result',exact:true}).waitFor();
 await phone.screenshot({path:process.env.PROBE_SCREENSHOT+'/saved-history-390.png',fullPage:true});await phoneContext.close();}
 await context.close();
}finally{await browser?.close();await worker?.dispose();await f.close();}
