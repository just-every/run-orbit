import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
import {readFile, readdir} from 'node:fs/promises';
import {expect} from '@playwright/test';
import {TEST_SESSION_SECRET} from '../support/worker-identity.mjs';

/** The owner uses the emitted document and client transport; lost authority cannot read either. */
export async function sessionBoundaries({worker,browser,session,revoked,expired,opportunity,canary}:any) {
 const origin=worker.origin,cookie=(token:string)=>`__Host-orbit_session=${token}`;
 const secrets=[TEST_SESSION_SECRET,canary,session.token,revoked.token,expired.token];
 const absent=(body:string)=>{for(const value of secrets)assert.ok(!body.includes(value),'Private credentials stay on the Worker');};
 const headers={Cookie:cookie(session.token),Origin:origin,'Content-Type':'application/json'};
 const document=await fetch(origin+'/app',{headers}),html=await document.text();assert.equal(document.status,200);assert.ok(html.includes(opportunity.title),JSON.stringify({path:new URL(document.url).pathname,heading:html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1],hasQueue:html.includes('now-queue'),expectedTitle:opportunity.title}));absent(html);
 const recordURL=origin+`/api/v1/records/opportunity/${opportunity.id}`;
 const detail=await(await fetch(recordURL,{headers})).json() as any;
 const input={...detail.record,contact_ids:detail.contacts.map((row:any)=>row.id),primary_contact_id:detail.contacts.find((row:any)=>row.is_primary)?.id??null,custom_fields:JSON.parse(detail.record.custom_fields_json??'{}')};
 const changed=`Fresh customer evidence ${Date.now()}`;
 const save=async(title:string)=>{const result=await fetch(recordURL,{method:'PUT',headers,body:JSON.stringify({...input,title})});assert.equal(result.status,200,await result.text());};
 await save(changed);
 const fresh=await(await fetch(origin+'/app',{headers:{...headers,'Sec-Fetch-Mode':'navigate'}})).text();assert.ok(fresh.includes(changed));absent(fresh);await save(opportunity.title);
 for(const [name,token] of [['missing',''],['expired',expired.token],['revoked',revoked.token],['valid',session.token]]){
  const auth=token?{Cookie:cookie(token)}:{};
  const doc=await fetch(origin+'/app',{headers:auth,redirect:'manual'}),api=await fetch(origin+'/api/v1/opportunities/now',{headers:auth}),unknown=await fetch(origin+'/api/v1/missing',{headers:auth});
  assert.equal(doc.status,name==='valid'?200:302);assert.equal(api.status,name==='valid'?200:401);assert.equal(unknown.status,name==='valid'?404:401);
  if(name!=='valid'){assert.equal(doc.headers.get('location'),'/signin?returnTo=%2Fapp');assert.ok(!(await doc.text()).includes(opportunity.title));}
 }
 for(const path of ['/missing-document','/assets/no-such-file.js','/@vite/client','/src/core/app/client.tsx'])assert.equal((await fetch(origin+path,{headers:{'Sec-Fetch-Mode':'navigate'}})).status,404,path);
 const unsupported=await new Promise<number|undefined>((resolve,reject)=>{const req=httpRequest(origin+'/',{headers:{Host:'unsupported.invalid'}},response=>{response.resume();resolve(response.statusCode);});req.on('error',reject);req.end();});assert.equal(unsupported,404);
 const asset=(await readdir('dist/client/assets')).find(file=>file.endsWith('.css'))!;assert.equal((await fetch(origin+'/assets/'+asset)).status,200);
 const context=await browser.newContext({viewport:{width:1440,height:900},extraHTTPHeaders:{Cookie:cookie(session.token)}}),page=await context.newPage(),errors:string[]=[],rpc=new Map<string,Record<string,string>>();
 page.on('pageerror',(error:Error)=>errors.push(error.message));
 page.on('request',(request:any)=>{if(new URL(request.url()).pathname.startsWith('/_serverFn/'))rpc.set(request.url(),request.headers());});
 try{
  await page.goto(origin+'/app/records',{waitUntil:'networkidle'});const timeOrigin=await page.evaluate(()=>performance.timeOrigin);
  await page.getByRole('link',{name:'NOW',exact:true}).click();await page.getByTestId('now-queue').waitFor();await page.waitForLoadState('networkidle');assert.equal(await page.evaluate(()=>performance.timeOrigin),timeOrigin);assert.deepEqual(errors,[]);assert.ok(rpc.size>0);
  for(const [url,transportHeaders] of rpc){
   const positive=await fetch(url,{headers:{...transportHeaders,cookie:cookie(session.token)}});assert.ok(positive.ok,await positive.text());
   for(const token of ['',expired.token,revoked.token]){
    const response=await fetch(url,{headers:{...transportHeaders,cookie:token?cookie(token):''},redirect:'manual'}),body=await response.text();
    assert.ok(!body.includes(opportunity.title));assert.ok(body.includes('/signin')||body.includes('redirect')||response.status===302,body);
   }
  }
 }finally{await context.close();}
 for(const file of await readdir('dist/client/assets'))if(file.endsWith('.js'))absent(await readFile('dist/client/assets/'+file,'utf8'));
 // The deployment declaration must open the real form with an editable hint before hydration.
 const spec=JSON.parse(await readFile('management/integration/deployment-spec.json','utf8'));
 const formContext=await browser.newContext({viewport:{width:1440,height:900},javaScriptEnabled:false}),form=await formContext.newPage();
 try{
  const url=new URL(spec.surfaces.app.signIn.path,origin);url.searchParams.set('login_hint','owner@example.test');
  assert.equal((await form.goto(url.href))?.status(),200);
  await expect(form.getByRole('textbox',{name:'Email',exact:true})).toHaveValue('owner@example.test');
  await expect(form.getByRole('button',{name:'Email a sign-in link',exact:true})).toBeEnabled();
  await form.getByRole('textbox',{name:'Email',exact:true}).fill('another-owner@example.test');
  await expect(form.getByRole('textbox',{name:'Email',exact:true})).toHaveValue('another-owner@example.test');
  await form.goto(new URL(spec.surfaces.app.signIn.path,origin).href);await expect(form.getByRole('textbox',{name:'Email',exact:true})).toHaveValue('');
 }finally{await formContext.close();}
}

/** One anonymous quota is shared by public/delegation doors and survives a process restart. */
export async function publicQuota(fixture:any,worker:any) {
 const ip='synthetic-orbit-private-ip-'+crypto.randomUUID(),headers={'CF-Connecting-IP':ip};
 let attempts=0,limited:Response|undefined;
 while(attempts++<2000){
  const response=await fetch(worker.origin+'/api/delegation/v1/token',{method:'POST',headers,body:new URLSearchParams({grant_type:'invalid'})});await response.arrayBuffer();
  if(response.status===429){limited=response;break;}
 }
 assert.ok(limited,'Anonymous requests eventually receive a bounded allowance');assert.ok(Number(limited.headers.get('Retry-After'))>0);
 assert.equal((await fetch(worker.origin+'/api/delegation/v1/identity',{headers})).status,429,'The read and token doors share the public allowance');
 await worker.stop();await fixture.reopen();
 const rows=(await fixture.db.prepare('SELECT bucket,expires_at FROM public_rate_limits').all()).results;
 assert.ok(rows.length>0);assert.ok(rows.every((row:any)=>!row.bucket.includes(ip)),'Durable identities disclose no clear client address');
 await fixture.close();await worker.start();
 assert.equal((await fetch(worker.origin+'/api/delegation/v1/identity',{headers})).status,429,'Restart retains the allowance');
 await worker.stop();await fixture.reopen();await fixture.db.prepare('UPDATE public_rate_limits SET expires_at=0').run();await fixture.close();await worker.start();
 assert.equal((await fetch(worker.origin+'/api/delegation/v1/identity',{headers})).status,401,'Expired anonymous state permits a fresh request, still without authority');
}
