import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixtureProvider } from './editor-provider.mjs';
import { chromium } from '@playwright/test';
import { freePort, freshCheckout } from './checkout.mjs';
import { privateFiles, assertPrivateRoutes, setupWithProbes } from './private-routes.mjs';
import {openLink} from './sign-in.mjs';

test('admission uses native owner authority, bounds editor framing and preserves local private files and built assets', {timeout: 15 * 60_000}, async () => {
  const checkout = await freshCheckout(), browser = await chromium.launch();
  const evidence = process.env.ORBIT_EVIDENCE_DIR;
  if (evidence) await mkdir(evidence, {recursive: true});
  const management = await fixtureProvider(), manager = management.origin;
  try {
    const port = await freePort(), origin = `http://127.0.0.1:${port}`; management.state.allowed = origin;
    const paths = await privateFiles(checkout.root);
    // Nonempty publication data lives only in this disposable test installation.
    const compiled = {revision:1,edits:[
      {id:'notfound-title',revision:1,path:'/missing-admission-route',target:{selector:'div:nth-child(1) > div:nth-child(1) > main:nth-child(1) > section:nth-child(2) > h1:nth-child(1)',tag:'h1',role:'',beforeText:'Page not found'},change:{text:'Published test not found'}},
    ]};
    await writeFile(join(checkout.root,'src/editor/visual-edits.json'),JSON.stringify(compiled));
    const setup = await setupWithProbes(checkout, ['setup','--owner-email','owner@example.test','--port',String(port),'--non-interactive'], origin, paths);
    assert.equal(setup.code, 0, setup.output.slice(-1500));
    await appendFile(join(checkout.root,'.dev.vars'), `\nRER_MANAGEMENT_ORIGIN=${manager}\nRER_INSTALLATION_ID=test-orbit\n`);
    const server = checkout.serve(['dev']); const open = openLink(await server.ready);
    await assertPrivateRoutes(origin, paths);
    const denied = await fetch(origin + '/api/editor/config'); assert.equal(denied.status, 403);
    assert.match(denied.headers.get('cache-control'), /no-store/);
    const visitor = await browser.newPage();
    const fonts = [];
    for (const width of [1440,390]) for (const path of ['/','/signin']) {
      await visitor.setViewportSize({width,height:900}); await visitor.goto(origin+path); await visitor.evaluate(() => document.fonts.ready);
      fonts.push({width,path,...await visitor.evaluate(() => ({body:getComputedStyle(document.body).fontFamily, heading:getComputedStyle(document.querySelector('h1')).fontFamily,content:getComputedStyle(document.querySelector('.orbit-home')??document.body).fontFamily}))});
      if (evidence) await visitor.screenshot({path:join(evidence,`${path === '/' ? 'home' : 'signin'}-${width}.png`),fullPage:true});
    }
    // An anonymous local visitor reaches the checkout-key gate, without owner authority.
    await visitor.goto(origin+'/');
    assert.deepEqual(await (await fetch(origin+'/setup/state')).json(), {state:'unclaimed'});
    await visitor.getByRole('link',{name:'Finish setup',exact:true}).click();
    await visitor.waitForURL(url => url.pathname === '/__dev/key');
    assert.equal((await visitor.context().request.get(origin+'/api/editor/config')).status(),403);
    const notfound=await visitor.goto(origin+'/missing-admission-route');assert.equal(notfound.status(),404);
    await visitor.getByRole('heading',{name:'Published test not found',exact:true}).waitFor();
    await visitor.reload();await visitor.getByRole('heading',{name:'Published test not found',exact:true}).waitFor();
    assert.equal(management.state.requests, 0, 'public pages never contact management');
    const owner = await browser.newPage();
    await owner.goto(open); await owner.waitForURL(url => url.pathname === '/setup');
    await owner.fill('#setup-name','Admission Test Co');
    await owner.getByRole('button',{name:'Finish setup'}).click();
    await owner.waitForURL(origin+'/app');
    assert.deepEqual(await (await fetch(origin+'/setup/state')).json(), {state:'claimed'});
    await visitor.goto(origin+'/');
    await visitor.getByRole('link',{name:'Sign in',exact:true}).waitFor();
    for (const width of [1440,390]) {
      await owner.setViewportSize({width,height:900}); await owner.reload();
      const response = await owner.evaluate(async () => { const response=await fetch('/api/editor/config');return {status:response.status,headers:Object.fromEntries(response.headers),body:await response.json()}; }); assert.equal(response.status,200);
      assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/);
      assert.ok(response.headers['content-security-policy'].includes(manager));
      const grant = response.body; assert.equal(grant.config.managementOrigin, manager);
      await owner.locator('[data-rer-editor]').waitFor({timeout: 10000});
      await owner.getByRole('button',{name:'Open Run Edit Run',exact:true}).click();
      await owner.frameLocator('iframe').getByText('Labeled local management fixture').waitFor();
      await owner.waitForFunction(() => document.querySelector('[data-rer-editor]')?.dataset.connection === 'connected');
      const target = await owner.locator('h1').evaluate(element => {
        const parts = []; let node = element;
        while (node && node !== document.body) { const parent = node.parentElement; parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${Array.from(parent.children).indexOf(node)+1})`); node = parent; }
        return {selector:parts.join(' > '),tag:'h1',role:'',beforeText:element.textContent.replace(/\s+/g,' ').trim()};
      });
      const frame = owner.frames().find(frame => frame.url().startsWith(manager));
      await frame.evaluate(snapshot => window.send('live-edits',{snapshot}), {revision:1,edits:[{id:'test-overlay',revision:1,parentOrigin:origin,path:'/app',target,change:{text:'Private test overlay'}}]});
      await owner.getByRole('heading',{name:'Private test overlay',exact:true}).waitFor();
      await frame.evaluate(() => window.send('undo-live-edit',{id:'test-overlay',revision:1}));
      await owner.getByRole('heading',{name:target.beforeText,exact:true}).waitFor();
      await owner.waitForFunction(() => document.querySelector('[data-rer-editor]')?.shadowRoot?.querySelector('iframe')?.style.clipPath.startsWith('path('));
      assert.equal(await owner.evaluate(() => document.elementFromPoint(20,20)?.hasAttribute('data-rer-editor')),true,'negotiated editor surface receives pointer hits');
      if (evidence) await owner.screenshot({path:join(evidence,`editor-${width}.png`)});
    }
    const mountedFrame = owner.frames().find(frame => frame.url().startsWith(manager));
    const frameDocument = await mountedFrame.evaluate(() => performance.timeOrigin);
    await owner.waitForTimeout(32_000);
    assert.equal(await owner.locator('[data-rer-editor]').count(),1,'native authority renews beyond the first lease');
    assert.equal(await mountedFrame.evaluate(() => performance.timeOrigin),frameDocument,'renewal preserves the negotiated frame');
    const vars = await readFile(join(checkout.root,'.dev.vars'),'utf8');
    const token = vars.match(/^SETUP_TOKEN=(.*)$/m)[1].replace(/^"|"$/g,'');
    const second = await fetch(origin+'/auth/bootstrap',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({token,displayName:'Second owner'})});
    assert.equal(second.status,409,'owner claim cannot run twice');
    // Revoke through the native server endpoint without a document navigation.
    const revoked = await owner.evaluate(async () => (await fetch('/auth/signout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status);
    assert.equal(revoked,204);
    await owner.locator('[data-rer-editor]').waitFor({state:'detached',timeout:20_000});
    await owner.getByRole('button',{name:'Sign out',exact:true}).click();
    assert.equal(await owner.locator('[data-rer-editor]').count(),0);
    // Base's sign-in page allows no in-page fetch (default-src 'none'), so ask with this browser's own cookies.
    await owner.waitForURL(url => url.pathname === '/signin');
    assert.equal((await owner.context().request.get(origin+'/api/editor/config')).status(),403);
    await checkout.rer(['dev','--stop']); await server.exited;
    const preview = checkout.serve(['preview']); await preview.ready;
    await assertPrivateRoutes(origin,paths);
    const page = await browser.newPage(); assert.match((await page.goto(origin+'/signin')).headers()['content-security-policy'], /frame-ancestors 'none'/);
    const response = await page.goto(origin+'/'); assert.match(response.headers()['content-security-policy'], /frame-ancestors 'none'/);
    const files = await page.locator('script[src],link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(n=>n.src||n.href));
    assert.ok(files.some(file=>file.endsWith('/rer-theme.css')));
    assert.ok(files.some(file=>file.endsWith('/brand/fonts.css')));
    for (const file of files) { const asset=await fetch(file); assert.equal(asset.status,200); assert.match(asset.headers.get('content-type'),file.includes('.css')?/text\/css/:/javascript/); }
    await page.goto(origin+'/docs');
    const appFiles = await page.locator('script[src],link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(n=>n.src||n.href));
    assert.ok(appFiles.some(file=>file.includes('/assets/')));
    for (const file of appFiles) { const asset=await fetch(file); assert.equal(asset.status,200); assert.match(asset.headers.get('content-type'),file.includes('.css')?/text\/css/:/javascript/); }
    await page.getByRole('link',{name:'Orbit home',exact:true}).click();
    await page.getByRole('link',{name:'Sign in',exact:true}).waitFor();
    await page.goto(origin+'/signin'); await page.fill('#signin-email','owner@example.test'); await page.getByRole('button',{name:'Email a sign-in link'}).click();
    await page.getByRole('status').waitFor();
    await checkout.rer(['preview','--stop']); await preview.exited;
    if (evidence) await writeFile(join(evidence,'fonts-after.json'),JSON.stringify(fonts,null,2)+'\n');
    console.log(JSON.stringify({fonts,managementFixtureRequests:management.state.requests,ownerClaim:'repeat refused',assets:'served with native MIME',privateRoutes:'setup/dev/preview refused'}));
  } finally {
    await checkout.rer(['dev','--stop']); await checkout.rer(['preview','--stop']);
    await browser.close(); await checkout.close(); await management.close();
  }
});
