// Read the real persisted live run after erasure/disconnect; never seed provider state.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {getPlatformProxy} from 'wrangler';
import {chromium} from '@playwright/test';
import {identityVarArgs} from '../support/worker-identity.mjs';
const origin='http://127.0.0.1:17863',folder='docs/retained-verification/INTEGRATE-005',record=JSON.parse(await readFile(folder+'/live.json','utf8'));
const probe=createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(17863,'127.0.0.1',resolve);});await new Promise(resolve=>probe.close(resolve));
await mkdir('.rer-tools',{recursive:true});
const platform=await getPlatformProxy({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:'.wrangler/state/v3'},remoteBindings:false});
let worker,browser,closed=false;
try{
 const db=platform.env.DB,owner=await db.prepare('SELECT id FROM operators WHERE setup_owner=1').first(),{testAuth}=await import('../support/test-auth.ts'),session=await testAuth(db).createSession(owner.id);
 assert.equal(await db.prepare('SELECT state FROM slack_installation').first('state'),'disconnected');
 for(const message of record.messages){const row=await db.prepare('SELECT n.state,n.content_json,d.state AS deletion FROM slack_notices n JOIN slack_deletions d ON d.notice_id=n.id WHERE n.message_ts=?').bind(message.timestamp).first();assert.equal(row.state,'redacted');assert.equal(row.content_json,null);assert.equal(row.deletion,'deleted');}
 assert.equal(record.messages.length,2);await platform.dispose();closed=true;
 worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--port','17863','--inspector-port','0',...identityVarArgs(origin,'owner@run-orbit.test')],{env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});await writeFile('.rer-tools/slack-readback-pids.json',JSON.stringify({worker:worker.pid}));worker.stdout.on('data',()=>{});worker.stderr.on('data',()=>{});
 const deadline=Date.now()+60000;while(true){try{if((await fetch(origin+'/health')).ok)break;}catch{}if(Date.now()>deadline||worker.exitCode!==null)throw Error('Live-state Worker did not become ready');await new Promise(resolve=>setTimeout(resolve,100));}
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});const context=await browser.newContext({extraHTTPHeaders:{Cookie:'__Host-orbit_session='+session.token}}),page=await context.newPage();
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/settings');await page.locator('section[aria-labelledby="slack-settings"]').getByText('Unresolved setup · notices paused',{exact:true}).waitFor();await page.locator('section[aria-labelledby="connected-products"] li').first().waitFor();await page.waitForLoadState('networkidle');for(const [heading,name] of [['Slack sales notices','unresolved'],['Connected products','products-unresolved'],['Provider deletion requests','provider-deletions']]){await page.getByRole('heading',{name:heading,exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${folder}/live-${name}-${width}.png`});}assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));}
 console.log('Real persisted live-run erasure, tracked deletions and disconnected setup captured at 1440/390; no provider request made.');
}finally{await browser?.close();if(worker&&worker.exitCode===null){worker.kill('SIGTERM');await once(worker,'exit');}if(!closed)await platform.dispose();await rm('.rer-tools/slack-readback-pids.json',{force:true});}
