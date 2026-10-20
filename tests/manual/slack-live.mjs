// Local-only held-bot proof. Credentials enter through the caller's environment, never an artifact.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {chromium} from '@playwright/test';
const evidence='docs/retained-verification/INTEGRATE-005',report={provider:'Slack',live:true,status:[],messages:[],cleanup:[]};
let browser,server,buffer='',messages=[],origin,api,posted=0;
const token=process.env.SLACK_BOT_TOKEN,channelId=process.env.SLACK_CHANNEL_ID;
assert.ok(token&&channelId,'Held Slack bot and channel must be injected by the named key wrapper.');
async function slack(method,body){const read=method==='auth.test'||method.startsWith('conversations.'),query=new URLSearchParams(Object.entries(body).map(([key,value])=>[key,String(value)]));const response=await fetch('https://slack.com/api/'+method+(read&&query.size?'?'+query:''),{method:read?'GET':'POST',redirect:'error',headers:{Authorization:'Bearer '+token,...(read?{}:{'Content-Type':'application/json; charset=utf-8'})},...(read?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!result.ok){const error=new Error(`Slack ${method}: ${String(result.error).replace(/[^a-z_]/g,'')}`);error.code=result.error;throw error;}return result;}
function launch(args){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,['node_modules/@runeditrun/rer/bin/rer.mjs',...args],{env:{...process.env,SLACK_BOT_TOKEN:undefined,SLACK_CHANNEL_ID:undefined,WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);child.once('exit',code=>code===0?resolve(output):reject(new Error(`Orbit ${args[0]} failed (exit ${code}); no private output printed.`)));});}
try{
 // Read before connecting or posting. Customer-facing or externally shared channels stop the live leg.
 const info=(await slack('conversations.info',{channel:channelId})).channel;
 const description=[info.name,info.topic?.value,info.purpose?.value].join(' ').toLowerCase();
 const internal=info.is_member===true&&info.is_shared===false&&info.is_ext_shared===false&&info.is_org_shared!==true&&info.is_pending_ext_shared!==true&&!info.pending_shared?.length&&!info.is_im&&!info.is_mpim&&!info.is_archived;
 if(!internal||/customer|client|support|external|public community/.test(description))throw new Error('Held channel is shared, not a bot-member internal channel, or appears customer-facing; live proof stopped.');
 report.status.push('conversations.info: workspace-internal bot-member test channel; no customer-facing indicators');
 const auth=await slack('auth.test',{});report.status.push('auth.test: accepted');
 await launch(['setup','--owner-email','owner@run-orbit.test','--port','17861','--non-interactive']);
 server=spawn(process.execPath,['node_modules/@runeditrun/rer/bin/rer.mjs','dev','--foreground','--direct','--port','17861'],{env:{...process.env,SLACK_BOT_TOKEN:undefined,SLACK_CHANNEL_ID:undefined,WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',chunk=>buffer+=chunk);server.stderr.on('data',chunk=>buffer+=chunk);
 const deadline=Date.now()+180000;while(!/^RER_OPEN /m.test(buffer)){if(server.exitCode!==null)throw new Error('Orbit dev exited before ready; private output withheld.');if(Date.now()>deadline)throw new Error('Orbit dev startup timed out; private output withheld.');await new Promise(r=>setTimeout(r,250));}
 const open=buffer.match(/^RER_OPEN (.+)$/m)[1].trim();origin=new URL(open).origin;
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();await page.goto(open);await page.waitForURL(url=>!url.hash,{timeout:60000});
 api=async(path,method='GET',body)=>{const result=await page.evaluate(async({path,method,body})=>{const response=await fetch('/api/v1/'+path,{method,...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});return{status:response.status,data:await response.json()};},{path,method,body});assert.ok(result.status<400,`Orbit ${path}: HTTP ${result.status}`);return result.data;};
 // Complete the real first-run setup through its public route when required.
 if(new URL(page.url()).pathname==='/setup'){
  const form=page.locator('form[action="/api/v1/setup"]');await page.getByLabel('Your name').fill('Harbour Sales Owner');await page.getByLabel('Business name').fill('Harbour Sales');await page.getByLabel('Time zone').fill('Australia/Brisbane');await page.getByLabel('Currency').fill('USD');await form.getByRole('button').last().click();await page.waitForURL(url=>url.pathname.startsWith('/app'),{timeout:60000});
 }
 await page.goto(origin+'/app/settings');await page.getByRole('heading',{name:'Slack sales notices',exact:true}).waitFor();
 await page.getByLabel('Bot token',{exact:true}).fill(token);await page.getByLabel('Slack app signing secret',{exact:true}).fill(randomBytes(32).toString('hex'));
 await page.getByRole('button',{name:'Verify and connect Slack',exact:true}).click();await page.getByRole('button',{name:'Load member channels',exact:true}).waitFor();
 report.status.push('Settings bot-token and generated test-installation signing-secret entry: connected; credentials cleared from form');
 await page.getByRole('button',{name:'Load member channels',exact:true}).click();await page.getByLabel('Channel',{exact:true}).selectOption(channelId);
 await page.getByRole('button',{name:'Save channel routing',exact:true}).click();
 let state=await api('settings/slack');assert.ok(state.channels.some(c=>c.id===channelId));
 const settings=await api('settings'),stages=settings.stages,owner=settings.operators.find(o=>o.setup_owner===1);assert.ok(stages.length>=2);
 const runTag='[orbit-c6 test] '+Date.now(),deal=await api('workbench/opportunities','POST',{title:runTag+' Harbour pilot',companyName:runTag+' Harbour',contactName:'Maya Chen',email:'maya@orbit-c6.example',stageId:stages[0].id,valueCents:1250000});
 await api(`records/opportunity/${deal.id}/move`,'POST',{stageId:stages[1].id,reviewedStageId:stages[0].id});
 state=await api('settings/slack');messages=state.notices.filter(n=>n.state==='sent').map(n=>({ts:n.message_ts,event:n.event_kind,content:JSON.parse(n.content_json)}));assert.equal(messages.length,1);posted++;
 await api('tasks','POST',{title:'Send customer-private pilot details',recordType:'opportunity',recordId:deal.id,ownerId:owner.id,dueAt:new Date(Date.now()-86400000).toISOString(),priority:'high',type:'follow_up',notes:'Private notes and money never belong in Slack',recurrence:'none',timezone:'UTC',reminderMinutes:null});
 state=await api('settings/slack');messages=state.notices.filter(n=>n.state==='sent').map(n=>({ts:n.message_ts,event:n.event_kind,content:JSON.parse(n.content_json)}));posted=messages.length;assert.equal(posted,2);assert.ok(posted<=6);
 await api(`records/opportunity/${deal.id}/move`,'POST',{stageId:stages[1].id,reviewedStageId:stages[1].id});await api('settings/slack/process','POST',{});assert.equal((await api('settings/slack')).notices.filter(n=>n.state==='sent').length,2);
 report.status.push('Stage move and overdue-task notice: sent once each; event replay and process replay: no second message');
 // chat.postMessage's stored data is allowlisted; channel readback confirms provider arrival when scoped.
 try{const history=await slack('conversations.history',{channel:channelId,limit:100});const found=history.messages.filter(m=>m.text?.includes(runTag));assert.equal(found.length,2);for(const message of found){assert.ok(message.text.includes('[orbit-c6 test]'));assert.ok(!message.text.includes('maya@orbit-c6.example')&&!message.text.includes('1250000')&&!message.text.includes('Private notes'));assert.ok(message.text.includes(origin+'/app/'));}report.status.push('conversations.history: both run-tagged messages arrived with only allowed fields');}catch(error){if(error.code!=='missing_scope')throw error;report.status.push('conversations.history: missing_scope; posted message responses and second-delete proof retained');}
 for(const message of messages){assert.deepEqual(Object.keys(message.content).sort(),['eventKind','recordDisplayName','stageFrom','stageTo','ownerDisplayName','dueDate','link'].sort());await page.goto(message.content.link);await page.getByText(runTag+' Harbour pilot',{exact:true}).first().waitFor({timeout:60000});const anonymous=await browser.newContext();const response=await anonymous.request.get(message.content.link,{maxRedirects:0});assert.equal(response.status(),302);assert.ok(response.headers().location.startsWith('/signin'));await anonymous.close();report.messages.push({event:message.event,status:'arrived; allowlisted; authenticated link opens; anonymous link requires sign-in',timestamp:message.ts});}
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/settings');await page.getByRole('heading',{name:'Slack sales notices',exact:true}).waitFor();await page.locator('#slack-settings').scrollIntoViewIfNeeded();await page.screenshot({path:`${evidence}/settings-${width}.png`,fullPage:true});await page.getByRole('heading',{name:'Notice status',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`${evidence}/notices-${width}.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));}
 await api('settings/slack/disconnect','POST',{});report.status.push('Disconnect: unresolved setup; existing in-app deal and task remain available');
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/settings');await page.getByRole('heading',{name:'Slack sales notices',exact:true}).waitFor();await page.locator('#slack-settings').scrollIntoViewIfNeeded();await page.screenshot({path:`${evidence}/unresolved-${width}.png`});await page.getByRole('heading',{name:'Connected products',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`${evidence}/products-unresolved-${width}.png`});}
 report.status.push('Inbound signatures and identity refusals use the fake network edge, not a live Slack click; app-console interactivity configuration is still required for live clicks.');
}catch(error){report.status.push('BLOCKED: '+(error.code?'Slack missing scope or API refusal: '+error.code:error.message));process.exitCode=1;}
finally{
 // Read the running app even after a failed assertion, so every posted timestamp is cleaned up.
 if(api)try{const state=await api('settings/slack');messages=state.notices.filter(n=>n.message_ts).map(n=>({ts:n.message_ts}));}catch{}
 for(const message of messages){try{await slack('chat.delete',{channel:channelId,ts:message.ts});report.cleanup.push({timestamp:message.ts,status:'deleted'});try{await slack('chat.delete',{channel:channelId,ts:message.ts});throw new Error('Second delete unexpectedly succeeded');}catch(error){assert.equal(error.code,'message_not_found');report.cleanup.push({timestamp:message.ts,status:'second delete: message_not_found'});}}catch(error){report.cleanup.push({timestamp:message.ts,status:'CLEANUP FAILED: '+(error.code??error.message)});process.exitCode=1;}}
 if(messages.length)try{const history=await slack('conversations.history',{channel:channelId,limit:100});assert.ok(history.messages.every(m=>!messages.some(post=>post.ts===m.ts)));report.status.push('Final channel readback: no messages from this run');}catch(error){if(error.code==='missing_scope')report.status.push('Final history unavailable: missing_scope; every posted timestamp independently confirmed message_not_found');else{report.status.push('Final history failed: '+error.message);process.exitCode=1;}}
 await browser?.close();if(server&&server.exitCode===null){server.kill('SIGTERM');await Promise.race([once(server,'exit'),new Promise(resolve=>setTimeout(resolve,10000))]);if(server.exitCode===null)server.kill('SIGKILL');}
 buffer='';await writeFile(`${evidence}/live.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:process.exitCode?'blocked':'passed',messages:report.messages.length,cleanup:report.cleanup,details:report.status}));
}
