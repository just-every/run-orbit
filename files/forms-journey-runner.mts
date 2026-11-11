import {chromium} from '/workspace/run-orbit/node_modules/@playwright/test/index.mjs';
import {fixture} from '/workspace/run-orbit/newtests/t096/fixture.ts';
import {emittedWorker,httpsBuyerSite} from '/workspace/run-orbit/newtests/t096/emitted-fixture.ts';
import {formMappingBrowserJourney} from '/workspace/run-orbit/newtests/t096/browser-form-mapping.ts';
import {mkdir,writeFile} from 'node:fs/promises';
const directory=process.env.HOME+'/rer-consolidation/work/main-orbit-forms-compile-1/packet/forms-journey';
await mkdir(directory,{recursive:true});
const f=await fixture();let worker,buyer,browser;
try{
 worker=await emittedWorker(f.target);buyer=await httpsBuyerSite(worker.certificate);
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox',...worker.browserArgs,...buyer.browserArgs]});
 await formMappingBrowserJourney(browser,worker.origin,directory,f.cookie,[f.operator.operatorId],{},buyer);
 await writeFile(directory+'/receipt.json',JSON.stringify({status:'passed',journey:'formMappingBrowserJourney',source:'newtests/t096/browser-form-mapping.ts',registeredBy:'newtests/t096/browser-journeys.test.ts',widths:[1440,390],newAssertionsAt:1440,saveReloadCompile:true,hostedFramedDirect:true},null,2)+'\n');
 console.log('Existing mapped forms journey passed: save/reload/compile/exact preview/approve/publish/hosted/framed/direct intake.');
}finally{await browser?.close();await worker?.dispose();await buyer?.dispose();await f.close();}
