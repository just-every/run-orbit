import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function editorAdmission({checkout,browser,page,origin,management}) {
 const manager=management.origin, ownerURL=page.url();
 // Earlier installed-user steps already opened the editor. Suspend that page while
 // measuring anonymous navigation, so its legitimate traffic cannot enter the count.
 await page.goto('about:blank');
 const priorRequests=management.state.requests;
    const denied = await fetch(origin + '/api/editor/config'); assert.equal(denied.status, 403);
    assert.match(denied.headers.get('cache-control'), /no-store/);
    const visitor = await browser.newPage({viewport:{width:1440,height:900}});
    // The claimed installation exposes no editor authority to a visitor.
    // An anonymous visitor still has no owner authority and reaches the checkout-key gate.
    await visitor.goto(origin+'/');
    assert.deepEqual(await (await fetch(origin+'/setup/state')).json(), {state:'claimed'});
    await visitor.getByRole('link',{name:'Sign in',exact:true}).click();
    await visitor.waitForURL(url => url.pathname === '/__dev/key');
    assert.equal((await visitor.context().request.get(origin+'/api/editor/config')).status(),403);
    const notfound=await visitor.goto(origin+'/missing-admission-route');assert.equal(notfound.status(),404);
    await visitor.getByRole('heading',{name:'Published test not found',exact:true}).waitFor();
    await visitor.reload();await visitor.getByRole('heading',{name:'Published test not found',exact:true}).waitFor();
    assert.equal(management.state.requests, priorRequests, 'public pages never contact management');
    const owner=page;
    await owner.goto(ownerURL);
    for (const width of [1440]) {
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
      assert.equal(await owner.evaluate(() => document.elementFromPoint(20,20)?.hasAttribute('data-rer-editor')),true,'negotiated editor surface receives pointer hits');
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
    await owner.goto(origin+'/signin');
    assert.equal(await owner.locator('[data-rer-editor]').count(),0);
    // Dev sign-in requires the checkout key again after revocation. Query with
    // this browser's own cookies to prove that the old owner session is powerless.
    await owner.waitForURL(url => url.pathname === '/__dev/key');
    assert.equal((await owner.context().request.get(origin+'/api/editor/config')).status(),403);
    await visitor.close();

}
