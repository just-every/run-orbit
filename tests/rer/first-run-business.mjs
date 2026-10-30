import assert from 'node:assert/strict';
import { appendFile, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { freePort } from './checkout.mjs';
import { openLink } from './sign-in.mjs';
import { browserAPI } from './browser-api.mjs';

/** Existing identity journey's first-run behaviour, through real rer dev and D1. */
export async function firstRunBusiness(checkout, browser, evidence) {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const setup = async () => {
    const result = await checkout.rer(['setup','--owner-email','owner@example.test','--port',String(port),'--non-interactive']);
    assert.equal(result.code,0,'Business first-run setup failed; private output withheld');
  };
  const reset = async () => assert.equal((await checkout.rer(['reset','--yes'])).code,0);
  const screenshots = async (page, name) => {
    if (!evidence) return;
    await mkdir(evidence,{recursive:true});
    // Behaviour assertions use 1440. The candidate's proof also shows the phone.
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:900});
      await page.screenshot({path:join(evidence,`first-run-${name}-${width}.png`),fullPage:true});
    }
    await page.setViewportSize({width:1440,height:900});
  };
  const context = await browser.newContext({viewport:{width:1440,height:900},timezoneId:'Europe/London'});
  const page = await context.newPage();
  try {
    await setup();
    // v1 local CLI carry contains only the name/branding. Owner and time zone
    // below are the exact documented managed first-build input names, not
    // invented business.json fields. The signed document path is covered in core.
    await writeFile(join(checkout.root,'.rer/local/business.json'),JSON.stringify({version:1,origin:'https://business.example.test',business_id:'test-business',business_url:'https://business.example.test/business/test-business',name:'Harbour Business',legal_name:null,accent:null,logo_url:null}),{mode:0o600});
    await appendFile(join(checkout.root,'.dev.vars'),'\nOWNER_NAME=Hollis Reed\nWORKSPACE_TIMEZONE=UTC\n');
    const server = await checkout.serve(['dev']);
    try {
      await page.goto(openLink(await server.ready));
      await page.waitForURL(url=>url.pathname==='/setup');
      await expect(page.getByLabel('Business name')).toHaveValue('Harbour Business');
      await expect(page.getByLabel('Your name')).toHaveValue('Hollis Reed');
      await expect(page.getByLabel('Time zone')).toHaveValue('UTC');
      // Wait for hydration; the browser's Europe/London must not replace carried UTC.
      await page.waitForLoadState('networkidle');
      await expect(page.getByLabel('Time zone')).toHaveValue('UTC');
      await screenshots(page,'prefilled');
      await page.getByRole('button',{name:'Finish setup',exact:true}).click();
      await page.waitForURL(origin+'/app');
      const settings = await browserAPI(page,'/api/v1/settings');
      assert.equal(settings.workspace.name,'Harbour Business');
      assert.equal(settings.workspace.timezone,'UTC');
      await page.goto(origin+'/setup');await page.waitForURL(origin+'/app');
      await page.goto(origin+'/app/settings/workspace');
      await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Harbour Business');
      const carryPath=join(checkout.root,'.rer/local/business.json');
      const updatedCarry=JSON.stringify({version:1,name:'Harbour Business renamed'});
      await writeFile(carryPath,updatedCarry,{mode:0o600});
      await page.reload();
      const refreshed=await browserAPI(page,'/api/v1/settings');
      console.log(`O-11 refresh API name: ${refreshed.workspace.name}`);
      assert.equal(refreshed.workspace.name,'Harbour Business renamed');
      await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Harbour Business renamed');
      await page.reload();
      assert.equal((await browserAPI(page,'/api/v1/settings')).workspace.updated_at,refreshed.workspace.updated_at,'unchanged carry performs no duplicate workspace write');
      assert.equal(await readFile(carryPath,'utf8'),updatedCarry,'Orbit never writes back to the Business carry');

    } finally { await checkout.stop('dev'); await server.exited; }
    await writeFile(join(checkout.root,'.rer/local/business.json'),JSON.stringify({version:1,name:'Harbour Business restarted'}),{mode:0o600});
    const restarted=await checkout.serve(['dev']);
    try {
      await page.goto(openLink(await restarted.ready));await page.goto(origin+'/app/settings/workspace');
      await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Harbour Business restarted');
      const settings=await browserAPI(page,'/api/v1/settings');
      assert.equal(settings.workspace.name,'Harbour Business restarted');
      console.log(`O-11 restart API name: ${settings.workspace.name}`);
      await page.getByLabel('Name',{exact:true}).fill('Owner edited Orbit name');
      await page.getByLabel('Name',{exact:true}).press('Tab');
      await expect.poll(async()=>(await browserAPI(page,'/api/v1/settings')).workspace.name).toBe('Owner edited Orbit name');
      await page.reload();
      await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Owner edited Orbit name');
      assert.equal((await browserAPI(page,'/api/v1/settings')).workspace.name,'Owner edited Orbit name','unchanged carry respects an Orbit edit');
      const carryPath=join(checkout.root,'.rer/local/business.json');
      assert.equal(JSON.parse(await readFile(carryPath,'utf8')).name,'Harbour Business restarted','owner edit stays one-way');
      for (const empty of ['',JSON.stringify({version:1,name:''})]) {
        await writeFile(carryPath,empty,{mode:0o600});await page.reload();
        assert.equal((await browserAPI(page,'/api/v1/settings')).workspace.name,'Owner edited Orbit name','empty carry leaves the name alone');
      }
      await unlink(carryPath);await page.reload();
      assert.equal((await browserAPI(page,'/api/v1/settings')).workspace.name,'Owner edited Orbit name','missing carry leaves the name alone');
      await writeFile(carryPath,JSON.stringify({version:1,name:'Harbour Business restarted'}),{mode:0o600});
    } finally { await checkout.stop('dev');await restarted.exited; }
    const ownerRestart=await checkout.serve(['dev']);
    try {
      await page.goto(openLink(await ownerRestart.ready));
      assert.equal((await browserAPI(page,'/api/v1/settings')).workspace.name,'Owner edited Orbit name','unchanged carry respects an Orbit edit after restart');
    } finally { await checkout.stop('dev');await ownerRestart.exited; }
    await context.clearCookies();await reset();await setup();
    const emptyServer = await checkout.serve(['dev']);
    try {
      await page.goto(openLink(await emptyServer.ready));await page.waitForURL(url=>url.pathname==='/setup');
      await page.waitForLoadState('networkidle');
      await expect(page.getByLabel('Business name')).toHaveValue('');
      await page.getByRole('button',{name:'Finish setup',exact:true}).click();
      await expect(page.getByRole('alert')).toHaveText('Enter your business name');
      assert.equal(new URL(page.url()).pathname,'/setup');
      await screenshots(page,'empty-name');
      const invalid = await page.evaluate(async () => {
        const response = await fetch('/api/v1/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ownerName:'Hollis Reed',name:' ',timezone:'UTC',currency:'USD',stages:'Qualified'})});
        return {status:response.status,body:await response.json()};
      });
      assert.equal(invalid.status,400);assert.deepEqual(invalid.body,{error:'Enter your business name'});
    } finally { await checkout.stop('dev');await emptyServer.exited; }
    // Same unfinished store, a carry appears on the next launch. Editing its
    // default wins when the owner confirms, including after a form validation error.
    await writeFile(join(checkout.root,'.rer/local/business.json'),JSON.stringify({version:1,name:'Carried Business'}),{mode:0o600});
    const editedServer = await checkout.serve(['dev']);
    try {
      await page.goto(openLink(await editedServer.ready));await page.waitForURL(url=>url.pathname==='/setup');
      await expect(page.getByLabel('Business name')).toHaveValue('Carried Business');
      await page.getByLabel('Business name').fill('Owner chosen Business');
      await page.getByLabel('Your name').fill('Hollis Reed');
      await page.getByRole('button',{name:'Finish setup',exact:true}).click();await page.waitForURL(origin+'/app');
      assert.equal((await browserAPI(page,'/api/v1/settings')).workspace.name,'Owner chosen Business');
    } finally { await checkout.stop('dev');await editedServer.exited; }
  } finally { await context.close();await reset(); }
}
