import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import {reviewedMessageOutcomes} from '../support/message-outcomes';
import {join} from 'node:path';
import {generateKeyPairSync,sign} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {isolatedDatabase} from '../support/isolated-database';
import {availablePort} from '../support/available-port';
import {createDependencies} from '../support/dependencies';
import {RecordsRepository} from '../../src/core/features/records/repository';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import {createId} from '../../src/core/shared/ids';
import {signRelayBody} from '../../src/base/sendgrid-event-relay/crypto';
import {publicIdentity} from '../../src/core/platform/public-rate-limit';
import {identityVarArgs} from '../support/worker-identity.mjs';

test('OUT-002 emitted Worker reloads truthful accepted, delivered, bounced, failed and unresolved message views; signed provider limits and reviewed suppression clear remain intact',async()=>{
 const fixture=await isolatedDatabase(),port=await availablePort(),origin=`http://127.0.0.1:${port}`,secret=crypto.randomUUID()+crypto.randomUUID(),keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),publicKey=keys.publicKey.export({type:'spki',format:'der'}).toString('base64');
 let worker:ReturnType<typeof spawn>|undefined,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
 try{
  const db=fixture.db,actor=createId(),deps=createDependencies(db);await deps.auth.ensureOperator({id:actor,email:'runtime-operator@orbit.test',displayName:'Runtime operator'});await deps.workspace.ensureWorkspace({name:'Runtime',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});const session=await deps.auth.createSession(actor);
  const contact=await new RecordsRepository(db).save('contact',{name:'Runtime suppressed contact',email:'runtime-customer@orbit.test',contactability:'do_not_contact'},actor);
  // Send through native review with only provider HTTP replaced, then reopen the persisted store in the emitted Worker.
  const stage=createId();await deps.workspace.ensurePipelineStage({id:stage,name:'Lead',position:0});
  const opportunity=await new WorkbenchRepository(db).createOpportunity({title:'Runtime outreach',companyName:'Runtime Co',contactName:'Runtime buyer',email:'runtime-buyer@orbit.test',stageId:stage,valueCents:0},actor);
  const buyer=await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(opportunity.id).first<{contact_id:string}>();
  const messages=await reviewedMessageOutcomes(db,`__Host-orbit_session=${session.token}`,opportunity.id,buyer!.contact_id),message=messages[0]!;
  // Saturate the previous shared bucket and unsigned per-IP budget in this and the next minute.
  const ip='launch-provider-test',now=Date.now();for(const time of [now,now+60000]){
   for(const [bucket,count]of [[`ingress:${Math.floor(time/60000)}`,600],[`signed-mail:${Math.floor(time/60000)}`,594],[`public:${await publicIdentity(new Request(origin,{headers:{'CF-Connecting-IP':ip}}),time)}`,299]] as const)await db.prepare('INSERT INTO public_rate_limits VALUES(?,?,?)').bind(bucket,count,time+180000).run();
  }
  await fixture.close();
  // Generated credentials live in a private disposable file, never process arguments or logs.
  const secretsFile=join(fixture.directory,'provider.env');await writeFile(secretsFile,`RER_MAIL_RELAY_SECRET=${secret}\nSENDGRID_WEBHOOK_PUBLIC_KEY=${publicKey}\nSENDGRID_PARSE_PUBLIC_KEY=${publicKey}\n`,{mode:0o600});
  worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',fixture.directory,'--port',String(port),'--inspector-port','0','--env-file',secretsFile,...identityVarArgs(origin)],{stdio:['ignore','pipe','pipe'],env:{...Object.fromEntries(['PATH','HOME','TMPDIR','USER','LANG','LC_ALL'].flatMap(name=>process.env[name]?[[name,process.env[name]!]]:[])),CI:'1',WRANGLER_SEND_METRICS:'false'}});
  worker.stdout!.resume();worker.stderr!.resume();let ready=false;for(let i=0;i<300;i++){try{if((await fetch(origin+'/health')).ok){ready=true;break;}}catch{}if(worker.exitCode!==null)break;await new Promise(resolve=>setTimeout(resolve,100));}assert.equal(ready,true,'Emitted Worker becomes healthy');
  const session_=`__Host-orbit_session=${session.token}`,api=async(path:string)=>{const response=await fetch(origin+'/api/v1/workbench'+path,{headers:{Cookie:session_}});assert.equal(response.status,200);return response.json() as any;};
  const restarted=await api(`/opportunities/${opportunity.id}/messages`);assert.equal(restarted.messages.length,5);
  for(const saved of messages)assert.equal(restarted.messages.find((item:any)=>item.id===saved.id).state,['bounced','delivered'].includes(saved.outcome)?'accepted':saved.outcome);assert.equal((await api('/delivery-outcomes')).lastEventAt,null,'No signed delivery event has arrived yet');
  const timestamp=String(Math.floor(Date.now()/1000)),body='[]',relayHeaders={'CF-Connecting-IP':ip,'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':await signRelayBody(secret,timestamp,body)};
  const relay=(signature=relayHeaders['x-rer-mail-signature'])=>fetch(origin+'/api/v1/mail/events/relay',{method:'POST',headers:{...relayHeaders,'x-rer-mail-signature':signature},body});
  assert.equal((await relay('forged')).status,401);assert.equal((await relay('forged')).status,429);assert.equal((await relay()).status,200,'A valid relay survives saturated unsigned and general ingress buckets');
  const bounce=JSON.stringify([{sg_event_id:createId(),event:'bounce',type:'bounce',reason:'550 5.1.1 Address does not exist',timestamp:Number(timestamp),email:restarted.messages[0].recipientEmail,rer_product:'orbit',rer_delivery_id:message.idempotencyKey}]);
  const signature=sign('sha256',Buffer.from(timestamp+bounce),keys.privateKey).toString('base64');assert.equal((await fetch(origin+'/api/v1/mail/events/sendgrid',{method:'POST',headers:{'CF-Connecting-IP':ip,'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':signature},body:bounce})).status,200);
  const outcomes=await api('/delivery-outcomes');assert.equal(outcomes.connected,true);assert.ok(outcomes.lastEventAt,'Settings shows the last signed delivery event');
  const deliver=JSON.stringify([{sg_event_id:createId(),event:'delivered',timestamp:Number(timestamp),email:restarted.messages[0].recipientEmail,rer_product:'orbit',rer_delivery_id:messages[2]!.idempotencyKey}]);
  const signedPost=(raw:string)=>fetch(origin+'/api/v1/mail/events/sendgrid',{method:'POST',headers:{'CF-Connecting-IP':ip,'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':sign('sha256',Buffer.from(timestamp+raw),keys.privateKey).toString('base64')},body:raw});
  assert.equal((await signedPost(deliver)).status,200);assert.equal((await signedPost(bounce)).status,200,'Signed bounce replay is inert');
  const sent=await api(`/opportunities/${opportunity.id}/messages`);assert.equal(sent.outcomesTracked,true);
  for(const saved of messages){const persisted=sent.messages.find((item:any)=>item.id===saved.id);assert.equal(persisted.state,saved.outcome);assert.equal(Boolean(persisted.deliveredAt),saved.outcome==='delivered');}
  assert.equal(sent.messages.find((item:any)=>item.id===message.id).failure,'550 5.1.1 Address does not exist');
  const form=new FormData();form.set('from','unmatched@customer.test');form.set('text','Runtime genuine reply');form.set('headers',`Message-ID: <${createId()}@customer.test>\r\nDate: ${new Date().toUTCString()}`);const request=new Request(origin+'/api/v1/mail/events/reply',{method:'POST',body:form}),raw=Buffer.from(await request.arrayBuffer());
  assert.equal((await fetch(request.url,{method:'POST',headers:{'CF-Connecting-IP':ip,'Content-Type':request.headers.get('Content-Type')!,'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':sign('sha256',Buffer.concat([Buffer.from(timestamp),raw]),keys.privateKey).toString('base64')},body:raw})).status,200);
  assert.equal((await relay()).status,200);const limited=await relay();assert.equal(limited.status,429);assert.ok(Number(limited.headers.get('Retry-After'))>0);
  browser=await chromium.launch({headless:true,executablePath:process.env.ORBIT_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});const context=await browser.newContext({viewport:{width:1440,height:1000},extraHTTPHeaders:{Cookie:`__Host-orbit_session=${session.token}`}}),page=await context.newPage();
  const expected:Record<string,{kind:string;title:string;label:RegExp}>={
   accepted:{kind:'Sent',title:'Sent message',label:/accepted by the mail provider/i},
   delivered:{kind:'Delivered',title:'Delivered message',label:/deliver(?:ed|y reported)/i},
   bounced:{kind:'Bounced',title:'Message bounced',label:/bounced|delivery problem/i},
   failed:{kind:'Not sent',title:'Message not sent',label:/failed|did not accept/i},
   'delivery-unknown':{kind:'Unresolved',title:'Delivery unresolved',label:/unresolved/i}
  };
  const evidence=process.env.ORBIT_OUTCOME_EVIDENCE;
  if(evidence)await mkdir(evidence,{recursive:true});
  const show=async(path:string)=>{await page.goto(origin+path);await page.reload();};
  await show(`/app/opportunities/${opportunity.id}`);
  for(const saved of messages){
   const row=page.getByTestId('record-activity').locator('li').filter({has:page.getByText(saved.subject,{exact:true})});
   await expect(row).toHaveCount(1);await expect(row.locator('.r-kind')).toHaveText(expected[saved.outcome]!.kind);await expect(row.locator('.r-entry-line')).toContainText(expected[saved.outcome]!.label);
   if(saved.outcome==='accepted')await expect(row).not.toContainText(/\bdelivered\b/i);
   if(saved.outcome==='bounced')await expect(row).toContainText('550 5.1.1 Address does not exist');
  }
  if(evidence){await page.getByRole('button',{name:'More for Runtime buyer',exact:true}).hover();await page.getByRole('tooltip').waitFor();await page.screenshot({path:join(evidence,'activity-1440.png'),fullPage:true});}
  for(const saved of messages){
   await show(`/app/drafts/${saved.draftId}`);await expect(page.getByRole('heading',{name:expected[saved.outcome]!.title,exact:true})).toBeVisible();
   await expect(page.getByTestId('draft-editor').getByRole('status')).toContainText(expected[saved.outcome]!.label);
   if(saved.outcome==='accepted')await expect(page.getByTestId('draft-editor')).not.toContainText(/\bdelivered\b/i);
   if(['failed','delivery-unknown'].includes(saved.outcome))await expect(page.getByTestId('draft-editor')).not.toContainText(/\bsent successfully\b|\bdelivered\b/i);
   await expect(page.getByRole('region',{name:'Approved message',exact:true})).toBeVisible();await expect(page.getByTestId('draft-editor')).toContainText(saved.subject);await expect(page.getByTestId('draft-editor')).toContainText('Runtime reviewed body');
   if(evidence)await page.screenshot({path:join(evidence,`${saved.outcome}-1440.png`),fullPage:true});
  }
  // One-width assertions above are in Verify; optional phone captures are the landing's browser proof.
  if(evidence){
   await page.setViewportSize({width:390,height:844});await show(`/app/opportunities/${opportunity.id}`);await page.getByTestId('record-activity').getByText(messages[0]!.subject,{exact:true}).waitFor();
   await page.getByRole('button',{name:'More for Runtime buyer',exact:true}).focus();await page.getByRole('tooltip').waitFor();await page.screenshot({path:join(evidence,'activity-390.png'),fullPage:true});
   for(const saved of messages){await show(`/app/drafts/${saved.draftId}`);await page.getByRole('heading',{name:expected[saved.outcome]!.title,exact:true}).waitFor();await page.screenshot({path:join(evidence,`${saved.outcome}-390.png`),fullPage:true});}
   await page.setViewportSize({width:1440,height:1000});
  }
  assert.equal((await api(`/opportunities/${opportunity.id}/messages`)).messages.length,5,'Reloading outcomes creates no new message');
  await page.goto(origin+'/app/contacts');await page.locator('.records-list a').filter({has:page.getByRole('heading',{name:'Runtime suppressed contact',exact:true})}).click();
  // Email permission: back to Contactable is the reviewed clear, asking once under the field.
  const permission=page.getByTestId('record-details').getByLabel('Email permission',{exact:true});assert.equal(await permission.inputValue(),'do_not_contact');
  await permission.selectOption('contactable');const review=page.getByRole('group',{name:'Confirm change',exact:true});await expect(review).toContainText('runtime-customer@orbit.test');await expect(review.getByRole('button',{name:'Clear do-not-contact',exact:true})).toBeFocused();await review.getByRole('button',{name:'Clear do-not-contact',exact:true}).click();await expect(review).toHaveCount(0);await expect(permission).toHaveValue('contactable');
  await expect.poll(async()=>((await (await fetch(origin+`/api/v1/records/contact/${contact.id}`,{headers:{Cookie:`__Host-orbit_session=${session.token}`}})).json()) as any).record.contactability).toBe('contactable');
  const result=await fetch(origin+`/api/v1/records/contact/${contact.id}`,{headers:{Cookie:`__Host-orbit_session=${session.token}`}});assert.equal(result.status,200);assert.equal((await result.json() as any).record.contactability,'contactable');
 }finally{
  await browser?.close();if(worker&&worker.exitCode===null){const exited=once(worker,'exit');worker.kill('SIGTERM');await exited;}await fixture.dispose();
 }
});
