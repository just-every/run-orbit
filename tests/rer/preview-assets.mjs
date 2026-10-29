import assert from 'node:assert/strict';
export async function previewAssets(browser,origin) {
    const page=await browser.newPage({viewport:{width:1440,height:900}}); assert.match((await page.goto(origin+'/signin')).headers()['content-security-policy'], /frame-ancestors 'none'/);
    const response = await page.goto(origin+'/'); assert.match(response.headers()['content-security-policy'], /frame-ancestors 'none'/);
    const files = await page.locator('script[src],link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(n=>n.src||n.href));
    for (const file of files) { const asset=await fetch(file); assert.equal(asset.status,200); assert.match(asset.headers.get('content-type'),file.includes('.css')?/text\/css/:/javascript/); }
    await page.goto(origin+'/docs');
    const appFiles = await page.locator('script[src],link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(n=>n.src||n.href));
    for (const file of appFiles) { const asset=await fetch(file); assert.equal(asset.status,200); assert.match(asset.headers.get('content-type'),file.includes('.css')?/text\/css/:/javascript/); }
    await page.getByRole('link',{name:'Orbit home',exact:true}).click();
    await page.getByRole('link',{name:'Sign in',exact:true}).waitFor();
    await page.goto(origin+'/signin'); await page.fill('#signin-email','owner@example.test'); await page.getByRole('button',{name:'Email a sign-in link'}).click();
    await page.getByRole('status').waitFor();

 await page.close();
}
