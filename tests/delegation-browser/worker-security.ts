import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import type {Browser,BrowserContext} from '@playwright/test';
import {TEST_SESSION_SECRET} from '../support/worker-identity.mjs';

/** Exercise SSR and captured, compiled server functions against the same Worker as the native journey. */
export async function workerSecurityJourney({context,origin,valid,revoked,expired,providerCanary,opportunityId}:{browser:Browser;context:BrowserContext;origin:string;valid:string;revoked:string;expired:string;providerCanary:string;opportunityId:string}){
 const cookie=(token:string)=>`__Host-orbit_session=${token}`;
 const headers={Cookie:cookie(valid),Origin:origin,'Content-Type':'application/json'};
 const record='/api/v1/records/opportunity/'+opportunityId;
 const initial=await fetch(origin+record,{headers});assert.equal(initial.status,200);const detail=await initial.json() as any;
 const save=async(title:string)=>{const response=await fetch(origin+record,{method:'PUT',headers,body:JSON.stringify({...detail.record,title,contact_ids:detail.contacts.map((row:any)=>row.id),primary_contact_id:detail.contacts.find((row:any)=>row.is_primary)?.id??null,custom_fields:JSON.parse(detail.record.custom_fields_json??'{}')})});assert.equal(response.status,200);};
 const privateValues=[valid,revoked,expired,providerCanary,TEST_SESSION_SECRET];
 const privateValuesAbsent=(body:string)=>{for(const value of privateValues)assert.ok(!body.includes(value),'Session values and bound secrets stay private');};
 const first=await fetch(origin+'/app',{headers});assert.equal(first.status,200);const html=await first.text();assert.ok(html.includes(detail.record.title));privateValuesAbsent(html);
 const changed='Synthetic Orbit fresh SSR '+crypto.randomUUID();
 await save(changed);
 try{const fresh=await fetch(origin+'/app',{headers});assert.equal(fresh.status,200);assert.ok((await fresh.text()).includes(changed),'SSR reflects a native persisted edit');}finally{await save(detail.record.title);}
 for(const [name,token] of [['missing',''],['expired',expired],['revoked',revoked],['valid',valid]]){
  const authenticated=token?{Cookie:cookie(token)}:{};
  const document=await fetch(origin+'/app',{headers:authenticated,redirect:'manual'}),api=await fetch(origin+'/api/v1/opportunities/now',{headers:authenticated}),unknown=await fetch(origin+'/api/v1/missing',{headers:authenticated});
  assert.equal(document.status,name==='valid'?200:302);assert.equal(api.status,name==='valid'?200:401);assert.equal(unknown.status,name==='valid'?404:401);
  if(name!=='valid'){assert.equal(document.headers.get('Location'),'/signin?returnTo=%2Fapp');assert.ok(!(await document.text()).includes(detail.record.title));}
 }
 for(const path of ['/missing-document','/assets/no-such-file.js','/@vite/client','/src/core/app/client.tsx'])assert.equal((await fetch(origin+path,{headers:{'Sec-Fetch-Mode':'navigate'}})).status,404);
 const unsupported=await new Promise<number|undefined>((resolve,reject)=>{const request=httpRequest(origin+'/',{headers:{Host:'unsupported.invalid'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);request.end();});assert.equal(unsupported,404);
 const assets=await readdir('dist/client/assets'),css=assets.find(file=>file.endsWith('.css'));assert.ok(css);assert.equal((await fetch(origin+'/assets/'+css)).status,200);
 const page=await context.newPage(),errors:string[]=[],rpc=new Map<string,Record<string,string>>();
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/_serverFn/'))rpc.set(request.url(),request.headers());});
 await page.goto(origin+'/app/records',{waitUntil:'networkidle'});const timeOrigin=await page.evaluate(()=>performance.timeOrigin);
 await page.getByRole('link',{name:'NOW',exact:true}).click();await page.getByTestId('now-queue').waitFor();await page.waitForLoadState('networkidle');assert.equal(await page.evaluate(()=>performance.timeOrigin),timeOrigin);assert.deepEqual(errors,[]);assert.ok(rpc.size>0,'Hydrated navigation calls the compiled generated server function');
 for(const [url,transport] of rpc){
  const positive=await fetch(url,{headers:{...transport,cookie:cookie(valid)}});assert.equal(positive.ok,true);privateValuesAbsent(await positive.text());
  for(const token of ['',expired,revoked]){const response=await fetch(url,{headers:{...transport,cookie:token?cookie(token):''},redirect:'manual'}),body=await response.text();assert.ok(!body.includes(detail.record.title));assert.ok(body.includes('/signin')||body.includes('redirect')||response.status===302,'Generated transport rejects invalid sessions');}
 }
 for(const file of assets.filter(file=>file.endsWith('.js'))){const client=await readFile('dist/client/assets/'+file,'utf8');assert.doesNotMatch(client,/cloudflare:workers|token_hash|magic_links/);privateValuesAbsent(client);}
 await page.close();
}
