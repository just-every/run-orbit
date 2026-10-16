import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {authenticateOperator} from './operator-session.mjs';
import {fixtureMailbox} from '../support/capture-mail.ts';
import {requestOfflineFixture} from '../../scripts/browser-runtime.mjs';

const serious=async page=>(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.filter(violation=>['serious','critical'].includes(violation.impact));
// Nothing may push the page wider than the screen.
const overflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth?[]:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>`${e.tagName.toLowerCase()}.${e.className} ${Math.round(e.getBoundingClientRect().right)}`).slice(0,8));

test('CAPTURE-001 CAPTURE-004 an operator adds a mailbox and calendar files, reviews the proposals and opens the account at 1440 and 390',async({page,context},info)=>{
 test.setTimeout(240_000);await authenticateOperator(context);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const screenshots=process.env.CAPTURE_SCREENSHOT_DIR??join('verification','ui','capture');mkdirSync(screenshots,{recursive:true});
 await page.goto('/app/capture');const origin=new URL(page.url()).origin;
 const create=async(kind,body)=>{const response=await page.request.post(`/api/v1/records/${kind}`,{headers:{Origin:origin},data:body});expect(response.status()).toBe(201);return (await response.json()).id;};
 for(const width of [1440,390]){
  const domain=`capture-${width}-${Date.now()}.example`,account=`Acme ${width}`;
  const company=await create('company',{name:account,primary_domain:domain});
  const ana=await create('contact',{name:'Ana Ruiz',email:`ana@${domain}`,company_id:company}),bob=await create('contact',{name:'Bob Stone',email:`bob@${domain}`,company_id:company});
  // No opportunity: the browser suites share one database, and NOW and notifications must stay as the other suites expect.
  const mail=fixtureMailbox({anaThread:`<no-orbit-thread@${domain}>`,bobThread:`<no-orbit-send@${domain}>`},domain);
  const files=[{name:'mailbox.mbox',mimeType:'application/mbox',buffer:Buffer.from(mail.mbox)},{name:'invite.ics',mimeType:'text/calendar',buffer:Buffer.from(mail.invite)},{name:'cancel.ics',mimeType:'text/calendar',buffer:Buffer.from(mail.cancellation)}];

  await page.setViewportSize({width,height:900});await page.goto('/app/capture');
  await expect(page.getByRole('heading',{name:'Capture mail and meetings',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Set up mail and calendar files'}).click();
  await expect(page.getByRole('heading',{name:'Upload mail and calendar files',level:1})).toBeVisible();
  await page.getByLabel('Mail (.eml or mbox) and calendar (.ics) files').setInputFiles(files);
  await page.getByRole('button',{name:'Add files',exact:true}).click();
  const result=page.getByRole('region',{name:'Import result'});
  await expect(result.getByRole('row',{name:/^Captured 6$/})).toBeVisible();
  await expect(result.getByRole('row',{name:/^Not stored 1$/})).toBeVisible();
  await expect(page.getByText('No known contact or company domain: 1',{exact:true})).toBeVisible();
  expect(await overflow(page)).toEqual([]);expect(await serious(page)).toEqual([]);
  await page.screenshot({path:join(screenshots,`capture-${width}.png`),fullPage:true});
  // Review is its own place once something is captured.
  await page.getByRole('link',{name:/^Review \d+ proposed changes?$/}).click();
  await expect(page.getByRole('heading',{name:'Review proposed changes',level:1})).toBeVisible();
  await expect(page.getByRole('article',{name:'Link this reply to Ana Ruiz'})).toBeVisible();
  expect(await overflow(page)).toEqual([]);expect(await serious(page)).toEqual([]);

  // Open the account: its proposals wait there, and nothing is on its timeline until a person accepts.
  await page.goto(`/app/records?kind=company&record=${company}`);
  await expect(page.getByRole('heading',{name:account,exact:true,level:1})).toBeVisible();
  const reply=page.getByRole('article',{name:'Link this reply to Ana Ruiz'});
  await expect(reply).toContainText('Can we talk on Tuesday?');
  const timelineSignals=page.locator('article[id^="entry-"]').filter({has:page.locator('[data-field="signalId"]')});
  await expect(timelineSignals).toHaveCount(0);
  const name=page.getByRole('article',{name:'Set name from this message'});
  await expect(name.getByRole('cell',{name:'Ana Ruiz',exact:true})).toBeVisible();await expect(name.getByRole('cell',{name:'Ana R.',exact:true})).toBeVisible();
  expect(await overflow(page)).toEqual([]);expect(await serious(page)).toEqual([]);
  await page.screenshot({path:join(screenshots,`account-before-review-${width}.png`),fullPage:true});
  await reply.getByRole('button',{name:'Accept',exact:true}).click();
  await expect(page.getByText('Accepted: Link this reply to Ana Ruiz.')).toBeVisible();
  await expect(timelineSignals).toHaveCount(1);
  const cara=page.getByRole('article',{name:`Create contact cara@${domain} at ${account}`});
  await cara.getByRole('button',{name:'Decline',exact:true}).click();
  await expect(page.getByText(/Declined: Create contact .* It will not be offered again/)).toBeVisible();
  expect(await serious(page)).toEqual([]);
  await page.screenshot({path:join(screenshots,`account-after-review-${width}.png`),fullPage:true});

  // Adding the same files again changes nothing and the declined proposal does not return.
  await page.goto('/app/capture/connect/files');await page.getByLabel('Mail (.eml or mbox) and calendar (.ics) files').setInputFiles(files);await page.getByRole('button',{name:'Add files',exact:true}).click();
  await expect(page.getByRole('region',{name:'Import result'}).getByRole('row',{name:/^Already captured 6$/})).toBeVisible();
  await page.goto(`/app/records?kind=company&record=${company}`);
  await expect(page.getByRole('article',{name:'Set name from this message'})).toBeVisible();
  await expect(page.getByRole('article',{name:`Create contact cara@${domain} at ${account}`})).toHaveCount(0);
  await expect(timelineSignals).toHaveCount(1);
 }
 expect(errors).toEqual([]);
});

test('CAPTURE provider status keeps revoked access clear, reconnects through the guided setup and disconnect preserves captured history',async({page,context})=>{
 test.setTimeout(120_000);
 await authenticateOperator(context);
 await requestOfflineFixture('tests/support/capture-browser-source.ts');

 await page.goto('/app/capture');
 const providersResponse=await page.request.get('/api/v1/capture/providers');
 expect(providersResponse.ok()).toBeTruthy();
 const providers=await providersResponse.json();
 expect(providers.available).toBe(true);

 const screenshots=process.env.CAPTURE_SCREENSHOT_DIR??join('verification','ui','capture');
 mkdirSync(screenshots,{recursive:true});
 const sources=[
  {id:'capture-browser-revoked-google',name:'Revoked Gmail proof',provider:'Google'},
  {id:'capture-browser-revoked-microsoft',name:'Revoked Outlook proof',provider:'Microsoft'},
 ];
 const sourceApi=await page.request.get('/api/v1/capture/sources');
 expect(sourceApi.ok()).toBeTruthy();
 const initialSources=(await sourceApi.json()).sources;
 for(const source of sources){
  const before=initialSources.find(item=>item.id===source.id);
  expect(before).toMatchObject({state:'error',has_credential:1,captured_count:7,skipped_count:2,proposals_waiting:1,last_success_at:'2026-10-01T12:00:00.000Z'});
 }
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await page.goto('/app/capture');
  for(const source of sources){
   const card=page.getByRole('article',{name:source.name});
   await expect(card.getByText(source.provider,{exact:true})).toBeVisible();
   await expect(card.getByText('Access revoked · reconnect required',{exact:true})).toBeVisible();
   await expect(card.getByText('Access was revoked: Reconnect to resume.',{exact:true})).toBeVisible();
   await expect(card.getByRole('heading',{name:'Reconnect after access was revoked'})).toBeVisible();
   await expect(card.getByRole('button',{name:`Disconnect ${source.name}`,exact:true})).toBeVisible();
  }
  expect(await overflow(page)).toEqual([]);
  expect(await serious(page)).toEqual([]);
  await page.screenshot({path:join(screenshots,`capture-revoked-${width}.png`),fullPage:true});
  // Reconnecting is the guided, one-provider setup: plain steps, the exact console pages, the callback where it is pasted.
  for(const source of sources){
   const provider=providers.providers.find(item=>item.name.startsWith(source.provider));
   await page.goto('/app/capture');
   await page.getByRole('article',{name:source.name}).getByRole('link',{name:`Reconnect ${source.name}`,exact:true}).click();
   await expect(page.getByRole('heading',{name:`Connect your ${source.provider} account`,level:1})).toBeVisible();
   const steps=page.getByRole('navigation',{name:`${source.provider} steps`});
   await expect(steps.getByRole('listitem')).toHaveCount(6);
   const form=page.getByRole('form',{name:`Reconnect ${source.provider}`});
   await expect(form.locator('input[name="sourceId"]')).toHaveValue(source.id);
   await expect(form.getByLabel('Client secret')).toHaveAttribute('type','password');
   await expect(form).toHaveAttribute('action',`/api/v1/capture/oauth/${provider.id}/start`);
   await steps.getByRole('link',{name:/^2\./}).click();
   const callbackStep=source.provider==='Google'?4:2;
   await steps.getByRole('link',{name:new RegExp(`^${callbackStep}\\.`)}).click();
   await expect(page.getByText(`Step ${callbackStep} of 6`)).toBeVisible();
   await expect(page.getByRole('textbox',{name:`${source.provider} redirect address`})).toHaveText(provider.redirectUri);
   await expect(page.getByRole('button',{name:`Copy ${source.provider.toLowerCase()} redirect address`})).toBeVisible();
   for(const link of await page.locator('.capture-guide__card a[target=_blank]').all())expect(new URL(await link.getAttribute('href')).protocol).toBe('https:');
   expect(await overflow(page)).toEqual([]);
   expect(await serious(page)).toEqual([]);
   await page.screenshot({path:join(screenshots,`capture-guide-${provider.id}-${width}.png`),fullPage:true});
  }
  await page.goto('/app/capture');
 }

 for(const source of sources){
  const card=page.getByRole('article',{name:source.name});
  page.once('dialog',dialog=>dialog.accept());
  await card.getByRole('button',{name:`Disconnect ${source.name}`,exact:true}).click();
  await expect(card.getByText('Disconnected',{exact:true})).toBeVisible();
 }
 const after=await page.request.get('/api/v1/capture/sources');
 expect(after.ok()).toBeTruthy();
 const afterSources=(await after.json()).sources;
 for(const source of sources){
  const saved=afterSources.find(item=>item.id===source.id);
  expect(saved).toMatchObject({state:'disconnected',has_credential:0,captured_count:7,skipped_count:2,proposals_waiting:1,last_success_at:'2026-10-01T12:00:00.000Z'});
  const card=page.getByRole('article',{name:source.name});
  const count=label=>card.locator('.records-detail-list > div').filter({has:page.getByText(label,{exact:true})}).locator('dd');
  await expect(count('Captured')).toHaveText('7');
  await expect(count('Not stored')).toHaveText('2');
  await expect(count('Proposals waiting')).toHaveText('1');
 }
 expect(await overflow(page)).toEqual([]);
 expect(await serious(page)).toEqual([]);
});
