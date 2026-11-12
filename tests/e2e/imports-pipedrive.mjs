import {expect} from '@playwright/test';
import {unstable_DevEnv} from 'wrangler';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {join} from 'node:path';
import {isolatedDatabase} from '../support/isolated-database.ts';
import {createDependencies} from '../support/dependencies.ts';
import {createId} from '../../src/core/shared/ids.ts';
import {pipedriveNetwork} from '../support/pipedrive-network.ts';
import {identityVars} from '../support/worker-identity.mjs';

/** The built UI and Worker use real persistence; only outbound Pipedrive HTTP is replaced. */
export async function pipedriveBrowserFlow(browser,screenshots){
 const fixture=await isolatedDatabase(),runtime=new unstable_DevEnv(),network=pipedriveNetwork();let context;
 try{
  const db=fixture.db,deps=createDependencies(db),actor=createId(),stage=createId();
  await deps.auth.ensureOperator({id:actor,email:`synthetic-orbit-182${'@'}operator.test`,displayName:'Pipedrive owner'});await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(actor).run();
  await deps.workspace.ensureWorkspace({name:'Pipedrive review',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});await deps.workspace.ensurePipelineStage({id:stage,name:'Qualified',position:0});const session=await deps.auth.createSession(actor);
  const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));const origin=`http://127.0.0.1:${port}`;
  await fixture.close();const bindings=Object.fromEntries(Object.entries({...identityVars(origin),ORBIT_ENCRYPTION_KEY:'7a'.repeat(32)}).map(([name,value])=>[name,{type:'secret_text',value}]));
  const worker=await runtime.startWorker({config:join(process.cwd(),'dist/server/wrangler.json'),bindings,dev:{remote:false,persist:fixture.directory,watch:false,inspector:false,server:{hostname:'127.0.0.1',port},outboundService:async request=>{const result=await network.fetcher(request.url,{method:request.method,headers:request.headers,redirect:'manual'});if(result.status===429)result.headers.set('Retry-After','1');return result;}}});await worker.ready;
  context=await browser.newContext({baseURL:origin,viewport:{width:1440,height:900},extraHTTPHeaders:{Cookie:`__Host-orbit_session=${session.token}`}});const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const capture=async state=>{for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:join(screenshots,`pipedrive-${state}-${width}.png`),fullPage:true});}await page.setViewportSize({width:1440,height:900});};
  await page.goto(origin+'/app/settings/data/import');await page.getByText('Connect Pipedrive',{exact:true}).click();const panel=page.getByRole('region',{name:'Connected Pipedrive import',exact:true});await expect(panel.getByRole('heading',{name:'Pipedrive connection',exact:true})).toBeVisible();await capture('connect');
  await panel.getByLabel('Pipedrive read access token',{exact:true}).fill('synthetic-orbit-182');await panel.getByLabel('I authorize this read-only pull for review.',{exact:true}).check();await panel.getByRole('button',{name:'Connect read-only Pipedrive',exact:true}).click();await expect(panel.getByRole('status')).toContainText('Connected to Pipedrive company 99');
  await panel.getByRole('button',{name:'Pull supported data',exact:true}).click();await expect(panel.getByRole('heading',{name:'Waiting for Pipedrive',exact:true})).toBeVisible();await expect(panel.getByRole('status').filter({hasText:'Next window:'})).toBeVisible();await capture('waiting');
  // A document reload must reopen the saved source checkpoint, rather than start another pull.
  await page.reload();await page.getByText('Connect Pipedrive',{exact:true}).click();await panel.getByText('Saved Pipedrive pulls',{exact:true}).click();await panel.getByRole('button',{name:'Open source checkpoint',exact:true}).click();await expect(panel.getByRole('heading',{name:'Waiting for Pipedrive',exact:true})).toBeVisible();
  await panel.getByRole('button',{name:'Continue source pull',exact:true}).click();await expect(panel.getByRole('heading',{name:'Source ready for mapping',exact:true})).toBeVisible();await expect(panel.getByRole('list',{name:'Pipedrive source counts',exact:true})).toContainText('organizations: 2');await capture('resumed');
  await panel.getByRole('combobox',{name:'Stage for 1:101',exact:true}).selectOption(stage);await panel.getByRole('combobox',{name:'Stage for 2:201',exact:true}).selectOption(stage);await panel.getByRole('combobox',{name:'Pipedrive owner 71',exact:true}).selectOption(actor);await capture('mapping');
  await panel.getByRole('button',{name:'Save Pipedrive dry run',exact:true}).click();await expect(page.getByRole('heading',{name:'Review your dry run',exact:true})).toBeVisible();const diagnostics=page.getByRole('list',{name:'Pipedrive source diagnostics',exact:true});await expect(diagnostics).toContainText('Unsupported currency EUR');await expect(diagnostics).toContainText('source 33');await expect(diagnostics).toContainText('Export data');await capture('preview');
  const noCustomers=await page.request.get(origin+'/api/v1/records/contact');expect((await noCustomers.json()).records).toHaveLength(0);
  await page.getByLabel('I checked these rows, including any that will not import and any marked Do not contact.',{exact:true}).check();await page.getByRole('button',{name:'Apply reviewed import',exact:true}).click();await expect(page.getByRole('heading',{name:'Import complete',exact:true})).toBeVisible();await capture('applied');
  const deals=await page.request.get(origin+'/api/v1/records/opportunity');const imported=(await deals.json()).records;expect(imported).toHaveLength(2);const deal=imported.find(deal=>deal.title==='Synthetic Orbit USD North');const note=await page.request.post(origin+`/api/v1/records/opportunity/${deal.id}/entries`,{headers:{Origin:origin},data:{kind:'note',text:'Later native browser note',occurredAt:'2025-02-01T12:00:00Z'}});expect(note.ok()).toBe(true);
  const history=page.locator('.crm-history article').filter({hasText:'company-99'});await history.getByRole('button',{name:'Undo import',exact:true}).click();await page.getByRole('dialog',{name:'Undo this import?',exact:true}).getByRole('button',{name:'Confirm undo',exact:true}).click();await expect(page.getByRole('status')).toContainText('Import undone');await capture('undo');
  const saved=await page.request.get(origin+`/api/v1/records/opportunity/${deal.id}`);expect(saved.ok()).toBe(true);expect((await saved.json()).timeline.some(entry=>JSON.parse(entry.payload_json).text==='Later native browser note')).toBe(true);expect(errors).toEqual([]);
 }finally{await context?.close();await runtime.teardown();await fixture.dispose();}
}
