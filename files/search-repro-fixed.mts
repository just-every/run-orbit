import {recordsSearchHydrationJourney} from '/workspace/run-orbit/tests/delegation-browser/records-search-hydration-journey.mjs';
import {chromium,expect} from '/workspace/run-orbit/node_modules/@playwright/test/index.mjs';
import {unstable_DevEnv} from '/workspace/run-orbit/node_modules/wrangler/wrangler-dist/cli.js';
import {isolatedDatabase} from '/workspace/run-orbit/tests/support/isolated-database';
import {createTestDependencies} from '/workspace/run-orbit/tests/support/test-dependencies';
import {sampleData} from '/workspace/run-orbit/tests/fixtures/sample-data';
import {customCertificate} from '/workspace/run-orbit/tests/support/http-listener-fixture';
import {certificateTrust} from '/workspace/run-orbit/newtests/t096/emitted-fixture';
import {identityVars} from '/workspace/run-orbit/tests/support/worker-identity.mjs';
import {sessionCookieName} from '/workspace/run-orbit/tests/support/test-auth';
const fixture=await isolatedDatabase(),runtime=new unstable_DevEnv();let browser;
const port=8731,origin=`https://orbit.127.0.0.1.nip.io:${port}`;
try{
 const deps=createTestDependencies(fixture.db);await deps.sampleData.seed();
 await fixture.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(sampleData.operators[0].id).run();
 const session=await deps.auth.createSession(sampleData.operators[0].id),certificate=await customCertificate(fixture.directory);await fixture.close();
 const worker=await runtime.startWorker({config:'/workspace/run-orbit/dist/server/wrangler.json',bindings:Object.fromEntries(Object.entries(identityVars(origin)).map(([name,value])=>[name,{type:'secret_text',value}])),dev:{remote:false,persist:fixture.directory,watch:false,inspector:false,server:{hostname:'127.0.0.1',port,secure:true,httpsKeyPath:certificate.keyPath,httpsCertPath:certificate.certPath},origin:{secure:true,hostname:new URL(origin).host}}});await worker.ready;
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--no-proxy-server','--host-resolver-rules=MAP orbit.127.0.0.1.nip.io 127.0.0.1',...certificateTrust(certificate.cert)]});
 const context=await browser.newContext({baseURL:origin,ignoreHTTPSErrors:true,viewport:{width:1440,height:900},extraHTTPHeaders:{Cookie:`${sessionCookieName}=${session.token}`}}),page=await context.newPage();
 await recordsSearchHydrationJourney(page);
 console.log('PASS delayed JavaScript keeps search read-only until interactive; saved and reopened query survives.');
}finally{await browser?.close();await runtime.teardown();await fixture.dispose();}
