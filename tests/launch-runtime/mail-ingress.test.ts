import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHmac} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {isolatedDatabase} from '../support/isolated-database';
import {emittedMailWorker} from '../support/emitted-mail-worker';
import {createDependencies} from '../support/dependencies';
import {mailTransportKeys} from '../support/mail-transport-client';
import {RecordsRepository} from '../../src/core/features/records/repository';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import {OutreachRepository} from '../../src/core/features/workbench/outreach-repository';
import {ApprovalRepository} from '../../src/core/features/outreach/approval-repository';
import {createId} from '../../src/core/shared/ids';
import {mailTransport} from './mail-transport';
import {sessionBoundaries,publicQuota} from './session-boundaries';
import {unconfiguredHost} from './unconfigured-host';

// One emitted installation: an authenticated seller's reviewed message receives
// provider evidence, is stopped by its source and remains safe under abusive ingress.
test('the emitted installation protects seller sessions and consumes authenticated mail evidence without reviving stopped outreach',async()=>{
 const fixture=await isolatedDatabase(),keys=mailTransportKeys(),canary=crypto.randomUUID();
 const worker=await emittedMailWorker(fixture.directory,{...keys.bindings,MAIL_PROVIDER:'development',MAIL_FROM:'auth@localhost.test',SENDGRID_API_KEY:canary,ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)});
 let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
 try{
  const db=fixture.db,actor=createId(),stage=createId(),deps=createDependencies(db);
  await deps.auth.ensureOperator({id:actor,email:'runtime-operator@orbit.test',displayName:'Runtime operator'});
  await deps.workspace.ensureWorkspace({name:'Runtime',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  await deps.workspace.ensurePipelineStage({id:stage,name:'Lead',position:0});
  const session=await deps.auth.createSession(actor),revoked=await deps.auth.createSession(actor),expired=await deps.auth.createSession(actor);
  await deps.auth.revoke(revoked.id);await db.prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?").bind(expired.id).run();
  const opportunity=await new WorkbenchRepository(db).createOpportunity({title:'Runtime outreach',companyName:'Runtime Co',contactName:'Runtime buyer',email:'runtime-buyer@orbit.test',stageId:stage,valueCents:0},actor);
  const buyer=(await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(opportunity.id).first<{contact_id:string}>())!.contact_id;
  // The sent deal moves to NEXT; retain real pending work for the NOW document
  // and client-transport authority checks before processing delivery receipts.
  const pendingInput={title:'Customer awaiting review',companyName:'Pending customer',contactName:'Pending buyer',email:'pending-buyer@orbit.test',stageId:stage,valueCents:0};
  const pending={...await new WorkbenchRepository(db).createOpportunity(pendingInput,actor),title:pendingInput.title};
  const outreach=new OutreachRepository(db),approval=new ApprovalRepository(db);
  const draft=await outreach.createDraft(opportunity.id,{contactId:buyer,subject:'Runtime subject',body:'Runtime body'},actor);
  const message=await approval.approve(draft.id,1,actor,{quietHoursConfirmation:(await approval.preview(draft.id)).localTime});
  await outreach.settle(message.id,actor,'accepted','runtime-receipt',null);
  const scheduledDraft=await outreach.createDraft(opportunity.id,{contactId:buyer,subject:'Later reviewed subject',body:'Later reviewed body'},actor);
  const scheduled=await approval.approve(scheduledDraft.id,1,actor,{now:new Date('2030-01-07T09:00:00Z'),scheduledAt:'2030-01-07T10:00:00Z'});
  const stopped=await new RecordsRepository(db).save('contact',{name:'Runtime suppressed contact',email:'runtime-customer@orbit.test',contactability:'do_not_contact'},actor);
  await fixture.close();await unconfiguredHost(fixture.directory);await worker.start();
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});
  await sessionBoundaries({fixture,worker,browser,session,revoked,expired,opportunity:pending,canary});
  await publicQuota(fixture,worker);
  const headers={Cookie:`__Host-orbit_session=${session.token}`,Origin:worker.origin,'Content-Type':'application/json'};
  const api=async(path:string)=>{const response=await fetch(worker.origin+'/api/v1/workbench'+path,{headers});assert.equal(response.status,200);return response.json() as any;};
  assert.equal((await api(`/opportunities/${opportunity.id}/messages`)).messages.find((row:any)=>row.id===message.id).state,'accepted');
  assert.equal((await api('/delivery-outcomes')).lastEventAt,null);
  const bounce=Buffer.from(JSON.stringify([{sg_event_id:createId(),event:'bounce',type:'bounce',reason:'550 5.1.1 Address does not exist',timestamp:Math.floor(Date.now()/1000),email:'runtime-buyer@orbit.test',rer_product:'orbit',rer_delivery_id:message.idempotency_key}]));
  const forged=await fetch(worker.origin+'/api/v1/mail/events/sendgrid',{method:'POST',headers:{'X-Twilio-Email-Event-Webhook-Signature':'forged'},body:bounce});assert.equal(forged.status,401);
  const signedHeaders=await keys.headers('sendgrid',bounce,'runtime-provider');
  assert.equal((await fetch(worker.origin+'/api/v1/mail/events/sendgrid',{method:'POST',headers:signedHeaders,body:bounce})).status,200);
  assert.equal((await fetch(worker.origin+'/api/v1/mail/events/sendgrid',{method:'POST',headers:signedHeaders,body:bounce})).status,200,'Replayed provider evidence is accepted once');
  const outcomes=await api('/delivery-outcomes');assert.equal(outcomes.connected,true);assert.ok(outcomes.lastEventAt);
  const sent=(await api(`/opportunities/${opportunity.id}/messages`)).messages.find((row:any)=>row.id===message.id);assert.equal(sent.state,'bounced');assert.equal(sent.failure,'550 5.1.1 Address does not exist');
  const source=createId(),configured=await fetch(worker.origin+`/api/v1/sources/${source}`,{method:'PUT',headers,body:JSON.stringify({name:'Runtime configured source',enabled:true})});assert.equal(configured.status,200);
  const secret=(await configured.json() as any).secret,event={eventId:createId(),type:'email.unsubscribed',subject:'Customer unsubscribed',occurredAt:new Date().toISOString(),email:'RUNTIME-BUYER@orbit.test',record:{type:'opportunity',id:opportunity.id}},body=JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000));
  const sendStop=()=>fetch(worker.origin+`/api/v1/signals/${source}`,{method:'POST',headers:{'Content-Type':'application/json','X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex')},body});
  const accepted=await sendStop();assert.equal(accepted.status,201);const signal=await accepted.json() as {id:string;linked:boolean};assert.equal(signal.linked,true);assert.deepEqual(await(await sendStop()).json(),{id:signal.id,replayed:true});
  const contact=await(await fetch(worker.origin+`/api/v1/records/contact/${buyer}`,{headers})).json() as any;assert.equal(contact.record.contactability,'do_not_contact');
  assert.equal((await api(`/opportunities/${opportunity.id}/messages`)).messages.find((row:any)=>row.id===scheduled.id).state,'cancelled');
  const context=await browser.newContext({viewport:{width:1440,height:900},extraHTTPHeaders:{Cookie:headers.Cookie}}),page=await context.newPage();
  await page.goto(worker.origin+`/app/opportunities/${opportunity.id}`);await expect(page.getByTestId('message-outcome').filter({hasText:'bounced'})).toBeVisible();await expect(page.locator('#approved-outreach')).toContainText(sent.failure);
  await page.goto(worker.origin+`/app/records?kind=contact&record=${stopped.id}`);await page.getByRole('button',{name:'Edit details',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Contactability',exact:true})).toHaveValue('do_not_contact');
  assert.equal(await page.getByRole('combobox',{name:'Contactability',exact:true}).locator('option[value="contactable"]').evaluate((option:HTMLOptionElement)=>option.disabled),true);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Clear do-not-contact',exact:true}).click();
  const review=page.getByRole('dialog',{name:'Clear do-not-contact',exact:true});await expect(review).toContainText('runtime-customer@orbit.test');await expect(review.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();
  await review.getByRole('button',{name:'Clear do-not-contact',exact:true}).click();await expect(review).toHaveCount(0);await page.getByRole('button',{name:'Clear do-not-contact',exact:true}).waitFor({state:'detached'});
  const cleared=await(await fetch(worker.origin+`/api/v1/records/contact/${stopped.id}`,{headers})).json() as any;assert.equal(cleared.record.contactability,'contactable');
  await context.close();
  await mailTransport(fixture,worker,keys);
 }finally{await browser?.close();await worker.stop();await fixture.dispose();}
});
