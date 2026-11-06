import {mkdir} from 'node:fs/promises';
import {chromium} from '/home/agent/rer-consolidation/work/sd-orbit-c-f115/orbit/node_modules/@playwright/test/index.mjs';
import {fixture,signIn} from '/home/agent/rer-consolidation/work/sd-orbit-c-f115/orbit/newtests/t096/fixture.ts';
import {emittedWorker,httpsBuyerSite} from '/home/agent/rer-consolidation/work/sd-orbit-c-f115/orbit/newtests/t096/emitted-fixture.ts';
import {formMappingBrowserJourney} from '/home/agent/rer-consolidation/work/sd-orbit-c-f115/orbit/newtests/t096/browser-form-mapping.ts';
import {createDependencies} from '/home/agent/rer-consolidation/work/sd-orbit-c-f115/orbit/tests/support/dependencies.ts';
const f=await fixture(),directory='/home/agent/rer-consolidation/work/sd-orbit-c-f115/mapping-only';
let worker,buyer,browser;
try {
 await mkdir(directory,{recursive:true});
 const id=crypto.randomUUID();await createDependencies(f.db).auth.ensureOperator({id,email:f.operator.email.replace('@','-second@'),displayName:'Second operator'});
 const second=await signIn(f.db,f.operator.email.replace('@','-second@'));
 worker=await emittedWorker(f.target);buyer=await httpsBuyerSite(worker.certificate);browser=await chromium.launch({headless:true,args:[...worker.browserArgs,...buyer.browserArgs]});
 await formMappingBrowserJourney(browser,worker.origin,directory,f.cookie,[f.operator.operatorId,id],{[id]:second.cookie},buyer);
 console.log('Mapped form focused journey passed');
}finally{await browser?.close();await worker?.dispose();await buyer?.dispose();await f.close();}
