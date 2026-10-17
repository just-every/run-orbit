import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {generateKeyPairSync,sign} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {isolatedDatabase} from '../support/isolated-database';
import {availablePort} from '../support/available-port';
import {createDependencies} from '../support/dependencies';
import {RecordsRepository} from '../../src/core/features/records/repository';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import {OutreachRepository} from '../../src/core/features/workbench/outreach-repository';
import {ApprovalRepository} from '../../src/core/features/outreach/approval-repository';
import {createId} from '../../src/core/shared/ids';
import {signRelayBody} from '../../src/base/sendgrid-event-relay/crypto';
import {publicIdentity} from '../../src/core/platform/public-rate-limit';
import {identityVarArgs} from '../support/worker-identity.mjs';

test('emitted Worker verifies each provider before its separate limit, shows a signed bounce as the message outcome, and supports the reviewed native do-not-contact clear',async()=>{
 const fixture=await isolatedDatabase(),port=await availablePort(),origin=`http://127.0.0.1:${port}`,secret=crypto.randomUUID()+crypto.randomUUID(),keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),publicKey=keys.publicKey.export({type:'spki',format:'der'}).toString('base64');
 let worker:ReturnType<typeof spawn>|undefined,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
 try{
  const db=fixture.db,actor=createId(),deps=createDependencies(db);await deps.auth.ensureOperator({id:actor,email:'runtime-operator@orbit.test',displayName:'Runtime operator'});await deps.workspace.ensureWorkspace({name:'Runtime',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});const session=await deps.auth.createSession(actor);
  const contact=await new RecordsRepository(db).save('contact',{name:'Runtime suppressed contact',email:'runtime-customer@orbit.test',contactability:'do_not_contact'},actor);
  // One approved message SendGrid accepted; its signed bounce must become the message's visible outcome.
  const stage=createId();await deps.workspace.ensurePipelineStage({id:stage,name:'Lead',position:0});
  const opportunity=await new WorkbenchRepository(db).createOpportunity({title:'Runtime outreach',companyName:'Runtime Co',contactName:'Runtime buyer',email:'runtime-buyer@orbit.test',stageId:stage,valueCents:0},actor);
  const buyer=await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(opportunity.id).first<{contact_id:string}>();
  const draft=await new OutreachRepository(db).createDraft(opportunity.id,{contactId:buyer!.contact_id,subject:'Runtime subject',body:'Runtime body'},actor),approval=new ApprovalRepository(db);
  const message=await approval.approve(draft.id,1,actor,{quietHoursConfirmation:(await approval.preview(draft.id)).localTime});await new OutreachRepository(db).settle(message.id,actor,'accepted','runtime-receipt',null);
  // Saturate the previous shared bucket and unsigned per-IP budget in this and the next minute.
  const ip='launch-provider-test',now=Date.now();for(const time of [now,now+60000]){
   for(const [bucket,count]of [[`ingress:${Math.floor(time/60000)}`,600],[`signed-mail:${Math.floor(time/60000)}`,596],[`public:${await publicIdentity(new Request(origin,{headers:{'CF-Connecting-IP':ip}}),time)}`,299]] as const)await db.prepare('INSERT INTO public_rate_limits VALUES(?,?,?)').bind(bucket,count,time+180000).run();
  }
  await fixture.close();
  // Generated credentials live in a private disposable file, never process arguments or logs.
  const secretsFile=join(fixture.directory,'provider.env');await writeFile(secretsFile,`RER_MAIL_RELAY_SECRET=${secret}\nSENDGRID_WEBHOOK_PUBLIC_KEY=${publicKey}\nSENDGRID_PARSE_PUBLIC_KEY=${publicKey}\n`,{mode:0o600});
  worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',fixture.directory,'--port',String(port),'--inspector-port','0','--env-file',secretsFile,...identityVarArgs(origin)],{stdio:['ignore','pipe','pipe'],env:{...Object.fromEntries(['PATH','HOME','TMPDIR','USER','LANG','LC_ALL'].flatMap(name=>process.env[name]?[[name,process.env[name]!]]:[])),CI:'1',WRANGLER_SEND_METRICS:'false'}});
  worker.stdout!.resume();worker.stderr!.resume();let ready=false;for(let i=0;i<300;i++){try{if((await fetch(origin+'/health')).ok){ready=true;break;}}catch{}if(worker.exitCode!==null)break;await new Promise(resolve=>setTimeout(resolve,100));}assert.equal(ready,true,'Emitted Worker becomes healthy');
  const session_=`__Host-orbit_session=${session.token}`,api=async(path:string)=>{const response=await fetch(origin+'/api/v1/workbench'+path,{headers:{Cookie:session_}});assert.equal(response.status,200);return response.json() as any;};
  assert.equal((await api(`/opportunities/${opportunity.id}/messages`)).messages[0].state,'accepted');assert.equal((await api('/delivery-outcomes')).lastEventAt,null,'No signed delivery event has arrived yet');
  const timestamp=String(Math.floor(Date.now()/1000)),body='[]',relayHeaders={'CF-Connecting-IP':ip,'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':await signRelayBody(secret,timestamp,body)};
  const relay=(signature=relayHeaders['x-rer-mail-signature'])=>fetch(origin+'/api/v1/mail/events/relay',{method:'POST',headers:{...relayHeaders,'x-rer-mail-signature':signature},body});
  assert.equal((await relay('forged')).status,401);assert.equal((await relay('forged')).status,429);assert.equal((await relay()).status,200,'A valid relay survives saturated unsigned and general ingress buckets');
  const bounce=JSON.stringify([{sg_event_id:createId(),event:'bounce',type:'bounce',reason:'550 5.1.1 Address does not exist',timestamp:Number(timestamp),email:'runtime-buyer@orbit.test',rer_product:'orbit',rer_delivery_id:message.idempotency_key}]);
  const signature=sign('sha256',Buffer.from(timestamp+bounce),keys.privateKey).toString('base64');assert.equal((await fetch(origin+'/api/v1/mail/events/sendgrid',{method:'POST',headers:{'CF-Connecting-IP':ip,'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':signature},body:bounce})).status,200);
  const outcomes=await api('/delivery-outcomes');assert.equal(outcomes.connected,true);assert.ok(outcomes.lastEventAt,'Settings shows the last signed delivery event');
  const sent=await api(`/opportunities/${opportunity.id}/messages`);assert.equal(sent.outcomesTracked,true);assert.equal(sent.messages[0].state,'bounced');assert.equal(sent.messages[0].failure,'550 5.1.1 Address does not exist');
  const form=new FormData();form.set('from','unmatched@customer.test');form.set('text','Runtime genuine reply');form.set('headers',`Message-ID: <${createId()}@customer.test>\r\nDate: ${new Date().toUTCString()}`);const request=new Request(origin+'/api/v1/mail/events/reply',{method:'POST',body:form}),raw=Buffer.from(await request.arrayBuffer());
  assert.equal((await fetch(request.url,{method:'POST',headers:{'CF-Connecting-IP':ip,'Content-Type':request.headers.get('Content-Type')!,'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':sign('sha256',Buffer.concat([Buffer.from(timestamp),raw]),keys.privateKey).toString('base64')},body:raw})).status,200);
  assert.equal((await relay()).status,200);const limited=await relay();assert.equal(limited.status,429);assert.ok(Number(limited.headers.get('Retry-After'))>0);
  browser=await chromium.launch();const context=await browser.newContext({extraHTTPHeaders:{Cookie:`__Host-orbit_session=${session.token}`}}),page=await context.newPage();
  await page.goto(origin+`/app/opportunities/${opportunity.id}`);await expect(page.getByTestId('message-outcome')).toContainText('Bounced');await expect(page.locator('#approved-outreach')).toContainText('550 5.1.1 Address does not exist');
  await page.goto(origin+'/app/records');await page.getByRole('button',{name:'Contacts',exact:true}).click();await page.getByRole('button').filter({has:page.getByRole('heading',{name:'Runtime suppressed contact',exact:true})}).click();
  await page.getByRole('button',{name:'Edit details',exact:true}).click();assert.equal(await page.getByRole('combobox',{name:'Contactability',exact:true}).inputValue(),'do_not_contact');assert.equal(await page.getByRole('combobox',{name:'Contactability',exact:true}).locator('option[value="contactable"]').evaluate(option=>(option as HTMLOptionElement).disabled),true,'The native contactable option is disabled for a stopped contact');await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Clear do-not-contact',exact:true}).click();const review=page.getByRole('dialog',{name:'Clear do-not-contact',exact:true});await expect(review).toContainText('runtime-customer@orbit.test');await expect(review.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();await review.getByRole('button',{name:'Clear do-not-contact',exact:true}).click();await expect(review).toHaveCount(0);await page.getByRole('button',{name:'Clear do-not-contact',exact:true}).waitFor({state:'detached'});
  const result=await fetch(origin+`/api/v1/records/contact/${contact.id}`,{headers:{Cookie:`__Host-orbit_session=${session.token}`}});assert.equal(result.status,200);assert.equal((await result.json() as any).record.contactability,'contactable');
 }finally{
  await browser?.close();if(worker&&worker.exitCode===null){const exited=once(worker,'exit');worker.kill('SIGTERM');await exited;}await fixture.dispose();
 }
});
