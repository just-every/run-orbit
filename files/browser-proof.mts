import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium,expect} from '/workspace/run-orbit/node_modules/@playwright/test/index.mjs';
import {fixture} from '/workspace/run-orbit/newtests/t096/fixture.ts';
import {emittedWorker} from '/workspace/run-orbit/newtests/t096/emitted-fixture.ts';
import {createApp} from '/workspace/run-orbit/tests/support/app.ts';
import {WorkbenchRepository} from '/workspace/run-orbit/src/core/features/workbench/repository.ts';
const directory='/home/agent/rer-consolidation/work/sd-orbit-c-f67/packet';
await mkdir(directory,{recursive:true});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const f=await fixture();
let browser,worker;
try{
 const app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})}});
 const api=async(path,method='GET',data?)=>{
  const r=await app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});
  assert.ok(r.ok,await r.clone().text());return r.json();
 };
 await api('settings/opt-out/one_to_one','POST',{carries:false,removalAllowed:true});
 const ids={};
 for(const kind of ['template','snippet','signature']){
  ids[kind]=(await api('library','POST',{kind,name:'Synthetic Orbit '+kind,subject:kind==='template'?'Next steps for {{company.name}}':'',body:kind==='template'?'Hi {{contact.name}},\nYour role: {{contact.job_title}}.':kind==='snippet'?'Review {{deal.title}} together.':'Best,\nSynthetic Orbit sales — 雪 67',visibility:'shared'})).id;
 }
 const email=['synthetic-orbit-67','customer.test'].join('@');
 const deal=await new WorkbenchRepository(f.db).createOpportunity({title:'Synthetic rollout',companyName:'Synthetic customer',contactName:'Maya Chen',email,stageId:f.stage,valueCents:100},f.operator.operatorId);
 const contactId=await f.db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(deal.id).first<string>('contact_id');
 await f.db.prepare("UPDATE contacts SET job_title='Operations lead' WHERE id=?").bind(contactId).run();
 const draft=await api(`workbench/opportunities/${deal.id}/drafts`,'POST',{contactId,subject:'Initial subject',body:'Initial body'});
 await api(`library/drafts/${draft.id}/apply`,'POST',{revision:1,templateId:ids.template,snippetId:ids.snippet,signatureId:ids.signature});
 worker=await emittedWorker(f.target);
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox',...worker.browserArgs]});
 const rows=[];
 for(const width of [1440,390]){
  const context=await browser.newContext({baseURL:worker.origin,viewport:{width,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:f.cookie}});
  const page=await context.newPage();
  await page.goto('/app/settings/mail/library');
  await expect(page.getByRole('heading',{name:'Message library',exact:true})).toBeVisible();
  for(const kind of ['template','snippet','signature'])await expect(page.getByRole('button').filter({has:page.getByText('Synthetic Orbit '+kind,{exact:true})})).toBeVisible();
  await page.getByRole('button').filter({has:page.getByText('Synthetic Orbit template',{exact:true})}).click();
  await expect(page.getByLabel('Subject',{exact:true})).toHaveValue('Next steps for {{company.name}}');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`${directory}/library-${width}.png`,fullPage:true});
  await page.goto('/app/drafts/'+draft.id);
  await expect(page.getByTestId('rendered-body')).toHaveText('Hi Maya Chen,\nYour role: Operations lead.\n\nReview Synthetic rollout together.\n\nBest,\nSynthetic Orbit sales — 雪 67');
  await expect(page.locator('#send-approval')).toContainText('Next steps for Synthetic customer');
  await expect(page.locator('#send-approval')).toContainText(email);
  await expect(page.getByTestId('draft-opt-out')).toContainText('not included');
  const confirm=page.getByRole('button',{name:'Confirm rendered merge values',exact:true});
  if(await confirm.count())await confirm.click();
  await expect(page.getByRole('button',{name:'Merge values reviewed',exact:true})).toBeDisabled();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`${directory}/rendered-review-${width}.png`,fullPage:true});
  rows.push({width,library:true,exactRecipient:true,exactSubject:true,exactBodyAndSignature:true,optOutNotIncluded:true,mergeReviewed:true,noOverflow:true});
  await context.close();
 }
 await writeFile(directory+'/browser-receipt.json',JSON.stringify({head,rows,onlyMailEdgeReplaced:false,noCustomerSubmission:true,uiSourceChanges:false},null,2)+'\n');
 console.log('BROWSER',JSON.stringify({head,rows}));
}finally{
 await browser?.close();
 await worker?.dispose();
 await f.close();
}
