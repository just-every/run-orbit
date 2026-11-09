import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,expect,type Browser,type Page,type FrameLocator} from '@playwright/test';
import {fixture} from './fixture';
import {emittedWorker,httpsBuyerSite} from './emitted-fixture';
import {accessible,watchBrowser} from './browser-observations';
import {formEmbedCode} from '../../src/core/features/forms/embed-code';
import {undisclosedInquiry} from './undisclosed-inquiry-fixture';

/** The three published doors, record associations and saved basis as an operator sees them. */
export async function formIdentityBrowserJourney(directory:string){
 await mkdir(directory,{recursive:true,mode:0o700});
 for(const width of [1440,390]){
  const f=await fixture();let worker:Awaited<ReturnType<typeof emittedWorker>>|undefined,buyer:Awaited<ReturnType<typeof httpsBuyerSite>>|undefined,browser:Browser|undefined;
  try{
   const legacy=await undisclosedInquiry(f,`existing-inquiry-${width}`);
   worker=await emittedWorker(f.target);buyer=await httpsBuyerSite(worker.certificate);const origin=worker.origin;
   browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic','--disable-gpu',...worker.browserArgs,...buyer.browserArgs]});
   const owner=await browser.newContext({baseURL:origin,viewport:{width,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:f.cookie}}),errors=watchBrowser(owner),page=await owner.newPage(),base='/api/v2/workspaces/workspace/forms';
   const call=async(path:string,method='GET',data?:unknown,status=200)=>{const response=await owner.request.fetch(path,{method,headers:{Origin:origin},data});assert.equal(response.status(),status,await response.text());return response.json();};
   const workspace=(await call('/api/v1/settings')).workspace;
   await call('/api/v1/settings','PUT',{name:workspace.name,timezone:workspace.timezone,currency:workspace.currency,workingHours:JSON.parse(workspace.working_hours_json),staleIntervalDays:workspace.stale_interval_days,awaitingResponseWorkingDays:workspace.awaiting_response_working_days,freeMailDomains:['gmail.com'],ifUpdatedAt:workspace.updated_at});
   await call('/api/v1/settings/form-embedding','PUT',{origins:[buyer.origin]});
   const pipeline=await call('/api/v1/settings/pipelines','POST',{name:'Manufacturing sales',stages:[{name:'Initial review',probability:10,requiredFields:[],staleIntervalDays:7},{name:'Consultation',probability:40,requiredFields:[],staleIntervalDays:7}]},201);
   const options=await call(`${base}/builder-options`),stage=options.stages.find((row:any)=>row.pipeline_id===pipeline.id&&row.stage_name==='Consultation');assert.ok(stage);assert.notEqual(stage.stage_id,f.stage);
   const publish=async(slug:string,consentWording:string|null)=>{
    const form={title:`Production enquiries ${slug}`,fields:[{id:'name',label:'Name',required:true},{id:'email',label:'Email',required:true},{id:'phone',label:'Phone',required:false}],consentWording,companyByEmailDomain:true,createOpportunity:true,opportunity:{stageId:stage.stage_id,pipelineId:stage.pipeline_id}},saved=await call(base,'POST',{form,landing:{title:'Production consultation',heading:'Discuss your production rollout',paragraphs:['Tell us who to contact about your enquiry.']}}),compiled=await call(`${base}/compile`,'POST',{formId:saved.id,revision:saved.revision,reviewedHash:saved.hash,slug,maxRecords:30,expiresAt:new Date(Date.now()+86400000).toISOString()});
    await call(`${base}/publications/${compiled.operationId}/approve`,'POST',{artifactHash:compiled.hash,formRevision:saved.revision});await call(`${base}/publications/${compiled.operationId}/publish`,'POST',{});return {saved,compiled,form,slug};
   };
   const marketing=await publish(`identity-${width}`,'Send production product updates'),inquiry=await publish(`inquiry-identity-${width}`,null),contacts:string[]=[],domain=`identity-${width}.manufacturer.test`;let companyId:string|undefined;
   const inspect=async(receipt:any,form:typeof marketing,name:string,email:string)=>{
    const rows=await call(`${base}/${form.saved.id}/submissions`),submission=rows.find((row:any)=>row.id===receipt.submissionId);assert.ok(submission);
    const detail=await call(`/api/v1/records/contact/${submission.contact_id}`);assert.equal(detail.record.email,email);assert.equal(detail.record.name,name);assert.equal(detail.opportunities.length,1);
    const company=await call(`/api/v1/records/company/${detail.record.company_id}`),deal=await call(`/api/v1/records/opportunity/${detail.opportunities[0].id}`);
    assert.equal(company.record.primary_domain,domain);if(companyId)assert.equal(company.record.id,companyId);companyId=company.record.id;assert.ok(company.contacts.some((contact:any)=>contact.id===detail.record.id));assert.equal(deal.record.company_id,company.record.id);assert.equal(deal.record.stage_id,stage.stage_id);assert.equal(deal.record.pipeline_id,pipeline.id);assert.equal(deal.record.queue_state,'now');assert.ok(deal.contacts.some((contact:any)=>contact.id===detail.record.id));
    assert.equal(submission.contact_basis.wording,form.form.consentWording);assert.equal(submission.contact_basis.formRevision,form.saved.revision);assert.equal(submission.contact_basis.artifactHash,form.compiled.hash);assert.ok(Number.isFinite(Date.parse(submission.contact_basis.occurredAt)));return {detail,submission};
   };
   for(const door of ['hosted','framed','direct'] as const){
    const visitor=await browser.newContext({baseURL:origin,viewport:{width,height:1000},ignoreHTTPSErrors:true}),visitorErrors=watchBrowser(visitor);try{
     await visitor.grantPermissions(['local-network-access'],{origin:buyer.origin});const host=await visitor.newPage();let formPage:Page|FrameLocator=host;
     const open=async()=>{
      if(door==='hosted')await host.goto(`/p/${marketing.slug}`);
      else if(door==='framed'){buyer!.serve('/identity-frame',`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Production sales</title></head><body><main><h1>Production sales</h1>${formEmbedCode(origin,{slug:marketing.slug,parameters:[]})}</main></body></html>`);await host.goto(`${buyer!.origin}/identity-frame`);formPage=host.frameLocator('iframe[title="Contact form"]');}
      else{buyer!.serve('/identity-direct',marketing.compiled.html.replace('<head>',`<head><base href="${origin}/">`));await host.goto(`${buyer!.origin}/identity-direct`);}
     };
     const email=[`synthetic-orbit-${door}-${width}`,domain].join('@'),name=`Morgan Chen ${door}`,tick=width===1440;
     const send=async(changed:boolean)=>{
      await open();await formPage.getByLabel('Name',{exact:true}).fill(changed?`Revised ${name}`:name);await formPage.getByLabel('Email',{exact:true}).fill(changed?email.toUpperCase():email);if(changed)await formPage.getByLabel('Phone',{exact:true}).fill('+1 212 555 0142');if(tick||changed)await formPage.getByLabel(marketing.form.consentWording!,{exact:true}).check();await expect(formPage.getByRole('button',{name:'Submit enquiry',exact:true})).toBeEnabled();
      const submitted=host.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname===`/api/public/forms/${marketing.slug}`);await formPage.getByRole('button',{name:'Submit enquiry',exact:true}).click();const response=await submitted;assert.equal(response.status(),200,await response.text());await expect(formPage.getByRole('status')).toContainText('Your enquiry was received');return response.json();
     };
     const first=await send(false),created=await inspect(first,marketing,name,email);assert.equal(created.detail.record.contactability,tick?'contactable':'do_not_contact');assert.equal(created.submission.contact_basis.accepted,tick);contacts.push(created.detail.record.id);
     await accessible(host,`identity-${door}-received-${width}`,directory);
     const changed=await send(true),revised=await inspect(changed,marketing,name,email);assert.equal(revised.detail.record.id,created.detail.record.id);assert.equal(revised.detail.record.phone,'+1 212 555 0142');assert.equal(revised.detail.record.contactability,tick?'contactable':'do_not_contact');assert.equal(changed.reviewRequired,true);assert.equal(revised.submission.contact_basis.accepted,true);
     const proposals=(await call(`/api/v1/capture/proposals?recordType=contact&recordId=${created.detail.record.id}`)).proposals;assert.ok(proposals.some((proposal:any)=>proposal.field==='name'&&proposal.current_value===name&&proposal.proposed_value===`Revised ${name}`));
     const found=await call(`/api/v1/records/contact?q=${encodeURIComponent(email)}`);assert.equal(found.records.filter((contact:any)=>contact.email===email).length,1,'case changes reuse exactly one contact');assert.deepEqual(await visitor.cookies(),[]);await visitorErrors.check(directory,`identity-${door}-${width}`);
     console.log(`PROBE FORM-003 1: ${door} form at ${width}, new and changed exact email -> same contact, business company and selected-stage deal; empty phone filled and changed name waits for review`);
    }finally{await visitor.close();}
   }
   // An inquiry cannot release an explicit operator stop, even with a fresh submission.
   const stopped=await call(`/api/v1/records/contact/${contacts[0]}`);if(stopped.record.contactability!=='do_not_contact')await call(`/api/v1/records/contact/${contacts[0]}`,'PATCH',{changes:{contactability:'do_not_contact'},base:{contactability:'contactable'}});
   const visitor=await browser.newContext({baseURL:origin,viewport:{width,height:1000},ignoreHTTPSErrors:true});try{
    const inquiryPage=await visitor.newPage();
    for(const email of [[`synthetic-orbit-inquiry-${width}`,domain].join('@'),[`synthetic-orbit-hosted-${width}`,domain].join('@'),[`synthetic-orbit-free-${width}`,'gmail.com'].join('@')]){
     await inquiryPage.goto(`/p/${inquiry.slug}`);const disclosure=await inquiryPage.locator('#inquiry-disclosure').innerText();assert.ok(disclosure);assert.equal(await inquiryPage.locator('[name="consent"]').count(),0);await inquiryPage.getByLabel('Name',{exact:true}).fill('Jordan Reyes');await inquiryPage.getByLabel('Email',{exact:true}).fill(email);await expect(inquiryPage.getByRole('button',{name:'Submit enquiry',exact:true})).toBeEnabled();await accessible(inquiryPage,`identity-inquiry-disclosure-${width}`,directory);
     const submitted=inquiryPage.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname===`/api/public/forms/${inquiry.slug}`);await inquiryPage.getByRole('button',{name:'Submit enquiry',exact:true}).click();const response=await submitted;assert.equal(response.status(),200,await response.text());const receipt=await response.json(),rows=await call(`${base}/${inquiry.saved.id}/submissions`),submission=rows.find((row:any)=>row.id===receipt.submissionId),detail=await call(`/api/v1/records/contact/${submission.contact_id}`);assert.equal(submission.contact_basis.kind,'inquiry');assert.equal(submission.contact_basis.wording,disclosure);assert.equal(submission.contact_basis.formRevision,inquiry.saved.revision);assert.ok(Number.isFinite(Date.parse(submission.contact_basis.occurredAt)));assert.equal(detail.record.contactability,submission.contact_id===contacts[0]?'do_not_contact':'contactable');if(email.endsWith('gmail.com'))assert.equal(detail.record.company_id,null);
    }
   }finally{await visitor.close();}
   const legacyVisitor=await browser.newContext({baseURL:origin,viewport:{width,height:1000},ignoreHTTPSErrors:true});try{
    const legacyPage=await legacyVisitor.newPage();await legacyPage.goto(`/p/${legacy.slug}`);assert.equal(await legacyPage.locator('#inquiry-disclosure').count(),0);
    await legacyPage.getByLabel('Name',{exact:true}).fill('Avery Patel');await legacyPage.getByLabel('Email',{exact:true}).fill([`synthetic-orbit-existing-${width}`,domain].join('@'));
    await expect(legacyPage.getByRole('button',{name:'Submit enquiry',exact:true})).toBeEnabled();const submitted=legacyPage.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname===`/api/public/forms/${legacy.slug}`);await legacyPage.getByRole('button',{name:'Submit enquiry',exact:true}).click();const response=await submitted;assert.equal(response.status(),200,await response.text());await expect(legacyPage.getByRole('status')).toContainText('Your enquiry was received');
    const receipt=await response.json(),rows=await call(`${base}/${legacy.saved.id}/submissions`),submission=rows.find((row:any)=>row.id===receipt.submissionId);assert.equal(submission.contact_basis,null);assert.equal((await call(`/api/v1/records/contact/${submission.contact_id}`)).record.contactability,'do_not_contact');
    assert.equal(await (await legacyVisitor.request.get(`/p/${legacy.slug}`)).text(),legacy.compiled.html);await accessible(legacyPage,`identity-existing-inquiry-received-${width}`,directory);
   }finally{await legacyVisitor.close();}
   await page.goto('/app/settings/forms');
   for(const form of [marketing,inquiry]){
    const row=page.locator('div.fold-row').filter({has:page.getByRole('heading',{name:form.form.title,exact:true})});await row.getByRole('button',{name:'Read submissions',exact:true}).click();const bases=page.getByRole('region',{name:'Contact basis',exact:true});await expect(bases).toHaveCount(form===marketing?6:3);await expect(bases.first()).toContainText(form===marketing?marketing.form.consentWording!:'One-to-one follow-up requested');await expect(bases.first()).toContainText(`Form revision ${form.saved.revision}`);await expect(bases.first()).toContainText('Recorded');await accessible(page,`identity-${form===marketing?'consent':'inquiry'}-readback-${width}`,directory);
   }
   const legacyRow=page.locator('div.fold-row').filter({has:page.getByRole('heading',{name:legacy.saved.form.title,exact:true})});await legacyRow.getByRole('button',{name:'Read submissions',exact:true}).click();await expect(page.locator('article.fold-row')).toContainText('Avery Patel');await expect(page.getByRole('region',{name:'Contact basis',exact:true})).toHaveCount(0);await accessible(page,`identity-existing-inquiry-readback-${width}`,directory);
   await errors.check(directory,`identity-operator-${width}`);await owner.close();
  }finally{await browser?.close();await worker?.dispose();await buyer?.dispose();await f.close();}
 }
}
