import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {createId} from '../../src/core/shared/ids';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {isolatedDatabase} from './isolated-database';
import {readCurrentArchive} from './current-archive';

type Api=(path:string,method?:string,body?:unknown,token?:string)=>Promise<Response>;
type Customer={id:string;name:string;email:string;livemode:boolean;deleted:boolean};
type Review={customerId:string;name:string;email:string;domain:string;companyId:string;opportunityId:string};
type Billing={mapping:Review|null;timeline:{id:string;eventType:string;state:string;currency:string;amountCents:number;occurredAt:string;receivedAt:string}[];state:string;currentState:string|null;reason:string|null;lastEventAt:string|null};
const billingTables=['billing_connection','billing_credentials','billing_mappings','billing_events','billing_erased_customers'] as const;
const unchangedTables=[...billingTables,'opportunities','companies','contacts','opportunity_contacts','signals','signal_links','timeline_entries','timeline_entry_records','audit_entries','evaluations','notifications'];
const email=(index:number,domain='example.test')=>[`synthetic-orbit-${index}`,domain].join('@');
async function json<T=any>(response:Response,status=200):Promise<T>{assert.equal(response.status,status,`Public route: ${(await response.clone().text()).slice(0,512)}`);return response.json() as Promise<T>;}
async function rows(db:D1Database,table:string){return(await db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results;}
async function inventory(db:D1Database){const results=await db.batch(unchangedTables.map(table=>db.prepare(`SELECT * FROM ${table} ORDER BY rowid`)));return Object.fromEntries(unchangedTables.map((table,i)=>[table,results[i]!.results]));}

/** Real application and D1; only Stripe's HTTPS boundary is substituted. */
async function installation(){
 const platform=await isolatedDatabase(),db=platform.db,deps=createDependencies(db),owner=createId(),seller=createId(),stage=createId();
 try{
  await deps.workspace.ensureWorkspace({name:'synthetic-orbit-1',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  for(const [id,index] of [[owner,1],[seller,2]] as const)await deps.auth.ensureOperator({id,email:email(index),displayName:`synthetic-orbit-${index}`});
  await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(owner).run();
  await deps.workspace.ensurePipelineStage({id:stage,name:'synthetic-orbit-1',position:0});
  const ownerSession=await deps.auth.createSession(owner),sellerSession=await deps.auth.createSession(seller);
  const security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')})!;
  const apiKey=['rk','test','synthetic-orbit-3'].join('_'),webhookSecret='synthetic-orbit-4',customers=new Map<string,Customer>();
  const calls:{path:string;method:string}[]=[];
  const app=createApp({database:db,sourceSecurity:security,assets:{fetch:async()=>new Response(null,{status:404})},captureFetch:async(input,init)=>{
   const url=new URL(input),method=init?.method??'GET';assert.equal(url.origin,'https://api.stripe.com');assert.equal(method,'GET','Billing context never creates a customer, charge or invoice');
   assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer '+apiKey);calls.push({path:url.pathname+url.search,method});
   if(url.pathname==='/v1/customers'){assert.equal(url.searchParams.get('limit'),'1');return Response.json({object:'list',data:[],has_more:false});}
   const customer=customers.get(decodeURIComponent(url.pathname.slice('/v1/customers/'.length)));
   assert.ok(url.pathname.startsWith('/v1/customers/')&&customer,'Only the reviewed customer is fetched');return Response.json(customer);
  }});
  const api:Api=(path,method='GET',body,token=ownerSession.token)=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:token?'__Host-orbit_session='+token:'',Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const deal=async(index:number)=>{
   const domain=`synthetic-orbit-${index}.test`;
   const company=await json<{id:string}>(await api('records/company','POST',{name:`synthetic-orbit-${index}`,primary_domain:domain}),201);
   const contact=await json<{id:string}>(await api('records/contact','POST',{name:`synthetic-orbit-${index+1}`,email:email(index+1,domain),company_id:company.id}),201);
   const input={title:`synthetic-orbit-${index+2}`,stage_id:stage,owner_id:seller,company_id:company.id,value_cents:12000,contact_ids:[contact.id],primary_contact_id:contact.id};
   const opportunity=await json<{id:string}>(await api('records/opportunity','POST',input),201);
   const customer={id:`synthetic-orbit-${index+3}`,name:`synthetic-orbit-${index+1}`,email:email(index+1,domain),livemode:false,deleted:false};customers.set(customer.id,customer);
   return{company:company.id,contact:contact.id,opportunity:opportunity.id,input,customer,domain};
  };
  const event=(customerId:string,index:number,type:string,created:number)=>({id:`synthetic-orbit-${index}`,type,livemode:false,created,data:{object:{id:`synthetic-orbit-${index+1}`,customer:customerId,currency:'usd',amount_paid:12000,amount_due:12000,amount_refunded:4000,status:type==='invoice.paid'?'paid':'open',description:'synthetic-orbit-90',metadata:{private:'synthetic-orbit-90'},payment_method_details:{card:{last4:'9090'}},billing_details:{address:{line1:'synthetic-orbit-90'}}}}});
  const deliver=(payload:ReturnType<typeof event>,options:{stale?:boolean;forged?:boolean;altered?:boolean}={})=>{
   const raw=JSON.stringify(payload),timestamp=String(Math.floor(Date.now()/1000)-(options.stale?600:0)),signature=createHmac('sha256',options.forged?'synthetic-orbit-99':webhookSecret).update(timestamp+'.'+raw).digest('hex');
   return app.request('https://orbit.test/api/v1/billing/stripe/events',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':`t=${timestamp},v1=${signature}`},body:raw+(options.altered?' ':'')});
  };
  return{platform,db,deps,owner,seller,stage,security,apiKey,webhookSecret,customers,calls,app,api,deal,event,deliver,ownerToken:ownerSession.token,sellerToken:sellerSession.token};
 }catch(error){await platform.dispose();throw error;}
}
type Installation=Awaited<ReturnType<typeof installation>>;

async function reviewedLink(f:Installation,deal:Awaited<ReturnType<Installation['deal']>>){
 const request={customerId:deal.customer.id,companyId:deal.company,opportunityId:deal.opportunity},before=await inventory(f.db);
 const reviewed=await json<{review:Review;reviewToken:string;expiresAt:string}>(await f.api('billing/stripe/review','POST',request,f.sellerToken));
 assert.deepEqual(reviewed.review,{...request,name:deal.customer.name,email:deal.customer.email,domain:deal.domain});
 assert.ok(reviewed.reviewToken&&Date.parse(reviewed.expiresAt)>Date.now());
 assert.deepEqual(await inventory(f.db),before,'Review fetches current provider identity without writing');
 await json(await f.api('billing/stripe/link','POST',{...reviewed.review,reviewToken:reviewed.reviewToken},f.sellerToken),201);
 const mapped=await json<Billing>(await f.api('billing/opportunity/'+deal.opportunity));
 assert.equal(mapped.mapping?.customerId,deal.customer.id);assert.equal(mapped.mapping?.companyId,deal.company);assert.equal(mapped.mapping?.opportunityId,deal.opportunity);
 assert.deepEqual((await json<Billing>(await f.api('billing/company/'+deal.company))).timeline,mapped.timeline,'Company and opportunity read the same billing context');
 return reviewed;
}

async function proveConnection(f:Installation){
 const credentials={apiKey:f.apiKey,webhookSecret:f.webhookSecret},before=await inventory(f.db);
 for(const token of ['',f.sellerToken])for(const action of ['connect','disconnect']){
  assert.equal((await f.api('settings/stripe/'+action,'POST',action==='connect'?credentials:{},token)).status,token?403:401);
  assert.deepEqual(await inventory(f.db),before,'Connection authority is owner-only');
 }
 for(const apiKey of [['sk','test','synthetic-orbit-3'].join('_'),['rk','live','synthetic-orbit-3'].join('_')]){
  assert.equal((await f.api('settings/stripe/connect','POST',{...credentials,apiKey})).status,400);
  assert.deepEqual(await inventory(f.db),before,'Only restricted test credentials may connect');
 }
 assert.equal(f.calls.length,0,'Refused credentials never reach Stripe');
 const connected=await json(await f.api('settings/stripe/connect','POST',credentials));
 assert.ok(!JSON.stringify(connected).includes(f.apiKey)&&!JSON.stringify(connected).includes(f.webhookSecret));
 const status=await json(await f.api('settings/stripe'));assert.equal(status.state,'connected');assert.ok(status.checkedAt);assert.equal(new URL(status.webhookUrl).pathname,'/api/v1/billing/stripe/events');
 assert.ok(!JSON.stringify(status).includes(f.apiKey)&&!JSON.stringify(status).includes(f.webhookSecret),'Settings never echo credentials');
 assert.equal(f.calls[0]!.path,'/v1/customers?limit=1');
 const stored=await rows(f.db,'billing_credentials');assert.equal(stored.length,1);
 assert.ok(!JSON.stringify(stored).includes(f.apiKey)&&!JSON.stringify(stored).includes(f.webhookSecret),'Secrets are sealed at rest');
 const opened=await f.security.open(String(stored[0]!.sealed));assert.ok(opened.includes(f.apiKey)&&opened.includes(f.webhookSecret),'The stored seal contains the accepted credentials');
}

async function proveIdentity(f:Installation,deal:Awaited<ReturnType<Installation['deal']>>){
 const request={customerId:deal.customer.id,companyId:deal.company,opportunityId:deal.opportunity},original={...deal.customer};
 for(const change of [{email:email(98)},{name:'synthetic-orbit-98'},{livemode:true},{deleted:true}]){
  f.customers.set(original.id,{...original,...change});const before=await inventory(f.db);
  assert.equal((await f.api('billing/stripe/review','POST',request,f.sellerToken)).status,409);
  assert.deepEqual(await inventory(f.db),before,'A mismatched or unavailable customer creates no mapping, event or audit');
 }
 f.customers.set(original.id,original);
 await json(await f.api('records/company/'+deal.company,'PATCH',{changes:{primary_domain:'synthetic-orbit-98.test'},base:{primary_domain:deal.domain}}));
 const wrongDomain=await inventory(f.db);assert.equal((await f.api('billing/stripe/review','POST',request,f.sellerToken)).status,409);
 assert.deepEqual(await inventory(f.db),wrongDomain,'A company domain mismatch cannot be reviewed into a mapping');
 await json(await f.api('records/company/'+deal.company,'PATCH',{changes:{primary_domain:deal.domain},base:{primary_domain:'synthetic-orbit-98.test'}}));
 const reviewed=await json<{review:Review;reviewToken:string}>(await f.api('billing/stripe/review','POST',request,f.sellerToken));
 f.customers.set(original.id,{...original,email:email(98)});const before=await inventory(f.db);
 assert.equal((await f.api('billing/stripe/link','POST',{...reviewed.review,reviewToken:reviewed.reviewToken},f.sellerToken)).status,409);
 assert.deepEqual(await inventory(f.db),before,'A customer changed after review cannot be linked');f.customers.set(original.id,original);
 await reviewedLink(f,deal);
 const other=await json<{id:string}>(await f.api('records/opportunity','POST',{...deal.input,title:'synthetic-orbit-29'}),201),linked=await inventory(f.db);
 assert.equal((await f.api('billing/stripe/review','POST',{...request,opportunityId:other.id},f.sellerToken)).status,409);
 assert.deepEqual(await inventory(f.db),linked,'A customer already linked elsewhere cannot be reassigned');
}

async function proveEvents(f:Installation,deal:Awaited<ReturnType<Installation['deal']>>){
 const created=Math.floor(Date.now()/1000)-120,read=()=>f.api('billing/opportunity/'+deal.opportunity).then(response=>json<Billing>(response));
 const initial=await json(await f.api('records/opportunity/'+deal.opportunity));
 const paid=f.event(deal.customer.id,30,'invoice.paid',created),before=await inventory(f.db);
 for(const options of [{forged:true},{stale:true},{altered:true}]){
  assert.equal((await f.deliver(paid,options)).status,401);assert.deepEqual(await inventory(f.db),before,'Forged, expired or modified raw bodies write nothing');
 }
 const deliveries=[paid,f.event(deal.customer.id,32,'invoice.payment_failed',created+10),f.event(deal.customer.id,34,'charge.refunded',created+20)];
 for(const [index,payload] of deliveries.entries()){
  await json(await f.deliver(payload),201);const status=await read(),timeline=status.timeline;
  assert.equal(timeline.length,index+1);assert.equal(status.state,'connected');assert.equal(status.currentState,['paid','past-due','refunded'][index]);assert.ok(status.lastEventAt);
  const entry=timeline.find(item=>item.eventType===payload.type);assert.ok(entry);assert.equal(entry.currency,'USD');assert.equal(entry.amountCents,index===2?4000:12000);assert.equal(entry.occurredAt,new Date(payload.created*1000).toISOString());assert.ok(entry.receivedAt);
  const snapshot=await inventory(f.db);await json(await f.deliver(payload));assert.deepEqual(await inventory(f.db),snapshot,'Identical delivery never writes twice');
 }
 assert.deepEqual((await read()).timeline.map(entry=>entry.state).sort(),['paid','past-due','refunded'].sort());
 const settled=await inventory(f.db);await json(await f.deliver(f.event(deal.customer.id,36,'invoice.paid',created+5)));
 assert.deepEqual(await inventory(f.db),settled,'An older provider-created delivery cannot rewrite newer context');
 assert.deepEqual(await json(await f.api('records/opportunity/'+deal.opportunity)),initial,'Billing evidence never changes the deal stage, outcome, score or CRM timeline');
 const stored=await rows(f.db,'billing_events');assert.equal(stored.length,3);
 const allowed=['id','customer_id','customer_hash','object_id','event_type','state','currency','amount_cents','occurred_at','source_created','received_at'];
 for(const row of stored)assert.deepEqual(Object.keys(row).sort(),allowed.slice().sort(),'Only normalized billing fields persist');
 assert.ok(!JSON.stringify(stored).includes('synthetic-orbit-90')&&!JSON.stringify(stored).includes('9090'),'Provider metadata, address and card details are discarded');
}

async function proveArchive(f:Installation,deal:Awaited<ReturnType<Installation['deal']>>){
 let job=await json(await f.api('records/archive/exports','POST',{}),201);
 for(let step=0;step<300&&job.state!=='ready';step++)job=await json(await f.api(`records/archive/exports/${job.id}/advance`,'POST',{}));assert.equal(job.state,'ready');
 const download=await f.api(`records/archive/exports/${job.id}/download`);assert.equal(download.status,200);const archive=await readCurrentArchive(download);
 const serialized=JSON.stringify(archive);assert.ok(!serialized.includes(f.apiKey)&&!serialized.includes(f.webhookSecret));
 assert.ok(!archive.manifest.tables.some(table=>table.name==='billing_credentials'),'Records excludes provider credentials');
 for(const table of ['billing_connection','billing_mappings','billing_events'])assert.ok(archive.manifest.tables.some(entry=>entry.name===table&&entry.rows>0),`Records exports populated ${table}`);
 const target=await isolatedDatabase();
 try{
  const deps=createDependencies(target.db),bootstrap=createId();await deps.auth.ensureOperator({id:bootstrap,email:email(80),displayName:'synthetic-orbit-80'});
  await deps.workspace.ensureWorkspace({name:'synthetic-orbit-80',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  const session=await deps.auth.createSession(bootstrap);let token=session.token,providerCalls=0;
  const app=createApp({database:target.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')}),captureFetch:async()=>{providerCalls++;throw new Error('Restored authority must remain paused');}});
  const api:Api=(path,method='GET',body)=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:'__Host-orbit_session='+token,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  let restored=await json(await api('records/archive/imports','POST',{manifest:archive.manifest,confirmed:true}),201);
  for(const part of archive.parts)await json(await api(`records/archive/imports/${restored.id}/parts/${part.index}`,'PUT',part));
  for(let step=0;step<1000&&restored.state!=='complete';step++)restored=await json(await api(`records/archive/imports/${restored.id}/finalize`,'POST',{}));assert.equal(restored.state,'complete');
  token=(await deps.auth.createSession(f.owner)).token;
  for(const table of ['billing_mappings','billing_events','billing_erased_customers'])assert.deepEqual(await rows(target.db,table),await rows(f.db,table),`${table} survives populated Records restore`);
  assert.equal((await rows(target.db,'billing_credentials')).length,0);
  const status=await json(await api('settings/stripe'));assert.equal(status.state,'paused');assert.ok(status.reason,'Restore explains fresh credentials are required');
  const billing=await json<Billing>(await api('billing/opportunity/'+deal.opportunity));assert.equal(billing.mapping?.customerId,deal.customer.id);assert.equal(billing.timeline.length,3);
  assert.equal((await api('billing/stripe/review','POST',{customerId:deal.customer.id,companyId:deal.company,opportunityId:deal.opportunity})).status,409);
  assert.equal(providerCalls,0,'Restored billing history confers no provider authority');
 }finally{await target.dispose();}
 await json(await f.api(`records/archive/exports/${job.id}/abort`,'POST',{}));
}

/** Focused Stripe test-mode context proof through the real signed and operator routes. */
export async function exerciseStripeBilling(){
 const f=await installation();
 try{
  await proveConnection(f);const deal=await f.deal(10);await proveIdentity(f,deal);await proveEvents(f,deal);
  const waiting=await f.deal(20),payload=f.event(waiting.customer.id,40,'invoice.paid',Math.floor(Date.now()/1000)-30);
  await json(await f.deliver(payload),201);
  const unlinked=await json<{events:{customerId:string}[]}>(await f.api('billing/stripe/unlinked'));assert.ok(unlinked.events.some(event=>event.customerId===waiting.customer.id));
  const pending=await json<Billing>(await f.api('billing/opportunity/'+waiting.opportunity));assert.equal(pending.mapping,null);assert.deepEqual(pending.timeline,[],'An unmapped event waits without guessing a deal');
  await reviewedLink(f,waiting);assert.equal((await json<Billing>(await f.api('billing/opportunity/'+waiting.opportunity))).timeline.length,1,'Explicit identity review attaches the waiting event');
  assert.ok(!(await json<{events:{customerId:string}[]}>(await f.api('billing/stripe/unlinked'))).events.some(event=>event.customerId===waiting.customer.id));
  const overdue=f.event(waiting.customer.id,42,'invoice.overdue',payload.created+10),voided=f.event(waiting.customer.id,44,'invoice.voided',payload.created+20);voided.data.object.status='void';
  for(const [event,state] of [[overdue,'past-due'],[voided,'voided']] as const){await json(await f.deliver(event),201);assert.equal((await json<Billing>(await f.api('billing/opportunity/'+waiting.opportunity))).currentState,state);const before=await inventory(f.db);await json(await f.deliver(event));assert.deepEqual(await inventory(f.db),before);}
  await json(await f.api('records/contact/'+waiting.contact,'DELETE',{confirmed:true}));
  assert.equal((await json<Billing>(await f.api('billing/opportunity/'+waiting.opportunity))).mapping,null);
  assert.ok(!(await rows(f.db,'billing_events')).some(row=>row.customer_id===waiting.customer.id));assert.ok((await rows(f.db,'billing_erased_customers')).length>0);
  const erased=await inventory(f.db);await json(await f.deliver(payload));assert.deepEqual(await inventory(f.db),erased,'Erased customer replay cannot resurrect billing context');
  await proveArchive(f,deal);
  await json(await f.api('settings/stripe/disconnect','POST',{}));assert.equal((await json(await f.api('settings/stripe'))).state,'disconnected');
  const revoked=await inventory(f.db),providerCalls=f.calls.length;
  assert.equal((await f.deliver(f.event(deal.customer.id,50,'invoice.paid',Math.floor(Date.now()/1000)))).status,409);
  assert.equal((await f.api('billing/stripe/review','POST',{customerId:deal.customer.id,companyId:deal.company,opportunityId:deal.opportunity},f.sellerToken)).status,409);
  assert.deepEqual(await inventory(f.db),revoked,'Revocation stops new billing writes');assert.equal(f.calls.length,providerCalls,'Revocation stops provider requests');
 }finally{await f.platform.dispose();}
}
