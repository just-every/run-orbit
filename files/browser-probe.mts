import {mock} from 'node:test';
import {resolve} from 'node:path';
import {chromium} from '/workspace/orbit-f153/node_modules/@playwright/test/index.mjs';
import {unstable_DevEnv} from '/workspace/orbit-f153/node_modules/wrangler/wrangler-dist/cli.js';
import {isolatedDatabase} from '/workspace/orbit-f153/tests/support/isolated-database.ts';
import {stalledRiskBrowser} from '/workspace/orbit-f153/tests/support/stalled-risk-browser.ts';
import {draftParityBrowserJourney} from '/workspace/orbit-f153/tests/support/agent-door-draft-parity-proof.ts';

const fixture=await isolatedDatabase(),runtime=new unstable_DevEnv(),origin='http://127.0.0.1:8746';
let browser:any;
try{
 const prepared=await stalledRiskBrowser({mock} as any,fixture.db,origin);
 await fixture.close();
 const secret=(value:string)=>({type:'secret_text' as const,value});
 const emitted=await runtime.startWorker({config:resolve('/workspace/orbit-f153/dist/server/wrangler.json'),bindings:Object.fromEntries(Object.entries(prepared.vars).map(([name,value])=>[name,secret(value)])),dev:{remote:false,persist:fixture.directory,watch:false,inspector:false,server:{hostname:'127.0.0.1',port:8746}}});await emitted.ready;
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({baseURL:origin,extraHTTPHeaders:{Cookie:prepared.cookie}});
 await draftParityBrowserJourney({page:await context.newPage(),...prepared,evidence:'/home/agent/rer-consolidation/work/sd-orbit-c-f153/packet/screens'});
 await context.close();
}finally{await browser?.close();await runtime.teardown();await fixture.dispose();}
