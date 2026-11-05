import {mkdirSync,readFileSync,readdirSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {authenticateOperator} from './operator-session.mjs';
test('BASE-PUBLIC-001 BASE-SECRET-001 PUBLIC-001 public surfaces expose no private data or third-party requests before interaction',async({page,context})=>{
 test.setTimeout(120000);
 const origin=`http://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}`,external=[],requests=[],responses=[],sockets=[];
 page.on('request',request=>{requests.push(request);if(new URL(request.url()).origin!==origin)external.push(request.url());});
 page.on('websocket',socket=>sockets.push(socket.url()));
 page.on('response',response=>responses.push(response));
 await context.addInitScript(()=>{
  window.orbitPrivacyCalls=[];
  const observe=(object,name)=>{
   if(!object||typeof object[name]!=='function')return;
   const original=object[name];object[name]=function(...args){window.orbitPrivacyCalls.push(name);return Reflect.apply(original,this,args);};
  };
  observe(navigator,'sendBeacon');
  const store=Storage.prototype.setItem;
  Storage.prototype.setItem=function(...args){if(this===localStorage)window.orbitPrivacyCalls.push('persistent storage');return Reflect.apply(store,this,args);};
  observe(HTMLCanvasElement.prototype,'toDataURL');observe(HTMLCanvasElement.prototype,'toBlob');
  observe(CanvasRenderingContext2D.prototype,'getImageData');
  observe(window.WebGLRenderingContext?.prototype,'readPixels');observe(window.WebGL2RenderingContext?.prototype,'readPixels');
  observe(window.AudioBuffer?.prototype,'getChannelData');observe(window.OfflineAudioContext?.prototype,'startRendering');
  const cookie=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');
  Object.defineProperty(Document.prototype,'cookie',{...cookie,set(value){window.orbitPrivacyCalls.push('cookie');return cookie.set.call(this,value);}});
 });
 await page.goto('/');await page.waitForLoadState('networkidle');expect(external).toEqual([]);expect(await context.cookies()).toEqual([]);await expect(page.locator('body')).not.toContainText('Fieldhouse');await expect(page.locator('body')).not.toContainText('maya.patel');
 const scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(node=>node.src));for(const script of scripts){const body=await(await page.request.get(script)).text();expect(body).not.toContain('SENDGRID_API_KEY');expect(body).not.toContain('OPENAI_API_KEY');expect(body).not.toContain('ORBIT_ENCRYPTION_KEY');}
 const docs=JSON.parse(readFileSync('docs/site.json','utf8')).sections.flatMap(section=>section.pages.map(page=>page.slug?`/docs/${page.slug}`:'/docs'));
 const assets=new Set(readdirSync('dist/client',{recursive:true}).map(file=>`/${file}`));
 const documents=[...assets].filter(file=>file.endsWith('.html'));
 const routes=[...new Set(['/','/signin','/demo',...docs,...documents])];
 const checkedScripts=new Set();
 for(const route of routes){
  const start=requests.length,responseStart=responses.length;
  const document=await page.goto(route);expect(document.status(),route).toBe(200);
  expect(document.headers()['content-type'],route).toContain('text/html');
  // Load lazy public artwork as well as the initial viewport's assets.
  await page.locator('img').evaluateAll(images=>images.forEach(image=>image.loading='eager'));
  await page.waitForLoadState('networkidle');
  expect(external,`${route} third-party requests`).toEqual([]);expect(sockets,`${route} socket collection`).toEqual([]);
  expect(await context.cookies(),`${route} cookies`).toEqual([]);
  expect(await page.evaluate(()=>({calls:window.orbitPrivacyCalls,local:Object.keys(localStorage)})),`${route} tracking storage and fingerprinting`).toEqual({calls:[],local:[]});
  const collection=requests.slice(start).filter(request=>request.method()!=='GET'||request.postData()!==null||['fetch','xhr','eventsource','websocket','ping'].includes(request.resourceType()));
  expect(collection.map(request=>({url:request.url(),method:request.method(),type:request.resourceType()})),`${route} visitor collection`).toEqual([]);
  expect(await page.locator('img').evaluateAll(images=>images.filter(image=>image.complete&&image.naturalWidth===1&&image.naturalHeight===1).map(image=>image.src)),`${route} tracking pixels`).toEqual([]);
  for(const response of responses.slice(responseStart)){
   expect(response.headers()['set-cookie'],`${route} ${response.url()} cookie header`).toBeUndefined();
   if(response.request().resourceType()!=='document'){
    const asset=new URL(response.url());
    expect(assets.has(decodeURIComponent(asset.pathname)),`${route} loads only emitted public assets: ${asset.pathname}`).toBe(true);
    expect(asset.search,`${route} assets carry no visitor query`).toBe('');
   }
   if(response.request().resourceType()!=='script'||checkedScripts.has(response.url()))continue;
   expect(response.status(),response.url()).toBe(200);checkedScripts.add(response.url());
   const body=await response.text();expect(body).not.toContain('SENDGRID_API_KEY');expect(body).not.toContain('OPENAI_API_KEY');expect(body).not.toContain('ORBIT_ENCRYPTION_KEY');
  }
  const inline=await page.locator('script:not([src])').allTextContents();
  for(const body of inline){expect(body).not.toContain('SENDGRID_API_KEY');expect(body).not.toContain('OPENAI_API_KEY');expect(body).not.toContain('ORBIT_ENCRYPTION_KEY');}
 }
 expect(checkedScripts.size,'The emitted public application scripts actually ran').toBeGreaterThan(0);
 console.log(`SIGNAL-007 public privacy: ${routes.length} documents, ${checkedScripts.size} executed script assets, ${requests.length} requests; no collection, cookie, pixel or fingerprint calls`);
});
test('BASE-PUBLIC-003 public surfaces pass WCAG 2.2 AA at desktop and phone widths',async({page,context})=>{
 test.setTimeout(120000);mkdirSync('verification/ui',{recursive:true});
 const routes=['/','/signin','/docs','/demo'];
 for(const width of [1440,390,320]){
  await context.clearCookies();await page.setViewportSize({width,height:900});
  for(const route of routes){
   await page.goto(route);await page.waitForLoadState('networkidle');
   await page.screenshot({path:`verification/ui/${width}-${route==='/'?'public':route.slice(1).replaceAll('/','-')}.png`,fullPage:true});
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
   expect(result.violations,`${width}px ${route}`).toEqual([]);
   if(route==='/demo'){
    const selected=page.getByRole('complementary',{name:'Opportunities'}).getByRole('button').last();await selected.focus();await page.keyboard.press('Enter');await expect(selected).toHaveAttribute('aria-pressed','true');
    const changed=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();expect(changed.violations,`${width}px demo selection`).toEqual([]);
    await page.screenshot({path:`verification/ui/${width}-demo-selected.png`,fullPage:true});
   }
   // Start from a fresh document, not after the last demo control, so Tab proves a reachable first control.
   if(route==='/demo'){await page.goto(route);await page.waitForLoadState('networkidle');}
   await page.keyboard.press('Tab');
   expect(await page.evaluate(()=>document.activeElement!==document.body),`${width}px ${route} keyboard focus`).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px ${route} horizontal overflow`).toBe(true);
  }
 }
});
test('BASE-ACCESS-001 BASE-ACCESS-002 native operator APIs reject anonymous and forged session claims',async({request})=>{
 for(const route of ['/api/v1/records/contact','/api/v1/settings','/api/v1/notifications','/api/v1/assistance/usage','/api/v1/sources']){
  expect((await request.get(route)).status()).toBe(401);expect((await request.get(route,{headers:{Cookie:'__Host-orbit_session=forged','X-Operator-Id':'setup-owner'}})).status()).toBe(401);
 }
});

test('BASE-PUBLIC-002 BASE-INPUT-003 operator documents reject framing and unsupported upload endpoints',async({request})=>{const response=await request.get('/');expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");expect(response.headers()['x-frame-options']).toBe('DENY');expect((await request.post('/uploads',{data:'not an accepted upload'})).status()).toBe(404);});
test('BASE-INPUT-002 user HTML is displayed as text and cannot execute or load remote pixels',async({page,context})=>{
 await authenticateOperator(context);const pixel=`https://untrusted.example/pixel-${Date.now()}`,requests=[];page.on('request',request=>{if(request.url().startsWith('https://untrusted.example'))requests.push(request.url());});
 const name=`<img src="${pixel}" onerror="window.orbitInjected=true">`;
 const response=await page.request.post('/api/v1/records/company',{headers:{Origin:`http://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}`},data:{name}});expect(response.status()).toBe(201);await page.goto('/app/companies');await expect(page.getByText(name,{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.orbitInjected)).toBeUndefined();expect(requests).toEqual([]);expect(await page.locator(`img[src="${pixel}"]`).count()).toBe(0);
});
