import assert from 'node:assert/strict';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
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
  const freshBrowser = () => browser.newContext({viewport:{width:1440,height:900},timezoneId:'Europe/London'});
  let context = await freshBrowser(), page = await context.newPage();
  const keys = await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const trust = {v:1,issuer:'https://business.example.test',audience:origin,subject:'orbit-first-run',email:'owner@example.test',keys:{test:await crypto.subtle.exportKey('jwk',keys.publicKey)}};
  const trustBinding = `\nRER_BUSINESS_TRUST='${JSON.stringify(trust)}'\n`;
  const deliver = async (values, changes={}) => {
    const now = Math.floor(Date.now()/1000), encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const body = `${encode({alg:'ES256',typ:'rer-business-settings+jwt',kid:'test'})}.${encode({v:1,iss:trust.issuer,aud:origin,sub:trust.subject,business:'business-first-run',email:trust.email,jti:crypto.randomUUID(),iat:now,exp:now+300,rev:1,values,logo:null,team:null,...changes})}`;
    const settings = body+'.'+Buffer.from(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,new TextEncoder().encode(body))).toString('base64url');
    return page.evaluate(async settings => (await fetch('/api/rer/business-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings})})).status,settings);
  };
  try {
    await setup();
    // v1 local CLI carry contains only the name/branding. Owner and time zone
    // below are the exact documented managed first-build input names, not
    // invented business.json fields. Signed refreshes also use the running Worker.
    await writeFile(join(checkout.root,'.rer/local/business.json'),JSON.stringify({version:1,origin:'https://business.example.test',business_id:'test-business',business_url:'https://business.example.test/business/test-business',name:'Harbour Business',legal_name:null,accent:null,logo_url:null}),{mode:0o600});
    await appendFile(join(checkout.root,'.dev.vars'),'\nOWNER_NAME=Hollis Reed\nWORKSPACE_TIMEZONE=UTC\nBRAND_COLOR="#2468ac"\n');
    await appendFile(join(checkout.root,'.dev.vars'),trustBinding);
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
      await expect(page.locator('summary').filter({hasText:'Business name:'})).toBeVisible();
      await expect(page.getByLabel('Business name',{exact:true})).toBeHidden();
      await expect(page.getByLabel('Business accent',{exact:true})).toHaveValue('#2468ac');
      const stranger = await browser.newContext({viewport:{width:1440,height:900}});
      try {
        const other = await stranger.newPage();
        await other.goto(origin+'/setup');
        assert.equal(new URL(other.url()).pathname,'/__dev/key','the existing local dev gate refuses anonymous setup access');
        assert.equal((await other.content()).includes('Harbour Business'),false);
        await other.goto(openLink(await server.ready));
        await other.waitForURL(url=>url.pathname==='/setup');
        await other.waitForLoadState('networkidle');
        await other.goto(origin+'/auth/dev/enter?as=seller&returnTo=%2Fsetup');
        await expect(other.getByText('The workspace owner is finishing first-run setup. Try again once they have finished.')).toBeVisible();
        assert.equal(await other.getByLabel('Business name',{exact:true}).count(),0);
        assert.equal((await other.content()).includes('Harbour Business'),false);
        const refused = await other.evaluate(async()=> (await fetch('/api/v1/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ownerName:'Foreign',name:'Foreign',timezone:'UTC',currency:'USD',stages:'Qualified',brandColor:'#aa0000'})})).status);
        assert.equal(refused,403);
      } finally {await stranger.close();}
      assert.equal(await deliver({brand_color:'red'}),403);
      assert.equal(await deliver({brand_color:'#118833'},{aud:'https://foreign.example.test'}),403);
      await screenshots(page,'prefilled');
      await page.getByRole('button',{name:'Finish setup',exact:true}).click();
      await page.waitForURL(origin+'/app');
      const settings = await browserAPI(page,'/api/v1/settings');
      assert.equal(settings.workspace.name,'Harbour Business');
      assert.equal(settings.workspace.timezone,'UTC');
      await page.goto(origin+'/app/opportunities/new');
      await expect(page.getByRole('button',{name:'Save opportunity',exact:true})).toBeEnabled();
      const accent = () => page.locator('.ob-app .operator-button').first().evaluate(element=>getComputedStyle(element).backgroundColor);
      assert.equal(await accent(),'rgb(36, 104, 172)');
      await screenshots(page,'app-accent');
      await page.reload();assert.equal(await accent(),'rgb(36, 104, 172)');
      await page.goto(origin+'/setup');await page.waitForURL(origin+'/app');
    } finally { await checkout.stop('dev'); await server.exited; }
    // A restarted Vite server owns a new dependency graph. A fresh context
    // prevents old optimized-module cache entries from masking hydration.
    await context.close();context=await freshBrowser();page=await context.newPage();
    await reset();await setup();
    await appendFile(join(checkout.root,'.dev.vars'),'\nBRAND_COLOR=red\nWORKSPACE_TIMEZONE=Invalid/Zone\n');
    const emptyServer = await checkout.serve(['dev']);
    try {
      await page.goto(openLink(await emptyServer.ready));await page.waitForURL(url=>url.pathname==='/setup');
      await page.waitForLoadState('networkidle');
      await expect(page.getByLabel('Business name')).toHaveValue('');
      assert.equal(await page.getByLabel('Business accent',{exact:true}).count(),0);
      await expect(page.getByLabel('Time zone',{exact:true})).toHaveValue('Europe/London');
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
    await context.close();context=await freshBrowser();page=await context.newPage();
    // Same unfinished store, a carry appears on the next launch. Editing its
    // default wins when the owner confirms, including after a form validation error.
    await writeFile(join(checkout.root,'.rer/local/business.json'),JSON.stringify({version:1,name:'Carried Business'}),{mode:0o600});
    await appendFile(join(checkout.root,'.dev.vars'),'\nOWNER_NAME=Supplied owner\nWORKSPACE_TIMEZONE=UTC\nBRAND_COLOR="#2468ac"\n');
    await appendFile(join(checkout.root,'.dev.vars'),trustBinding);
    const editedServer = await checkout.serve(['dev']);
    try {
      await page.goto(openLink(await editedServer.ready));await page.waitForURL(url=>url.pathname==='/setup');
      await expect(page.getByLabel('Business name')).toHaveValue('Carried Business');
      // Both the native HTML refusal and the hydrated form remain editable.
      // A server refusal reloads the form; reopen its existing edit disclosure.
      const edit = async label => {
        const input = page.getByLabel(label,{exact:true});
        if (!await input.isVisible()) await page.locator('summary').filter({hasText:label+':'}).click();
        return input;
      };
      await (await edit('Business accent')).fill('red');
      await page.getByRole('button',{name:'Finish setup',exact:true}).click();
      assert.equal(new URL(page.url()).pathname,'/setup','an invalid accent cannot complete setup');
      await (await edit('Business accent')).fill('');
      await page.getByRole('button',{name:'Finish setup',exact:true}).click();
      assert.equal(new URL(page.url()).pathname,'/setup','a known accent cannot be silently cleared');
      await (await edit('Business name')).fill('Owner chosen Business');
      await (await edit('Your name')).fill('Owner chosen name');
      await (await edit('Time zone')).fill('Europe/Paris');
      await (await edit('Business accent')).fill('#813fa8');
      await page.getByRole('button',{name:'Finish setup',exact:true}).click();await page.waitForURL(origin+'/app');
      const edited = (await browserAPI(page,'/api/v1/settings')).workspace;
      assert.equal(edited.name,'Owner chosen Business');assert.equal(edited.timezone,'Europe/Paris');
      await page.goto(origin+'/app/opportunities/new');
      await expect(page.getByRole('button',{name:'Save opportunity',exact:true})).toBeEnabled();
      assert.equal(await deliver({display_name:'Later Business',owner_name:'Later owner',timezone:'Asia/Tokyo',brand_color:'#118833'}),200);
      await page.reload();
      const retained = (await browserAPI(page,'/api/v1/settings')).workspace;
      assert.equal(retained.name,'Owner chosen Business');assert.equal(retained.timezone,'Europe/Paris');
      assert.equal(await page.locator('.ob-app .operator-button').first().evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(129, 63, 168)');
      await screenshots(page,'edited-accent');
    } finally { await checkout.stop('dev');await editedServer.exited; }
  } finally { await context.close();await reset(); }
}
