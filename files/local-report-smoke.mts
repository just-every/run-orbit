import {mkdir} from 'node:fs/promises';
import {fixture,nativeRecord} from '/home/agent/rer-consolidation/work/maint/gr-mt-orbit-ci-4/repo/newtests/t096/fixture.ts';
import {emittedWorker} from '/home/agent/rer-consolidation/work/maint/gr-mt-orbit-ci-4/repo/newtests/t096/emitted-fixture.ts';
import {authorReport} from '/home/agent/rer-consolidation/work/maint/gr-mt-orbit-ci-4/repo/newtests/t096/browser-report-authoring.ts';
import {chromium} from '/home/agent/rer-consolidation/work/maint/gr-mt-orbit-ci-4/repo/node_modules/@playwright/test/index.mjs';
const directory='/tmp/gr-mt-orbit-ci-4/browser';
await mkdir(directory,{recursive:true,mode:0o700});
let f,worker,browser;
try {
  f=await fixture();
  const opportunity=await nativeRecord(f,'opportunity',{title:'Browser native deal',value_cents:3200});
  worker=await emittedWorker(f.target);
  console.log('Owned Worker PID:',worker.pid);
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic','--disable-gpu',...worker.browserArgs]});
  const context=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:f.cookie}});
  try {
    const page=await context.newPage();
    await authorReport(page,1440,directory,opportunity.ref.id);
    console.log('PASS: retained authorReport helper at 1440; Save result waits for the held preview; exported window matches the reviewed preview; USD 32.00 from one native opportunity; shared-record drilldown retains native cents.');
  } finally { await context.close(); }
} finally {
  try { await browser?.close(); } finally {
    try { await worker?.dispose(); } finally { await f?.close(); }
  }
}
