import {expect} from '@playwright/test';
import {unstable_DevEnv} from 'wrangler';
import {join} from 'node:path';
import {isolatedDatabase} from '../support/isolated-database.ts';
import {createTestDependencies} from '../support/test-dependencies.ts';
import {sampleData} from '../fixtures/sample-data/index.ts';
import {customCertificate} from '../support/http-listener-fixture.ts';
import {identityVars} from '../support/worker-identity.mjs';
import {hubspotEdge} from '../support/hubspot-api-proof.ts';
/** Built documents and authenticated APIs stay real; replace only the remote HubSpot network edge. */
export async function hubspotBrowserFlow(browser,screenshots){
 const fixture=await isolatedDatabase(),runtime=new unstable_DevEnv(),edge=hubspotEdge(),origin=`https://127.0.0.1:${process.env.ORBIT_HUBSPOT_PORT??8730}`;let context;
 try{
  const deps=createTestDependencies(fixture.db);await deps.sampleData.seed();const actor=sampleData.operators[0].id;await fixture.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(actor).run();const session=await deps.auth.createSession(actor),certificate=await customCertificate(fixture.directory);await fixture.close();
  const worker=await runtime.startWorker({config:join(process.cwd(),'dist/server/wrangler.json'),bindings:Object.fromEntries(Object.entries({...identityVars(origin),ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)}).map(([name,value])=>[name,{type:'secret_text',value}])),dev:{remote:false,persist:fixture.directory,watch:false,inspector:false,server:{hostname:'127.0.0.1',port:Number(new URL(origin).port),secure:true,httpsKeyPath:certificate.keyPath,httpsCertPath:certificate.certPath},origin:{secure:true},outboundService:request=>edge.fetcher(request.url,{method:request.method,headers:{Authorization:request.headers.get('Authorization')},redirect:'manual'})}});await worker.ready;
  context=await browser.newContext({baseURL:origin,ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:`__Host-orbit_session=${session.token}`}});const page=await context.newPage();await page.setViewportSize({width:1440,height:900});
  const proof=async name=>{await page.screenshot({path:join(screenshots,`hubspot-${name}-1440.png`),fullPage:true});await page.setViewportSize({width:390,height:900});await page.screenshot({path:join(screenshots,`hubspot-${name}-390.png`),fullPage:true});await page.setViewportSize({width:1440,height:900});};
  await page.goto('/app/settings/data/import');await page.getByRole('radio',{name:'HubSpot CSV',exact:true}).check();const section=page.getByRole('group',{name:'Connected HubSpot import'});await expect(section.getByLabel('Read-only HubSpot private-app token')).toBeVisible();await proof('connect');
  edge.scopeMissing(true);await section.getByLabel('Read-only HubSpot private-app token').fill('synthetic-orbit-174');await section.getByRole('button',{name:'Connect HubSpot',exact:true}).click();await expect(section).toContainText('crm.objects.owners.read');await expect(section.getByLabel('Read-only HubSpot private-app token')).toHaveValue('');await proof('refusal');
  edge.scopeMissing(false);await section.getByLabel('Read-only HubSpot private-app token').fill('synthetic-orbit-174');await section.getByRole('button',{name:'Connect HubSpot',exact:true}).click();await expect(section.getByRole('status').first()).toContainText('Connected to HubSpot account 12345');
  edge.rateLimit();await section.getByRole('button',{name:'Pull HubSpot records',exact:true}).click();await expect(section).toContainText('HubSpot rate limit');await expect(section).toContainText('Resume after');await expect(section.getByRole('button',{name:'Resume HubSpot pull',exact:true})).toBeEnabled();await page.waitForTimeout(1100);
  await section.getByRole('button',{name:'Resume HubSpot pull',exact:true}).click();await expect(section.getByRole('heading',{name:'HubSpot source reconciliation'})).toBeVisible({timeout:60000});await expect(section).toContainText('custom_blob');
  await section.getByLabel('HubSpot owner contact:owner1',{exact:true}).selectOption(actor);await section.getByLabel('HubSpot owner company:owner1',{exact:true}).selectOption(actor);await section.getByLabel('HubSpot owner deal:owner1',{exact:true}).selectOption(actor);
  for(const stage of ['pipeline1:stage1','pipeline2:stage2'])await section.getByLabel(`HubSpot stage ${stage}`,{exact:true}).selectOption(sampleData.pipelineStages[0].id);
  await section.getByRole('button',{name:'Save HubSpot dry run',exact:true}).click();await expect(page.getByRole('heading',{name:'Review your dry run',exact:true})).toBeVisible();await expect(page.getByText(/^companies: 2/)).toBeVisible();await proof('preview');
  await page.getByRole('checkbox',{name:'I checked these rows, including any that will not import and any marked Do not contact.'}).check();edge.rateLimit();await page.getByRole('button',{name:'Apply reviewed import',exact:true}).click();await expect(page.getByRole('alert')).toContainText('HubSpot rate limit');await expect(page.getByRole('alert')).toContainText('Resume after');await page.waitForTimeout(1100);
  await page.getByRole('button',{name:'Apply reviewed import',exact:true}).click();await expect(page.getByRole('heading',{name:'Import complete',exact:true})).toBeVisible({timeout:90000});await proof('resumed');
  const saved=await page.request.get('/api/v1/tasks?view=all&owner=all');expect(saved.ok()).toBe(true);expect((await saved.json()).tasks.some(task=>task.title==='Synthetic connected task')).toBe(true);
 }finally{await context?.close();await runtime.teardown();await fixture.dispose();}
}
