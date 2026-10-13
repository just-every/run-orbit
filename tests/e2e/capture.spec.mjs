import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {authenticateOperator} from './operator-session.mjs';
import {fixtureMailbox} from '../support/capture-mail.ts';

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
  await expect(page.getByRole('heading',{name:'Capture mail and calendar',exact:true})).toBeVisible();
  await page.getByLabel('Mail (.eml or mbox) and calendar (.ics) files').setInputFiles(files);
  await page.getByRole('button',{name:'Add files',exact:true}).click();
  const result=page.getByRole('region',{name:'Import result'});
  await expect(result.getByRole('row',{name:/^Captured 6$/})).toBeVisible();
  await expect(result.getByRole('row',{name:/^Not stored 1$/})).toBeVisible();
  await expect(page.getByText('No known contact or company domain: 1',{exact:true})).toBeVisible();
  await expect(page.getByRole('article',{name:'Link this reply to Ana Ruiz'})).toBeVisible();
  expect(await overflow(page)).toEqual([]);expect(await serious(page)).toEqual([]);
  await page.screenshot({path:join(screenshots,`capture-${width}.png`),fullPage:true});

  // Open the account: its proposals wait there, and nothing is on its timeline until a person accepts.
  await page.goto(`/app/records?kind=company&record=${company}`);
  await expect(page.getByRole('heading',{name:account,exact:true,level:1})).toBeVisible();
  const reply=page.getByRole('article',{name:'Link this reply to Ana Ruiz'});
  await expect(reply).toContainText('Can we talk on Tuesday?');
  await expect(page.getByRole('heading',{name:'signal.recorded',exact:true})).toHaveCount(0);
  const name=page.getByRole('article',{name:'Set name from this message'});
  await expect(name.getByRole('cell',{name:'Ana Ruiz',exact:true})).toBeVisible();await expect(name.getByRole('cell',{name:'Ana R.',exact:true})).toBeVisible();
  expect(await overflow(page)).toEqual([]);expect(await serious(page)).toEqual([]);
  await page.screenshot({path:join(screenshots,`account-before-review-${width}.png`),fullPage:true});
  await reply.getByRole('button',{name:'Accept',exact:true}).click();
  await expect(page.getByText('Accepted: Link this reply to Ana Ruiz.')).toBeVisible();
  await expect(page.getByRole('heading',{name:'signal.recorded',exact:true})).toHaveCount(1);
  const cara=page.getByRole('article',{name:`Create contact cara@${domain} at ${account}`});
  await cara.getByRole('button',{name:'Decline',exact:true}).click();
  await expect(page.getByText(/Declined: Create contact .* It will not be offered again/)).toBeVisible();
  expect(await serious(page)).toEqual([]);
  await page.screenshot({path:join(screenshots,`account-after-review-${width}.png`),fullPage:true});

  // Adding the same files again changes nothing and the declined proposal does not return.
  await page.goto('/app/capture');await page.getByLabel('Mail (.eml or mbox) and calendar (.ics) files').setInputFiles(files);await page.getByRole('button',{name:'Add files',exact:true}).click();
  await expect(page.getByRole('region',{name:'Import result'}).getByRole('row',{name:/^Already captured 6$/})).toBeVisible();
  await page.goto(`/app/records?kind=company&record=${company}`);
  await expect(page.getByRole('article',{name:'Set name from this message'})).toBeVisible();
  await expect(page.getByRole('article',{name:`Create contact cara@${domain} at ${account}`})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'signal.recorded',exact:true})).toHaveCount(1);
 }
 expect(errors).toEqual([]);
});
