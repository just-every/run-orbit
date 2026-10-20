// Visual fixtures live only in tests: render the real emitted Worker and its real Settings routes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {writeFile,rm} from 'node:fs/promises';
import {getPlatformProxy} from 'wrangler';
import {chromium} from '@playwright/test';
import {identityVarArgs} from '../support/worker-identity.mjs';
const origin='http://127.0.0.1:17862',evidence='docs/retained-verification/INTEGRATE-005';
const probe=createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(17862,'127.0.0.1',resolve);});await new Promise(resolve=>probe.close(resolve));
const platform=await getPlatformProxy({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:'.wrangler/state/v3'},remoteBindings:false});
let browser,worker,session,closed=false;
try{
 const db=platform.env.DB,owner=await db.prepare("SELECT * FROM operators WHERE setup_owner=1 AND status='active'").first();assert.ok(owner);
 const {testAuth}=await import('../support/test-auth.ts');session=await testAuth(db).createSession(owner.id);
 const deal=await db.prepare('SELECT * FROM opportunities ORDER BY created_at DESC LIMIT 1').first();assert.ok(deal);
 const channel=await db.prepare('SELECT * FROM slack_channels LIMIT 1').first();assert.ok(channel);
 const now=new Date().toISOString(),retry=new Date(Date.now()+300000).toISOString();
 await db.prepare("UPDATE slack_installation SET state='revoked',error='token_revoked'").run();
 await db.prepare("UPDATE slack_channels SET last_error='ratelimited',retry_at=?").bind(retry).run();
 const installation=await db.prepare('SELECT * FROM slack_installation').first(),epoch=Number(await db.prepare("SELECT policy_epoch FROM access_workspaces WHERE id='workspace'").first('policy_epoch'));await db.prepare('INSERT OR REPLACE INTO slack_mappings VALUES(?,?,?,?,?,NULL,?,?)').bind(installation.team_id,installation.enterprise_id,installation.app_id,'UVISUAL',owner.id,epoch,now).run();
 const states=['rate-limited','uncertain','failed','withheld','paused','held','redacted'];
 for(const [i,state] of states.entries()){
  const content=state==='redacted'?null:state==='withheld'?JSON.stringify({eventKind:'stage',link:origin+'/app/opportunities/'+deal.id}):JSON.stringify({eventKind:'stage',recordDisplayName:'Harbour annual rollout',stageFrom:'Discovery',stageTo:'Proposal',ownerDisplayName:owner.display_name,dueDate:null,link:origin+'/app/opportunities/'+deal.id});
  const errors={'rate-limited':'ratelimited',uncertain:'submission_uncertain',failed:'not_in_channel',withheld:'Record is restricted from this channel audience',paused:'token_revoked',held:'Held by administrator; never resend',redacted:'Underlying record erased'};
  await db.prepare('INSERT OR REPLACE INTO slack_notices(id,event_key,event_kind,channel_id,record_type,record_id,state,content_json,error,retry_at,created_at,updated_at,privacy) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('visual-'+state,'visual-'+state,'stage',channel.id,'opportunity',['withheld','redacted'].includes(state)?null:deal.id,state==='withheld'?'sent':state,content,errors[state],state==='rate-limited'?retry:null,new Date(Date.now()+1000+i).toISOString(),now,state==='withheld'?'withheld':null).run();
 }
 await platform.dispose();closed=true;
 worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--port','17862','--inspector-port','0',...identityVarArgs(origin,'owner@run-orbit.test')],{env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});
 await writeFile('.rer-tools/slack-status-pids.json',JSON.stringify({worker:worker.pid}));
 // Keep process output private: Wrangler may describe local bindings.
 worker.stdout.on('data',()=>{});worker.stderr.on('data',()=>{});
 const deadline=Date.now()+60000;while(true){try{if((await fetch(origin+'/health')).ok)break;}catch{}if(Date.now()>deadline||worker.exitCode!==null)throw Error('Emitted Worker did not become ready');await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({extraHTTPHeaders:{Cookie:'__Host-orbit_session='+session.token}});const page=await context.newPage();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/settings');await page.getByRole('heading',{name:'Slack sales notices',exact:true}).waitFor();
  await page.getByText('Unresolved setup · notices paused',{exact:true}).first().waitFor();
  await page.locator('#slack-settings').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/revoked-settings-${width}.png`});
  for(const state of states){const row=page.locator('li').filter({has:page.getByText(`stage · #${channel.name} · ${state==='withheld'?'sent · details withheld':state}`,{exact:true})});await row.evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/${state}-${width}.png`});}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Settings fits the viewport');
 }
 const disconnected=await page.evaluate(async()=>{const response=await fetch('/api/v1/settings/slack/disconnect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return response.status;});assert.equal(disconnected,200);
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/settings');await page.getByRole('heading',{name:'Slack sales notices',exact:true}).waitFor();await page.getByText('Unresolved setup · notices paused',{exact:true}).first().waitFor();await page.locator('#slack-settings').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/unresolved-${width}.png`});await page.getByRole('heading',{name:'Connected products',exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/products-unresolved-${width}.png`});await page.getByText('Connect workspace',{exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/credentials-${width}.png`});await page.getByRole('heading',{name:'Map Slack identities',exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/mapping-${width}.png`});}
 console.log('Slack settings, rate-limit, uncertain, failed, withheld, paused, held and redacted states inspected at 1440/390. These state fixtures are not live-provider proof.');
}finally{await browser?.close();if(worker&&worker.exitCode===null){worker.kill('SIGTERM');await once(worker,'exit');}if(!closed)await platform.dispose();await rm('.rer-tools/slack-status-pids.json',{force:true});}
