import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {open,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {isolatedDatabase} from '../tests/support/isolated-database';
import {createApp} from '../tests/support/app';
import {createDependencies} from '../tests/support/dependencies';
import {identityVarArgs} from '../tests/support/worker-identity.mjs';
import {createId} from '../src/core/shared/ids';
import {SendGridSendError} from '../src/base/modules/mail/src/sendgrid-email/index.mjs';
import {signRelayBody} from '../src/base/sendgrid-event-relay/crypto';
const packet=process.env.F59_PACKET!,port=15629,origin=`http://127.0.0.1:${port}`,p=await isolatedDatabase();
let server:ReturnType<typeof spawn>|undefined,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
const log=await open('/tmp/f59-browser-worker.log','w');
try{
 const db=p.db,deps=createDependencies(db),actor=createId(),stage=createId();
 await deps.auth.ensureOperator({id:actor,email:`${createId()}@test.invalid`,displayName:'Delivery operator'});
 await deps.workspace.ensureWorkspace({name:'Delivery proof',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
 await deps.workspace.ensurePipelineStage({id:stage,name:'Discovery',position:0});
 await db.prepare("INSERT OR REPLACE INTO first_run_setup VALUES('workspace',?)").bind(new Date().toISOString()).run();
 const session=await deps.auth.createSession(actor),relaySecret='synthetic-orbit-f59-browser-relay-'.repeat(2),refusal='synthetic-orbit-f59: sender domain refused',bounce='synthetic-orbit-f59: recipient mailbox permanently disabled';
 let sends=0;
 const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},mailEventKeys:{relaySecret},outboundMail:{send:async()=>{sends++;if(sends===1)throw new SendGridSendError('rejected',refusal,403);return{providerMessageId:'synthetic-orbit-f59-browser-receipt'};}}});
 const api=async(path:string,body?:unknown,status=200)=>{const response=await app.request('https://orbit.test/api/v1/'+path,{method:body?'POST':'GET',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});assert.equal(response.status,status);return response.json() as Promise<any>;};
 const deal=await api('workbench/opportunities',{title:'Provider failure history',companyName:'Synthetic account',contactName:'Synthetic buyer',email:`${createId()}@test.invalid`,stageId:stage,valueCents:0},201),detail=await api(`opportunities/${deal.id}`),contact=detail.opportunity.contacts[0];
 const messages=[];
 for(const subject of ['Refused submission','Permanent delivery bounce']){const draft=await api(`workbench/opportunities/${deal.id}/drafts`,{contactId:contact.id,subject,body:'Exact reviewed message'},201),preview=await api(`workbench/drafts/${draft.id}/approval-preview`);messages.push(await api(`workbench/drafts/${draft.id}/approve`,{revision:1,quietHoursConfirmation:preview.localTime},sends===0?502:200));}
 const message=await db.prepare('SELECT idempotency_key FROM outbound_messages WHERE id=?').bind(messages[1].id).first<{idempotency_key:string}>(),timestamp=String(Math.floor(Date.now()/1000)),body=JSON.stringify([{sg_event_id:createId(),event:'bounce',type:'bounce',reason:bounce,timestamp:Number(timestamp),email:contact.email,rer_product:'orbit',rer_delivery_id:message!.idempotency_key}]),signature=await signRelayBody(relaySecret,timestamp,body);
 const delivery=()=>app.request('https://orbit.test/api/v1/mail/events/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':signature},body});assert.equal((await delivery()).status,200);assert.equal((await delivery()).status,200);
 const history=await api(`workbench/opportunities/${deal.id}/messages`);assert.equal(history.messages.length,2);assert.equal(history.messages.find((m:any)=>m.id===messages[0].id).failure,refusal);assert.equal(history.messages.find((m:any)=>m.id===messages[1].id).failure,bounce);assert.equal(sends,2);
 await p.close();
 server=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--ip','127.0.0.1','--port',String(port),'--inspector-port','0','--persist-to',p.directory,...identityVarArgs(origin)],{stdio:['ignore',log.fd,log.fd],env:process.env});
 const deadline=Date.now()+60000;let ready=false;
 while(Date.now()<deadline){if(server.exitCode!==null)throw new Error('Proof Worker exited');try{if((await fetch(origin+'/health')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}assert.ok(ready,'Proof Worker becomes healthy');
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 const screens=[];
 for(const width of [1440,390]){const context=await browser.newContext({viewport:{width,height:1000},extraHTTPHeaders:{Cookie:`__Host-orbit_session=${session.token}`}}),page=await context.newPage();await page.goto(`${origin}/app/opportunities/${deal.id}`,{waitUntil:'networkidle'});for(const reason of [refusal,bounce]){const text=page.getByText(reason,{exact:false}).first();await text.waitFor({state:'visible'});await text.scrollIntoViewIfNeeded();assert.ok(await text.isVisible());}const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);await page.screenshot({path:`${packet}/out-006-${width}.png`,fullPage:true});screens.push({width,rejectionReason:refusal,bounceReason:bounce,overflow});await context.close();}
 await writeFile(`${packet}/browser-receipt.json`,JSON.stringify({door:'/app/opportunities/:id',screens,submissions:sends,historyMessages:history.messages.map((m:any)=>({id:m.id,state:m.state,failure:m.failure})),status:'passed'},null,2)+'\n');console.log('Browser proof passed at 1440 and 390; exact refusal and bounce reasons visible; no overflow; two original submissions.');
}finally{
 await browser?.close();if(server&&server.exitCode===null){server.kill('SIGTERM');await once(server,'exit');}await log.close();await p.dispose();
}
