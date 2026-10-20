// Visual fixtures live only in tests: render the real emitted Worker and its real Settings routes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {writeFile,rm} from 'node:fs/promises';
import {getPlatformProxy} from 'wrangler';
import {chromium} from '@playwright/test';
import {identityVarArgs} from '../support/worker-identity.mjs';
const connectedFixture=process.argv.includes('--connected');
const origin='http://127.0.0.1:17862',evidence='docs/retained-verification/INTEGRATE-005';
const probe=createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(17862,'127.0.0.1',resolve);});await new Promise(resolve=>probe.close(resolve));
const platform=await getPlatformProxy({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:'.wrangler/state/v3'},remoteBindings:false});
let browser,worker,session,memberSession,closed=false;
try{
 const db=platform.env.DB,owner=await db.prepare("SELECT * FROM operators WHERE setup_owner=1 AND status='active'").first();assert.ok(owner);
 const {testAuth}=await import('../support/test-auth.ts');session=await testAuth(db).createSession(owner.id);
 await db.prepare("UPDATE slack_installation SET state='revoked',error='token_revoked',app_id=COALESCE(app_id,'AVISUAL')").run();
 let deal=await db.prepare('SELECT * FROM opportunities ORDER BY created_at DESC LIMIT 1').first();if(!deal){const {createApp}=await import('../support/app.ts'),app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}}),stage=await db.prepare('SELECT id FROM pipeline_stages ORDER BY position LIMIT 1').first('id');const response=await app.request('https://orbit.test/api/v1/workbench/opportunities',{method:'POST',headers:{Cookie:'__Host-orbit_session='+session.token,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({title:'Harbour annual rollout',companyName:'Harbour',contactName:'Maya Chen',email:'maya@harbour.test',stageId:stage,valueCents:4200000})});assert.equal(response.status,201);deal=await db.prepare('SELECT * FROM opportunities ORDER BY created_at DESC LIMIT 1').first();}assert.ok(deal);
 await db.prepare("INSERT OR IGNORE INTO slack_channels(id,name,events_json,enabled) VALUES('CVISUAL','sales-internal','[\"stage\",\"won\",\"due\",\"handoff\"]',1)").run();const channel=await db.prepare('SELECT * FROM slack_channels LIMIT 1').first();assert.ok(channel);
 const now=new Date().toISOString(),retry=new Date(Date.now()+300000).toISOString();
 if(connectedFixture){await db.prepare("UPDATE slack_installation SET state='connected',error=NULL").run();await db.prepare("INSERT OR REPLACE INTO slack_credentials VALUES('slack','visual fixture only; no provider authority')").run();}
 await db.prepare("UPDATE slack_channels SET last_error='ratelimited',retry_at=?").bind(retry).run();
 const {createDependencies}=await import('../support/dependencies.ts'),{createId}=await import('../../src/core/shared/ids.ts');let member=await db.prepare("SELECT * FROM operators WHERE email='seller-visual@orbit.test'").first();if(!member){const id=createId();await createDependencies(db).auth.ensureOperator({id,email:'seller-visual@orbit.test',displayName:'Jordan Lee'});member=await db.prepare('SELECT * FROM operators WHERE id=?').bind(id).first();}memberSession=await testAuth(db).createSession(member.id);
 const installation=await db.prepare('SELECT * FROM slack_installation').first(),epoch=Number(await db.prepare("SELECT policy_epoch FROM access_workspaces WHERE id='workspace'").first('policy_epoch'));await db.prepare('INSERT OR REPLACE INTO slack_mappings VALUES(?,?,?,?,?,NULL,?,?)').bind(installation.team_id,installation.enterprise_id,installation.app_id,'UVISUAL',member.id,epoch,now).run();
 const states=['rate-limited','uncertain','failed','withheld','paused','held','redacted'];
 for(const [i,state] of states.entries()){
  const content=state==='redacted'?null:state==='withheld'?JSON.stringify({eventKind:'stage',link:origin+'/app/opportunities/'+deal.id}):JSON.stringify({eventKind:'stage',recordDisplayName:'Harbour annual rollout',stageFrom:'Discovery',stageTo:'Proposal',ownerDisplayName:owner.display_name,dueDate:null,link:origin+'/app/opportunities/'+deal.id});
  const errors={'rate-limited':'ratelimited',uncertain:'submission_uncertain',failed:'not_in_channel',withheld:'Record is restricted from this channel audience',paused:'token_revoked',held:'Held by administrator; never resend',redacted:'Underlying record erased'};
  await db.prepare('INSERT OR REPLACE INTO slack_notices(id,event_key,event_kind,channel_id,record_type,record_id,state,content_json,error,retry_at,created_at,updated_at,privacy) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('visual-'+state,'visual-'+state,'stage',channel.id,'opportunity',['withheld','redacted'].includes(state)?null:deal.id,state==='withheld'?'sent':state,content,errors[state],state==='rate-limited'?retry:null,new Date(Date.now()+1000+i).toISOString(),now,state==='withheld'?'withheld':null).run();
 }
 for(const [notice,state,error] of [['redacted','deleted',null],['uncertain','uncertain','submission_uncertain'],['held','held','Restored request needs administrator confirmation']])await db.prepare('INSERT OR REPLACE INTO slack_deletions(notice_id,team_id,app_id,channel_id,message_ts,state,error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind('visual-'+notice,installation.team_id,installation.app_id,channel.id,'1792500000.'+notice.length,state,error,now,now).run();
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
  await page.getByText(connectedFixture?'Connected':'Unresolved setup · notices paused',{exact:true}).first().waitFor();
  await page.locator('#slack-settings').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/${connectedFixture?'settings':'revoked-settings'}-${width}.png`,fullPage:connectedFixture});
  if(connectedFixture)for(const [heading,name] of [['Route events','routing'],['Channel status','channel-status'],['Notice status','notices']]){await page.getByRole('heading',{name:heading,exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/${name}-${width}.png`});}
  for(const state of states){const row=page.locator('li').filter({has:page.getByText(`stage · #${channel.name} · ${state==='withheld'?'sent · details withheld':state}`,{exact:true})});await row.evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/${state}-${width}.png`});}
  await page.getByRole('heading',{name:'Provider deletion requests',exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/provider-deletions-${width}.png`});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Settings fits the viewport');
 }
 const memberContext=await browser.newContext({extraHTTPHeaders:{Cookie:'__Host-orbit_session='+memberSession.token}}),memberPage=await memberContext.newPage();for(const width of [1440,390]){await memberPage.setViewportSize({width,height:1000});await memberPage.goto(origin+'/app/settings');await memberPage.getByRole('heading',{name:'Identity mapping status',exact:true}).waitFor();const surface=memberPage.locator('section[aria-labelledby="slack-settings"]');assert.ok((await surface.innerText()).includes('UVISUAL → Jordan Lee'));assert.equal(await surface.getByRole('button',{name:'Save explicit identity mapping',exact:true}).count(),0);await memberPage.getByRole('heading',{name:'Identity mapping status',exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));await memberPage.screenshot({path:`${evidence}/mapping-operator-${width}.png`});}await memberContext.close();
 const disconnected=await page.evaluate(async()=>{const response=await fetch('/api/v1/settings/slack/disconnect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return response.status;});assert.equal(disconnected,200);
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/settings');await page.getByRole('heading',{name:'Slack sales notices',exact:true}).waitFor();await page.getByText('Unresolved setup · notices paused',{exact:true}).first().waitFor();await page.locator('#slack-settings').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/unresolved-${width}.png`});await page.getByRole('heading',{name:'Connected products',exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/products-unresolved-${width}.png`});await page.getByText('Connect workspace',{exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/credentials-${width}.png`});await page.getByRole('heading',{name:'Map Slack identities',exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/mapping-${width}.png`});}
 console.log('Slack settings, rate-limit, uncertain, failed, withheld, paused, held and redacted states inspected at 1440/390. These state fixtures are not live-provider proof.');
}finally{await browser?.close();if(worker&&worker.exitCode===null){worker.kill('SIGTERM');await once(worker,'exit');}if(!closed)await platform.dispose();await rm('.rer-tools/slack-status-pids.json',{force:true});}
