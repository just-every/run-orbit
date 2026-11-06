import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {openSync,closeSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from '@playwright/test';
const origin='http://127.0.0.1:18722',packet=process.env.HOME+'/rer-consolidation/work/sd-orbit-c-f68/packet';
const fixture=JSON.parse(await readFile('/tmp/f68-browser-session.json','utf8'));
const log=openSync('/tmp/f68-browser-runtime.log','w');
const server=spawn(process.execPath,['--input-type=module','-e','import("./scripts/browser-runtime.mjs").then(m=>m.serveBrowserRuntime())'],{env:{...process.env,PORT:'18722',ORBIT_INSPECTOR_PORT:'0'},stdio:['ignore',log,log]});
let browser;
try{
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch(origin+'/health')).ok){ready=true;break;}}catch{}if(server.exitCode!==null)throw Error('Browser Worker exited');await new Promise(r=>setTimeout(r,500));}assert.ok(ready,'Emitted Worker healthy');
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},extraHTTPHeaders:{Cookie:fixture.cookie}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/app/settings/team');
 await page.getByRole('button',{name:'Remove Departing operator',exact:true}).click();
 const review=page.getByRole('region',{name:'Operator removal review',exact:true});
 await review.getByRole('heading',{name:'Open opportunities (1)',exact:true}).waitFor();
 assert.equal(await review.getByRole('button',{name:'Confirm handover and remove',exact:true}).isEnabled(),false);
 await review.getByLabel('Receiving operator for opportunities',{exact:true}).selectOption(fixture.receiver);
 await review.getByLabel('Receiving operator for tasks',{exact:true}).selectOption('unassigned');
 await review.getByLabel('Receiving operator for handoffs',{exact:true}).selectOption('unassigned');
 const widths=[];
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  for(const text of ['Removal review deal','Review the customer follow-up','Send the reviewed proposal','1 scheduled message(s) will be cancelled.'])assert.ok(await review.getByText(text,{exact:true}).isVisible());
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
  const textSizes=await review.locator('h3,h4,p,label,button,select,li').evaluateAll(nodes=>nodes.map(node=>Number.parseFloat(getComputedStyle(node).fontSize)));
  assert.ok(textSizes.every(size=>size>=13),'Removal review text is at least 13px');
  assert.ok(await review.getByRole('button',{name:'Confirm handover and remove',exact:true}).isEnabled());
  await page.screenshot({path:packet+'/removal-review-'+width+'.png',fullPage:true});
  widths.push({width,overflow,textMinimum:Math.min(...textSizes),inventories:{opportunities:1,tasks:1,handoffs:1,scheduledMessages:1},choices:{opportunities:'Receiving operator',tasks:'Explicitly leave unassigned',handoffs:'Explicitly leave unassigned'}});
 }
 await review.getByRole('button',{name:'Confirm handover and remove',exact:true}).click();
 await review.waitFor({state:'hidden'});
 const read=async(path)=>{const r=await context.request.get(origin+path);assert.equal(r.status(),200,await r.text());return r.json();};
 assert.equal((await read('/api/v1/records/opportunity/'+fixture.deal)).record.owner_id,fixture.receiver);
 assert.equal((await read('/api/v1/tasks/'+fixture.task)).task.ownerId,null);
 assert.equal((await read('/delegation/handoffs/'+fixture.deal)).tasks.find(row=>row.target.endsWith(fixture.handoff)).task.assignee_id,null);
 assert.ok((await read('/api/v1/workbench/opportunities/'+fixture.deal+'/messages')).messages.every(row=>row.state==='cancelled'));
 assert.deepEqual(errors,[]);
 await writeFile(packet+'/BROWSER.json',JSON.stringify({status:'passed',door:'/app/settings/team',widths,finalRemoval:'receiver assigned; both task sets unassigned; scheduled message cancelled',pageErrors:errors},null,2)+'\n');
 console.log('BROWSER PASS widths=1440,390 populated removal review, choices, no overflow, minimum text 13px, final states verified');
}finally{if(browser)await browser.close();const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;closeSync(log);}
