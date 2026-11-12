import {createId} from '../../src/core/shared/ids';
import assert from 'node:assert/strict';
import {isolatedDatabase} from './isolated-database';
import {todayApp} from './today-workspace';
import {createAIProvider} from '../../src/core/features/assistance/provider';
import {localArchiveRoundTrip} from './capture-privacy-archive';
import {launchFixture} from './launch-fixture';
import {riskBusinessState} from './browser-risk-data';

/** Products, money, immutable history, privacy and cited conflicts through authenticated HTTP. */
export async function exerciseQuotes(){
 const source=await isolatedDatabase();
 try{
 const db=source.db,t=await todayApp(db,{provider:createAIProvider({OPENAI_API_KEY:'synthetic-orbit-165',AI_MODEL:'synthetic-orbit-model',AI_INPUT_COST_PER_MILLION:'1',AI_OUTPUT_COST_PER_MILLION:'2'})});
 const base='/api/v1/quotes',product=async(name:string,cents:number)=>{const p=await t.json<any>(base+'/products',{body:{name,active:true}},201);const price=await t.json<any>(`${base}/products/${p.id}/prices`,{body:{unitPriceCents:cents,basePriceId:null}},201);return {productId:p.id,priceId:price.id,quantity:2,discountCents:0,overrideUnitPriceCents:null,overrideReason:null};};
 const first=await product('Synthetic annual licence',10001),second=await product('Synthetic onboarding',25000);
 await t.json(`${base}/products/${second.productId}`,{method:'PUT',body:{name:'Synthetic onboarding service',active:true}},200);
 const catalog=await t.json<any>(base+'/products',{},200);assert.equal(catalog.currency,'USD');assert.ok(catalog.products.some((p:any)=>p.id===second.productId&&p.name==='Synthetic onboarding service'&&p.unitPriceCents===25000));
 const deal=await t.opportunity('Synthetic quote review','Synthetic quote buyer','Synthetic buyer',['synthetic-orbit-165','example.test'].join('@'));
 const path=`${base}/deals/${deal}`,input={baseVersion:0,expiresOn:'2030-11-03',lines:[{...first,discountCents:1002},{...second,quantity:1,overrideUnitPriceCents:24000,overrideReason:'Reviewed onboarding concession'}],discountCents:3000,tax:{treatment:'added',rateBasisPoints:825,disclosure:'US sales tax added at 8.25 percent for the reviewed destination; no automated tax determination.'}};
 const v1=await t.json<any>(path,{body:input},201);
 assert.deepEqual([v1.version,v1.content.subtotalCents,v1.content.netCents,v1.content.taxCents,v1.content.totalCents],[1,43000,40000,3300,43300]);
 assert.deepEqual(v1.content.lines.map((l:any)=>[l.bookUnitPriceCents,l.unitPriceCents,l.totalCents,l.override]),[[10001,10001,19000,false],[25000,24000,24000,true]]);
 assert.equal(v1.content.lines[1].overrideReason,input.lines[1].overrideReason);assert.deepEqual(v1.content.tax,input.tax);assert.equal(v1.content.currency,'USD');
 const before=await t.json<any>(path,{},200);
 for(const body of [{...input,baseVersion:1,totalCents:1},{...input,baseVersion:1,lines:[first]},{...input,baseVersion:1,tax:{...input.tax,disclosure:''}},{...input,baseVersion:1,discountCents:999999},{...input,baseVersion:1,lines:[{...first,quantity:1.5},second]},{...input,baseVersion:1,lines:[first,{...second,overrideUnitPriceCents:1,overrideReason:null}]}])assert.equal((await t.call(path,{body})).status,400,'unsafe money inputs never save a quote');
 assert.deepEqual(await t.json(path,{},200),before,'all invalid requests leave saved history unchanged');
 // Catalog changes do not rewrite any issued proposal. A stale book selection must be refreshed explicitly.
 const revisedPrice=await t.json<any>(`${base}/products/${first.productId}/prices`,{body:{unitPriceCents:12000,basePriceId:first.priceId}},201);
 assert.equal((await t.call(path,{body:{...input,baseVersion:1}})).status,409);
 const updated={...input,baseVersion:1,expiresOn:'2030-11-17',lines:[{...first,priceId:revisedPrice.id,quantity:1},second],discountCents:0,tax:{treatment:'not-collected',rateBasisPoints:0,disclosure:'US sales tax is not collected by this proposal; the buyer may owe use tax.'}};
 const competing=await Promise.all([t.call(path,{body:updated}),t.call(path,{body:updated})]);assert.deepEqual(competing.map(response=>response.status).sort(),[201,409],'one concurrent edit creates the next immutable version');const losing=competing.find(response=>response.status===409)!;assert.match(await losing.text(),/Current quote is version 2/);const v2=await competing.find(response=>response.status===201)!.json() as any;assert.equal(v2.version,2);assert.equal(v2.content.totalCents,62000);assert.equal(v2.content.taxCents,0);
 const history=await t.json<any>(path,{},200);assert.deepEqual(history.versions,[v2,v1]);
 const sales=await riskBusinessState(db);
 for(const verb of ['review','progress']){const stale=await t.call(`${path}/versions/1/${verb}`,{body:{}});assert.equal(stale.status,409);assert.match(await stale.text(),/Current quote is version 2/);}
 assert.equal((await t.call(path,{body:{...updated,baseVersion:1}})).status,409);
 assert.deepEqual(await t.json(path,{},200),history);assert.deepEqual(await riskBusinessState(db),sales,'stale proposals change no sales state');
 const inclusiveDeal=await t.opportunity('Synthetic tax-inclusive quote','Synthetic inclusive buyer','Inclusive buyer',['synthetic-orbit-166','example.test'].join('@'));const inclusive=await t.json<any>(`${base}/deals/${inclusiveDeal}`,{body:{...input,baseVersion:0,lines:[{...first,priceId:revisedPrice.id,quantity:1,overrideUnitPriceCents:101,overrideReason:'Reviewed bundled price'},{...second,quantity:1,overrideUnitPriceCents:100,overrideReason:'Reviewed bundled price'}],discountCents:0,tax:{treatment:'included',rateBasisPoints:1000,disclosure:'US sales tax at 10 percent is included in these entered prices.'}}},201);assert.deepEqual([inclusive.content.taxCents,inclusive.content.totalCents],[18,201],'inclusive tax is extracted once with integer-cent rounding');
 const review=await t.json<any>(`${path}/versions/2/review`,{body:{}},200);assert.deepEqual(review.quote,v2);assert.equal(review.signature.configured,false);assert.match(review.signature.status,/Not sent/);
 const callText='The buyer said this quote expires 2030-12-01.';
 const call=await t.json<any>(`/api/v1/records/opportunity/${deal}/entries`,{body:{kind:'call',text:callText,occurredAt:'2026-11-01T12:00:00.000Z',durationMinutes:10}},200);
 const preview=await t.json<any>(`/api/v1/risks/${deal}/conflicts/preview`,{body:{}},200),quoteLine=preview.request.lines.find((line:any)=>line.evidenceId===v2.id);
 assert.ok(quoteLine.text.includes('2030-11-17')&&quoteLine.text.includes('USD 620.00'));
 assert.ok(preview.request.lines.some((line:any)=>line.evidenceId===v1.id&&line.text.includes('USD 433.00')),'every version remains observed evidence');
 assert.deepEqual(preview.request.lines.find((line:any)=>line.evidenceId===call.id).text,callText);
 const conflict={kind:'conflicting-date',explanation:'The issued quote and logged call state different expiration dates.',citations:[{evidenceId:v2.id,quote:'2030-11-17'},{evidenceId:call.id,quote:'2030-12-01'}],nextTask:'Confirm the quote expiration date with the buyer'};
 const original=fetch,requests:unknown[]=[],state=await riskBusinessState(db);
 try{globalThis.fetch=async(url,init)=>{if(url!=='https://api.openai.com/v1/responses')return original(url,init);requests.push(JSON.parse(JSON.parse(String(init?.body)).input));return Response.json({status:'completed',usage:{input_tokens:80,output_tokens:30},output:[{content:[{type:'output_text',text:JSON.stringify({findings:[conflict]})}]}]});};
 const result=await t.json<any>(`/api/v1/risks/${deal}/conflicts`,{body:{requestHash:preview.requestHash}},200);assert.deepEqual(result.findings[0].citations,conflict.citations);assert.equal(result.findings[0].nextTask,conflict.nextTask);assert.deepEqual(requests,[preview.request]);
 }finally{globalThis.fetch=original;}
 assert.deepEqual(await riskBusinessState(db),state,'the model edge alone is replaced and risk checking changes no sales state');
 const memberId=createId();await db.prepare('INSERT INTO access_collaborators VALUES(?,?)').bind(memberId,new Date().toISOString()).run();const member=await todayApp(db,{operatorId:memberId});
 for(const endpoint of [base+'/products',path]){assert.equal((await member.call(endpoint)).status,403);assert.equal((await member.call(endpoint,{body:endpoint===path?updated:{name:'Forbidden',active:true}})).status,403);}
 assert.deepEqual(await t.json(path,{},200),history);
 await db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(member.actor).run();assert.equal((await member.call(path)).status,401,'revoked sessions cannot read quote history');
 // Open populated Records export and restore, then the actual local portability engine.
 let job=await t.json<any>('/api/v1/records/archive/exports',{body:{}},201);
 for(let n=0;n<1000&&job.state==='preparing';n++)job=await t.json<any>(`/api/v1/records/archive/exports/${job.id}/advance`,{body:{}},200);
 assert.equal(job.state,'ready');const archive=await t.json<any>(`/api/v1/records/archive/exports/${job.id}/download`,{},200);
 for(const name of ['quote_products','quote_prices','quote_versions'])assert.ok(archive.manifest.tables.find((row:any)=>row.name===name).rows>0,'export contains populated '+name);
 const target=await launchFixture();try{
 const restore=async(path:string,body:unknown,method='POST')=>{const response=await target.request('records/archive/'+path,method,body);assert.ok(response.ok,await response.clone().text());return response.json() as Promise<any>;};
 let restored=await restore('imports',{manifest:archive.manifest,confirmed:true});for(const part of archive.parts)await restore(`imports/${restored.id}/parts/${part.index}`,part,'PUT');for(let n=0;n<1000&&restored.state!=='complete';n++)restored=await restore(`imports/${restored.id}/finalize`,{});assert.equal(restored.state,'complete');
 const restoredApp=await todayApp(target.db,{operatorId:t.actor});assert.deepEqual(await restoredApp.json(path,{},200),history);
 }finally{await target.dispose();}
 const local=await isolatedDatabase();try{await localArchiveRoundTrip(db,local.db);const restored=await todayApp(local.db,{operatorId:t.actor});assert.deepEqual(await restored.json(path,{},200),history);assert.equal((await restored.call(`${path}/versions/1/review`,{body:{}})).status,409);assert.equal((await restored.json<any>(`${path}/versions/2/review`,{body:{}},200)).signature.configured,false,'restore cannot fabricate a signature or provider authority');}finally{await local.dispose();}
 const contact=(await t.json<any>(`/api/v1/opportunities/${deal}`,{},200)).opportunity.contacts[0].id;
 await t.json(`/api/v1/records/contact/${contact}`,{method:'DELETE',body:{confirmed:true}},200);
 assert.deepEqual((await t.json<any>(path,{},200)).versions,[],'erasure withdraws every linked quote snapshot');
 assert.equal((await t.call(`${path}/versions/2/review`,{body:{}})).status,404,'an old review never resurrects erased history');
 assert.ok(!(await t.json<any>(`/api/v1/risks/${deal}/findings`,{},200)).evidence.some((line:any)=>[v1.id,v2.id].includes(line.id)));
 // A version keeps its privacy attribution when the person is later removed from the deal.
 const detachedEmail=['synthetic-orbit-167','example.test'].join('@'),detachedDeal=await t.opportunity('Synthetic detached quote','Synthetic detached buyer','Detached buyer',detachedEmail);
 const detachedContact=(await t.json<any>(`/api/v1/opportunities/${detachedDeal}`,{},200)).opportunity.contacts[0].id;
 await t.json(`${base}/deals/${detachedDeal}`,{body:{...updated,baseVersion:0,lines:[updated.lines[0],{...second,quantity:1,overrideUnitPriceCents:24000,overrideReason:'Reviewed detached concession'}]}},201);
 const detachedContext=await t.json<any>(`/api/v1/relationships/opportunity/${detachedDeal}`,{},200);
 await t.json(`/api/v1/relationships/opportunity/${detachedDeal}`,{method:'PUT',body:{revision:detachedContext.revision,companyId:detachedContext.company?.id??null,primaryContactId:null,stakeholders:[],products:detachedContext.products,nextStep:detachedContext.nextStep,mutualCommitments:detachedContext.mutualCommitments}},200);
 await t.json(`/api/v1/records/contact/${detachedContact}`,{method:'DELETE',body:{confirmed:true}},200);
 assert.deepEqual((await t.json<any>(`${base}/deals/${detachedDeal}`,{},200)).versions,[],'Historical quote attribution survives detachment for privacy erasure');
 assert.deepEqual((await t.json<any>(`${base}/deals/${inclusiveDeal}`,{},200)).versions,[inclusive],'Erasure preserves an unrelated customer’s complete quote');

 }finally{await source.dispose();}
}
