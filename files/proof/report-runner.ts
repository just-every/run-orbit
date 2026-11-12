import {fixture,nativeRecord} from '/home/agent/rer-consolidation/work/main-orbit-readable-values-1-pc1/run-orbit/newtests/t096/fixture';
import {emittedWorker} from '/home/agent/rer-consolidation/work/main-orbit-readable-values-1-pc1/run-orbit/newtests/t096/emitted-fixture';
import {authorReport} from '/home/agent/rer-consolidation/work/main-orbit-readable-values-1-pc1/run-orbit/newtests/t096/browser-report-authoring';
import {chromium} from '/home/agent/rer-consolidation/work/main-orbit-readable-values-1-pc1/run-orbit/node_modules/@playwright/test/index.mjs';
import {mkdir} from 'node:fs/promises';
async function main(){
 const directory='/home/agent/rer-consolidation/work/main-orbit-readable-values-1-pc1/report-proof';await mkdir(directory,{recursive:true});
 const f=await fixture();let worker:any,browser:any;
 try{
  const deal=await nativeRecord(f,'opportunity',{title:'Browser native deal',value_cents:3200});worker=await emittedWorker(f.target);browser=await chromium.launch({headless:true,args:worker.browserArgs});
  const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},ignoreHTTPSErrors:true});const split=f.cookie.indexOf('=');await context.addCookies([{name:f.cookie.slice(0,split),value:f.cookie.slice(split+1),url:worker.origin,httpOnly:true,secure:true,sameSite:'Lax'}]);const page=await context.newPage();
  await authorReport(page,1440,directory,deal.ref.id);
  await page.setViewportSize({width:390,height:1000});await page.screenshot({path:directory+'/report-drilldown-390.png',fullPage:true});
  console.log('Report-authoring helper passed: saved/exported 3200 cents; shared drilldown displays 32 USD. Assertions at 1440; screenshots at 1440 and 390.');
 }finally{await browser?.close();await worker?.dispose();await f.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
