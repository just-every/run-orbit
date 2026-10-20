// Visual fixtures live only in tests: render the real emitted Worker and its real Settings routes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {getPlatformProxy} from 'wrangler';
import {chromium} from '@playwright/test';
import {identityVarArgs} from '../support/worker-identity.mjs';
const origin='http://127.0.0.1:17862',evidence='docs/retained-verification/INTEGRATE-005';
const platform=await getPlatformProxy({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:'.wrangler/state/v3'},remoteBindings:false});
let browser,worker,session;
try{
 const db=platform.env.DB,owner=await db.prepare("SELECT * FROM operators WHERE setup_owner=1 AND status='active'").first();assert.ok(owner);
 const {testAuth}=await import('../support/test-auth.ts');session=await testAuth(db).createSession(owner.id);
 const deal=await db.prepare('SELECT * FROM opportunities ORDER BY created_at DESC LIMIT 1').first();assert.ok(deal);
 const channel=await db.prepare('SELECT * FROM slack_channels LIMIT 1').first();assert.ok(channel);
 const now=new Date().toISOString(),retry=new Date(Date.now()+300000).toISOString();
 await db.prepare("UPDATE slack_installation SET state='revoked',error='token_revoked'").run();
 await db.prepare("UPDATE slack_channels SET last_error='ratelimited',retry_at=?").bind(retry).run();
 await db.prepare('INSERT OR REPLACE INTO slack_mappings VALUES(?,?,NULL)').bind('UVISUAL',owner.id).run();
 const states=['rate-limited','uncertain','failed','withheld','paused','held','redacted'];
 for(const [i,state] of states.entries()){
  const content=['withheld','redacted'].includes(state)?null:JSON.stringify({eventKind:'stage',recordDisplayName:'Harbour annual rollout',stageFrom:'Discovery',stageTo:'Proposal',ownerDisplayName:owner.display_name,dueDate:null,link:origin+'/app/opportunities/'+deal.id});
  const errors={'rate-limited':'ratelimited',uncertain:'submission_uncertain',failed:'not_in_channel',withheld:'Record is restricted from this channel audience',paused:'token_revoked',held:'Held by administrator; never resend',redacted:'Underlying record erased'};
  await db.prepare('INSERT OR REPLACE INTO slack_notices(id,event_key,event_kind,channel_id,record_type,record_id,state,content_json,error,retry_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind('visual-'+state,'visual-'+state,'stage',channel.id,'opportunity',['withheld','redacted'].includes(state)?null:deal.id,state,content,errors[state],state==='rate-limited'?retry:null,new Date(Date.now()+1000+i).toISOString(),now).run();
 }
 await platform.dispose();
 worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--port','17862','--inspector-port','0',...identityVarArgs(origin,'owner@run-orbit.test')],{env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});
 // Keep process output private: Wrangler may describe local bindings.
 worker.stdout.on('data',()=>{});worker.stderr.on('data',()=>{});
 const deadline=Date.now()+60000;while(true){try{if((await fetch(origin+'/health')).ok)break;}catch{}if(Date.now()>deadline||worker.exitCode!==null)throw Error('Emitted Worker did not become ready');await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({extraHTTPHeaders:{Cookie:'__Host-orbit_session='+session.token}});const page=await context.newPage();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/settings');await page.getByRole('heading',{name:'Slack sales notices',exact:true}).waitFor();
  await page.getByText('Unresolved setup · notices paused',{exact:true}).first().waitFor();
  await page.locator('#slack-settings').scrollIntoViewIfNeeded();await page.screenshot({path:`${evidence}/revoked-settings-${width}.png`});
  for(const state of states){const row=page.locator('li').filter({has:page.getByText(`stage · #${channel.name} · ${state}`,{exact:true})});await row.scrollIntoViewIfNeeded();await page.screenshot({path:`${evidence}/${state}-${width}.png`});}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Settings fits the viewport');
 }
 console.log('Slack settings, rate-limit, uncertain, failed, withheld, paused, held and redacted states inspected at 1440/390. These state fixtures are not live-provider proof.');
}finally{await browser?.close();await platform.dispose();if(worker&&worker.exitCode===null){worker.kill('SIGTERM');await once(worker,'exit');}}
