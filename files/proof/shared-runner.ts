import {fixture,collaborator} from '/home/agent/rer-consolidation/work/main-orbit-readable-values-1-pc1/run-orbit/newtests/t096/fixture';
import {emittedWorker} from '/home/agent/rer-consolidation/work/main-orbit-readable-values-1-pc1/run-orbit/newtests/t096/emitted-fixture';
import {readableSharedValues} from '/home/agent/rer-consolidation/work/main-orbit-readable-values-1-pc1/run-orbit/newtests/t096/browser-shared-values';
import {chromium} from '/home/agent/rer-consolidation/work/main-orbit-readable-values-1-pc1/run-orbit/node_modules/@playwright/test/index.mjs';
import {mkdir} from 'node:fs/promises';
async function main(){
 const directory='/home/agent/rer-consolidation/work/main-orbit-readable-values-1-pc1/shared-proof';await mkdir(directory,{recursive:true});
 const f=await fixture();let worker:any,browser:any;
 try{
  const guest=await collaborator(f,'guest');worker=await emittedWorker(f.target);
  browser=await chromium.launch({headless:true,args:worker.browserArgs});
  const signed=async(cookie:string)=>{const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},ignoreHTTPSErrors:true});const split=cookie.indexOf('=');await context.addCookies([{name:cookie.slice(0,split),value:cookie.slice(split+1),url:worker.origin,httpOnly:true,secure:true,sameSite:'Lax'}]);return context.newPage();};
  await readableSharedValues(await signed(f.cookie),await signed(guest.cookie),guest.operator.operatorId,directory);console.log('Shared readable values public-door proof passed at 1440; screenshots at 1440 and 390.');
 }finally{await browser?.close();await worker?.dispose();await f.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
