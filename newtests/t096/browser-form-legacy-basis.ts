import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium,expect,type Browser} from '@playwright/test';
import {fixture} from './fixture';
import {legacyPublication} from './forms-legacy-publication';
import {publication} from './publication-fixture';
import {emittedWorker} from './emitted-fixture';
import {accessible,watchBrowser} from './browser-observations';
import {inquiryDisclosure} from '../../src/core/features/forms/contact-basis';

/** A retained publication crosses the real emitted public door after the upgrade. */
export async function formLegacyBasisBrowserJourney(directory:string){
 await mkdir(directory,{recursive:true,mode:0o700});
 const f=await fixture();let worker:Awaited<ReturnType<typeof emittedWorker>>|undefined,browser:Browser|undefined;
 try{
  const old=await legacyPublication(f),current=await publication(f,'current-inquiry',null),artifact=await f.db.prepare('SELECT body_json,content_hash FROM content_entities WHERE id=?').bind(old.compiled.artifactId).first();
  worker=await emittedWorker(f.target);
  browser=await chromium.launch({headless:true,args:['--disable-gpu',...worker.browserArgs]});
  const owner=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:f.cookie}}),errors=watchBrowser(owner),panel=await owner.newPage();
  const call=async(path:string)=>{const response=await owner.request.get(path);assert.equal(response.status(),200,await response.text());return response.json();};
  const results:any[]=[];
  // Assert behavior at the desktop width; show each changed screen again on a phone.
  const visitor=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},ignoreHTTPSErrors:true}),visitorErrors=watchBrowser(visitor),page=await visitor.newPage();
  try{
   for(const [kind,p] of [['legacy',old],['current',current]] as const){
    const document=await visitor.request.get(`/p/${p.slug}`);assert.equal(document.status(),200);assert.equal(await document.text(),p.compiled.html);assert.equal(p.compiled.html.includes(inquiryDisclosure),kind==='current');
    await page.goto(`/p/${p.slug}`);await expect(page.getByRole('heading',{name:p.saved.landing.heading,exact:true,level:1})).toBeVisible();await expect(page.locator('#inquiry-disclosure')).toHaveCount(kind==='current'?1:0);
    for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await accessible(page,`basis-${kind}-public-${width}`,directory);}
    await page.setViewportSize({width:1440,height:1000});await page.getByLabel('Name',{exact:true}).fill(`${kind} inquiry person`);await page.getByLabel('Email',{exact:true}).fill(`${kind}-browser@manufacturer.test`);await page.getByLabel('Message',{exact:true}).fill('Please discuss our production rollout.');
    await expect(page.getByRole('button',{name:'Submit enquiry',exact:true})).toBeEnabled();
    const submitted=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname===`/api/public/forms/${p.slug}`);await page.getByRole('button',{name:'Submit enquiry',exact:true}).click();const response=await submitted;assert.equal(response.status(),200,await response.text());const receipt=await response.json();await expect(page.getByRole('status')).toContainText('Your enquiry was received');
    assert.deepEqual(await visitor.cookies(),[]);
    const rows=await call(`/api/v2/workspaces/workspace/forms/${p.saved.id}/submissions`),submission=rows.find((row:any)=>row.id===receipt.submissionId),detail=await call(`/api/v1/records/contact/${submission.contact_id}`);
    assert.equal(detail.record.name,`${kind} inquiry person`);assert.equal(detail.record.email,`${kind}-browser@manufacturer.test`);
    await panel.goto('/app/settings/forms');const row=panel.locator('div.fold-row').filter({has:panel.getByRole('heading',{name:p.saved.form.title,exact:true})});await row.getByRole('button',{name:'Read submissions',exact:true}).click();await expect(panel.getByText('Submissions loaded.',{exact:true})).toBeVisible();
    if(kind==='legacy'){await expect(panel.getByText('No contact basis recorded.',{exact:true})).toBeVisible();await expect(panel.getByRole('region',{name:'Contact basis',exact:true})).toHaveCount(0);await expect(panel.getByText(inquiryDisclosure,{exact:true})).toHaveCount(0);assert.equal(submission.contact_basis,null);assert.equal(JSON.stringify(detail).includes(inquiryDisclosure),false);}
    else{const basis=panel.getByRole('region',{name:'Contact basis',exact:true});await expect(basis).toContainText(inquiryDisclosure);await expect(basis).toContainText('One-to-one follow-up requested');await expect(basis).toContainText(`Form revision ${p.saved.revision}`);assert.deepEqual({...submission.contact_basis,occurredAt:undefined},{kind:'inquiry',wording:inquiryDisclosure,accepted:true,formRevision:p.saved.revision,artifactHash:p.compiled.hash,occurredAt:undefined});assert.ok(Number.isFinite(Date.parse(submission.contact_basis.occurredAt)));assert.equal(detail.record.contactability,'contactable');}
    for(const width of [1440,390]){await panel.setViewportSize({width,height:1000});await accessible(panel,`basis-${kind}-submissions-${width}`,directory);}
    await panel.goto(`/app/contacts/${submission.contact_id}`);await expect(panel.getByRole('heading',{name:`${kind} inquiry person`,exact:true,level:1})).toBeVisible();const inquiry=panel.locator(`#entry-${submission.signal_id}`);await expect(inquiry).toContainText(p.saved.form.title);await inquiry.getByText('Recorded details',{exact:true}).click();await expect(inquiry).toContainText('Please discuss our production rollout.');
    if(kind==='legacy')await expect(panel.getByText(inquiryDisclosure,{exact:true})).toHaveCount(0);
    for(const width of [1440,390]){await panel.setViewportSize({width,height:1000});await accessible(panel,`basis-${kind}-contact-${width}`,directory);}
    await panel.setViewportSize({width:1440,height:1000});results.push({kind,pageStatus:document.status(),submitStatus:response.status(),artifactContainsDisclosure:kind==='current',basis:submission.contact_basis,contactability:detail.record.contactability});
   }
   await visitorErrors.check(directory,'basis-visitor');
  }finally{await visitor.close();}
  await errors.check(directory,'basis-operator');await owner.close();await browser.close();browser=undefined;await worker.dispose();worker=undefined;await f.target.reopen();
  assert.deepEqual(await f.db.prepare('SELECT body_json,content_hash FROM content_entities WHERE id=?').bind(old.compiled.artifactId).first(),artifact,'the upgrade and both submissions never rewrite the retained publication');
  await writeFile(join(directory,'legacy-basis-receipt.json'),JSON.stringify({prior:'e14862416147c15b854df69f6decc0a315f67385',assertionWidth:1440,screenshots:[1440,390],results,artifactUnchanged:true},null,2)+'\n',{mode:0o600});
  console.log('PROBE FORM-003 legacy: retained artifact without disclosure -> anonymous public submit, authenticated API and contact/submissions screens without unshown wording; fresh inquiry retains disclosed basis');
 }finally{await browser?.close();await worker?.dispose();await f.close();}
}
