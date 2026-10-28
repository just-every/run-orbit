import {publicationAvailabilityJourney} from './forms-publication-availability';
import {recordMailCompletionSeed} from '../../tests/support/record-mail-browser';
import {recordMailBrowserSeed} from './record-mail-browser-seed';
import {recordMailBrowserJourney} from './browser-record-mail';
import {formMappingBrowserJourney} from './browser-form-mapping';
import {createDependencies} from '../../tests/support/dependencies';
import {createId} from '../../src/core/shared/ids';
import {ownershipBrowserJourney} from './browser-ownership';
import {forecastBrowserJourney} from './browser-forecast-journey';
import {isolateBrowserTemp} from '../../tests/support/browser-temp.mjs';
isolateBrowserTemp();
import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {accessible,watchBrowser,startTrace,stopTrace,closeTracedBrowser} from './browser-observations';
import {formWithoutScript} from './browser-form-no-script';
import {formSpam} from './browser-form-spam';
import {authorReport} from './browser-report-authoring';
import {collaboratorJourney} from './browser-access-journey';
import {fixture,nativeRecord,signIn,signInLink} from './fixture';
import {emittedWorker} from './emitted-fixture';

const directory=process.env.ORBIT_FOLD_BROWSER_EVIDENCE!;
const width=Number(1440);
let f:Awaited<ReturnType<typeof fixture>>,worker:Awaited<ReturnType<typeof emittedWorker>>,browser:Awaited<ReturnType<typeof chromium.launch>>;
let opportunity:Awaited<ReturnType<typeof nativeRecord>>,contact:Awaited<ReturnType<typeof nativeRecord>>;
let invitation:{token:string},invited:Awaited<ReturnType<typeof signIn>>,returning:string[],ownershipOwnerId:string,ownershipRecipient:Awaited<ReturnType<typeof signIn>>;
let recordMailSeed:Parameters<typeof recordMailBrowserJourney>[4];
before(async()=>{if(!directory)throw new Error('Private browser evidence directory is required.');await mkdir(directory,{recursive:true,mode:0o700});f=await fixture();
opportunity=await nativeRecord(f,'opportunity',{title:'Browser native deal',value_cents:3200});contact=await nativeRecord(f,'contact',{name:'Shared browser contact',email:'shared@browser.test',custom_fields:{private_note:'Private browser marker'}});await f.db.prepare("UPDATE schema_types SET fields_json=? WHERE name='contact'").bind(JSON.stringify({email:{sensitivity:'private'},'custom_fields_json.private_note':{sensitivity:'private'}})).run();invitation=await f.admin.invite(await f.nativeContext(),{email:'invited@browser.test',role:'seller',expiresAt:new Date(Date.now()+86400000).toISOString()}),invited=await signIn(f.db,'invited@browser.test'),returning=[await signInLink(f.db,'invited@browser.test'),await signInLink(f.db,'invited@browser.test')];ownershipOwnerId=createId();await createDependencies(f.db).auth.ensureOperator({id:ownershipOwnerId,email:'synthetic-orbit-owner@people.test',displayName:'Jordan Reyes'});ownershipRecipient=await signIn(f.db,'synthetic-orbit-owner@people.test');const recordMailInitial=await recordMailBrowserSeed(f);recordMailSeed={...recordMailInitial,...await recordMailCompletionSeed(f,recordMailInitial)};worker=await emittedWorker(f.target);browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic','--disable-gpu',...worker.browserArgs]});
});
after(async()=>{try{await closeTracedBrowser(browser);}finally{try{await worker?.dispose();if(f){await f.target.reopen();assert.equal(await f.db.prepare('SELECT count(*) n FROM outbound_messages').first('n'),0,'Native draft, capture and forecast journeys never submit customer mail');}}finally{await f?.close();}}await writeFile(join(directory,'runtime-closure.json'),JSON.stringify({closed:true,viewports:[1440],ownedWorkers:0,ownedBrowsers:0}),{mode:0o600});});

async function ownerScreen(name:string,run:(page:import('@playwright/test').Page)=>Promise<void>){const context=await browser.newContext({baseURL:worker.origin,viewport:{width,height:900},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:f.cookie}}),errors=watchBrowser(context),page=await context.newPage();await startTrace(context,directory,name);try{await run(page);await errors.check(directory,name);}finally{await stopTrace(context);await context.close();}}

test('an operator authors, saves and exports a report with native record drill-through',()=>ownerScreen('native-reports',async page=>{
await page.goto('/app/reports');if(width===1440)await page.getByRole('button',{name:'Set up open opportunities report',exact:true}).click();await page.getByRole('combobox',{name:'Report',exact:true}).selectOption('open-opportunities:1');await page.getByRole('button',{name:'Preview report',exact:true}).click();await expect(page.getByRole('heading',{name:'Review before saving'})).toBeVisible();await page.getByRole('button',{name:'Save reviewed report',exact:true}).click();await expect(page.getByRole('heading',{name:'Saved result',exact:true})).toBeVisible();await page.reload();await page.getByRole('button',{name:'Reopen saved report'}).first().click();await expect(page.getByRole('heading',{name:'Saved result',exact:true})).toBeVisible();const downloading=page.waitForEvent('download');await page.getByRole('link',{name:'Export saved report',exact:true}).first().click();const download=await downloading,path=join(directory,`report-${width}.json`);await download.saveAs(path);const report=JSON.parse(await readFile(path,'utf8'));assert.equal(report.values.value,1);assert.equal(report.values.n,1);assert.deepEqual(report.inputs.map((ref:any)=>ref.id),[opportunity.ref.id]);assert.equal(report.population.pages,1);assert.equal(report.inputs[0].revision,opportunity.ref.revision);await accessible(page,`reports-${width}`,directory);await authorReport(page,width,directory,opportunity.ref.id);

}));

test('an operator publishes hosted and framed mapped enquiries, reviews spam and withdraws publication',async()=>{await ownerScreen('native-forms',async page=>{
 await page.goto('/app/forms');await page.getByLabel('Page title',{exact:true}).fill(`Browser inquiry ${width}`);await page.getByLabel('Page heading',{exact:true}).fill('Talk with the team');await page.getByLabel('Form title',{exact:true}).fill('Your inquiry');await page.getByLabel('Page text',{exact:true}).fill('Share your contact details to request a conversation.');await page.getByLabel('Optional consent wording').fill('Send occasional product updates');await page.getByLabel('Create an opportunity in NOW for each new enquirer').uncheck();await page.getByRole('button',{name:'Save form text',exact:true}).click();await page.getByLabel('Public path').fill(`browser-${width}`);await page.getByLabel('Publication expires').fill(new Date(Date.now()+86400000).toISOString().slice(0,16));await page.getByRole('button',{name:'Compile saved revision'}).click();await expect(page.getByRole('heading',{name:'Review exact publication'})).toBeVisible();await page.getByRole('button',{name:'Approve reviewed page'}).click();await page.getByRole('button',{name:'Publish approved page'}).click();await expect(page.getByRole('link',{name:'Open published page',exact:true})).toBeVisible();await accessible(page,`forms-${width}`,directory);await formWithoutScript(browser,worker.origin,width,directory);
 const publicContext=await browser.newContext({baseURL:worker.origin,viewport:{width,height:900},ignoreHTTPSErrors:true}),publicErrors=watchBrowser(publicContext),publicPage=await publicContext.newPage();await startTrace(publicContext,directory,`public-${width}`);const visitorRequests:string[]=[];publicPage.on('request',request=>visitorRequests.push(request.url()));await publicPage.goto(`/p/browser-${width}`);await publicPage.waitForLoadState('networkidle');assert.ok(visitorRequests.every(url=>new URL(url).origin===worker!.origin),'disabled Turnstile loads no third-party assets');assert.ok(visitorRequests.every(url=>!url.endsWith('/challenge')),'no visitor API request precedes first interaction');assert.deepEqual(await publicContext.cookies(),[]);await expect(publicPage.getByRole('button',{name:'Submit enquiry'})).toBeDisabled();await publicPage.getByLabel('Name',{exact:true}).focus();await publicPage.keyboard.press('Tab');await expect(publicPage.getByRole('button',{name:'Submit enquiry'})).toBeEnabled();await publicPage.getByRole('button',{name:'Submit enquiry'}).click();await expect(publicPage.getByLabel('Name',{exact:true})).toBeFocused();await publicPage.getByLabel('Name',{exact:true}).fill('Browser inquiry person');await publicPage.keyboard.press('Tab');await expect(publicPage.getByLabel('Email',{exact:true})).toBeFocused();await publicPage.getByLabel('Email',{exact:true}).fill('invalid-email');await publicPage.getByRole('button',{name:'Submit enquiry'}).click();assert.equal(await publicPage.getByLabel('Email',{exact:true}).evaluate((element:HTMLInputElement)=>element.validity.typeMismatch),true);await publicPage.getByLabel('Email',{exact:true}).fill(`inquiry-${width}@browser.test`);await publicPage.getByLabel('Message',{exact:true}).fill('An actual native inquiry');if(width===390)await publicPage.getByLabel('Send occasional product updates',{exact:true}).check();await publicPage.getByRole('button',{name:'Submit enquiry'}).click();await expect(publicPage.getByRole('status')).toContainText('Your enquiry was received');await expect(publicPage.getByRole('status')).toBeFocused();assert.deepEqual(await publicContext.cookies(),[]);assert.ok(visitorRequests.every(url=>new URL(url).origin===worker!.origin),'ordinary forms make no third-party requests');await accessible(publicPage,`public-form-${width}`,directory);await publicPage.getByRole('button',{name:'Submit enquiry'}).click();await expect(publicPage.getByRole('status')).toContainText('Your enquiry was received');await page.getByRole('button',{name:'Read submissions'}).first().click();await page.locator('article.fold-row a[href^="/app/records?kind=contact&record="]').first().click();await expect(page.getByRole('heading',{name:'Browser inquiry person',exact:true})).toBeVisible();const inquiry=page.locator('article[id^="entry-"]').filter({hasText:'Your inquiry'});await expect(inquiry).toBeVisible();await expect(inquiry).toHaveCount(1);await expect(inquiry).toContainText('An actual native inquiry');await formSpam(page,publicPage,width,directory);await page.goto('/app/forms');await page.getByRole('button',{name:'Reopen latest publication'}).first().click();
 const publishedPage=page.locator(`a[href="/p/browser-${width}"]`);
 await expect(publishedPage).toBeVisible();
 await expect(page.locator('p[role=status][tabindex="-1"]')).toHaveCount(1);
 await page.getByRole('button',{name:'Unpublish',exact:true}).click();
 await expect(publishedPage).toHaveCount(0);
 assert.equal((await publicPage.request.get(`/p/browser-${width}`)).status(),404);await page.reload();await page.getByRole('button',{name:'Reopen latest publication'}).first().click();await expect(page.getByRole('group',{name:'New capture authorization'})).toBeVisible();await page.getByLabel('New maximum contacts',{exact:true}).fill('7');await page.getByRole('button',{name:'Approve reviewed page',exact:true}).click();await expect(page.getByRole('button',{name:'Publish approved page',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Publish approved page',exact:true}).click();await expect(publishedPage).toBeVisible();assert.equal((await publicPage.request.get(`/p/browser-${width}`)).status(),200);
 const formsBase='/api/v2/workspaces/workspace/forms',savedForms=await(await page.request.get(formsBase)).json(),form=savedForms.find((row:any)=>JSON.parse(row.body_json).landing.title===`Browser inquiry ${width}`);assert.ok(form);
 const publications=await(await page.request.get(`${formsBase}/${form.id}/publications`)).json(),publication=publications.find((row:any)=>row.slug===`browser-${width}`);assert.ok(publication);
 const review=new URL(`${formsBase}/publications/${publication.id}`,worker.origin).href;
 await publicationAvailabilityJourney(page.request,review,`/p/browser-${width}`,async()=>{
  await page.getByRole('button',{name:'Edit saved form',exact:true}).first().click();await page.getByLabel('Page heading',{exact:true}).fill('Updated enquiry');
  const savingForm=page.waitForResponse(response=>response.request().method()==='POST'&&/^\/api\/v2\/workspaces\/[^/]+\/forms$/.test(new URL(response.url()).pathname));
  await page.getByRole('button',{name:'Save form text',exact:true}).click();const savedForm=await savingForm;assert.equal(savedForm.status(),200);assert.equal((await savedForm.json()).revision,2);
  await expect(page.getByRole('button',{name:'Save form text',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Reopen latest publication',exact:true}).first().click();await expect(publishedPage).toHaveCount(0);
  assert.equal((await publicPage.request.get(`/p/browser-${width}`)).status(),404);await expect(page.getByRole('region',{name:'Compiled page review'}).getByRole('status').first()).toBeVisible();await expect(page.locator('p[role=status][tabindex="-1"]')).toHaveCount(1);await expect(page.getByRole('button',{name:'Publish approved page',exact:true})).toBeDisabled();
 },async()=>{
  const withdrawing=page.waitForResponse(response=>response.request().method()==='POST'&&response.url()===`${review}/withdraw`);await page.getByRole('button',{name:'Unpublish',exact:true}).click();assert.equal((await withdrawing).status(),200);await expect(publishedPage).toHaveCount(0);
 });
 await publicErrors.check(directory,`public-${width}`);await stopTrace(publicContext);await publicContext.close();
});await formMappingBrowserJourney(browser,worker.origin,directory,f.cookie,[f.operator.operatorId,ownershipOwnerId],{[ownershipOwnerId]:ownershipRecipient.cookie});});

test('an operator reviews record mail and hands follow-up promises to a receiving colleague',()=>recordMailBrowserJourney(browser,worker.origin,directory,f.cookie,recordMailSeed));

test('reviewed record ownership changes persist and notify the receiving operator',()=>ownershipBrowserJourney(browser,worker.origin,directory,f.cookie,{id:ownershipOwnerId,cookie:ownershipRecipient.cookie}));

test('an invited collaborator sees only current field grants through profile changes and returning sign-in',async()=>{await ownerScreen('native-access',async page=>{
 await page.goto('/app/access');await expect(page.getByRole('heading',{name:'Collaborators',exact:true})).toBeVisible();await page.getByLabel('Collaborator email',{exact:true}).focus();await page.keyboard.press('Tab');await expect(page.getByLabel('Starts as')).toBeFocused();await accessible(page,`roles-${width}`,directory);

});await collaboratorJourney(browser,worker.origin,directory,f.cookie,invited,invitation.token,contact.ref.id,returning);});

test('a manager saves reviewed forecast overrides, recurring schedules and quotas without rewriting prior snapshots',()=>forecastBrowserJourney(browser,worker.origin,directory,f.cookie,invited.cookie));
