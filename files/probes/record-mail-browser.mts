import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '/workspace/run-orbit/node_modules/@playwright/test/index.mjs';
import {fixture} from '/workspace/run-orbit/newtests/t096/fixture.ts';
import {recordMailBrowserSeed} from '/workspace/run-orbit/newtests/t096/record-mail-browser-seed.ts';
import {recordMailCompletionSeed} from '/workspace/run-orbit/tests/support/record-mail-browser.ts';
import {recordMailBrowserJourney} from '/workspace/run-orbit/newtests/t096/browser-record-mail.ts';
import {emittedWorker} from '/workspace/run-orbit/newtests/t096/emitted-fixture.ts';
const directory='/tmp/orbit-record-focused-evidence';await mkdir(directory,{recursive:true});
const f=await fixture();let worker:any,browser:any;
try{const initial=await recordMailBrowserSeed(f),seed={...initial,...await recordMailCompletionSeed(f,initial)};worker=await emittedWorker(f.target,undefined,{ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)});browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic',...worker.browserArgs]});await recordMailBrowserJourney(browser,worker.origin,directory,f.cookie,seed);console.log(JSON.stringify({probe:'existing recordMailBrowserJourney',head:'ae91bb500222adab251858960883d64368ee3bd7',viewports:[1440,390],passed:true,scope:'contact and company composition, review, accepted history, notifications, sender and actual library signature'}));}finally{await browser?.close();await worker?.dispose();await f.close();}
